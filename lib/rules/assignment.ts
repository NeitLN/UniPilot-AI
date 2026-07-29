// BR-01 — assignment validation, overdue/priority labelling, sort order.
// Imported by both the client form and the server action so the rule is
// defined exactly once (docs/UniPilot/UniPilot_AI_ROADMAP.md §1 principle 3).
import type {
  AssignmentPriority,
  AssignmentStatus,
} from "@/lib/supabase/types";

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
}

export const REQUIRED = [
  "title",
  "courseId",
  "dueAt",
  "weight",
  "priority",
] as const;

export type FieldErrors = Partial<
  Record<"title" | "courseId" | "dueAt" | "weight" | "priority" | "progress", string>
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

  return errors;
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

export function sortByDueDate<T extends Pick<AssignmentLike, "dueAt">>(
  list: T[],
): T[] {
  return [...list].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
  );
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

export type ProgressTone = "coral" | "tangerine" | "violet" | "muted";

/** Progress bar color per docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 2. */
export function progressTone(a: AssignmentLike, now = new Date()): ProgressTone {
  if (isOverdue(a, now)) return "coral";
  if (a.priority === "high") return "tangerine";
  if (a.status === "in_progress") return "violet";
  return "muted";
}
