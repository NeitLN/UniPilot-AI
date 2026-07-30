import { describe, expect, it } from "vitest";
import {
  isOverdue,
  overdueDays,
  overdueLabel,
  priorityLabel,
  progressTone,
  sortByDueDate,
  statusLabel,
  validateAssignment,
  type AssignmentInput,
} from "@/lib/rules/assignment";

const baseInput: AssignmentInput = {
  title: "Essay draft",
  courseId: "course-1",
  dueAt: "2026-08-01T00:00:00.000Z",
  weight: 20,
  priority: "high",
  status: "not_started",
  progress: 0,
  notes: "",
  reminderAt: "",
  score: null,
};

describe("validateAssignment", () => {
  it("passes for fully valid input", () => {
    expect(validateAssignment(baseInput)).toEqual({});
  });

  it("flags every missing required field", () => {
    const errors = validateAssignment({
      ...baseInput,
      title: "  ",
      courseId: "",
      dueAt: "",
      priority: "",
    });
    expect(errors.title).toBeDefined();
    expect(errors.courseId).toBeDefined();
    expect(errors.dueAt).toBeDefined();
    expect(errors.priority).toBeDefined();
  });

  it("rejects weight outside 0-100", () => {
    expect(validateAssignment({ ...baseInput, weight: 101 }).weight).toBeDefined();
    expect(validateAssignment({ ...baseInput, weight: -1 }).weight).toBeDefined();
    expect(validateAssignment({ ...baseInput, weight: 0 }).weight).toBeUndefined();
    expect(validateAssignment({ ...baseInput, weight: 100 }).weight).toBeUndefined();
  });

  it("rejects progress outside 0-100", () => {
    expect(validateAssignment({ ...baseInput, progress: 101 }).progress).toBeDefined();
    expect(validateAssignment({ ...baseInput, progress: -1 }).progress).toBeDefined();
    expect(validateAssignment({ ...baseInput, progress: 100 }).progress).toBeUndefined();
  });

  it("allows a null score (not graded yet)", () => {
    expect(validateAssignment({ ...baseInput, score: null }).score).toBeUndefined();
  });

  it("rejects score outside 0-100 but accepts the boundaries", () => {
    expect(validateAssignment({ ...baseInput, score: 101 }).score).toBeDefined();
    expect(validateAssignment({ ...baseInput, score: -1 }).score).toBeDefined();
    expect(validateAssignment({ ...baseInput, score: 0 }).score).toBeUndefined();
    expect(validateAssignment({ ...baseInput, score: 100 }).score).toBeUndefined();
  });
});

describe("isOverdue / overdueDays / overdueLabel", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("is true for a past due date that isn't done or archived", () => {
    const a = {
      dueAt: "2026-07-27T00:00:00.000Z",
      status: "in_progress" as const,
      priority: "medium" as const,
      archivedAt: null,
    };
    expect(isOverdue(a, now)).toBe(true);
    expect(overdueDays(a, now)).toBe(2);
    expect(overdueLabel(a, now)).toBe("Overdue 2d");
  });

  it("is false once status is done, even past due", () => {
    const a = {
      dueAt: "2026-07-27T00:00:00.000Z",
      status: "done" as const,
      priority: "medium" as const,
      archivedAt: null,
    };
    expect(isOverdue(a, now)).toBe(false);
    expect(overdueLabel(a, now)).toBeNull();
  });

  it("is false once archived, even past due", () => {
    const a = {
      dueAt: "2026-07-27T00:00:00.000Z",
      status: "not_started" as const,
      priority: "medium" as const,
      archivedAt: "2026-07-28T00:00:00.000Z",
    };
    expect(isOverdue(a, now)).toBe(false);
  });

  it("is false for a future due date", () => {
    const a = {
      dueAt: "2026-08-01T00:00:00.000Z",
      status: "not_started" as const,
      priority: "medium" as const,
      archivedAt: null,
    };
    expect(isOverdue(a, now)).toBe(false);
  });
});

describe("sortByDueDate", () => {
  it("sorts ascending without mutating the input array", () => {
    const list = [
      { dueAt: "2026-08-05T00:00:00.000Z" },
      { dueAt: "2026-07-30T00:00:00.000Z" },
      { dueAt: "2026-08-01T00:00:00.000Z" },
    ];
    const sorted = sortByDueDate(list);
    expect(sorted.map((a) => a.dueAt)).toEqual([
      "2026-07-30T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
      "2026-08-05T00:00:00.000Z",
    ]);
    expect(list[0].dueAt).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("statusLabel / priorityLabel", () => {
  it("returns human text, not raw enum values", () => {
    expect(statusLabel({ status: "not_started" })).toBe("Not started");
    expect(statusLabel({ status: "in_progress" })).toBe("In progress");
    expect(statusLabel({ status: "done" })).toBe("Done");
    expect(priorityLabel({ priority: "high" })).toBe("High priority");
    expect(priorityLabel({ priority: "medium" })).toBe("Medium priority");
    expect(priorityLabel({ priority: "low" })).toBe("Low priority");
  });
});

describe("progressTone", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("prioritizes overdue over priority/status", () => {
    const a = {
      dueAt: "2026-07-27T00:00:00.000Z",
      status: "in_progress" as const,
      priority: "high" as const,
      archivedAt: null,
    };
    expect(progressTone(a, now)).toBe("coral");
  });

  it("falls back to tangerine for high priority when not overdue", () => {
    const a = {
      dueAt: "2026-08-01T00:00:00.000Z",
      status: "not_started" as const,
      priority: "high" as const,
      archivedAt: null,
    };
    expect(progressTone(a, now)).toBe("tangerine");
  });

  it("falls back to violet for in-progress, medium/low priority", () => {
    const a = {
      dueAt: "2026-08-01T00:00:00.000Z",
      status: "in_progress" as const,
      priority: "low" as const,
      archivedAt: null,
    };
    expect(progressTone(a, now)).toBe("violet");
  });

  it("falls back to muted for not-started, medium/low priority", () => {
    const a = {
      dueAt: "2026-08-01T00:00:00.000Z",
      status: "not_started" as const,
      priority: "low" as const,
      archivedAt: null,
    };
    expect(progressTone(a, now)).toBe("muted");
  });
});
