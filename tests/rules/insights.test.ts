import { describe, expect, it } from "vitest";
import {
  weekOverWeek,
  deriveStudyInsight,
  deriveWeeklyWin,
  dailyMinutesForWeek,
  planAdherence,
  type CourseStudyLoad,
} from "@/lib/rules/insights";

describe("dailyMinutesForWeek", () => {
  it("returns 7 days starting Monday, zero-filled", () => {
    const days = dailyMinutesForWeek([], "2026-08-03", "UTC");
    expect(days).toHaveLength(7);
    expect(days[0].dayKey).toBe("2026-08-03");
    expect(days[6].dayKey).toBe("2026-08-09");
    expect(days.every((d) => d.minutes === 0)).toBe(true);
  });

  it("buckets sessions onto the right day and ignores sessions outside the week", () => {
    const days = dailyMinutesForWeek(
      [
        { startedAt: "2026-08-04T09:00:00.000Z", durationSeconds: 1500 },
        { startedAt: "2026-08-20T09:00:00.000Z", durationSeconds: 1500 }, // outside this week
      ],
      "2026-08-03",
      "UTC",
    );
    expect(days.find((d) => d.dayKey === "2026-08-04")?.minutes).toBe(25);
    expect(days.reduce((s, d) => s + d.minutes, 0)).toBe(25);
  });
});

describe("deriveWeeklyWin", () => {
  it("prioritizes an early completion above everything else", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [{ title: "SRS Report", daysEarly: 2 }],
      currentStreak: 10,
      dailyMinutes: [{ dayKey: "2026-08-03", label: "Mon", minutes: 500 }],
      planAdherencePct: 1,
    });
    expect(win?.kind).toBe("early_completion");
    expect(win?.message).toContain("SRS Report");
  });

  it("falls back to a meaningful streak when nothing was completed early", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [],
      currentStreak: 5,
      dailyMinutes: [],
      planAdherencePct: null,
    });
    expect(win?.kind).toBe("streak");
  });

  it("does not treat a 1-2 day streak as win-worthy", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [],
      currentStreak: 2,
      dailyMinutes: [{ dayKey: "2026-08-03", label: "Mon", minutes: 50 }],
      planAdherencePct: null,
    });
    expect(win?.kind).toBe("top_day");
  });

  it("falls back to the strongest day when there's no early completion or streak", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [],
      currentStreak: 0,
      dailyMinutes: [
        { dayKey: "2026-08-03", label: "Mon", minutes: 30 },
        { dayKey: "2026-08-04", label: "Tue", minutes: 90 },
      ],
      planAdherencePct: null,
    });
    expect(win?.kind).toBe("top_day");
    expect(win?.message).toContain("Tue");
  });

  it("falls back to plan adherence when no daily minutes exist", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [],
      currentStreak: 0,
      dailyMinutes: [],
      planAdherencePct: 0.9,
    });
    expect(win?.kind).toBe("plan_adherence");
  });

  it("returns null for a genuinely quiet week", () => {
    const win = deriveWeeklyWin({
      earlyCompletions: [],
      currentStreak: 0,
      dailyMinutes: [],
      planAdherencePct: null,
    });
    expect(win).toBeNull();
  });
});

describe("weekOverWeek", () => {
  it("reports up when current exceeds previous", () => {
    const r = weekOverWeek(120, 90);
    expect(r).toEqual({ current: 120, previous: 90, delta: 30, direction: "up" });
  });

  it("reports down when current is below previous", () => {
    const r = weekOverWeek(60, 90);
    expect(r.direction).toBe("down");
    expect(r.delta).toBe(-30);
  });

  it("reports flat when unchanged", () => {
    expect(weekOverWeek(3.46, 3.46).direction).toBe("flat");
  });

  it("rounds the delta to 2 decimals (GPA-style inputs)", () => {
    const r = weekOverWeek(3.464, 3.41);
    expect(r.delta).toBe(0.05);
  });
});

describe("deriveStudyInsight", () => {
  it("returns null with fewer than 2 courses", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "a", courseName: "A", minutes: 10, nextDueInDays: 1 },
    ];
    expect(deriveStudyInsight(courses)).toBeNull();
  });

  it("returns null when no course has an upcoming deadline", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "a", courseName: "A", minutes: 150, nextDueInDays: null },
      { courseId: "b", courseName: "B", minutes: 25, nextDueInDays: null },
    ];
    expect(deriveStudyInsight(courses)).toBeNull();
  });

  it("flags the most-studied course vs. the most urgent one, matching the review's example shape", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "req", courseName: "Requirements Engineering", minutes: 150, nextDueInDays: 14 },
      { courseId: "test", courseName: "Software Testing", minutes: 25, nextDueInDays: 6 },
    ];
    const insight = deriveStudyInsight(courses);
    expect(insight).toContain("150 min");
    expect(insight).toContain("Requirements Engineering");
    expect(insight).toContain("25 min");
    expect(insight).toContain("Software Testing");
    expect(insight).toContain("in 6 days");
  });

  it("says 'today' for a deadline that's already due", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "a", courseName: "A", minutes: 100, nextDueInDays: 10 },
      { courseId: "b", courseName: "B", minutes: 0, nextDueInDays: 0 },
    ];
    expect(deriveStudyInsight(courses)).toContain("due today");
  });

  it("returns null when the most-urgent course is also the most-studied one — nothing neglected", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "a", courseName: "A", minutes: 150, nextDueInDays: 2 },
      { courseId: "b", courseName: "B", minutes: 25, nextDueInDays: 20 },
    ];
    expect(deriveStudyInsight(courses)).toBeNull();
  });

  it("returns null when the urgent course actually got at least as much time", () => {
    const courses: CourseStudyLoad[] = [
      { courseId: "a", courseName: "A", minutes: 50, nextDueInDays: 10 },
      { courseId: "b", courseName: "B", minutes: 80, nextDueInDays: 2 },
    ];
    expect(deriveStudyInsight(courses)).toBeNull();
  });
});

describe("planAdherence", () => {
  const timeZone = "UTC";

  it("returns null when nothing has elapsed yet", () => {
    const now = new Date("2026-07-20T08:00:00Z");
    const planned = [{ startAt: "2026-07-21T09:00:00Z" }];
    expect(planAdherence(planned, new Set(), { now, timeZone })).toBeNull();
  });

  it("counts a planned session as kept when a completed focus session lands the same day", () => {
    const now = new Date("2026-07-20T20:00:00Z");
    const planned = [{ startAt: "2026-07-20T09:00:00Z" }];
    const completedDays = new Set(["2026-07-20"]);
    expect(planAdherence(planned, completedDays, { now, timeZone })).toBe(1);
  });

  it("computes a fractional rate across mixed kept/missed sessions", () => {
    const now = new Date("2026-07-22T20:00:00Z");
    const planned = [
      { startAt: "2026-07-20T09:00:00Z" }, // kept
      { startAt: "2026-07-21T09:00:00Z" }, // missed
      { startAt: "2026-07-22T09:00:00Z" }, // kept
    ];
    const completedDays = new Set(["2026-07-20", "2026-07-22"]);
    expect(planAdherence(planned, completedDays, { now, timeZone })).toBeCloseTo(0.67, 2);
  });

  it("ignores planned sessions that haven't happened yet", () => {
    const now = new Date("2026-07-20T20:00:00Z");
    const planned = [
      { startAt: "2026-07-20T09:00:00Z" }, // elapsed, kept
      { startAt: "2026-07-25T09:00:00Z" }, // future — not counted
    ];
    const completedDays = new Set(["2026-07-20"]);
    expect(planAdherence(planned, completedDays, { now, timeZone })).toBe(1);
  });
});
