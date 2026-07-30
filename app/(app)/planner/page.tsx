import { createClient } from "@/lib/supabase/server";
import { canGeneratePlan } from "@/lib/rules/plan";
import { Pilo } from "@/components/brand/Pilo";
import { GenerateButton } from "@/components/planner/GenerateButton";
import { PlanEditor, type PlanSessionData } from "@/components/planner/PlanEditor";
import {
  ActivePlanSummary,
  type ActivePlanSessionData,
} from "@/components/planner/ActivePlanSummary";

async function loadSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
) {
  const { data: sessionRows } = await supabase
    .from("study_sessions")
    .select("id, assignment_id, start_at, end_at, reason")
    .eq("plan_id", planId)
    .order("start_at", { ascending: true });

  const assignmentIds = [
    ...new Set(
      (sessionRows ?? [])
        .map((s) => s.assignment_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: assignmentRows } = assignmentIds.length
    ? await supabase.from("assignments").select("id, title").in("id", assignmentIds)
    : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((assignmentRows ?? []).map((a) => [a.id, a.title]));

  return (sessionRows ?? []).map((s) => ({
    id: s.id,
    assignmentTitle: s.assignment_id
      ? (titleById.get(s.assignment_id) ?? "Unknown assignment")
      : "Unknown assignment",
    startAt: s.start_at,
    endAt: s.end_at,
    reason: s.reason,
  }));
}

export default async function PlannerPage() {
  const supabase = await createClient();

  const [{ data: profile }, { data: pendingAssignments }, { data: draftPlan }, { data: activePlan }] =
    await Promise.all([
      supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
      supabase
        .from("assignments")
        .select("id")
        .is("archived_at", null)
        .neq("status", "done"),
      supabase
        .from("study_plans")
        .select("id")
        .eq("status", "draft")
        .maybeSingle(),
      supabase
        .from("study_plans")
        .select("id, confirmed_at")
        .eq("status", "active")
        .order("confirmed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const weeklyAvailabilityHours = profile?.weekly_availability_hours ?? 0;
  const pendingCount = pendingAssignments?.length ?? 0;
  const gate = canGeneratePlan({
    weeklyAvailabilityHours,
    pendingAssignmentCount: pendingCount,
  });

  let draftSessions: PlanSessionData[] = [];
  if (draftPlan) {
    draftSessions = await loadSessions(supabase, draftPlan.id);
  }

  let activeSessions: ActivePlanSessionData[] = [];
  if (activePlan && !draftPlan) {
    activeSessions = await loadSessions(supabase, activePlan.id);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            AI planner
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            Pilo drafts a weekly study plan — nothing is scheduled until you
            confirm it.
          </p>
        </div>
        <GenerateButton
          disabled={!gate.ok}
          disabledReasons={gate.reasons}
          label={
            draftPlan
              ? "Regenerate draft"
              : activePlan
                ? "Generate new draft"
                : "Generate this week's plan"
          }
        />
      </div>

      {draftPlan ? (
        <PlanEditor planId={draftPlan.id} sessions={draftSessions} />
      ) : activePlan ? (
        <ActivePlanSummary sessions={activeSessions} confirmedAt={activePlan.confirmed_at} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card py-12 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="text-sm font-semibold text-ink-2">
            No plan yet — generate one whenever you&rsquo;re ready.
          </p>
        </div>
      )}
    </div>
  );
}
