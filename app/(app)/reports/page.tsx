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
  deriveWeeklyWin,
  dailyMinutesForWeek,
  planAdherence,
  type WeekOverWeek,
  type CourseStudyLoad,
  type EarlyCompletion,
} from "@/lib/rules/insights";
import { mondayOf, nextWeek, parseWeekParam, previousWeek, weekRangeForMonday, isFutureWeek } from "@/lib/rules/report-range";
import { Pilo } from "@/components/brand/Pilo";
import { WeekNav } from "@/components/reports/WeekNav";
import { WeeklyRecapHero } from "@/components/reports/WeeklyRecapHero";
import { StudyRhythmChart } from "@/components/reports/StudyRhythmChart";
import { CourseTimeBreakdown, type CourseMinutes } from "@/components/reports/CourseTimeBreakdown";
import { PlanAdherenceCard } from "@/components/reports/PlanAdherenceCard";
import { WeeklyWinCard } from "@/components/reports/WeeklyWinCard";
import { CompletedRows } from "@/components/reports/CompletedRows";
import type { AssignmentStatus } from "@/lib/supabase/types";

interface AssignmentReportRow {
  id: string;
  title: string;
  course_id: string | null;
  status: AssignmentStatus;
  archived_at: string | null;
  due_at: string;
  completed_at: string | null;
}

interface ReportsPageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function WeeklyReportPage({ searchParams }: ReportsPageProps) {
  const { week } = await searchParams;
  const supabase = await createClient();
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();
  const now = new Date();

  const weekKey = parseWeekParam(week, now, timeZone);
  const prevWeekKey = previousWeek(weekKey);
  const isCurrentWeek = weekKey === mondayOf(now, timeZone);
  const canGoNext = !isFutureWeek(nextWeek(weekKey), now, timeZone);

  const { start: weekStart, end: weekEnd } = weekRangeForMonday(weekKey, timeZone);
  const { start: prevWeekStart } = weekRangeForMonday(prevWeekKey, timeZone);
  const fourteenDaysAgo = prevWeekStart;

  const ASSIGNMENT_COLUMNS = "id, title, course_id, status, archived_at, due_at, completed_at";

  const [{ data: profile }, { data: courseRows }, { data: sessionRows }, { data: gradeRows }, { data: activePlan }] =
    await Promise.all([
      supabase.from("profiles").select("weekly_availability_hours").maybeSingle(),
      supabase.from("courses").select("id, name"),
      supabase
        .from("focus_sessions")
        .select("assignment_id, started_at, duration_seconds, result, source")
        .gte("started_at", fourteenDaysAgo.toISOString())
        .lt("started_at", weekEnd.toISOString()),
      // Cumulative GPA is a lifetime figure — unbounded deliberately (see
      // original comment: grades accumulate far slower than assignments).
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

  const sessionAssignmentIds = [
    ...new Set((sessionRows ?? []).map((s) => s.assignment_id).filter((id): id is string => Boolean(id))),
  ];
  const [{ data: recentOrActiveAssignments }, { data: sessionReferencedAssignments }] = await Promise.all([
    supabase
      .from("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .or(`archived_at.is.null,completed_at.gte.${fourteenDaysAgo.toISOString()}`),
    sessionAssignmentIds.length > 0
      ? supabase.from("assignments").select(ASSIGNMENT_COLUMNS).in("id", sessionAssignmentIds)
      : Promise.resolve({ data: [] as AssignmentReportRow[] }),
  ]);

  const assignmentById = new Map(
    [...(recentOrActiveAssignments ?? []), ...(sessionReferencedAssignments ?? [])].map((a) => [a.id, a]),
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

  const currentWeekStats = weeklyStats(sessions, { now: new Date(weekEnd.getTime() - 1), timeZone });
  const previousWeekStats = weeklyStats(sessions, { now: new Date(weekStart.getTime() - 1), timeZone });
  const currentStreak = streakDays(sessions, { today: isCurrentWeek ? now : new Date(weekEnd.getTime() - 1), timeZone });
  const previousStreak = streakDays(sessions, { today: new Date(weekStart.getTime() - 1), timeZone });

  const completedThisWeek = allAssignments.filter(
    (a) => a.completed_at && new Date(a.completed_at) >= weekStart && new Date(a.completed_at) < weekEnd,
  );
  const completedPreviousWeek = allAssignments.filter(
    (a) => a.completed_at && new Date(a.completed_at) >= prevWeekStart && new Date(a.completed_at) < weekStart,
  ).length;

  const allGrades: GradeLike[] = (gradeRows ?? []).map((g) => ({ gradePoint: g.grade_point, creditHours: g.credit_hours }));
  const priorGrades: GradeLike[] = (gradeRows ?? [])
    .filter((g) => new Date(g.created_at).getTime() < weekStart.getTime())
    .map((g) => ({ gradePoint: g.grade_point, creditHours: g.credit_hours }));
  const currentGpa = allGrades.length > 0 ? gpa(allGrades) : null;
  const previousGpa = priorGrades.length > 0 ? gpa(priorGrades) : null;

  const completedFocusDayKeys = new Set(
    sessions.filter((s) => s.result === "completed").map((s) => dayKey(new Date(s.startedAt), timeZone)),
  );
  const plannedThisWeek = (plannedSessionRows ?? [])
    .map((s) => ({ startAt: s.start_at }))
    .filter((s) => new Date(s.startAt) >= weekStart && new Date(s.startAt) < weekEnd);
  const judgeAt = isCurrentWeek ? now : weekEnd;
  const elapsedPlanned = plannedThisWeek.filter((p) => new Date(p.startAt).getTime() <= judgeAt.getTime());
  const keptPlanned = elapsedPlanned.filter((p) => completedFocusDayKeys.has(dayKey(new Date(p.startAt), timeZone)));
  const adherence = planAdherence(plannedThisWeek, completedFocusDayKeys, { now: judgeAt, timeZone });

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

  const involvedCourseIds = new Set([...courseMinutesThisWeek.keys(), ...nextDueMsByCourse.keys()]);
  const courseLoads: CourseStudyLoad[] = Array.from(involvedCourseIds).map((courseId) => {
    const dueMs = nextDueMsByCourse.get(courseId);
    return {
      courseId,
      courseName: courseNameById.get(courseId) ?? "Unknown course",
      minutes: courseMinutesThisWeek.get(courseId) ?? 0,
      nextDueInDays: dueMs !== undefined ? Math.max(0, Math.ceil((dueMs - now.getTime()) / 86_400_000)) : null,
    };
  });
  const insight = deriveStudyInsight(courseLoads);

  const courseTimeBreakdown: CourseMinutes[] = Array.from(courseMinutesThisWeek.entries()).map(([courseId, minutes]) => ({
    courseId,
    courseName: courseNameById.get(courseId) ?? "Unknown course",
    minutes,
  }));

  const dailyThisWeek = dailyMinutesForWeek(sessions, weekKey, timeZone);
  const dailyLastWeek = dailyMinutesForWeek(sessions, prevWeekKey, timeZone);

  const earlyCompletions: EarlyCompletion[] = completedThisWeek
    .filter((a) => a.completed_at && new Date(a.completed_at).getTime() <= new Date(a.due_at).getTime())
    .map((a) => ({
      title: a.title,
      daysEarly: Math.round((new Date(a.due_at).getTime() - new Date(a.completed_at!).getTime()) / 86_400_000),
    }));
  const weeklyWin = deriveWeeklyWin({
    earlyCompletions,
    currentStreak,
    dailyMinutes: dailyThisWeek,
    planAdherencePct: adherence,
  });

  const hasAnyActivity =
    currentWeekStats.completedCycles > 0 ||
    currentWeekStats.partialSessions > 0 ||
    completedThisWeek.length > 0 ||
    currentStreak > 0;

  const completedDelta = weekOverWeek(completedThisWeek.length, completedPreviousWeek);
  const minutesDelta = weekOverWeek(currentWeekStats.completedMinutes, previousWeekStats.completedMinutes);
  const streakDelta = weekOverWeek(currentStreak, previousStreak);
  const gpaDelta = currentGpa !== null && previousGpa !== null ? weekOverWeek(currentGpa, previousGpa) : null;

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · compared with the week before`;

  const availabilityHours = profile?.weekly_availability_hours ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Weekly report</h1>
        </div>
      </div>

      <WeekNav
        weekLabel={weekLabel}
        previousWeekKey={prevWeekKey}
        nextWeekKey={canGoNext ? nextWeek(weekKey) : null}
        isCurrentWeek={isCurrentWeek}
      />

      {!hasAnyActivity ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card p-10 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="text-sm font-semibold text-ink-2">
            Nothing to report for this week — study a session or finish an assignment and it&rsquo;ll show up here.
          </p>
        </div>
      ) : (
        <>
          <WeeklyRecapHero
            completedMinutes={currentWeekStats.completedMinutes}
            completedCount={completedThisWeek.length}
            streak={currentStreak}
            goalMinutes={availabilityHours > 0 ? availabilityHours * 60 : null}
          />

          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <ReportStat label="Completed" value={String(completedThisWeek.length)} delta={completedDelta} unit="" />
            <ReportStat label="Study time" value={formatMinutes(currentWeekStats.completedMinutes)} delta={minutesDelta} unit=" min" />
            <ReportStat label="Streak" value={`${currentStreak}d`} delta={streakDelta} unit="d" />
            <ReportStat label="GPA" value={currentGpa !== null ? currentGpa.toFixed(2) : "—"} delta={gpaDelta} unit="" />
          </div>

          <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div className="flex min-w-0 flex-col gap-3.5">
              <StudyRhythmChart thisWeek={dailyThisWeek} lastWeek={dailyLastWeek} />
              {courseTimeBreakdown.length > 0 && (
                <div className="rounded-card bg-card p-5">
                  <CourseTimeBreakdown courses={courseTimeBreakdown} />
                </div>
              )}
              <CompletedRows
                rows={completedThisWeek.slice(0, 3).map((a) => ({
                  id: a.id,
                  title: a.title,
                  courseId: a.course_id,
                  courseName: a.course_id ? (courseNameById.get(a.course_id) ?? null) : null,
                  completedAt: a.completed_at!,
                }))}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              <PlanAdherenceCard adherence={adherence} elapsed={elapsedPlanned.length} kept={keptPlanned.length} />
              <WeeklyWinCard win={weeklyWin} />
              {insight && (
                <div className="rounded-card border border-tangerine/30 bg-tangerine-tint p-5">
                  <h2 className="font-display text-sm font-extrabold text-tangerine-text">Worth a look</h2>
                  <p className="mt-1.5 text-sm font-semibold text-tangerine-text">{insight}</p>
                </div>
              )}
            </div>
          </div>
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
