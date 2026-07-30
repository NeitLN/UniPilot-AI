"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assignmentBelongsToCaller } from "@/lib/supabase/ownership";
import { classify, validateManualSession } from "@/lib/rules/focus";

export interface LogFocusSessionInput {
  assignmentId: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
}

export interface LogFocusSessionResult {
  ok: boolean;
  error?: string;
}

export async function logFocusSession(
  input: LogFocusSessionInput,
): Promise<LogFocusSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired — sign in again." };

  if (!(await assignmentBelongsToCaller(supabase, input.assignmentId))) {
    return { ok: false, error: "That assignment isn't yours." };
  }

  const started = new Date(input.startedAt);
  const ended = new Date(input.endedAt);
  // Recomputed server-side, never trusting a client-supplied result/duration
  // (BR-04): only a genuine 25:00 elapsed counts as `completed`.
  const durationSeconds = Math.max(
    1,
    Math.round((ended.getTime() - started.getTime()) / 1000),
  );
  const result = classify(durationSeconds);

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    assignment_id: input.assignmentId,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    duration_seconds: durationSeconds,
    result,
    source: "timer",
  });

  if (error) {
    // 23505 = unique_violation on (user_id, started_at) — the same in-flight
    // session (same localStorage entry) was already logged by another tab.
    // The session IS recorded, so this is a success from the caller's view.
    if (error.code === "23505") {
      revalidatePath("/focus");
      revalidatePath("/");
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}

// FR-22 (docs/PRODUCT_REVIEW.md): offline/on-paper study never had a way
// to count toward the streak or minute totals at all — Pomodoro was the
// only path that could ever create a focus_sessions row.
export interface LogManualFocusSessionInput {
  assignmentId: string;
  startedAt: string; // ISO
  durationMinutes: number;
}

export async function logManualFocusSession(
  input: LogManualFocusSessionInput,
): Promise<LogFocusSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expired — sign in again." };

  if (!(await assignmentBelongsToCaller(supabase, input.assignmentId))) {
    return { ok: false, error: "That assignment isn't yours." };
  }

  // Never trust the client's own future-check (a stale clock, a paused
  // tab) — the server's clock, via the default `now` here, is the one
  // that actually matters.
  const errors = validateManualSession(input);
  const firstError = errors.startedAt ?? errors.durationMinutes;
  if (firstError) return { ok: false, error: firstError };

  const started = new Date(input.startedAt);
  const durationMinutes = Math.round(input.durationMinutes);
  const durationSeconds = durationMinutes * 60;
  const ended = new Date(started.getTime() + durationSeconds * 1000);

  // BR-04, via the same classify() the timer uses: a manual entry doesn't
  // get to call itself "completed" just because the user typed 25 — it's
  // held to the identical >=25:00 rule.
  const result = classify(durationSeconds);

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: user.id,
    assignment_id: input.assignmentId,
    started_at: started.toISOString(),
    ended_at: ended.toISOString(),
    duration_seconds: durationSeconds,
    result,
    source: "manual",
  });

  if (error) {
    // Same reasoning as logFocusSession above: 23505 here is almost always
    // an accidental double-submit of the same entry, not a deliberate
    // second session — the first insert already recorded it.
    if (error.code === "23505") {
      revalidatePath("/focus");
      revalidatePath("/");
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}
