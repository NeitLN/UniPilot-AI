"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSessions, buildSessionReminders } from "@/lib/rules/plan";
import { pushConfirmedSessionsToCalendar } from "@/lib/calendar/push";

export interface UpdateSessionResult {
  ok: boolean;
  error?: string;
}

/** Re-validates a single edited session against everything else in its draft plan. */
export async function updateStudySession(
  sessionId: string,
  startAt: string,
  endAt: string,
): Promise<UpdateSessionResult> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("study_sessions")
    .select("plan_id, assignment_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  const { data: plan } = await supabase
    .from("study_plans")
    .select("status")
    .eq("id", session.plan_id)
    .maybeSingle();
  if (!plan || plan.status !== "draft") {
    return { ok: false, error: "Only draft sessions can be edited." };
  }

  const [{ data: profile }, { data: otherSessions }, { data: classBlocks }, { data: assignment }] =
    await Promise.all([
      supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
      supabase
        .from("study_sessions")
        .select("start_at, end_at")
        .eq("plan_id", session.plan_id)
        .neq("id", sessionId),
      supabase.from("class_blocks").select("start_at, end_at"),
      session.assignment_id
        ? supabase.from("assignments").select("due_at").eq("id", session.assignment_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const assignmentId = session.assignment_id ?? "";
  const [validated] = validateSessions({
    sessions: [{ assignmentId, startAt, endAt }],
    classBlocks: [
      ...(classBlocks ?? []).map((b) => ({ startAt: b.start_at, endAt: b.end_at })),
      ...(otherSessions ?? []).map((s) => ({ startAt: s.start_at, endAt: s.end_at })),
    ],
    assignmentDueAt: assignment ? { [assignmentId]: assignment.due_at } : {},
    dailyAvailabilityHours: (profile?.weekly_availability_hours ?? 0) / 7,
  });

  if (!validated.valid) {
    return { ok: false, error: validated.violation };
  }

  const { error } = await supabase
    .from("study_sessions")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/planner");
  return { ok: true };
}

export async function deleteStudySession(sessionId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("study_sessions")
    .select("plan_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("Session not found.");

  const { data: plan } = await supabase
    .from("study_plans")
    .select("status")
    .eq("id", session.plan_id)
    .maybeSingle();
  if (!plan || plan.status !== "draft") {
    throw new Error("Only draft sessions can be removed.");
  }

  const { error } = await supabase.from("study_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/planner");
}

// FR-23 (docs/PRODUCT_REVIEW.md): confirmPlan used to swallow the Google
// Calendar push outcome entirely — the plan really did save either way,
// but the user had no way to tell whether their sessions also reached
// Google without opening Google Calendar and checking themselves.
export type ConfirmPlanResult =
  | { pushed: number }
  | { pushSkipped: "not_connected" }
  | { pushFailed: string };

function toConfirmPlanResult(result: Awaited<ReturnType<typeof pushConfirmedSessionsToCalendar>>): ConfirmPlanResult {
  if (result.ok) return { pushed: result.pushed };
  if (result.reason === "not_connected") return { pushSkipped: "not_connected" };
  return { pushFailed: result.message };
}

/** BR-02: the only place a draft is allowed to become active — never automatic. */
export async function confirmPlan(planId: string): Promise<ConfirmPlanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("start_at, assignment_id")
    .eq("plan_id", planId);

  const assignmentIds = [...new Set((sessions ?? []).map((s) => s.assignment_id).filter((id): id is string => Boolean(id)))];
  const { data: assignments } = assignmentIds.length
    ? await supabase.from("assignments").select("id, title").in("id", assignmentIds)
    : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((assignments ?? []).map((a) => [a.id, a.title]));

  const reminders = buildSessionReminders(
    (sessions ?? [])
      .filter((s) => s.assignment_id)
      .map((s) => ({
        assignmentTitle: titleById.get(s.assignment_id!) ?? "your study session",
        startAt: s.start_at,
      })),
  );

  const { error: planError } = await supabase
    .from("study_plans")
    .update({ status: "active", confirmed_at: new Date().toISOString() })
    .eq("id", planId)
    .eq("status", "draft");
  if (planError) throw new Error(planError.message);

  if (reminders.length > 0) {
    await supabase.from("notifications").insert(
      reminders.map((r) => ({
        user_id: user.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        scheduled_at: r.scheduledAt,
      })),
    );
  }

  // §5 "Đồng bộ 2 chiều Google Calendar" — best-effort: a Google failure
  // (not connected, expired grant, API error) must never undo or block a
  // plan the user just confirmed (AC-4) — the plan above is already
  // committed by this point regardless of what happens next. pushConfirmed-
  // SessionsToCalendar never actually throws (it catches internally and
  // returns a PushResult), but this still wraps it: the plan having saved
  // must never depend on that continuing to hold in the future.
  let pushResult: ConfirmPlanResult;
  try {
    pushResult = toConfirmPlanResult(await pushConfirmedSessionsToCalendar(supabase, user.id, planId));
  } catch (err) {
    pushResult = {
      pushFailed: err instanceof Error ? err.message : "Unknown push error",
    };
  }

  revalidatePath("/planner");
  revalidatePath("/");
  return pushResult;
}

/** Retries only the calendar half of confirmPlan — never touches
 * study_plans.status or reminders, so unlike calling confirmPlan again this
 * can't insert duplicate reminder notifications. Safe to call repeatedly:
 * pushConfirmedSessionsToCalendar only ever pushes sessions that don't
 * already have a gcal_event_id. */
export async function retryCalendarPush(planId: string): Promise<ConfirmPlanResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  try {
    const result = toConfirmPlanResult(await pushConfirmedSessionsToCalendar(supabase, user.id, planId));
    revalidatePath("/planner");
    return result;
  } catch (err) {
    return { pushFailed: err instanceof Error ? err.message : "Unknown push error" };
  }
}

/** BR-02: cancelling a draft deletes it outright — an active plan is untouched. */
export async function cancelPlan(planId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("study_plans")
    .delete()
    .eq("id", planId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);

  revalidatePath("/planner");
}
