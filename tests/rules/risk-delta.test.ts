import { describe, expect, it } from "vitest";
import { riskDelta, riskDeltaLabel, RISK_DELTA_MIN } from "@/lib/rules/risk";

/**
 * PROD-01 — a score with no direction is nearly useless: 47 means nothing
 * on its own, 47 after 31 means something. The two things this has to get
 * right are not announcing noise, and not implying a timeframe it cannot
 * support (rows exist only for days the app was opened).
 */
describe("riskDelta", () => {
  const history = [
    { scoreDate: "2026-08-01", score: 30 },
    { scoreDate: "2026-08-04", score: 31 },
  ];

  it("reports a rise against the most recent earlier reading", () => {
    expect(riskDelta(47, "2026-08-05", history)).toEqual({
      change: 16,
      direction: "up",
      daysApart: 1,
      worse: true,
    });
  });

  it("treats a fall as an improvement, since the score measures overload", () => {
    const delta = riskDelta(20, "2026-08-05", history);
    expect(delta).toMatchObject({ change: 11, direction: "down", worse: false });
  });

  it("stays silent on a change too small to mean anything", () => {
    // A point or two moves on ordinary variation in pending work.
    expect(riskDelta(33, "2026-08-05", history)).toBeNull();
    expect(riskDelta(31 + RISK_DELTA_MIN - 1, "2026-08-05", history)).toBeNull();
    expect(riskDelta(31 + RISK_DELTA_MIN, "2026-08-05", history)).not.toBeNull();
  });

  it("has nothing to say on the very first reading", () => {
    expect(riskDelta(70, "2026-08-05", [])).toBeNull();
  });

  it("ignores readings from today and later, comparing only backwards", () => {
    // A same-day row is the one being replaced, not something to compare to.
    const withToday = [...history, { scoreDate: "2026-08-05", score: 46 }];
    expect(riskDelta(47, "2026-08-05", withToday)).toMatchObject({ change: 16 });
  });

  it("measures the real gap, because rows only exist for days the app was opened", () => {
    // Nothing between the 1st and the 5th: the honest span is 4 days, and
    // a yesterday-based delta would have found no row and shown nothing.
    const sparse = [{ scoreDate: "2026-08-01", score: 30 }];
    expect(riskDelta(50, "2026-08-05", sparse)).toMatchObject({ daysApart: 4 });
  });

  it("does not assume the history arrives sorted", () => {
    const shuffled = [
      { scoreDate: "2026-08-04", score: 31 },
      { scoreDate: "2026-08-01", score: 30 },
    ];
    expect(riskDelta(47, "2026-08-05", shuffled)).toMatchObject({ daysApart: 1 });
  });

  it("accepts full timestamps as well as bare dates", () => {
    const stamped = [{ scoreDate: "2026-08-04T17:00:00.000Z", score: 31 }];
    expect(riskDelta(47, "2026-08-05T00:00:00.000Z", stamped)).toMatchObject({ change: 16 });
  });
});

describe("riskDeltaLabel", () => {
  it("names the timeframe rather than leaving a bare number", () => {
    expect(riskDeltaLabel({ change: 16, direction: "up", daysApart: 1, worse: true })).toBe(
      "+16 since yesterday",
    );
    expect(riskDeltaLabel({ change: 9, direction: "down", daysApart: 3, worse: false })).toBe(
      "−9 over 3 days",
    );
  });

  it("uses a real minus sign, not a hyphen, so it reads as a number", () => {
    const label = riskDeltaLabel({ change: 9, direction: "down", daysApart: 2, worse: false });
    expect(label.startsWith("−")).toBe(true);
  });
});
