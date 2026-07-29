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
    expect(streakDays([], today)).toBe(0);
  });

  it("only counts completed sessions, not partial", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "partial" },
    ];
    expect(streakDays(sessions, today)).toBe(0);
  });

  it("counts consecutive days including today", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 28).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, today)).toBe(3);
  });

  it("doesn't break the streak just because today has no session yet", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 28).toISOString(), result: "completed" },
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, today)).toBe(2);
  });

  it("stops at the first gap", () => {
    const sessions: Pick<FocusSessionLike, "startedAt" | "result">[] = [
      { startedAt: new Date(2026, 6, 29).toISOString(), result: "completed" },
      // gap on the 28th
      { startedAt: new Date(2026, 6, 27).toISOString(), result: "completed" },
    ];
    expect(streakDays(sessions, today)).toBe(1);
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
    const stats = weeklyStats(sessions, now);
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
    const stats = weeklyStats(sessions, now);
    expect(stats.completedCycles).toBe(0);
  });
});
