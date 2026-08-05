import { createClient } from "@/lib/supabase/server";
import {
  streakDays,
  weeklyStats,
  weeklyMinutesSeries,
  dailyActivity,
  completedCyclesToday,
  ORPHANED_SESSION_KEY,
} from "@/lib/rules/focus";
import { getViewerTimeZone } from "@/lib/timezone";
import { FocusTimer } from "@/components/focus/FocusTimer";
import { FocusStats, type FocusStatsData } from "@/components/focus/FocusStats";
import { DailyGoalCard } from "@/components/focus/DailyGoalCard";
import { LearningStats } from "@/components/focus/LearningStats";
import { CourseTimeCard, type CourseTimeGrade } from "@/components/focus/CourseTimeCard";
import { FocusHistoryCard, type FocusHistoryEntry } from "@/components/focus/FocusHistoryCard";
import { LogSessionDialog } from "@/components/focus/LogSessionDialog";

export default async function FocusPage() {
  const supabase = await createClient();
  const timeZone = await getViewerTimeZone();
  const now = new Date();
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();

  const [
    { data: profile },
    { data: assignmentRows },
    { data: courseRows },
    { data: sessionRows },
    { data: gradeRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("default_focus_minutes, daily_focus_goal_cycles")
      .maybeSingle(),
    // Unfiltered on purpose: past focus sessions can point at assignments
    // that are now done or archived, and those still need a real title/
    // course for the stats breakdown below (see the picker filter further
    // down for the active-only subset actually offered to start a session).
    supabase
      .from("assignments")
      .select("id, title, course_id, status, archived_at")
      .order("due_at", { ascending: true }),
    supabase.from("courses").select("id, name"),
    supabase
      .from("focus_sessions")
      .select("id, assignment_id, started_at, duration_seconds, result, source")
      .gte("started_at", sixtyDaysAgoIso)
      .order("started_at", { ascending: false }),
    // §5 learning stats: most recent grade per course, to line focus time
    // up against how that course actually turned out.
    supabase
      .from("grades")
      .select("course_id, grade_point, semester")
      .order("semester", { ascending: true }),
  ]);

  const allAssignments = assignmentRows ?? [];
  const activeAssignments = allAssignments.filter((a) => !a.archived_at && a.status !== "done");
  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const assignmentTitleById = new Map(allAssignments.map((a) => [a.id, a.title]));
  const assignmentCourseById = new Map(allAssignments.map((a) => [a.id, a.course_id]));

  const sessions = (sessionRows ?? []).map((s) => ({
    assignmentId: s.assignment_id,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
    source: s.source,
  }));

  // Already sorted most-recent-first by the query above.
  const focusHistory: FocusHistoryEntry[] = (sessionRows ?? []).map((s) => ({
    id: s.id,
    assignmentTitle: s.assignment_id
      ? (assignmentTitleById.get(s.assignment_id) ?? "Unassigned")
      : "Unassigned",
    courseId: s.assignment_id ? (assignmentCourseById.get(s.assignment_id) ?? null) : null,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
    source: s.source,
  }));

  const stats = weeklyStats(sessions, { timeZone });
  const streak = streakDays(sessions, { timeZone });

  const byAssignment = Object.entries(stats.minutesByAssignment)
    .map(([id, minutes]) => ({
      id,
      // ORPHANED_SESSION_KEY is the bucket for sessions with no assignment
      // at all — either a "General study" session, or one whose assignment
      // was deleted later. Both read as "Unassigned", matching what the
      // history list beside this already showed; the two used to disagree
      // ("Deleted assignment" here vs "Unassigned" there) for the same row.
      title:
        id === ORPHANED_SESSION_KEY ? "Unassigned" : (assignmentTitleById.get(id) ?? "Unassigned"),
      minutes,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const dailyGoalCycles = profile?.daily_focus_goal_cycles ?? 4;
  const defaultFocusMinutes = profile?.default_focus_minutes ?? 25;

  const statsData: FocusStatsData = {
    completedCycles: stats.completedCycles,
    partialSessions: stats.partialSessions,
    completedMinutes: stats.completedMinutes,
    partialMinutes: stats.partialMinutes,
    manualMinutes: stats.manualMinutes,
    streak,
    byAssignment,
    dailyActivity: dailyActivity(sessions, now, timeZone, 7),
    dailyGoalCycles,
  };

  const weeklySeries = weeklyMinutesSeries(sessions, { timeZone, weeks: 8 });

  // Last grade per course (rows arrive oldest-semester-first, so a later
  // entry for the same course simply overwrites — "most recent" wins).
  const gradePointByCourse = new Map<string, number>();
  for (const g of gradeRows ?? []) {
    gradePointByCourse.set(g.course_id, g.grade_point);
  }
  const allTimeCourseMinutes = new Map<string, number>();
  for (const s of sessions) {
    let courseName: string;
    if (s.assignmentId === null) {
      // No assignment means no course to attribute the time to — the same
      // "No course" bucket an assignment without a course already uses.
      // This said "Unknown course" before, which implied the course existed
      // and couldn't be found, and disagreed with the "Unassigned" label
      // the very same session got in the stats card above.
      courseName = "No course";
    } else {
      const courseId = assignmentCourseById.get(s.assignmentId);
      courseName = courseId ? (courseNameById.get(courseId) ?? "No course") : "No course";
    }
    allTimeCourseMinutes.set(
      courseName,
      (allTimeCourseMinutes.get(courseName) ?? 0) + s.durationSeconds / 60,
    );
  }
  const courseTimeGrades: CourseTimeGrade[] = Array.from(allTimeCourseMinutes.entries())
    .map(([name, minutes]) => {
      const course = (courseRows ?? []).find((c) => c.name === name);
      return {
        name,
        minutes: Math.round(minutes),
        gradePoint: course ? (gradePointByCourse.get(course.id) ?? null) : null,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Focus timer</h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">One session at a time.</p>
        </div>
        <LogSessionDialog
          assignments={activeAssignments.map((a) => ({ id: a.id, title: a.title }))}
        />
      </div>

      {/* The timer is the wider column — it was 1fr against a 1.4fr rail,
          which made the page's primary control the smaller half.
          items-start, not stretch: stretching the timer to match a taller
          right column pushed ~140px of empty space in between its dial, its
          select and its buttons, since the dial block absorbs all slack. The
          card now sits at its own height, spaced as the concept draws it. */}
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <FocusTimer
          assignments={activeAssignments.map((a) => ({ id: a.id, title: a.title }))}
          defaultDurationMinutes={defaultFocusMinutes}
        />
        <div className="flex flex-col gap-3.5">
          <FocusStats data={statsData} />
          <DailyGoalCard
            completed={completedCyclesToday(sessions, now, timeZone)}
            goal={dailyGoalCycles}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:items-stretch">
        <FocusHistoryCard entries={focusHistory} />
        <LearningStats dailySeries={statsData.dailyActivity} weeklySeries={weeklySeries} />
      </div>

      <CourseTimeCard byCourse={courseTimeGrades} />
    </div>
  );
}
