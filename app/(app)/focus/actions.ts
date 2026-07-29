"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assignmentBelongsToCaller } from "@/lib/supabase/ownership";
import { classify } from "@/lib/rules/focus";

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
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/focus");
  revalidatePath("/");
  return { ok: true };
}
