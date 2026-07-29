import { describe, expect, it } from "vitest";
import {
  addDays,
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
