import { describe, expect, it } from "vitest";
import {
  coveredAssignmentCount,
  derivePiloPlanNote,
  formatMinutes,
  freeAvailabilityBands,
  groupSessionsByViewerDay,
  planCoverage,
  planHealthLabel,
  totalPlannedMinutes,
  weekDayTabs,
  type PlanSessionLite,
} from "@/lib/rules/plan-presentation";

function session(
  overrides: Partial<PlanSessionLite> & Pick<PlanSessionLite, "startAt" | "endAt">,
): PlanSessionLite {
  return {
    id: crypto.randomUUID(),
    assignmentId: "a1",
    assignmentTitle: "Test assignment",
    courseId: null,
    courseName: null,
    reason: null,
    ...overrides,
  };
}

describe("weekDayTabs", () => {
  it("always returns 7 consecutive days starting from week_start", () => {
    const tabs = weekDayTabs("2026-08-03");
    expect(tabs).toHaveLength(7);
    expect(tabs[0].dayKey).toBe("2026-08-03");
    expect(tabs[6].dayKey).toBe("2026-08-09");
  });
});

describe("groupSessionsByViewerDay", () => {
  it("returns an empty map for an empty plan", () => {
    expect(groupSessionsByViewerDay([], "UTC").size).toBe(0);
  });

  it("buckets a single session onto its own day", () => {
    const s = session({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" });
    const grouped = groupSessionsByViewerDay([s], "UTC");
    expect(grouped.size).toBe(1);
    expect(grouped.get("2026-08-03")).toHaveLength(1);
  });

  it("respects the viewer's timezone, not UTC", () => {
    // 2026-08-04T02:00 UTC is still 2026-08-03 evening in America/New_York.
    const s = session({ startAt: "2026-08-04T02:00:00.000Z", endAt: "2026-08-04T03:00:00.000Z" });
    expect(groupSessionsByViewerDay([s], "America/New_York").has("2026-08-03")).toBe(true);
    expect(groupSessionsByViewerDay([s], "UTC").has("2026-08-04")).toBe(true);
  });
});

describe("totalPlannedMinutes / formatMinutes", () => {
  it("sums durations across sessions", () => {
    const sessions = [
      session({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" }),
      session({ startAt: "2026-08-03T14:00:00.000Z", endAt: "2026-08-03T14:45:00.000Z" }),
    ];
    expect(totalPlannedMinutes(sessions)).toBe(105);
  });

  it("formats minutes as Xh Ym, dropping the zero half", () => {
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(75)).toBe("1h 15m");
  });
});

describe("coveredAssignmentCount / planCoverage", () => {
  it("counts unique assignments, ignoring nulls", () => {
    const sessions = [
      session({
        assignmentId: "a1",
        startAt: "2026-08-03T09:00:00.000Z",
        endAt: "2026-08-03T10:00:00.000Z",
      }),
      session({
        assignmentId: "a1",
        startAt: "2026-08-04T09:00:00.000Z",
        endAt: "2026-08-04T10:00:00.000Z",
      }),
      session({
        assignmentId: "a2",
        startAt: "2026-08-05T09:00:00.000Z",
        endAt: "2026-08-05T10:00:00.000Z",
      }),
      session({
        assignmentId: null,
        startAt: "2026-08-06T09:00:00.000Z",
        endAt: "2026-08-06T10:00:00.000Z",
      }),
    ];
    expect(coveredAssignmentCount(sessions)).toBe(2);
  });

  it("returns null (not 0) when there's nothing due — never a misleading 0%", () => {
    expect(planCoverage(0, 0)).toBeNull();
    expect(planHealthLabel(planCoverage(0, 0))).toBe("No deadlines this week");
  });

  it("computes a real percentage otherwise, clamped at the denominator", () => {
    expect(planCoverage(5, 4)).toBe(80);
    expect(planCoverage(5, 5)).toBe(100);
    expect(planCoverage(5, 8)).toBe(100); // never over 100% from a data quirk
  });
});

describe("derivePiloPlanNote", () => {
  it("reports no sessions when the plan is empty", () => {
    const days = weekDayTabs("2026-08-03").map((d) => ({
      dayKey: d.dayKey,
      label: d.longLabel,
      minutes: 0,
      sessionCount: 0,
    }));
    expect(derivePiloPlanNote(days)).toBe("No sessions scheduled yet.");
  });

  it("calls out a meaningfully heavier day", () => {
    const base = weekDayTabs("2026-08-03").map((d) => ({
      dayKey: d.dayKey,
      label: d.longLabel,
      minutes: 0,
      sessionCount: 0,
    }));
    base[0] = { ...base[0], minutes: 180, sessionCount: 3 };
    base[1] = { ...base[1], minutes: 45, sessionCount: 1 };
    base[2] = { ...base[2], minutes: 45, sessionCount: 1 };
    const note = derivePiloPlanNote(base);
    expect(note).toMatch(/heaviest day/);
  });

  it("names a single light weekday among otherwise-busy weekdays", () => {
    const base = weekDayTabs("2026-08-03").map((d) => ({
      dayKey: d.dayKey,
      label: d.longLabel,
      minutes: 0,
      sessionCount: 0,
    }));
    base[0] = { ...base[0], minutes: 60, sessionCount: 1 };
    base[1] = { ...base[1], minutes: 60, sessionCount: 1 };
    base[2] = { ...base[2], minutes: 60, sessionCount: 1 };
    // base[3] (Thu) stays empty — the one light weekday.
    base[4] = { ...base[4], minutes: 60, sessionCount: 1 };
    const note = derivePiloPlanNote(base);
    expect(note).toMatch(/light/);
  });

  it("falls back to a neutral note when no strong pattern exists", () => {
    const base = weekDayTabs("2026-08-03").map((d) => ({
      dayKey: d.dayKey,
      label: d.longLabel,
      minutes: 60,
      sessionCount: 1,
    }));
    expect(derivePiloPlanNote(base)).toBe("Your sessions are spread across the week.");
  });
});

describe("freeAvailabilityBands", () => {
  it("returns the full window split at noon and 18:00 for a day with nothing scheduled", () => {
    const bands = freeAvailabilityBands("2026-08-03", [], "UTC");
    expect(bands).toEqual([
      { startMinute: 480, endMinute: 720, period: "morning" },
      { startMinute: 720, endMinute: 1080, period: "afternoon" },
      { startMinute: 1080, endMinute: 1200, period: "low" },
    ]);
  });

  it("subtracts a busy range and leaves the rest free", () => {
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [{ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:30:00.000Z" }],
      "UTC",
    );
    expect(bands).toEqual([
      { startMinute: 480, endMinute: 540, period: "morning" }, // 08:00-09:00
      { startMinute: 630, endMinute: 720, period: "morning" }, // 10:30-12:00
      { startMinute: 720, endMinute: 1080, period: "afternoon" },
      { startMinute: 1080, endMinute: 1200, period: "low" },
    ]);
  });

  it("merges overlapping busy ranges instead of double-subtracting", () => {
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [
        { startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:30:00.000Z" },
        { startAt: "2026-08-03T10:00:00.000Z", endAt: "2026-08-03T11:00:00.000Z" },
      ],
      "UTC",
    );
    expect(bands[0]).toEqual({ startMinute: 480, endMinute: 540, period: "morning" });
    expect(bands.some((b) => b.startMinute === 660)).toBe(true); // free resumes at 11:00
  });

  it("ignores ranges on a different local day", () => {
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [{ startAt: "2026-08-04T09:00:00.000Z", endAt: "2026-08-04T10:00:00.000Z" }],
      "UTC",
    );
    expect(bands).toEqual([
      { startMinute: 480, endMinute: 720, period: "morning" },
      { startMinute: 720, endMinute: 1080, period: "afternoon" },
      { startMinute: 1080, endMinute: 1200, period: "low" },
    ]);
  });

  it("respects the viewer's timezone when clamping to the display window", () => {
    // 2026-08-03T23:00 UTC = 2026-08-03T19:00 in America/New_York — inside the window.
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [{ startAt: "2026-08-03T23:00:00.000Z", endAt: "2026-08-04T00:00:00.000Z" }],
      "America/New_York",
    );
    expect(bands.some((b) => b.endMinute === 1140)).toBe(true); // free ends at 19:00
  });

  it("tags 18:00-20:00 as low energy, distinct from afternoon", () => {
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [{ startAt: "2026-08-03T00:00:00.000Z", endAt: "2026-08-03T00:00:00.000Z" }], // no-op busy range
      "UTC",
    );
    const low = bands.find((b) => b.period === "low");
    expect(low).toEqual({ startMinute: 1080, endMinute: 1200, period: "low" });
  });

  it("only emits a low-energy band for the portion of free time after 18:00", () => {
    const bands = freeAvailabilityBands(
      "2026-08-03",
      [{ startAt: "2026-08-03T17:00:00.000Z", endAt: "2026-08-03T19:00:00.000Z" }], // busy 17:00-19:00
      "UTC",
    );
    expect(bands).toContainEqual({ startMinute: 1140, endMinute: 1200, period: "low" }); // 19:00-20:00 free
    expect(bands.some((b) => b.period === "low" && b.startMinute < 1140)).toBe(false);
  });
});
