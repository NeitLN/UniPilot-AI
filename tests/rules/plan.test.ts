import { describe, expect, it } from "vitest";
import {
  buildSessionReminders,
  canGeneratePlan,
  computePlanProgress,
  validateSessions,
  type StudySessionCandidate,
} from "@/lib/rules/plan";

describe("canGeneratePlan", () => {
  it("blocks when availability is 0", () => {
    const result = canGeneratePlan({
      weeklyAvailabilityHours: 0,
      pendingAssignmentCount: 3,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/availability/i);
  });

  it("blocks when there are no pending assignments", () => {
    const result = canGeneratePlan({
      weeklyAvailabilityHours: 10,
      pendingAssignmentCount: 0,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/assignment/i);
  });

  it("reports both reasons when both are missing", () => {
    const result = canGeneratePlan({
      weeklyAvailabilityHours: 0,
      pendingAssignmentCount: 0,
    });
    expect(result.reasons).toHaveLength(2);
  });

  it("allows generation when both conditions are met", () => {
    const result = canGeneratePlan({
      weeklyAvailabilityHours: 10,
      pendingAssignmentCount: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});

describe("validateSessions", () => {
  const dueAt = { a1: "2026-08-05T23:59:00.000Z" };

  it("accepts a session that fits cleanly", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-01T09:00:00.000Z",
        endAt: "2026-08-01T10:00:00.000Z",
      },
    ];
    const [result] = validateSessions({
      sessions,
      classBlocks: [],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a session overlapping a class block", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-01T09:00:00.000Z",
        endAt: "2026-08-01T10:00:00.000Z",
      },
    ];
    const [result] = validateSessions({
      sessions,
      classBlocks: [{ startAt: "2026-08-01T09:30:00.000Z", endAt: "2026-08-01T11:00:00.000Z" }],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    expect(result.valid).toBe(false);
    expect(result.violation).toMatch(/overlaps/i);
  });

  it("rejects two proposed sessions that overlap each other, keeping the earlier one", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-01T10:00:00.000Z",
        endAt: "2026-08-01T11:00:00.000Z",
      },
      {
        assignmentId: "a1",
        startAt: "2026-08-01T09:30:00.000Z",
        endAt: "2026-08-01T10:30:00.000Z",
      },
    ];
    const results = validateSessions({
      sessions,
      classBlocks: [],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    // Sorted by start time: 09:30 session is processed first and wins.
    const earlier = results.find((r) => r.startAt === "2026-08-01T09:30:00.000Z")!;
    const later = results.find((r) => r.startAt === "2026-08-01T10:00:00.000Z")!;
    expect(earlier.valid).toBe(true);
    expect(later.valid).toBe(false);
  });

  it("rejects a session scheduled after the assignment's due date", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-06T09:00:00.000Z",
        endAt: "2026-08-06T10:00:00.000Z",
      },
    ];
    const [result] = validateSessions({
      sessions,
      classBlocks: [],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    expect(result.valid).toBe(false);
    expect(result.violation).toMatch(/due date/i);
  });

  it("rejects a session that would exceed the day's availability", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T10:00:00.000Z",
      }, // 2h
      {
        assignmentId: "a1",
        startAt: "2026-08-01T11:00:00.000Z",
        endAt: "2026-08-01T14:00:00.000Z",
      }, // 3h -> total 5h > 4h cap
    ];
    const results = validateSessions({
      sessions,
      classBlocks: [],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
    expect(results[1].violation).toMatch(/available hours/i);
  });

  it("rejects an inverted time range", () => {
    const sessions: StudySessionCandidate[] = [
      {
        assignmentId: "a1",
        startAt: "2026-08-01T10:00:00.000Z",
        endAt: "2026-08-01T09:00:00.000Z",
      },
    ];
    const [result] = validateSessions({
      sessions,
      classBlocks: [],
      assignmentDueAt: dueAt,
      dailyAvailabilityHours: 4,
    });
    expect(result.valid).toBe(false);
  });
});

describe("computePlanProgress", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("is 'empty' with no sessions at all", () => {
    const result = computePlanProgress([], now);
    expect(result).toEqual({ lifecycle: "empty", pastCount: 0, totalCount: 0 });
  });

  it("is 'active' when at least one session is still upcoming", () => {
    const result = computePlanProgress(
      [
        { startAt: "2026-07-30T09:00:00.000Z" }, // past
        { startAt: "2026-08-01T09:00:00.000Z" }, // upcoming
      ],
      now,
    );
    expect(result).toEqual({ lifecycle: "active", pastCount: 1, totalCount: 2 });
  });

  it("is 'ended' once every session's startAt is in the past — QA4-03", () => {
    const result = computePlanProgress(
      [
        { startAt: "2026-07-26T15:00:00.000Z" },
        { startAt: "2026-07-27T10:00:00.000Z" },
        { startAt: "2026-07-30T10:00:00.000Z" },
      ],
      now,
    );
    expect(result).toEqual({ lifecycle: "ended", pastCount: 3, totalCount: 3 });
  });

  it("is 'active' when every session is still upcoming", () => {
    const result = computePlanProgress(
      [{ startAt: "2026-08-01T09:00:00.000Z" }, { startAt: "2026-08-02T09:00:00.000Z" }],
      now,
    );
    expect(result).toEqual({ lifecycle: "active", pastCount: 0, totalCount: 2 });
  });

  it("treats a session starting exactly at `now` as not yet past", () => {
    const result = computePlanProgress([{ startAt: now.toISOString() }], now);
    expect(result.pastCount).toBe(0);
    expect(result.lifecycle).toBe("active");
  });
});

describe("buildSessionReminders", () => {
  it("builds one reminder draft per session", () => {
    const drafts = buildSessionReminders([
      { assignmentTitle: "Essay draft", startAt: "2026-08-01T09:00:00.000Z" },
    ]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      kind: "study_session",
      scheduledAt: "2026-08-01T09:00:00.000Z",
    });
    expect(drafts[0].title).toContain("Essay draft");
  });
});
