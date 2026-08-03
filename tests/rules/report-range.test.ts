import { describe, expect, it } from "vitest";
import {
  isFutureWeek,
  mondayOf,
  nextWeek,
  parseWeekParam,
  previousWeek,
  weekRangeForMonday,
} from "@/lib/rules/report-range";

describe("mondayOf", () => {
  it("returns the same date when it's already Monday", () => {
    expect(mondayOf(new Date("2026-08-03T12:00:00.000Z"), "UTC")).toBe("2026-08-03");
  });

  it("rewinds to Monday from any other weekday", () => {
    expect(mondayOf(new Date("2026-08-06T12:00:00.000Z"), "UTC")).toBe("2026-08-03"); // Thursday
    expect(mondayOf(new Date("2026-08-09T12:00:00.000Z"), "UTC")).toBe("2026-08-03"); // Sunday
  });

  it("handles a year boundary correctly", () => {
    // 2027-01-01 is a Friday; its Monday is in the prior year.
    expect(mondayOf(new Date("2027-01-01T12:00:00.000Z"), "UTC")).toBe("2026-12-28");
  });
});

describe("parseWeekParam", () => {
  const now = new Date("2026-08-05T12:00:00.000Z"); // Wednesday

  it("falls back to the current week for a missing or malformed param", () => {
    expect(parseWeekParam(undefined, now, "UTC")).toBe("2026-08-03");
    expect(parseWeekParam("not-a-date", now, "UTC")).toBe("2026-08-03");
    expect(parseWeekParam("2026-13-40", now, "UTC")).toBe("2026-08-03");
  });

  it("accepts a real Monday", () => {
    expect(parseWeekParam("2026-07-27", now, "UTC")).toBe("2026-07-27");
  });

  it("re-anchors a non-Monday date instead of reporting a lopsided week", () => {
    expect(parseWeekParam("2026-07-29", now, "UTC")).toBe("2026-08-03"); // a Wednesday, not accepted as-is
  });
});

describe("previousWeek / nextWeek", () => {
  it("steps by exactly 7 days", () => {
    expect(previousWeek("2026-08-03")).toBe("2026-07-27");
    expect(nextWeek("2026-08-03")).toBe("2026-08-10");
  });

  it("steps across a year boundary", () => {
    expect(nextWeek("2026-12-28")).toBe("2027-01-04");
  });
});

describe("isFutureWeek", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("is false for the current or a past week", () => {
    expect(isFutureWeek("2026-08-03", now, "UTC")).toBe(false);
    expect(isFutureWeek("2026-07-27", now, "UTC")).toBe(false);
  });

  it("is true for a week that hasn't started yet", () => {
    expect(isFutureWeek("2026-08-10", now, "UTC")).toBe(true);
  });
});

describe("weekRangeForMonday", () => {
  it("spans exactly 7 days", () => {
    const { start, end } = weekRangeForMonday("2026-08-03", "UTC");
    expect(end.getTime() - start.getTime()).toBe(7 * 86_400_000);
  });

  it("starts at local midnight for the given timezone", () => {
    // America/New_York is UTC-4 in August (EDT) — local midnight Aug 3 is
    // 04:00 UTC.
    const { start } = weekRangeForMonday("2026-08-03", "America/New_York");
    expect(start.toISOString()).toBe("2026-08-03T04:00:00.000Z");
  });
});
