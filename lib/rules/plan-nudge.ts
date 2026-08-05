/**
 * PROD-02 — the in-week half of plan adherence.
 *
 * `planAdherence` (lib/rules/insights.ts) already computes the number, but
 * it is only ever *shown* in the Weekly report — which is written after the
 * week is over, to a page a student who is falling behind is the least
 * likely to open. By the time the figure is visible there is nothing left
 * to do about it. This decides whether the same number is worth interrupting
 * someone about while the week can still be saved.
 *
 * Every guard here exists to stop a nudge that would be noise, because the
 * cost of a wrong one is not zero: a reminder that fires when the student
 * has done nothing wrong is how notification permission gets revoked, and
 * that takes the reminders that *do* work down with it.
 *
 * Takes the two counts rather than the ratio. `planAdherence` rounds to two
 * decimals for display, and reconstructing "2 of 6" from 0.33 is a
 * subtraction the caller already has the exact answer to.
 */

/** Below half of the elapsed plan kept. Deliberately not a near-miss
 * threshold like 0.8 — that is the bar `weeklyWin` uses to *praise* a
 * strong week, and a number good enough to be worth celebrating at 0.8 is
 * not one to interrupt someone over at 0.79. */
export const PLAN_NUDGE_THRESHOLD = 0.5;

/** Fewer elapsed sessions than this and the percentage is not a trend, it
 * is a rounding artifact: skipping one session out of two reads as a 50%
 * collapse. Three is the smallest number where a miss is a pattern rather
 * than a bad day. */
export const PLAN_NUDGE_MIN_ELAPSED = 3;

/** A nudge on the last day of the plan week is a scolding, not a prompt —
 * there is no time left to act on it. This reserves the tail of the week
 * for the Weekly report, which is the right place to look back from. */
export const PLAN_NUDGE_MIN_DAYS_LEFT = 2;

export type PlanNudgeSkipReason =
  "nothing_elapsed" | "too_few_elapsed" | "on_track" | "too_late_in_week";

export type PlanNudgeDecision =
  { nudge: true; kept: number; elapsed: number } | { nudge: false; reason: PlanNudgeSkipReason };

export interface PlanNudgeInput {
  /** Planned sessions that have already come and gone. */
  elapsed: number;
  /** Of those, the ones with a completed focus session on the same day —
   * the same day-key proxy `planAdherence` uses, matched by the caller. */
  kept: number;
  /** Whole days remaining before the plan week ends. */
  daysLeftInWeek: number;
}

/**
 * Whether this plan week is worth one interruption, and the figures the
 * message needs. Split from the sweep that writes the notification so the
 * judgement can be tested without a database.
 */
export function planNudgeDecision({
  elapsed,
  kept,
  daysLeftInWeek,
}: PlanNudgeInput): PlanNudgeDecision {
  if (elapsed <= 0) return { nudge: false, reason: "nothing_elapsed" };
  if (elapsed < PLAN_NUDGE_MIN_ELAPSED) return { nudge: false, reason: "too_few_elapsed" };
  if (daysLeftInWeek < PLAN_NUDGE_MIN_DAYS_LEFT)
    return { nudge: false, reason: "too_late_in_week" };
  if (kept / elapsed >= PLAN_NUDGE_THRESHOLD) return { nudge: false, reason: "on_track" };

  return { nudge: true, kept, elapsed };
}

/**
 * Whole days from `now` until the end of the plan week (`weekStart` + 7).
 *
 * `week_start` is a plain `date` column, so it carries no time and no zone.
 * Reading it as UTC midnight is what the rest of the app already does with
 * these; the result is floored, so a part-finished day never counts as one
 * the student still has to act in.
 */
export function daysLeftInPlanWeek(weekStart: string, now: Date): number {
  const end = new Date(`${weekStart.slice(0, 10)}T00:00:00.000Z`).getTime() + 7 * 86_400_000;
  return Math.floor((end - now.getTime()) / 86_400_000);
}

/** What the student reads on their lock screen. States the shortfall as a
 * count rather than a percentage — "2 of 6" is something you can picture
 * catching up on, where "33%" just reads as a grade. */
export function planNudgeMessage(decision: Extract<PlanNudgeDecision, { nudge: true }>): {
  title: string;
  body: string;
} {
  return {
    title: "Your study plan is slipping",
    body: `You've kept ${decision.kept} of ${decision.elapsed} planned sessions so far this week. There's still time — open Planner to reshuffle what's left.`,
  };
}
