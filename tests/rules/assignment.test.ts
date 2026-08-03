import { describe, expect, it } from "vitest";
import {
  completedAtForTransition,
  isDueThisWeek,
  isDueToday,
  isOverdue,
  overdueDays,
  overdueLabel,
  pickPiloAssignment,
  priorityLabel,
  progressTone,
  sectionForAssignment,
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
  repeat: "none",
  repeatUntil: "",
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

  it("requires repeatUntil when repeat isn't none", () => {
    expect(
      validateAssignment({ ...baseInput, repeat: "weekly", repeatUntil: "" }).repeatUntil,
    ).toBeDefined();
    expect(
      validateAssignment({ ...baseInput, repeat: "weekly", repeatUntil: "2026-09-01" })
        .repeatUntil,
    ).toBeUndefined();
  });

  it("rejects a repeatUntil before the due date", () => {
    expect(
      validateAssignment({ ...baseInput, repeat: "weekly", repeatUntil: "2026-01-01" })
        .repeatUntil,
    ).toBeDefined();
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

// UNIPILOT_ASSIGNMENTS_GENZ_DESIGN_BRIEF.md §13: timezone-aware day
// grouping, pinned to a fixed UTC instant so these stay deterministic
// regardless of the machine running the suite.
describe("isDueToday / isDueThisWeek", () => {
  const now = new Date("2026-07-29T12:00:00.000Z"); // Wed in UTC and in America/New_York

  it("isDueToday is true only for the same local calendar day", () => {
    expect(isDueToday("2026-07-29T23:00:00.000Z", now, "UTC")).toBe(true);
    expect(isDueToday("2026-07-29T01:00:00.000Z", now, "UTC")).toBe(true);
    expect(isDueToday("2026-07-30T00:00:00.000Z", now, "UTC")).toBe(false);
    expect(isDueToday("2026-07-28T23:59:00.000Z", now, "UTC")).toBe(false);
  });

  it("isDueToday respects the viewer's timezone, not the server's", () => {
    // 2026-07-30T02:00 UTC is still 2026-07-29 evening in America/New_York.
    expect(isDueToday("2026-07-30T02:00:00.000Z", now, "America/New_York")).toBe(true);
    expect(isDueToday("2026-07-30T02:00:00.000Z", now, "UTC")).toBe(false);
  });

  it("isDueThisWeek covers today through 6 days out, not before or after", () => {
    expect(isDueThisWeek("2026-07-29T23:00:00.000Z", now, "UTC")).toBe(true);
    expect(isDueThisWeek("2026-08-04T12:00:00.000Z", now, "UTC")).toBe(true);
    expect(isDueThisWeek("2026-08-05T00:00:00.000Z", now, "UTC")).toBe(false);
    expect(isDueThisWeek("2026-07-28T23:59:00.000Z", now, "UTC")).toBe(false);
  });
});

describe("sectionForAssignment", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("buckets a done assignment as completed regardless of due date", () => {
    expect(
      sectionForAssignment(
        { dueAt: "2026-07-01T00:00:00.000Z", status: "done", priority: "low", archivedAt: null },
        now,
        "UTC",
      ),
    ).toBe("completed");
  });

  it("buckets overdue work as needing attention", () => {
    expect(
      sectionForAssignment(
        {
          dueAt: "2026-07-27T00:00:00.000Z",
          status: "in_progress",
          priority: "low",
          archivedAt: null,
        },
        now,
        "UTC",
      ),
    ).toBe("attention");
  });

  it("buckets high priority due today/tomorrow as needing attention even if not overdue", () => {
    expect(
      sectionForAssignment(
        {
          dueAt: "2026-07-30T08:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
        now,
        "UTC",
      ),
    ).toBe("attention");
  });

  it("does not flag a high priority item due later this week as attention", () => {
    expect(
      sectionForAssignment(
        {
          dueAt: "2026-08-02T08:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
        now,
        "UTC",
      ),
    ).toBe("thisWeek");
  });

  it("buckets a non-urgent item due this week as thisWeek", () => {
    expect(
      sectionForAssignment(
        {
          dueAt: "2026-08-01T08:00:00.000Z",
          status: "not_started",
          priority: "low",
          archivedAt: null,
        },
        now,
        "UTC",
      ),
    ).toBe("thisWeek");
  });

  it("buckets everything further out as later", () => {
    expect(
      sectionForAssignment(
        {
          dueAt: "2026-09-01T00:00:00.000Z",
          status: "not_started",
          priority: "low",
          archivedAt: null,
        },
        now,
        "UTC",
      ),
    ).toBe("later");
  });
});

describe("completedAtForTransition", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("sets completed_at to now when transitioning into done", () => {
    expect(
      completedAtForTransition({ status: "in_progress", completedAt: null }, "done", now),
    ).toBe(now.toISOString());
  });

  it("keeps the existing completed_at when already done and staying done", () => {
    const existing = "2026-07-20T00:00:00.000Z";
    expect(
      completedAtForTransition({ status: "done", completedAt: existing }, "done", now),
    ).toBe(existing);
  });

  it("clears completed_at when transitioning away from done", () => {
    expect(
      completedAtForTransition({ status: "done", completedAt: "2026-07-20T00:00:00.000Z" }, "in_progress", now),
    ).toBeNull();
  });

  it("stays null for a transition between two non-done statuses", () => {
    expect(
      completedAtForTransition({ status: "not_started", completedAt: null }, "in_progress", now),
    ).toBeNull();
  });
});

describe("pickPiloAssignment", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("returns null for an empty or all-inactive list", () => {
    expect(pickPiloAssignment([], now)).toBeNull();
    expect(
      pickPiloAssignment(
        [
          {
            id: "a",
            dueAt: "2026-07-01T00:00:00.000Z",
            status: "done",
            priority: "high",
            archivedAt: null,
          },
          {
            id: "b",
            dueAt: "2026-07-01T00:00:00.000Z",
            status: "not_started",
            priority: "low",
            archivedAt: "2026-07-02T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toBeNull();
  });

  it("tier 1: prefers overdue + high priority over everything else", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "overdue-low",
          dueAt: "2026-07-20T00:00:00.000Z",
          status: "in_progress",
          priority: "low",
          archivedAt: null,
        },
        {
          id: "overdue-high",
          dueAt: "2026-07-25T00:00:00.000Z",
          status: "in_progress",
          priority: "high",
          archivedAt: null,
        },
        {
          id: "upcoming-high",
          dueAt: "2026-07-30T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("overdue-high");
  });

  it("tier 2: among overdue-high ties, picks the one closest to now", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "overdue-high-old",
          dueAt: "2026-07-10T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
        {
          id: "overdue-high-recent",
          dueAt: "2026-07-28T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("overdue-high-recent");
  });

  it("tier 2: falls back to any overdue item when none are high priority", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "overdue-medium",
          dueAt: "2026-07-27T00:00:00.000Z",
          status: "in_progress",
          priority: "medium",
          archivedAt: null,
        },
        {
          id: "upcoming-high",
          dueAt: "2026-08-01T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("overdue-medium");
  });

  it("tier 3: with nothing overdue, prefers the soonest high priority item", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "soon-low",
          dueAt: "2026-07-30T00:00:00.000Z",
          status: "not_started",
          priority: "low",
          archivedAt: null,
        },
        {
          id: "later-high",
          dueAt: "2026-08-05T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("later-high");
  });

  it("tier 4: falls back to the nearest deadline overall", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "soonest",
          dueAt: "2026-07-30T00:00:00.000Z",
          status: "not_started",
          priority: "low",
          archivedAt: null,
        },
        {
          id: "later",
          dueAt: "2026-08-05T00:00:00.000Z",
          status: "in_progress",
          priority: "medium",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("soonest");
  });

  it("ignores done and archived rows even in a mixed list", () => {
    const pick = pickPiloAssignment(
      [
        {
          id: "done-high",
          dueAt: "2026-07-25T00:00:00.000Z",
          status: "done",
          priority: "high",
          archivedAt: null,
        },
        {
          id: "archived-overdue",
          dueAt: "2026-07-25T00:00:00.000Z",
          status: "not_started",
          priority: "high",
          archivedAt: "2026-07-26T00:00:00.000Z",
        },
        {
          id: "real-pick",
          dueAt: "2026-08-01T00:00:00.000Z",
          status: "not_started",
          priority: "low",
          archivedAt: null,
        },
      ],
      now,
    );
    expect(pick?.id).toBe("real-pick");
  });
});
