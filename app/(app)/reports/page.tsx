import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import {
  streakDays,
  weeklyStats,
  dayKey,
  defaultTimeZone,
  formatMinutes,
  ORPHANED_SESSION_KEY,
  type FocusSessionLike,
} from "@/lib/rules/focus";
import { gpa, type GradeLike } from "@/lib/rules/gpa";
import {
  weekOverWeek,
  deriveStudyInsight,
  planAdherence,
  type WeekOverWeek,
  type CourseStudyLoad,
} from "@/lib/rules/insights";
import { Pilo } from "@/components/brand/Pilo";
import type { AssignmentStatus } from "@/lib/supabase/types";

const DAY_MS = 86_400_000;

interface AssignmentReportRow {
  id: string;
  course_id: string | null;
  status: AssignmentStatus;
  archived_at: string | null;
  due_at: string;
  updated_at: string;
}

export default async function WeeklyReportPage() {
  const supabase = await createClient();
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS);

  const ASSIGNMENT_COLUMNS = "id, course_id, status, archived_at, due_at, updated_at";

  const [
    { data: courseRows },
    { data: sessionRows },
    { data: gradeRows },
    { data: activePlan },
  ] = await Promise.all([
    supabase.from("courses").select("id, name"),
    supabase
      .from("focus_sessions")
      .select("assignment_id, started_at, duration_seconds, result, source")
      .gte("started_at", fourteenDaysAgo.toISOString()),
    // Cumulative GPA is a lifetime figure by definition — unlike
    // assignments below, grades can't be bounded to the reporting window
    // without silently breaking the "GPA now vs. GPA before this week"
    // comparison this page exists to show. Left unbounded deliberately;
    // grades also accumulate far slower than assignments (a handful per
    // semester, not per week), so this isn't the growth risk that one is.
    supabase.from("grades").select("course_id, grade_point, credit_hours, created_at"),
    supabase
      .from("study_plans")
      .select("id")
      .eq("status", "active")
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const { data: plannedSessionRows } = activePlan
    ? await supabase.from("study_sessions").select("start_at").eq("plan_id", activePlan.id)
    : { data: [] as { start_at: string }[] };

  // SR-05 (docs/PRODUCT_REVIEW_3.md): used to select every assignment ever
  // created, unbounded — this page only shows 7 days, but was paying for a
  // full-history scan every time. Three different things below actually
  // need an assignment row, with three different lifetimes:
  //  - completedThisWeek/PreviousWeek: only "done" rows updated.in the last
  //    14 days can possibly land in either week's count.
  //  - nextDueMsByCourse: any currently-active (not done, not archived) row,
  //    regardless of how long ago it was last touched.
  //  - the byAssignment -> course lookup for this week's *focus* minutes:
  //    specifically whichever assignment each recent focus session points
  //    at, which could be an old, untouched, already-archived row.
  // "archived_at is null or updated_at >= cutoff" covers the first two.
  // The third needs its own by-id fetch, sequenced after sessionRows
  // resolves — can't be folded into the same Promise.all since it depends
  // on that query's result, but it's still one extra query, not N.
  const sessionAssignmentIds = [
    ...new Set(
      (sessionRows ?? [])
        .map((s) => s.assignment_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [{ data: recentOrActiveAssignments }, { data: sessionReferencedAssignments }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(ASSIGNMENT_COLUMNS)
        .or(`archived_at.is.null,updated_at.gte.${fourteenDaysAgo.toISOString()}`),
      sessionAssignmentIds.length > 0
        ? supabase.from("assignments").select(ASSIGNMENT_COLUMNS).in("id", sessionAssignmentIds)
        : Promise.resolve({ data: [] as AssignmentReportRow[] }),
    ]);

  const assignmentById = new Map(
    [...(recentOrActiveAssignments ?? []), ...(sessionReferencedAssignments ?? [])].map((a) => [
      a.id,
      a,
    ]),
  );
  const allAssignments = Array.from(assignmentById.values());
  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const assignmentCourseById = new Map(allAssignments.map((a) => [a.id, a.course_id]));

  const sessions: FocusSessionLike[] = (sessionRows ?? []).map((s) => ({
    assignmentId: s.assignment_id,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
    source: s.source,
  }));

  const currentWeekStats = weeklyStats(sessions, { now, timeZone });
  const previousWeekStats = weeklyStats(sessions, { now: oneWeekAgo, timeZone });
  const currentStreak = streakDays(sessions, { today: now, timeZone });
  const previousStreak = streakDays(sessions, { today: oneWeekAgo, timeZone });

  // FR-26: no completed_at column exists on assignments — updated_at is a
  // proxy (bumped on any edit, not just a status change to "done"), so this
  // slightly over-counts a done item that was merely edited again this week.
  // Documented rather than silently treated as exact.
  const completedThisWeek = allAssignments.filter(
    (a) =>
      a.status === "done" &&
      new Date(a.updated_at).getTime() >= oneWeekAgo.getTime() &&
      new Date(a.updated_at).getTime() <= now.getTime(),
  ).length;
  const completedPreviousWeek = allAssignments.filter(
    (a) =>
      a.status === "done" &&
      new Date(a.updated_at).getTime() >= fourteenDaysAgo.getTime() &&
      new Date(a.updated_at).getTime() < oneWeekAgo.getTime(),
  ).length;

  const allGrades: GradeLike[] = (gradeRows ?? []).map((g) => ({
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));
  const priorGrades: GradeLike[] = (gradeRows ?? [])
    .filter((g) => new Date(g.created_at).getTime() < oneWeekAgo.getTime())
    .map((g) => ({ gradePoint: g.grade_point, creditHours: g.credit_hours }));
  const currentGpa = allGrades.length > 0 ? gpa(allGrades) : null;
  const previousGpa = priorGrades.length > 0 ? gpa(priorGrades) : null;

  const completedFocusDayKeys = new Set(
    sessions
      .filter((s) => s.result === "completed")
      .map((s) => dayKey(new Date(s.startedAt), timeZone)),
  );
  const adherence = planAdherence(
    (plannedSessionRows ?? []).map((s) => ({ startAt: s.start_at })),
    completedFocusDayKeys,
    { now, timeZone },
  );

  const courseMinutesThisWeek = new Map<string, number>();
  for (const [assignmentId, minutes] of Object.entries(currentWeekStats.minutesByAssignment)) {
    if (assignmentId === ORPHANED_SESSION_KEY) continue;
    const courseId = assignmentCourseById.get(assignmentId);
    if (!courseId) continue;
    courseMinutesThisWeek.set(courseId, (courseMinutesThisWeek.get(courseId) ?? 0) + minutes);
  }

  const nextDueMsByCourse = new Map<string, number>();
  for (const a of allAssignments) {
    if (a.status === "done" || a.archived_at || !a.course_id) continue;
    const dueMs = new Date(a.due_at).getTime();
    const existing = nextDueMsByCourse.get(a.course_id);
    if (existing === undefined || dueMs < existing) nextDueMsByCourse.set(a.course_id, dueMs);
  }

  const involvedCourseIds = new Set([
    ...courseMinutesThisWeek.keys(),
    ...nextDueMsByCourse.keys(),
  ]);
  const courseLoads: CourseStudyLoad[] = Array.from(involvedCourseIds).map((courseId) => {
    const dueMs = nextDueMsByCourse.get(courseId);
    return {
      courseId,
      courseName: courseNameById.get(courseId) ?? "Unknown course",
      minutes: courseMinutesThisWeek.get(courseId) ?? 0,
      nextDueInDays: dueMs !== undefined ? Math.max(0, Math.ceil((dueMs - now.getTime()) / DAY_MS)) : null,
    };
  });
  const insight = deriveStudyInsight(courseLoads);

  const hasAnyActivity =
    currentWeekStats.completedCycles > 0 ||
    currentWeekStats.partialSessions > 0 ||
    completedThisWeek > 0 ||
    currentStreak > 0;

  const completedDelta = weekOverWeek(completedThisWeek, completedPreviousWeek);
  const minutesDelta = weekOverWeek(currentWeekStats.completedMinutes, previousWeekStats.completedMinutes);
  const streakDelta = weekOverWeek(currentStreak, previousStreak);
  const gpaDelta =
    currentGpa !== null && previousGpa !== null ? weekOverWeek(currentGpa, previousGpa) : null;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Weekly report
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">
          The last 7 days, compared with the 7 before that.
        </p>
      </div>

      {!hasAnyActivity ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card p-10 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="text-sm font-semibold text-ink-2">
            Nothing to report yet — study a session or finish an assignment this week and it&rsquo;ll show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <ReportStat label="Completed" value={String(completedThisWeek)} delta={completedDelta} unit="" />
            <ReportStat
              label="Study time"
              value={formatMinutes(currentWeekStats.completedMinutes)}
              delta={minutesDelta}
              unit=" min"
            />
            <ReportStat label="Streak" value={`${currentStreak}d`} delta={streakDelta} unit="d" />
            <ReportStat
              label="GPA"
              value={currentGpa !== null ? currentGpa.toFixed(2) : "—"}
              delta={gpaDelta}
              unit=""
            />
          </div>

          <div className="rounded-card bg-card p-5">
            <h2 className="font-display text-lg font-bold text-foreground">Plan adherence</h2>
            {adherence === null ? (
              <p className="mt-1.5 text-sm font-semibold text-ink-2">
                No AI planner sessions have come due yet this week.
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-ink-2">
                You followed through on{" "}
                <span className="font-extrabold text-foreground">
                  {Math.round(adherence * 100)}%
                </span>{" "}
                of this week&rsquo;s planned study sessions.
              </p>
            )}
          </div>

          {insight && (
            <div className="rounded-card border border-tangerine/30 bg-tangerine-tint p-5">
              <h2 className="font-display text-sm font-extrabold text-tangerine-text">
                Worth a look
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-tangerine-text">{insight}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportStat({
  label,
  value,
  delta,
  unit,
}: {
  label: string;
  value: string;
  delta: WeekOverWeek | null;
  unit: string;
}) {
  return (
    <div className="rounded-card bg-card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      {delta && delta.direction !== "flat" && (
        <p
          className={`mt-1 inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-extrabold ${
            delta.direction === "up"
              ? "bg-mint-tint text-mint-text"
              : "bg-coral-tint text-coral-text"
          }`}
        >
          {delta.direction === "up" ? "↑" : "↓"} {Math.abs(delta.delta)}
          {unit} vs last week
        </p>
      )}
      {delta && delta.direction === "flat" && (
        <p className="mt-1 text-[11px] font-bold text-ink-3">No change vs last week</p>
      )}
      {!delta && <p className="mt-1 text-[11px] font-bold text-ink-3">No prior data</p>}
    </div>
  );
}
