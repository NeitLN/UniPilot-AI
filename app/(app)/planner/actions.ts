"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSessions, buildSessionReminders } from "@/lib/rules/plan";

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

/** BR-02: the only place a draft is allowed to become active — never automatic. */
export async function confirmPlan(planId: string) {
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

  revalidatePath("/planner");
  revalidatePath("/");
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
