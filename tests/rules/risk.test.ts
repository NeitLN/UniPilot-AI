import { describe, expect, it } from "vitest";
import { canCompute, computeRisk, topSuggestion } from "@/lib/rules/risk";

describe("canCompute", () => {
  it("requires availability > 0", () => {
    expect(
      canCompute({ availableHours: 0, pendingCount: 3, focusHistoryDays: 10 }),
    ).toBe(false);
  });

  it("requires at least one pending assignment", () => {
    expect(
      canCompute({ availableHours: 10, pendingCount: 0, focusHistoryDays: 10 }),
    ).toBe(false);
  });

  it("requires at least 7 days of focus history", () => {
    expect(
      canCompute({ availableHours: 10, pendingCount: 3, focusHistoryDays: 6 }),
    ).toBe(false);
  });

  it("passes when all three hold", () => {
    expect(
      canCompute({ availableHours: 10, pendingCount: 3, focusHistoryDays: 7 }),
    ).toBe(true);
  });
});

describe("computeRisk", () => {
  it("matches the worked example: 18h planned / 14h available, 3 overdue, 6 completed cycles", () => {
    // workload = min(100, 18/14*100) = min(100, 128.57) = 100
    // overdue  = min(100, 3*25) = 75
    // focus    = max(0, 100 - 6*10) = 40
    // score    = round(0.40*100 + 0.35*75 + 0.25*40) = round(40 + 26.25 + 10) = 76
    const result = computeRisk({
      plannedHours: 18,
      availableHours: 14,
      overdueCount: 3,
      completedCycles7d: 6,
    });
    expect(result.workload).toBe(100);
    expect(result.overdue).toBe(75);
    expect(result.focus).toBe(40);
    expect(result.score).toBe(76);
    expect(result.warn).toBe(true);
  });

  it("caps workload at 100 even when planned hours far exceed availability", () => {
    const result = computeRisk({
      plannedHours: 40,
      availableHours: 10,
      overdueCount: 0,
      completedCycles7d: 20,
    });
    expect(result.workload).toBe(100);
  });

  it("caps overdue at 100 regardless of how many are overdue", () => {
    const result = computeRisk({
      plannedHours: 0,
      availableHours: 10,
      overdueCount: 10,
      completedCycles7d: 0,
    });
    expect(result.overdue).toBe(100);
  });

  it("never lets focus go negative with a very high cycle count", () => {
    const result = computeRisk({
      plannedHours: 0,
      availableHours: 10,
      overdueCount: 0,
      completedCycles7d: 20,
    });
    expect(result.focus).toBe(0);
  });

  it("does not warn below the 60 threshold", () => {
    const result = computeRisk({
      plannedHours: 2,
      availableHours: 10,
      overdueCount: 0,
      completedCycles7d: 10,
    });
    expect(result.score).toBeLessThan(60);
    expect(result.warn).toBe(false);
  });

  it("warns exactly at the 60 threshold", () => {
    // workload=100(*.4=40), overdue=0(*.35=0), focus=100(*.25=25) -> wait, need score==60 case.
    // Use: workload=0, overdue=100(*.35=35), focus=100(*.25=25) -> score=60
    const result = computeRisk({
      plannedHours: 0,
      availableHours: 10,
      overdueCount: 5,
      completedCycles7d: 0,
    });
    expect(result.score).toBe(60);
    expect(result.warn).toBe(true);
  });
});

describe("topSuggestion", () => {
  it("picks workload when it contributes the most", () => {
    const s = topSuggestion({ workload: 100, overdue: 0, focus: 0 });
    expect(s.type).toBe("workload");
  });

  it("picks overdue when it contributes the most", () => {
    const s = topSuggestion({ workload: 0, overdue: 100, focus: 0 });
    expect(s.type).toBe("overdue");
  });

  it("picks focus when it contributes the most", () => {
    const s = topSuggestion({ workload: 0, overdue: 0, focus: 100 });
    expect(s.type).toBe("focus");
  });

  it("weighs contributions, not raw factor values", () => {
    // workload=50 (*.4=20) vs overdue=55 (*.35=19.25) -> workload still wins
    const s = topSuggestion({ workload: 50, overdue: 55, focus: 0 });
    expect(s.type).toBe("workload");
  });
});
