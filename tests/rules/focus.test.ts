import { describe, expect, it } from "vitest";
import {
  activityTone,
  breakKindForCycle,
  chartAxisTicks,
  classify,
  completedCyclesToday,
  dailyActivity,
  formatMinutes,
  streakDays,
  weeklyStats,
  weeklyMinutesSeries,
  validateManualSession,
  ORPHANED_SESSION_KEY,
  MAX_MANUAL_SESSION_MINUTES,
  POMODORO_SECONDS,
  type FocusSessionLike,
} from "@/lib/rules/focus";

describe("classify", () => {
  it("classifies a full 25:00 as completed", () => {
    expect(classify(POMODORO_SECONDS)).toBe("completed");
  });

  it("classifies anything over 25:00 as completed", () => {
    expect(classify(POMODORO_SECONDS + 5)).toBe("completed");
  });

  it("classifies 24:59 as partial, not completed — and it must not raise the streak", () => {
    expect(classify(POMODORO_SECONDS - 1)).toBe("partial");
  });

  it("classifies 0 seconds as partial", () => {
    expect(classify(0)).toBe("partial");
  });

  it("classifies against a variable target duration (45/60 min sessions)", () => {
    const FORTY_FIVE_MIN = 45 * 60;
    // Stopped at 30:00 during a chosen 45-min session — must not read as
    // "completed" just because it beats the old fixed 25:00 default.
    expect(classify(30 * 60, FORTY_FIVE_MIN)).toBe("partial");
    expect(classify(FORTY_FIVE_MIN, FORTY_FIVE_MIN)).toBe("completed");
  });
});

describe("dailyActivity / activityTone / completedCyclesToday", () => {
  const now = new Date("2026-08-03T12:00:00.000Z"); // Monday

  function session(startedAt: string, result: "completed" | "partial", minutes = 25): FocusSessionLike {
    return { assignmentId: "a1", startedAt, durationSeconds: minutes * 60, result };
  }

  it("returns one bucket per day, oldest first, today last", () => {
    const days = dailyActivity([], now, "UTC", 7);
    expect(days).toHaveLength(7);
    expect(days[6].dayKey).toBe("2026-08-03");
    expect(days[0].dayKey).toBe("2026-07-28");
  });

  it("tallies completed cycles and minutes per day", () => {
    const sessions = [
      session("2026-08-03T09:00:00.000Z", "completed"),
      session("2026-08-03T14:00:00.000Z", "partial", 10),
      session("2026-08-02T09:00:00.000Z", "completed"),
    ];
    const days = dailyActivity(sessions, now, "UTC", 7);
    const today = days.find((d) => d.dayKey === "2026-08-03")!;
    expect(today.completedCycles).toBe(1);
    expect(today.minutes).toBe(35);
    const yesterday = days.find((d) => d.dayKey === "2026-08-02")!;
    expect(yesterday.completedCycles).toBe(1);
  });

  it("activityTone is relative to the viewer's own goal, not an absolute count", () => {
    expect(activityTone(0, 4)).toBe("rest");
    expect(activityTone(1, 4)).toBe("light"); // under half
    expect(activityTone(2, 4)).toBe("good"); // half
    expect(activityTone(4, 4)).toBe("great"); // met goal
    expect(activityTone(6, 4)).toBe("heavy"); // 1.5x goal
  });

  it("activityTone falls back sanely when no real goal is set", () => {
    expect(activityTone(0, 0)).toBe("rest");
    expect(activityTone(2, 0)).toBe("good");
  });

  it("completedCyclesToday counts only completed sessions on the viewer's today", () => {
    const sessions = [
      session("2026-08-03T09:00:00.000Z", "completed"),
      session("2026-08-03T10:00:00.000Z", "partial"),
      session("2026-08-02T09:00:00.000Z", "completed"),
    ];
    expect(completedCyclesToday(sessions, now, "UTC")).toBe(1);
  });
});

describe("streakDays", () => {
  const today = new Date(2026, 6, 29); // Wed

  it("is 0 with no completed sessions", () => {
    expect(streakDays([], { today })).toBe(0);
  });

  it("only counts completed sessions, not partial", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "partial" },
    ];
    expect(streakDays(sessions, { today })).toBe(0);
  });

  it("counts consecutive days including today", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 28).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, { today })).toBe(3);
  });

  it("doesn't break the streak just because today has no session yet", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 28).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, { today })).toBe(2);
  });

  it("stops at the first gap", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "completed" },
      // gap on the 28th
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, { today })).toBe(1);
  });
});

describe("weeklyStats", () => {
  const now = new Date(2026, 6, 29, 12);

  it("tallies completed vs partial cycles and minutes", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 600, result: "partial" },
      { assignmentId: "a2", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.completedCycles).toBe(2);
    expect(stats.partialSessions).toBe(1);
    expect(stats.completedMinutes).toBe(50);
    expect(stats.partialMinutes).toBe(10);
    expect(stats.minutesByAssignment).toEqual({ a1: 35, a2: 25 });
  });

  it("keeps sub-minute partial time fractional instead of rounding it to 0 (B-02)", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 45, result: "partial" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.partialMinutes).toBeCloseTo(0.75);
    expect(stats.minutesByAssignment.a1).toBeCloseTo(0.75);
  });

  it("excludes sessions older than 7 days", () => {
    const sessions: FocusSessionLike[] = [
      {
        assignmentId: "a1",
        startedAt: new Date(2026, 6, 10).toISOString(),
        durationSeconds: 1500,
        result: "completed",
      },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.completedCycles).toBe(0);
  });

  // Phase 4.1 (docs/IMPLEMENTATION_PLAN.md): a session whose assignment was
  // later deleted has assignmentId: null (migration 0012's ON DELETE SET
  // NULL, replacing the old cascade-delete) — it must still count toward
  // cycles/minutes exactly like any other session, just grouped under a
  // sentinel key instead of a real assignment id.
  it("still counts an orphaned session (assignmentId: null) toward cycles and minutes", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: null, startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.completedCycles).toBe(2);
    expect(stats.completedMinutes).toBe(50);
    expect(stats.minutesByAssignment).toEqual({ [ORPHANED_SESSION_KEY]: 25, a1: 25 });
  });

  it("merges multiple orphaned sessions under the same sentinel key", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: null, startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
      { assignmentId: null, startedAt: now.toISOString(), durationSeconds: 300, result: "partial" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.minutesByAssignment[ORPHANED_SESSION_KEY]).toBe(30);
  });

  // FR-22 (docs/PRODUCT_REVIEW.md): a manually logged session counts
  // exactly like a timer one everywhere else (cycles, minutes, streak) —
  // manualMinutes exists purely so the UI can *also* disclose the split,
  // not to treat manual entries differently in any of the other totals.
  it("tracks manualMinutes for source: 'manual' sessions, on top of the normal totals", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed", source: "manual" },
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed", source: "timer" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.completedCycles).toBe(2);
    expect(stats.completedMinutes).toBe(50);
    expect(stats.manualMinutes).toBe(25);
  });

  it("treats a session with no source at all the same as 'timer' — manualMinutes stays 0", () => {
    const sessions: FocusSessionLike[] = [
      { assignmentId: "a1", startedAt: now.toISOString(), durationSeconds: 1500, result: "completed" },
    ];
    const stats = weeklyStats(sessions, { now });
    expect(stats.manualMinutes).toBe(0);
  });
});

describe("streakDays timezone handling", () => {
  // A session at 11:30pm PST on July 28 is 06:30/07:30 UTC on July 29 — a
  // server bucketing by its own (e.g. UTC) local time would misfile it as
  // the 29th for a Pacific user, breaking a streak they experienced as
  // consecutive. Passing the viewer's IANA zone must bucket it as the 28th.
  const lateNightPacific = new Date("2026-07-29T06:30:00.000Z");

  it("buckets a late-night session into the viewer's calendar day, not the server's", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: lateNightPacific.toISOString(), result: "completed" },
    ];
    // "Today" for the Pacific user is still July 28 at the moment this session
    // finished; anchor `today` there and check the session counts as today.
    const todayInLA = new Date("2026-07-28T23:35:00.000Z"); // still the 28th in LA
    expect(
      streakDays(sessions, { today: todayInLA, timeZone: "America/Los_Angeles" }),
    ).toBe(1);
  });

  it("would misfile the same session under a naive UTC bucketing (regression guard)", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: lateNightPacific.toISOString(), result: "completed" },
    ];
    const todayInLA = new Date("2026-07-28T23:35:00.000Z");
    // Under UTC, the session's key lands on the 29th while "today" (still the
    // 28th in LA) resolves to the 28th in UTC too — so the streak breaks.
    // This is the regression guard: LA and UTC must NOT agree here.
    expect(streakDays(sessions, { today: todayInLA, timeZone: "UTC" })).toBe(0);
  });

  it("defaults to the runtime's local zone when no timeZone is passed", () => {
    const today = new Date(2026, 6, 29);
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, { today })).toBe(1);
  });
});

describe("breakKindForCycle", () => {
  it("gives a short break for cycles 1-3", () => {
    expect(breakKindForCycle(1)).toBe("short");
    expect(breakKindForCycle(2)).toBe("short");
    expect(breakKindForCycle(3)).toBe("short");
  });

  it("gives a long break on every 4th cycle (F-01)", () => {
    expect(breakKindForCycle(4)).toBe("long");
    expect(breakKindForCycle(8)).toBe("long");
    expect(breakKindForCycle(12)).toBe("long");
  });

  it("resumes short breaks right after a long one", () => {
    expect(breakKindForCycle(5)).toBe("short");
  });
});

describe("formatMinutes", () => {
  it("shows '< 1 min' instead of '0 min' for sub-minute durations (B-02)", () => {
    expect(formatMinutes(0.75)).toBe("< 1 min");
    expect(formatMinutes(0.02)).toBe("< 1 min");
  });

  it("rounds minute-or-longer durations normally", () => {
    expect(formatMinutes(1)).toBe("1 min");
    expect(formatMinutes(24.6)).toBe("25 min");
  });

  it("shows '0 min' only for a literal zero", () => {
    expect(formatMinutes(0)).toBe("0 min");
  });
});

describe("weeklyMinutesSeries", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("buckets sessions into contiguous rolling weeks, oldest first", () => {
    const sessions: FocusSessionLike[] = [
      // this week (Jul 24-30)
      { assignmentId: "a", startedAt: "2026-07-30T09:00:00.000Z", durationSeconds: 1500, result: "completed" },
      // one week back (Jul 17-23)
      { assignmentId: "a", startedAt: "2026-07-20T09:00:00.000Z", durationSeconds: 3000, result: "completed" },
    ];
    const series = weeklyMinutesSeries(sessions, { now, timeZone: "UTC", weeks: 3 });
    expect(series).toHaveLength(3);
    expect(series[2].minutes).toBe(25); // this week
    expect(series[1].minutes).toBe(50); // one week back
    expect(series[0].minutes).toBe(0); // two weeks back — nothing logged
    expect(series[2].weekStart).toBe("2026-07-24");
  });

  it("returns all-zero buckets when there are no sessions", () => {
    const series = weeklyMinutesSeries([], { now, timeZone: "UTC", weeks: 4 });
    expect(series.every((w) => w.minutes === 0)).toBe(true);
  });
});

describe("validateManualSession", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("passes for a plausible past session", () => {
    const errors = validateManualSession(
      { startedAt: "2026-07-30T09:00:00.000Z", durationMinutes: 45 },
      now,
    );
    expect(errors).toEqual({});
  });

  it("rejects a start time in the future", () => {
    const errors = validateManualSession(
      { startedAt: "2026-07-30T13:00:00.000Z", durationMinutes: 30 },
      now,
    );
    expect(errors.startedAt).toBeDefined();
  });

  it("rejects a duration that would push the end time into the future", () => {
    // starts an hour ago, but "runs" for 2 hours — ends 1 hour from now.
    const errors = validateManualSession(
      { startedAt: "2026-07-30T11:00:00.000Z", durationMinutes: 120 },
      now,
    );
    expect(errors.durationMinutes).toBeDefined();
  });

  it("rejects a non-positive duration", () => {
    expect(
      validateManualSession({ startedAt: "2026-07-30T09:00:00.000Z", durationMinutes: 0 }, now)
        .durationMinutes,
    ).toBeDefined();
    expect(
      validateManualSession({ startedAt: "2026-07-30T09:00:00.000Z", durationMinutes: -5 }, now)
        .durationMinutes,
    ).toBeDefined();
  });

  it(`rejects a duration over ${MAX_MANUAL_SESSION_MINUTES} minutes`, () => {
    const errors = validateManualSession(
      { startedAt: "2020-01-01T00:00:00.000Z", durationMinutes: MAX_MANUAL_SESSION_MINUTES + 1 },
      now,
    );
    expect(errors.durationMinutes).toBeDefined();
  });

  it(`accepts exactly ${MAX_MANUAL_SESSION_MINUTES} minutes`, () => {
    const errors = validateManualSession(
      { startedAt: "2020-01-01T00:00:00.000Z", durationMinutes: MAX_MANUAL_SESSION_MINUTES },
      now,
    );
    expect(errors.durationMinutes).toBeUndefined();
  });

  it("rejects an unparseable start time", () => {
    expect(
      validateManualSession({ startedAt: "not-a-date", durationMinutes: 30 }, now).startedAt,
    ).toBeDefined();
  });
});

describe("chartAxisTicks", () => {
  it("picks round steps so the top tick reads at a glance", () => {
    // The concept's Learning rhythm axis: a ~60-minute peak yields 0/20/40/60,
    // not 0/17/34/51 scaled to the tallest bar.
    expect(chartAxisTicks(60)).toEqual([0, 20, 40, 60]);
    expect(chartAxisTicks(55)).toEqual([0, 20, 40, 60]);
  });

  it("always spans at least up to the largest value", () => {
    for (const max of [3, 7, 45, 123, 999, 1450]) {
      const ticks = chartAxisTicks(max);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
      expect(ticks[0]).toBe(0);
    }
  });

  it("keeps a labelled axis for an empty week instead of a bare baseline", () => {
    const ticks = chartAxisTicks(0);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(0);
  });

  it("uses evenly spaced steps", () => {
    const ticks = chartAxisTicks(240);
    const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(new Set(gaps).size).toBe(1);
  });
});
