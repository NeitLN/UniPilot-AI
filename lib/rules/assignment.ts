// BR-01 — assignment validation, overdue/priority labelling, sort order.
// Imported by both the client form and the server action so the rule is
// defined exactly once (docs/UniPilot/UniPilot_AI_ROADMAP.md §1 principle 3).
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";
import type { EventRepeat } from "@/lib/rules/event";
import { dayKey, defaultTimeZone, shiftDayKey } from "@/lib/rules/focus";

export interface AssignmentLike {
  dueAt: string;
  status: AssignmentStatus;
  priority: AssignmentPriority;
  archivedAt: string | null;
}

export interface AssignmentInput {
  title: string;
  courseId: string;
  dueAt: string;
  weight: number;
  priority: AssignmentPriority | "";
  status: AssignmentStatus;
  progress: number;
  notes: string;
  reminderAt: string;
  /** Achieved score 0-100, null until graded (F-03). */
  score: number | null;
  /** F-01: weekly labs/quizzes shouldn't need one manual entry per week —
   * reuses the same repeat vocabulary as Schedule events. Only read on
   * create; editing an already-materialized occurrence never re-expands it,
   * matching how Schedule's EventForm hides repeat controls on edit. */
  repeat: EventRepeat;
  repeatUntil: string;
}

export const REQUIRED = ["title", "courseId", "dueAt", "weight", "priority"] as const;

export type FieldErrors = Partial<
  Record<
    "title" | "courseId" | "dueAt" | "weight" | "priority" | "progress" | "score" | "repeatUntil",
    string
  >
>;

export function validateAssignment(input: AssignmentInput): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.title.trim()) {
    errors.title = "Title is required.";
  }
  if (!input.courseId) {
    errors.courseId = "Pick a course.";
  }
  if (!input.dueAt) {
    errors.dueAt = "Due date is required.";
  }
  if (input.weight === null || Number.isNaN(input.weight)) {
    errors.weight = "Weight is required.";
  } else if (input.weight < 0 || input.weight > 100) {
    errors.weight = "Weight must be between 0 and 100.";
  }
  if (!input.priority) {
    errors.priority = "Pick a priority.";
  }
  if (input.progress < 0 || input.progress > 100) {
    errors.progress = "Progress must be between 0 and 100.";
  }
  if (input.score !== null && (Number.isNaN(input.score) || input.score < 0 || input.score > 100)) {
    errors.score = "Score must be between 0 and 100.";
  }
  if (input.repeat !== "none") {
    if (!input.repeatUntil) {
      errors.repeatUntil = "Pick when the repeat ends.";
    } else if (input.dueAt) {
      const due = new Date(input.dueAt);
      const until = new Date(input.repeatUntil);
      if (until.getTime() < due.getTime()) {
        errors.repeatUntil = "Repeat end must be after the due date.";
      }
    }
  }

  return errors;
}

/** 0017_assignment_completed_at.sql: `completed_at` is app-owned, not a DB
 * trigger — this is the one place that decides its value on any status
 * transition, called from every code path that can change status
 * (updateAssignment, setAssignmentStatus, createAssignment). Editing a
 * still-done assignment must not bump its completion timestamp back to
 * "now" on every save, so an already-done row keeps its existing value. */
export function completedAtForTransition(
  from: { status: AssignmentStatus; completedAt: string | null },
  toStatus: AssignmentStatus,
  now: Date = new Date(),
): string | null {
  if (toStatus !== "done") return null;
  return from.status === "done" ? from.completedAt : now.toISOString();
}

/** Overdue only applies to work that isn't done and isn't archived. */
export function isOverdue(a: AssignmentLike, now = new Date()): boolean {
  if (a.archivedAt) return false;
  if (a.status === "done") return false;
  return new Date(a.dueAt).getTime() < now.getTime();
}

/** Whole days since the due date passed — minimum 1 for anything overdue. */
export function overdueDays(a: Pick<AssignmentLike, "dueAt">, now = new Date()): number {
  const ms = now.getTime() - new Date(a.dueAt).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000));
}

export function sortByDueDate<T extends Pick<AssignmentLike, "dueAt">>(list: T[]): T[] {
  return [...list].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

/** Text label only — never rely on color alone (BR-01). */
export function statusLabel(a: Pick<AssignmentLike, "status">): string {
  switch (a.status) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
  }
}

export function priorityLabel(a: Pick<AssignmentLike, "priority">): string {
  switch (a.priority) {
    case "high":
      return "High priority";
    case "medium":
      return "Medium priority";
    case "low":
      return "Low priority";
  }
}

/** `Overdue 2d`, distinct from the status/priority tag — BR-01. */
export function overdueLabel(a: AssignmentLike, now = new Date()): string | null {
  if (!isOverdue(a, now)) return null;
  return `Overdue ${overdueDays(a, now)}d`;
}

export type StatusTone = "mint" | "violet" | "neutral";

/** Status pill color — done/in-progress/not-started (BR-01). */
export function statusTone(a: Pick<AssignmentLike, "status">): StatusTone {
  switch (a.status) {
    case "done":
      return "mint";
    case "in_progress":
      return "violet";
    case "not_started":
      return "neutral";
  }
}

export type ProgressTone = "coral" | "tangerine" | "violet" | "muted";

/** Progress bar color per docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 2. */
export function progressTone(a: AssignmentLike, now = new Date()): ProgressTone {
  if (isOverdue(a, now)) return "coral";
  if (a.priority === "high") return "tangerine";
  if (a.status === "in_progress") return "violet";
  return "muted";
}

/** True when `dueAt`'s local calendar day (in `timeZone`) falls within the
 * 7-day window starting today — the Assignments page's definition of "this
 * week" (forward-looking from now, unlike focus.ts's trailing-7-day
 * "week"). Timezone-aware per the UNIPILOT_ASSIGNMENTS_GENZ_DESIGN_BRIEF
 * requirement that day grouping never default to the server's zone. */
export function isDueThisWeek(
  dueAt: string,
  now = new Date(),
  timeZone: string = defaultTimeZone(),
): boolean {
  const todayKey = dayKey(now, timeZone);
  const weekEndKey = shiftDayKey(todayKey, 6);
  const dueKey = dayKey(new Date(dueAt), timeZone);
  return dueKey >= todayKey && dueKey <= weekEndKey;
}

/** True when `dueAt`'s local calendar day (in `timeZone`) is today. Used by
 * the "Today" quick filter — deliberately its own function rather than
 * `isDueThisWeek(...) && ...` so both stay simple, direct day-key compares. */
export function isDueToday(
  dueAt: string,
  now = new Date(),
  timeZone: string = defaultTimeZone(),
): boolean {
  return dayKey(new Date(dueAt), timeZone) === dayKey(now, timeZone);
}

export type AssignmentSection = "attention" | "thisWeek" | "later" | "completed";

/**
 * Priority-bucket for the Assignments page's left column (replaces a flat
 * list — brief §6.3). Only meaningful for non-archived work; callers should
 * filter archived rows out before calling this.
 */
export function sectionForAssignment(
  a: AssignmentLike,
  now = new Date(),
  timeZone: string = defaultTimeZone(),
): AssignmentSection {
  if (a.status === "done") return "completed";

  const overdue = isOverdue(a, now);
  const todayKey = dayKey(now, timeZone);
  const dueSoonKey = shiftDayKey(todayKey, 1);
  const dueKey = dayKey(new Date(a.dueAt), timeZone);
  const dueVerySoon = dueKey <= dueSoonKey;

  if (overdue || (a.priority === "high" && dueVerySoon)) return "attention";
  if (isDueThisWeek(a.dueAt, now, timeZone)) return "thisWeek";
  return "later";
}

/**
 * Deterministic "what should I work on next" pick for Pilo's card (brief
 * §6.4) — pure and unit-testable, no randomness. Only considers active work
 * (not done, not archived) even if the caller passes a mixed list.
 *
 * Tier order:
 *  1. Overdue + high priority (closest to now among these).
 *  2. Overdue, any priority (closest to now).
 *  3. High priority, not yet due (soonest deadline).
 *  4. Soonest deadline overall.
 */
export function pickPiloAssignment<T extends AssignmentLike & { id: string }>(
  list: T[],
  now = new Date(),
): T | null {
  const active = list.filter((a) => !a.archivedAt && a.status !== "done");
  if (active.length === 0) return null;

  const byDueDateDesc = (x: T, y: T) => new Date(y.dueAt).getTime() - new Date(x.dueAt).getTime();

  const overdue = active.filter((a) => isOverdue(a, now));
  const overdueHigh = overdue.filter((a) => a.priority === "high");
  if (overdueHigh.length > 0) return [...overdueHigh].sort(byDueDateDesc)[0];
  if (overdue.length > 0) return [...overdue].sort(byDueDateDesc)[0];

  const upcoming = sortByDueDate(active.filter((a) => !isOverdue(a, now)));
  const upcomingHigh = upcoming.filter((a) => a.priority === "high");
  if (upcomingHigh.length > 0) return upcomingHigh[0];

  return upcoming[0] ?? null;
}

/**
 * Human-readable "when is this due" phrase for Pilo's recommendation copy
 * ("…it's due **today**"). Shared by Assignments' Pilo's-pick card and the
 * Dashboard's daily briefing so the same assignment is never described two
 * different ways on two screens.
 */
export function relativeDueLabel(dueAt: string, now = new Date()): string {
  const diffHours = (new Date(dueAt).getTime() - now.getTime()) / 3_600_000;
  if (diffHours < -1) {
    const days = Math.max(1, Math.round(Math.abs(diffHours) / 24));
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (diffHours <= 1) return "any moment now";
  if (diffHours < 24) return "today";
  const days = Math.round(diffHours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export interface QuickWinLike {
  id: string;
  progress: number;
  status: AssignmentStatus;
  archivedAt: string | null;
  dueAt: string;
}

/** Below this, an assignment reads as "started" rather than "almost done" —
 * not a hard spec number, just where "quick win" stops being an honest
 * description of the remaining work. */
export const QUICK_WIN_PROGRESS_THRESHOLD = 60;

/**
 * "Quick wins" (concept §6.6) — this app has no per-assignment effort or
 * duration estimate, so ranking by "which one is fastest" the way the
 * concept's copy ("Skim slides — 30 min") implies isn't something this data
 * can answer honestly (see the AssignmentQuickActions.tsx comment this
 * feature was previously left out in favor of). What the data *can* say
 * honestly: which active assignments are already mostly done, from the
 * viewer's own progress field — those are genuinely the closest to a quick
 * finish. Ties broken by soonest due date.
 */
export function deriveQuickWins<T extends QuickWinLike>(list: T[], limit = 3): T[] {
  return [...list]
    .filter(
      (a) => !a.archivedAt && a.status !== "done" && a.progress >= QUICK_WIN_PROGRESS_THRESHOLD,
    )
    .sort(
      (a, b) =>
        b.progress - a.progress || new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    )
    .slice(0, limit);
}
