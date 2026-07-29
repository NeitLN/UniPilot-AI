import { describe, expect, it } from "vitest";
import {
  classify,
  streakDays,
  weeklyStats,
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
