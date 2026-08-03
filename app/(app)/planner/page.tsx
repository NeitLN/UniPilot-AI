import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { canGeneratePlan, computePlanProgress } from "@/lib/rules/plan";
import {
  coveredAssignmentCount,
  derivePiloPlanNote,
  formatMinutes,
  groupSessionsByViewerDay,
  planCoverage,
  totalPlannedMinutes,
  weekDayTabs,
  type PlanSessionLite,
} from "@/lib/rules/plan-presentation";
import { AlertTriangle } from "lucide-react";
import { dayKey as toDayKey, defaultTimeZone, shiftDayKey } from "@/lib/rules/focus";
import { PlannerHero, type PlanLifecycleView } from "@/components/planner/PlannerHero";
import { PlanHealthCard } from "@/components/planner/PlanHealthCard";
import { PiloPlanNote } from "@/components/planner/PiloPlanNote";
import { AvailabilityBands } from "@/components/planner/AvailabilityBands";
import { PlannerWeekView } from "@/components/planner/PlannerWeekView";
import { GenerateButton, type GenerateButtonProps } from "@/components/planner/GenerateButton";

async function loadSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planId: string,
): Promise<PlanSessionLite[]> {
  const { data: sessionRows } = await supabase
    .from("study_sessions")
    .select("id, assignment_id, start_at, end_at, reason")
    .eq("plan_id", planId)
    .order("start_at", { ascending: true });

  const assignmentIds = [
    ...new Set((sessionRows ?? []).map((s) => s.assignment_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: assignmentRows } = assignmentIds.length
    ? await supabase.from("assignments").select("id, title, course_id").in("id", assignmentIds)
    : { data: [] as { id: string; title: string; course_id: string | null }[] };

  const courseIds = [
    ...new Set((assignmentRows ?? []).map((a) => a.course_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: courseRows } = courseIds.length
    ? await supabase.from("courses").select("id, name").in("id", courseIds)
    : { data: [] as { id: string; name: string }[] };
  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const assignmentById = new Map((assignmentRows ?? []).map((a) => [a.id, a]));

  return (sessionRows ?? []).map((s) => {
    const assignment = s.assignment_id ? assignmentById.get(s.assignment_id) : undefined;
    return {
      id: s.id,
      assignmentId: s.assignment_id,
      assignmentTitle: assignment?.title ?? "Unknown assignment",
      courseId: assignment?.course_id ?? null,
      courseName: assignment?.course_id ? (courseNameById.get(assignment.course_id) ?? null) : null,
      startAt: s.start_at,
      endAt: s.end_at,
      reason: s.reason,
    };
  });
}

export default async function PlannerPage() {
  const supabase = await createClient();
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();

  const [{ data: profile }, { data: pendingAssignments }, { data: draftPlan }, { data: activePlan }] =
    await Promise.all([
      supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
      supabase.from("assignments").select("id").is("archived_at", null).neq("status", "done"),
      supabase.from("study_plans").select("id, week_start").eq("status", "draft").maybeSingle(),
      supabase
        .from("study_plans")
        .select("id, week_start, confirmed_at")
        .eq("status", "active")
        .order("confirmed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const weeklyAvailabilityHours = profile?.weekly_availability_hours ?? 0;
  const pendingCount = pendingAssignments?.length ?? 0;
  const gate = canGeneratePlan({ weeklyAvailabilityHours, pendingAssignmentCount: pendingCount });

  const plan = draftPlan ?? activePlan ?? null;
  const isDraft = Boolean(draftPlan);

  let sessions: PlanSessionLite[] = [];
  if (plan) {
    sessions = await loadSessions(supabase, plan.id);
  }

  let lifecycle: PlanLifecycleView = "empty";
  if (isDraft) {
    lifecycle = "draft";
  } else if (activePlan) {
    lifecycle = computePlanProgress(sessions.map((s) => ({ startAt: s.startAt }))).lifecycle === "ended" ? "ended" : "active";
  }

  const generateProps: GenerateButtonProps = {
    disabled: !gate.ok,
    disabledReasons: gate.reasons,
    label: draftPlan ? "Regenerate draft" : activePlan ? "Generate new draft" : "Generate this week's plan",
  };

  // Empty state — nothing to build a week view around.
  if (!plan) {
    return (
      <div className="flex flex-col gap-3.5">
        <Header generateProps={generateProps} />
        <PlannerHero lifecycle="empty" planId={null} sessionCount={0} totalMinutesLabel="0m" generateProps={generateProps} />
      </div>
    );
  }

  const dayTabs = weekDayTabs(plan.week_start);
  const weekStartKey = dayTabs[0].dayKey;
  const weekEndExclusiveKey = shiftDayKey(weekStartKey, 7);

  const [{ data: classBlockRows }, { data: dueAssignmentRows }] = await Promise.all([
    supabase
      .from("class_blocks")
      .select("start_at, end_at")
      .gte("start_at", `${weekStartKey}T00:00:00Z`)
      .lt("start_at", `${weekEndExclusiveKey}T00:00:00Z`),
    supabase
      .from("assignments")
      .select("id, due_at")
      .is("archived_at", null)
      .neq("status", "done")
      .gte("due_at", `${weekStartKey}T00:00:00Z`)
      .lt("due_at", `${weekEndExclusiveKey}T00:00:00Z`),
  ]);

  const busyRanges = [
    ...(classBlockRows ?? []).map((b) => ({ startAt: b.start_at, endAt: b.end_at })),
    ...sessions.map((s) => ({ startAt: s.startAt, endAt: s.endAt })),
  ];

  const sessionsByDayMap = groupSessionsByViewerDay(sessions, timeZone);
  const sessionsByDay: Record<string, PlanSessionLite[]> = {};
  for (const [key, list] of sessionsByDayMap) sessionsByDay[key] = list;

  const todayKey = toDayKey(new Date(), timeZone);
  const initialDayKey =
    dayTabs.find((d) => d.dayKey === todayKey)?.dayKey ??
    dayTabs.find((d) => (sessionsByDay[d.dayKey]?.length ?? 0) > 0)?.dayKey ??
    dayTabs[0].dayKey;

  const totalMinutes = totalPlannedMinutes(sessions);
  const coveredCount = coveredAssignmentCount(sessions);
  const dueCount = (dueAssignmentRows ?? []).length;
  const coveragePct = planCoverage(dueCount, coveredCount);

  const dayLoads = dayTabs.map((d) => ({
    dayKey: d.dayKey,
    label: d.longLabel,
    minutes: totalPlannedMinutes(sessionsByDay[d.dayKey] ?? []),
    sessionCount: (sessionsByDay[d.dayKey] ?? []).length,
  }));
  const piloNote = derivePiloPlanNote(dayLoads);

  return (
    <div className="flex flex-col gap-3.5">
      <Header generateProps={generateProps} />

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* Hero first, insights after — brief §1.7 explicitly wants the
            reverse order from the Assignments page's Pilo-pick-first
            pattern, so this deliberately doesn't reuse that order-swap. */}
        <div className="flex min-w-0 flex-col gap-3.5 lg:order-1">
          <div id="review-confirm">
            <PlannerHero
              lifecycle={lifecycle}
              planId={plan.id}
              sessionCount={sessions.length}
              totalMinutesLabel={formatMinutes(totalMinutes)}
              generateProps={generateProps}
            />
          </div>
          <PlannerWeekView
            dayTabs={dayTabs}
            sessionsByDay={sessionsByDay}
            initialDayKey={initialDayKey}
            editable={isDraft}
          />
          {lifecycle === "draft" && sessions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-coral-tint px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-coral-text" aria-hidden="true" />
                <div>
                  <p className="text-[12.5px] font-extrabold text-coral-text">Nothing is scheduled until you confirm.</p>
                  <p className="text-[12.5px] font-semibold text-coral-text/85">Review your plan and confirm to lock it in.</p>
                </div>
              </div>
              <a
                href="#review-confirm"
                className="flex min-h-11 shrink-0 items-center rounded-ctl bg-coral px-4 text-sm font-extrabold text-white hover:bg-coral-deep"
              >
                Review &amp; confirm plan
              </a>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 lg:order-2">
          <PlanHealthCard
            sessionCount={sessions.length}
            totalMinutes={totalMinutes}
            coveredCount={coveredCount}
            coveragePct={coveragePct}
          />
          <PiloPlanNote note={piloNote} isDraft={isDraft} />
          <AvailabilityBands days={dayTabs} busyRanges={busyRanges} timeZone={timeZone} />
        </div>
      </div>
    </div>
  );
}

function Header({ generateProps }: { generateProps: GenerateButtonProps }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">AI planner</h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">Your week, planned around what matters.</p>
      </div>
      <GenerateButton {...generateProps} />
    </div>
  );
}
