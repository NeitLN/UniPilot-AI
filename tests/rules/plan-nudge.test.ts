import { describe, expect, it } from "vitest";
import {
  planNudgeDecision,
  planNudgeMessage,
  daysLeftInPlanWeek,
  PLAN_NUDGE_THRESHOLD,
  PLAN_NUDGE_MIN_ELAPSED,
  PLAN_NUDGE_MIN_DAYS_LEFT,
} from "@/lib/rules/plan-nudge";

/**
 * PROD-02 — this rule decides whether to interrupt someone. Almost every
 * test here is about a nudge that must NOT fire, because that is the
 * expensive direction: a reminder that arrives when nothing is wrong is how
 * a student turns notifications off, and that silences the reminders that
 * do work.
 */
describe("planNudgeDecision", () => {
  const ok = { elapsed: 6, kept: 1, daysLeftInWeek: 4 };

  it("fires when a real share of an established plan has been missed", () => {
    expect(planNudgeDecision(ok)).toEqual({ nudge: true, kept: 1, elapsed: 6 });
  });

  it("stays quiet before anything has elapsed", () => {
    expect(planNudgeDecision({ elapsed: 0, kept: 0, daysLeftInWeek: 6 })).toEqual({
      nudge: false,
      reason: "nothing_elapsed",
    });
  });

  it("stays quiet while the sample is too small to be a trend", () => {
    // 1 of 2 is 50% and looks alarming, but it is one missed session.
    expect(planNudgeDecision({ elapsed: 2, kept: 0, daysLeftInWeek: 5 })).toEqual({
      nudge: false,
      reason: "too_few_elapsed",
    });
  });

  it("stays quiet when the student is keeping up", () => {
    expect(planNudgeDecision({ elapsed: 6, kept: 3, daysLeftInWeek: 4 })).toEqual({
      nudge: false,
      reason: "on_track",
    });
  });

  it("treats exactly the threshold as keeping up, not as falling behind", () => {
    // 3 of 6 is exactly 0.5. The bar is "below half", so this must not fire.
    expect(planNudgeDecision({ elapsed: 6, kept: 3, daysLeftInWeek: 4 }).nudge).toBe(false);
    expect(planNudgeDecision({ elapsed: 6, kept: 2, daysLeftInWeek: 4 }).nudge).toBe(true);
  });

  it("stays quiet once the week has no room left to act in", () => {
    // Same failing week as `ok`, only later. Nothing can be done with this
    // information now, so it belongs in the Weekly report instead.
    expect(planNudgeDecision({ ...ok, daysLeftInWeek: 1 })).toEqual({
      nudge: false,
      reason: "too_late_in_week",
    });
    expect(planNudgeDecision({ ...ok, daysLeftInWeek: 0 }).nudge).toBe(false);
  });

  it("checks the sample size before the ratio, so a tiny miss is never reported as on_track", () => {
    // 0 of 1 is 0% — below the threshold — but the reason must be the
    // sample size, since that is what a caller logging reasons needs to see.
    expect(planNudgeDecision({ elapsed: 1, kept: 0, daysLeftInWeek: 5 })).toEqual({
      nudge: false,
      reason: "too_few_elapsed",
    });
  });

  it("holds the thresholds the comments justify", () => {
    // These are product decisions, not incidental numbers — pinning them
    // means changing one is a deliberate edit with a failing test attached.
    expect(PLAN_NUDGE_THRESHOLD).toBe(0.5);
    expect(PLAN_NUDGE_MIN_ELAPSED).toBe(3);
    expect(PLAN_NUDGE_MIN_DAYS_LEFT).toBe(2);
  });
});

describe("daysLeftInPlanWeek", () => {
  it("counts whole days to the end of the seven-day week", () => {
    expect(daysLeftInPlanWeek("2026-08-03", new Date("2026-08-03T00:00:00Z"))).toBe(7);
    expect(daysLeftInPlanWeek("2026-08-03", new Date("2026-08-06T00:00:00Z"))).toBe(4);
  });

  it("floors a part-finished day rather than crediting it", () => {
    // 23 hours left is not a day the student can plan around.
    expect(daysLeftInPlanWeek("2026-08-03", new Date("2026-08-09T01:00:00Z"))).toBe(0);
  });

  it("goes negative once the week is over, so a stale plan cannot qualify", () => {
    expect(daysLeftInPlanWeek("2026-08-03", new Date("2026-08-12T00:00:00Z"))).toBeLessThan(0);
  });

  it("accepts a full timestamp as well as a bare date", () => {
    expect(daysLeftInPlanWeek("2026-08-03T00:00:00+00:00", new Date("2026-08-06T00:00:00Z"))).toBe(
      4,
    );
  });
});

describe("planNudgeMessage", () => {
  it("leads with the counts, not a percentage", () => {
    const { title, body } = planNudgeMessage({ nudge: true, kept: 2, elapsed: 6 });
    expect(title).toBe("Your study plan is slipping");
    expect(body).toContain("2 of 6");
    expect(body).not.toMatch(/\d+%/);
  });

  it("points at something the student can actually do", () => {
    expect(planNudgeMessage({ nudge: true, kept: 0, elapsed: 4 }).body).toMatch(/Planner/);
  });
});
