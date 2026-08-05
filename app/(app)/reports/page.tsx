import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import {
  streakDays,
  weeklyStats,
  dayKey,
  defaultTimeZone,
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
import {
  mondayOf,
  nextWeek,
  parseWeekParam,
  previousWeek,
  weekRangeForMonday,
  isFutureWeek,
} from "@/lib/rules/report-range";
import {
  CheckCircle2,
  Clock,
  Flame,
  LineChart as LineChartIcon,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
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

  const [
    { data: profile },
    { data: courseRows },
    { data: sessionRows },
    { data: gradeRows },
    { data: activePlan },
  ] = await Promise.all([
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
    ...new Set(
      (sessionRows ?? []).map((s) => s.assignment_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const [{ data: recentOrActiveAssignments }, { data: sessionReferencedAssignments }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(ASSIGNMENT_COLUMNS)
        .or(`archived_at.is.null,completed_at.gte.${fourteenDaysAgo.toISOString()}`),
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

  const currentWeekStats = weeklyStats(sessions, {
    now: new Date(weekEnd.getTime() - 1),
    timeZone,
  });
  const previousWeekStats = weeklyStats(sessions, {
    now: new Date(weekStart.getTime() - 1),
    timeZone,
  });
  const currentStreak = streakDays(sessions, {
    today: isCurrentWeek ? now : new Date(weekEnd.getTime() - 1),
    timeZone,
  });
  const previousStreak = streakDays(sessions, {
    today: new Date(weekStart.getTime() - 1),
    timeZone,
  });

  const completedThisWeek = allAssignments.filter(
    (a) =>
      a.completed_at && new Date(a.completed_at) >= weekStart && new Date(a.completed_at) < weekEnd,
  );
  const completedPreviousWeek = allAssignments.filter(
    (a) =>
      a.completed_at &&
      new Date(a.completed_at) >= prevWeekStart &&
      new Date(a.completed_at) < weekStart,
  ).length;

  const allGrades: GradeLike[] = (gradeRows ?? []).map((g) => ({
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));
  const priorGrades: GradeLike[] = (gradeRows ?? [])
    .filter((g) => new Date(g.created_at).getTime() < weekStart.getTime())
    .map((g) => ({ gradePoint: g.grade_point, creditHours: g.credit_hours }));
  const currentGpa = allGrades.length > 0 ? gpa(allGrades) : null;
  const previousGpa = priorGrades.length > 0 ? gpa(priorGrades) : null;

  const completedFocusDayKeys = new Set(
    sessions
      .filter((s) => s.result === "completed")
      .map((s) => dayKey(new Date(s.startedAt), timeZone)),
  );
  const plannedThisWeek = (plannedSessionRows ?? [])
    .map((s) => ({ startAt: s.start_at }))
    .filter((s) => new Date(s.startAt) >= weekStart && new Date(s.startAt) < weekEnd);
  const judgeAt = isCurrentWeek ? now : weekEnd;
  const elapsedPlanned = plannedThisWeek.filter(
    (p) => new Date(p.startAt).getTime() <= judgeAt.getTime(),
  );
  const keptPlanned = elapsedPlanned.filter((p) =>
    completedFocusDayKeys.has(dayKey(new Date(p.startAt), timeZone)),
  );
  const adherence = planAdherence(plannedThisWeek, completedFocusDayKeys, {
    now: judgeAt,
    timeZone,
  });

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
      nextDueInDays:
        dueMs !== undefined ? Math.max(0, Math.ceil((dueMs - now.getTime()) / 86_400_000)) : null,
    };
  });
  const insight = deriveStudyInsight(courseLoads);

  const courseTimeBreakdown: CourseMinutes[] = Array.from(courseMinutesThisWeek.entries()).map(
    ([courseId, minutes]) => ({
      courseId,
      courseName: courseNameById.get(courseId) ?? "Unknown course",
      minutes,
    }),
  );

  const dailyThisWeek = dailyMinutesForWeek(sessions, weekKey, timeZone);
  const dailyLastWeek = dailyMinutesForWeek(sessions, prevWeekKey, timeZone);

  const earlyCompletions: EarlyCompletion[] = completedThisWeek
    .filter(
      (a) => a.completed_at && new Date(a.completed_at).getTime() <= new Date(a.due_at).getTime(),
    )
    .map((a) => ({
      title: a.title,
      daysEarly: Math.round(
        (new Date(a.due_at).getTime() - new Date(a.completed_at!).getTime()) / 86_400_000,
      ),
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
  const minutesDelta = weekOverWeek(
    currentWeekStats.completedMinutes,
    previousWeekStats.completedMinutes,
  );
  const streakDelta = weekOverWeek(currentStreak, previousStreak);
  const gpaDelta =
    currentGpa !== null && previousGpa !== null ? weekOverWeek(currentGpa, previousGpa) : null;

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · compared with the week before`;

  const availabilityHours = profile?.weekly_availability_hours ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Weekly report</h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">{weekLabel}</p>
        </div>
        <WeekNav
          previousWeekKey={prevWeekKey}
          nextWeekKey={canGoNext ? nextWeek(weekKey) : null}
          isCurrentWeek={isCurrentWeek}
        />
      </div>

      {!hasAnyActivity ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card p-10 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="text-sm font-semibold text-ink-2">
            Nothing to report for this week — study a session or finish an assignment and
            it&rsquo;ll show up here.
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
            <ReportStat
              label="Completed"
              value={String(completedThisWeek.length)}
              delta={completedDelta}
              unit=""
              tone="mint"
              icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
            />
            <ReportStat
              label="Study time"
              // Raw minutes against a "min" suffix, matching the hero's gauge
              // — formatMinutes would render "5h 25m" beside a 325/400 dial.
              value={String(currentWeekStats.completedMinutes)}
              suffix="min"
              delta={minutesDelta}
              unit=" min"
              tone="coral"
              icon={<Clock className="h-6 w-6" aria-hidden="true" />}
            />
            <ReportStat
              label="Streak"
              value={`${currentStreak}d`}
              delta={streakDelta}
              unit=" days"
              tone="lime"
              icon={<Flame className="h-6 w-6" aria-hidden="true" />}
            />
            <ReportStat
              label="GPA"
              value={currentGpa !== null ? currentGpa.toFixed(2) : "—"}
              delta={gpaDelta}
              unit=""
              tone="violet"
              icon={<LineChartIcon className="h-6 w-6" aria-hidden="true" />}
            />
          </div>

          <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div className="flex min-w-0 flex-col gap-3.5">
              <StudyRhythmChart thisWeek={dailyThisWeek} lastWeek={dailyLastWeek}>
                {courseTimeBreakdown.length > 0 && (
                  <CourseTimeBreakdown courses={courseTimeBreakdown} />
                )}
              </StudyRhythmChart>
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
              <PlanAdherenceCard
                adherence={adherence}
                elapsed={elapsedPlanned.length}
                kept={keptPlanned.length}
              />
              <WeeklyWinCard win={weeklyWin} />
              {insight && (
                <div className="flex items-center gap-4 rounded-card bg-tangerine-tint p-5">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tangerine text-white"
                  >
                    <AlertCircle className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[12.5px] font-semibold text-tangerine-text">
                      Worth a look
                    </h2>
                    <p className="mt-1 text-[13px] font-semibold text-tangerine-text">{insight}</p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-tangerine-text"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Card tint, the solid disc behind its icon, and the text colours that go
 * with that surface. Whole class literals, so Tailwind's build-time scanner
 * can see every one of them.
 *
 * `text`/`label` are part of the skin rather than fixed on the element for a
 * reason: --mint-tint, --coral-tint and --lime-tint deliberately keep their
 * light values in dark mode (see globals.css), so a token that *does* flip —
 * text-foreground, text-ink-2 — renders light-on-light there. These cards
 * previously used exactly that and measured 1.02:1. The paired *-text tokens
 * are theme-invariant by design, which is what a non-flipping tint needs.
 * The violet card is the exception: it sits on --card, which does flip, so
 * it takes the flipping tokens. */
const REPORT_STAT_SKIN: Record<
  ReportStatTone,
  { card: string; disc: string; text: string; label: string }
> = {
  mint: { card: "bg-mint-tint", disc: "bg-mint", text: "text-mint-text", label: "text-mint-text" },
  coral: {
    card: "bg-coral-tint",
    disc: "bg-coral",
    text: "text-coral-text",
    label: "text-coral-text",
  },
  // No --lime-text exists; --ink is the fixed dark shade the lime family
  // pairs with everywhere else (see lib/ui/course-tone.ts).
  lime: { card: "bg-lime-tint", disc: "bg-mint", text: "text-ink", label: "text-ink" },
  violet: { card: "bg-card", disc: "bg-violet", text: "text-foreground", label: "text-ink-2" },
};

type ReportStatTone = "mint" | "coral" | "lime" | "violet";

function ReportStat({
  label,
  value,
  suffix,
  delta,
  unit,
  tone,
  icon,
}: {
  label: string;
  value: string;
  /** Small trailing unit beside the figure ("min"), kept out of `value` so
   * it doesn't inherit the headline's size. */
  suffix?: string;
  delta: WeekOverWeek | null;
  unit: string;
  tone: ReportStatTone;
  icon: React.ReactNode;
}) {
  const skin = REPORT_STAT_SKIN[tone];
  return (
    // Disc beside the reading, not stacked above it — the concept's row
    // layout, which also keeps all four cards the same height.
    <div className={`flex items-center gap-3.5 rounded-card p-4 ${skin.card}`}>
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${skin.disc}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-[12px] font-semibold ${skin.label}`}>{label}</p>
        <p
          className={`mt-0.5 font-display text-[30px] font-bold leading-none tabular-nums ${skin.text}`}
        >
          {value}
          {suffix && <span className="ml-1 text-[13px] font-bold">{suffix}</span>}
        </p>
        {/* A coloured arrow line rather than a filled pill: four pills in a
            row competed with the figures they were annotating. */}
        {delta && delta.direction !== "flat" && (
          <p
            className={`mt-1.5 text-[11.5px] font-bold ${
              delta.direction === "up" ? "text-mint-text" : "text-coral-text"
            }`}
          >
            {delta.direction === "up" ? "↑" : "↓"} {Math.abs(delta.delta)}
            {unit} vs last week
          </p>
        )}
        {delta && delta.direction === "flat" && (
          <p className="mt-1.5 text-[11.5px] font-bold text-violet-text">No change</p>
        )}
        {!delta && <p className="mt-1.5 text-[11.5px] font-bold text-ink-3">No prior data</p>}
      </div>
    </div>
  );
}
