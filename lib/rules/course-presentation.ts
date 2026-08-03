// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 3 (Courses) — pure
// presentation helpers for the course-card grid redesign. Reuses
// isOverdue/isDueThisWeek from lib/rules/assignment.ts rather than
// re-deriving "overdue"/"this week" a second time (Phase 9 §9.1 explicitly
// requires one definition, not several that can drift).
import { isDueThisWeek, isOverdue, sortByDueDate } from "@/lib/rules/assignment";
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface CourseAssignmentLite {
  id: string;
  courseId: string;
  title: string;
  dueAt: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  progress: number;
  archivedAt: string | null;
}

/** Mean of each active (non-archived) assignment's own tracked `progress`
 * — null (not 0) when the course has no active assignments to average, so
 * the card can say "No assignments yet" instead of a misleading 0%. */
export function courseProgress(assignments: CourseAssignmentLite[]): number | null {
  const active = assignments.filter((a) => !a.archivedAt);
  if (active.length === 0) return null;
  const mean = active.reduce((sum, a) => sum + a.progress, 0) / active.length;
  return Math.round(mean);
}

export interface NextDeadline {
  assignmentId: string;
  title: string;
  dueAt: string;
  overdue: boolean;
}

/** Soonest not-done, non-archived assignment — null means "All caught up",
 * a real state, not an empty placeholder. */
export function nextCourseDeadline(assignments: CourseAssignmentLite[], now: Date = new Date()): NextDeadline | null {
  const pending = sortByDueDate(assignments.filter((a) => !a.archivedAt && a.status !== "done"));
  const next = pending[0];
  if (!next) return null;
  return { assignmentId: next.id, title: next.title, dueAt: next.dueAt, overdue: isOverdue(next, now) };
}

export interface CourseLoadEntry {
  courseId: string;
  courseName: string;
  count: number;
}

export interface CourseLoadSummary {
  totalAssignments: number;
  dueThisWeek: number;
  distribution: CourseLoadEntry[];
}

/** Distribution is only over active (non-archived, non-done) assignments —
 * a course's "load" is what's still outstanding, not its full history. */
export function courseLoadSummary(
  courses: { id: string; name: string }[],
  assignments: CourseAssignmentLite[],
  now: Date = new Date(),
  timeZone?: string,
): CourseLoadSummary {
  const active = assignments.filter((a) => !a.archivedAt && a.status !== "done");
  const nameById = new Map(courses.map((c) => [c.id, c.name]));
  const countByCourseCourse = new Map<string, number>();
  for (const a of active) {
    countByCourseCourse.set(a.courseId, (countByCourseCourse.get(a.courseId) ?? 0) + 1);
  }
  const distribution: CourseLoadEntry[] = courses
    .map((c) => ({ courseId: c.id, courseName: nameById.get(c.id) ?? c.name, count: countByCourseCourse.get(c.id) ?? 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalAssignments: active.length,
    dueThisWeek: active.filter((a) => isDueThisWeek(a.dueAt, now, timeZone)).length,
    distribution,
  };
}

/** Simple substring match on name/code — server-side filtering doesn't
 * need to be smarter than what a student would actually type. */
export function filterCourses<T extends { name: string; code: string | null }>(
  courses: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return courses;
  return courses.filter((c) => c.name.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q));
}
