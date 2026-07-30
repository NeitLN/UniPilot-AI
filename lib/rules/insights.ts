// FR-26 (docs/PRODUCT_REVIEW.md) — weekly summary report. Two pure,
// unit-tested responsibilities live here rather than inline in the page:
// (1) turning a this-week vs last-week pair into a directional delta, and
// (2) picking the one verbal insight the report exists to surface (AC-3) —
// which course got neglected relative to how soon its next assignment is
// due, not just "the course with the fewest minutes" (a course with
// nothing due soon studying little isn't a problem worth flagging).
import { dayKey, defaultTimeZone, formatMinutes } from "@/lib/rules/focus";

export interface WeekOverWeek {
  current: number;
  previous: number;
  delta: number;
  direction: "up" | "down" | "flat";
}

export function weekOverWeek(current: number, previous: number): WeekOverWeek {
  const delta = Number((current - previous).toFixed(2));
  return {
    current,
    previous,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

export interface CourseStudyLoad {
  courseId: string;
  courseName: string;
  /** Minutes studied this week. */
  minutes: number;
  /** Days until this course's nearest not-done, not-archived assignment is
   * due (0 = due today); null if it has none. */
  nextDueInDays: number | null;
}

/**
 * AC-3: flags a mismatch between how much time a course got this week and
 * how soon its next assignment is due — specifically, the most-studied
 * course this week vs. the course with the closest upcoming deadline, when
 * they differ and the urgent one got meaningfully less time. Returns null
 * rather than forcing a comparison when there's nothing to contrast (fewer
 * than 2 courses, or no course has anything due).
 */
export function deriveStudyInsight(courses: CourseStudyLoad[]): string | null {
  if (courses.length < 2) return null;
  const withDeadlines = courses.filter(
    (c): c is CourseStudyLoad & { nextDueInDays: number } => c.nextDueInDays !== null,
  );
  if (withDeadlines.length === 0) return null;

  const mostUrgent = [...withDeadlines].sort((a, b) => a.nextDueInDays - b.nextDueInDays)[0];
  const mostStudied = [...courses].sort((a, b) => b.minutes - a.minutes)[0];

  if (mostUrgent.courseId === mostStudied.courseId) return null;
  if (mostUrgent.minutes >= mostStudied.minutes) return null;

  const dueDays = mostUrgent.nextDueInDays;
  const dueText = dueDays <= 0 ? "today" : dueDays === 1 ? "in 1 day" : `in ${dueDays} days`;

  return `You spent ${formatMinutes(mostStudied.minutes)} on ${mostStudied.courseName} but only ${formatMinutes(mostUrgent.minutes)} on ${mostUrgent.courseName}, even though ${mostUrgent.courseName} has a submission due ${dueText}.`;
}

export interface PlannedSessionLike {
  startAt: string; // ISO
}

/**
 * Share of this week's already-elapsed AI Planner sessions that have at
 * least one *completed* focus session on the same calendar day — a
 * timezone-aware proxy for "did you actually sit down when you planned to,"
 * not a strict start/end time-window match (the planner and the timer are
 * two independent systems with no link between a specific planned block and
 * a specific focus session). Null when nothing has elapsed yet to judge —
 * distinct from 0, which means sessions elapsed and none were kept.
 */
export function planAdherence(
  plannedSessions: PlannedSessionLike[],
  completedFocusDayKeys: Set<string>,
  options: { now?: Date; timeZone?: string } = {},
): number | null {
  const { now = new Date(), timeZone = defaultTimeZone() } = options;
  const elapsed = plannedSessions.filter(
    (p) => new Date(p.startAt).getTime() <= now.getTime(),
  );
  if (elapsed.length === 0) return null;

  const kept = elapsed.filter((p) =>
    completedFocusDayKeys.has(dayKey(new Date(p.startAt), timeZone)),
  );
  return Number((kept.length / elapsed.length).toFixed(2));
}
