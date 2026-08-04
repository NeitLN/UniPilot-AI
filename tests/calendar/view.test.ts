import { describe, expect, it } from "vitest";
import {
  addDays,
  formatViewRangeLabel,
  getViewRange,
  isSameDay,
  parseDateParam,
  shiftDate,
  toDateParam,
} from "@/lib/calendar/view";

describe("getViewRange", () => {
  it("day view is a 24h window starting at midnight", () => {
    const { start, end } = getViewRange("day", new Date(2026, 6, 29, 15, 30));
    expect(start).toEqual(new Date(2026, 6, 29, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 6, 30, 0, 0, 0, 0));
  });

  it("week view starts on Monday regardless of which weekday is passed", () => {
    // 2026-07-29 is a Wednesday
    const { start, end } = getViewRange("week", new Date(2026, 6, 29));
    expect(start).toEqual(new Date(2026, 6, 27)); // Monday
    expect(end).toEqual(new Date(2026, 7, 3)); // next Monday
  });

  it("week view anchored on a Monday doesn't shift", () => {
    const { start } = getViewRange("week", new Date(2026, 6, 27));
    expect(start).toEqual(new Date(2026, 6, 27));
  });

  it("month view spans the full calendar month", () => {
    const { start, end } = getViewRange("month", new Date(2026, 6, 29));
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 7, 1));
  });
});

describe("isSameDay", () => {
  it("matches same calendar day regardless of time", () => {
    expect(isSameDay(new Date(2026, 6, 29, 1), new Date(2026, 6, 29, 23))).toBe(true);
  });
  it("does not match a different day", () => {
    expect(isSameDay(new Date(2026, 6, 29), new Date(2026, 6, 30))).toBe(false);
  });
});

describe("addDays", () => {
  it("adds positive and negative offsets", () => {
    expect(addDays(new Date(2026, 6, 29), 3)).toEqual(new Date(2026, 7, 1));
    expect(addDays(new Date(2026, 6, 29), -29)).toEqual(new Date(2026, 5, 30));
  });
});

describe("shiftDate", () => {
  it("steps a day view by one day", () => {
    expect(shiftDate("day", new Date(2026, 6, 29), 1)).toEqual(new Date(2026, 6, 30));
  });
  it("steps a week view by seven days", () => {
    expect(shiftDate("week", new Date(2026, 6, 29), -1)).toEqual(new Date(2026, 6, 22));
  });
  it("steps a month view to the 1st of the next month, without day-overflow (Jan 31 -> Mar 3 bug)", () => {
    expect(shiftDate("month", new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 1));
  });
});

describe("date param round-trip", () => {
  it("formats and parses back to the same day", () => {
    const d = new Date(2026, 0, 5);
    expect(toDateParam(d)).toBe("2026-01-05");
    expect(isSameDay(parseDateParam("2026-01-05"), d)).toBe(true);
  });

  it("falls back to today for missing/invalid input", () => {
    const today = new Date();
    expect(isSameDay(parseDateParam(undefined), today)).toBe(true);
  });
});

describe("formatViewRangeLabel", () => {
  // Pinned to en-US so the assertions describe the range-composition logic
  // (which ends carry the year/month) rather than the host's locale.
  const L = "en-US";

  it("prints a week inside one month as a shared month + year", () => {
    // Aug 2026: the 3rd is a Monday, so this week is Aug 3-9.
    expect(formatViewRangeLabel("week", new Date(2026, 7, 4), L)).toBe("Aug 3–9, 2026");
  });

  it("repeats the month only when the week crosses one", () => {
    // Mon Aug 31 2026 -> Sun Sep 6 2026.
    expect(formatViewRangeLabel("week", new Date(2026, 8, 2), L)).toBe("Aug 31–Sep 6, 2026");
  });

  it("prints both years when the week crosses new year", () => {
    // Mon Dec 28 2026 -> Sun Jan 3 2027.
    expect(formatViewRangeLabel("week", new Date(2026, 11, 30), L)).toBe(
      "Dec 28, 2026–Jan 3, 2027",
    );
  });

  it("uses a single date for day view and month+year for month view", () => {
    expect(formatViewRangeLabel("day", new Date(2026, 7, 4), L)).toBe("Aug 4, 2026");
    expect(formatViewRangeLabel("month", new Date(2026, 7, 4), L)).toBe("August 2026");
  });

  it("ends on the last visible day, not the exclusive range end", () => {
    const label = formatViewRangeLabel("week", new Date(2026, 7, 4), L);
    expect(getViewRange("week", new Date(2026, 7, 4)).end.getDate()).toBe(10);
    expect(label).toContain("–9,");
  });
});
