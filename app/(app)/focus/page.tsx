import { createClient } from "@/lib/supabase/server";
import { streakDays, weeklyStats } from "@/lib/rules/focus";
import { getViewerTimeZone } from "@/lib/timezone";
import { FocusTimer } from "@/components/focus/FocusTimer";
import { FocusStats, type FocusStatsData } from "@/components/focus/FocusStats";

export default async function FocusPage() {
  const supabase = await createClient();
  const timeZone = await getViewerTimeZone();
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();

  const [{ data: assignmentRows }, { data: courseRows }, { data: sessionRows }] =
    await Promise.all([
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
        .select("assignment_id, started_at, duration_seconds, result")
        .gte("started_at", sixtyDaysAgoIso)
        .order("started_at", { ascending: false }),
    ]);

  const allAssignments = assignmentRows ?? [];
  const activeAssignments = allAssignments.filter(
    (a) => !a.archived_at && a.status !== "done",
  );
  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const assignmentTitleById = new Map(allAssignments.map((a) => [a.id, a.title]));
  const assignmentCourseById = new Map(
    allAssignments.map((a) => [a.id, a.course_id]),
  );

  const sessions = (sessionRows ?? []).map((s) => ({
    assignmentId: s.assignment_id,
    startedAt: s.started_at,
    durationSeconds: s.duration_seconds,
    result: s.result,
  }));

  const stats = weeklyStats(sessions, { timeZone });
  const streak = streakDays(sessions, { timeZone });

  const byAssignment = Object.entries(stats.minutesByAssignment)
    .map(([id, minutes]) => ({
      id,
      title: assignmentTitleById.get(id) ?? "Deleted assignment",
      minutes,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const courseMinutes = new Map<string, number>();
  for (const [assignmentId, minutes] of Object.entries(stats.minutesByAssignment)) {
    const courseId = assignmentCourseById.get(assignmentId);
    const courseName = courseId
      ? (courseNameById.get(courseId) ?? "Unknown course")
      : "No course";
    courseMinutes.set(courseName, (courseMinutes.get(courseName) ?? 0) + minutes);
  }
  const byCourse = Array.from(courseMinutes.entries())
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes);

  const statsData: FocusStatsData = {
    completedCycles: stats.completedCycles,
    partialSessions: stats.partialSessions,
    completedMinutes: stats.completedMinutes,
    partialMinutes: stats.partialMinutes,
    streak,
    byAssignment,
    byCourse,
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Focus timer
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">
          25 minutes, one assignment at a time.
        </p>
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <FocusTimer
          assignments={activeAssignments.map((a) => ({ id: a.id, title: a.title }))}
        />
        <FocusStats data={statsData} />
      </div>
    </div>
  );
}
