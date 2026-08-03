import { describe, expect, it } from "vitest";
import {
  freeMinutesForDay,
  isCurrentDisplayedRange,
  isHappeningNow,
  layoutOverlappingEvents,
  nextClass,
  positionEvent,
  todayBlocks,
  type ClassBlockLite,
} from "@/lib/rules/schedule-presentation";

function block(overrides: Partial<ClassBlockLite> & Pick<ClassBlockLite, "startAt" | "endAt">): ClassBlockLite {
  return {
    id: crypto.randomUUID(),
    title: "Class",
    location: null,
    courseId: null,
    courseName: null,
    isAllDay: false,
    ...overrides,
  };
}

describe("nextClass / isHappeningNow", () => {
  const now = new Date("2026-08-03T10:00:00.000Z");

  it("picks the soonest class that hasn't ended, ignoring all-day blocks", () => {
    const b1 = block({ startAt: "2026-08-03T11:00:00.000Z", endAt: "2026-08-03T12:00:00.000Z" });
    const b2 = block({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T13:00:00.000Z" }); // already happening
    const allDay = block({ startAt: "2026-08-03T00:00:00.000Z", endAt: "2026-08-04T00:00:00.000Z", isAllDay: true });
    const result = nextClass([b1, b2, allDay], now);
    expect(result?.id).toBe(b2.id); // happening now, ends later than "now" — soonest by start time
  });

  it("returns null when nothing is left today", () => {
    const past = block({ startAt: "2026-08-03T06:00:00.000Z", endAt: "2026-08-03T07:00:00.000Z" });
    expect(nextClass([past], now)).toBeNull();
  });

  it("isHappeningNow is true only within [start, end)", () => {
    const b = block({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" });
    expect(isHappeningNow(b, new Date("2026-08-03T09:30:00.000Z"))).toBe(true);
    expect(isHappeningNow(b, new Date("2026-08-03T10:00:00.000Z"))).toBe(false);
    expect(isHappeningNow(b, new Date("2026-08-03T08:59:00.000Z"))).toBe(false);
  });
});

describe("todayBlocks", () => {
  it("returns an empty array for a day with nothing scheduled", () => {
    expect(todayBlocks([], new Date("2026-08-03T10:00:00.000Z"), "UTC")).toEqual([]);
  });

  it("respects the viewer's timezone", () => {
    const b = block({ startAt: "2026-08-04T02:00:00.000Z", endAt: "2026-08-04T03:00:00.000Z" });
    const now = new Date("2026-08-04T02:30:00.000Z");
    expect(todayBlocks([b], now, "America/New_York")).toHaveLength(1); // still Aug 3 evening there... but now is also Aug3 there
  });

  it("sorts ordered by start time", () => {
    const b1 = block({ startAt: "2026-08-03T14:00:00.000Z", endAt: "2026-08-03T15:00:00.000Z" });
    const b2 = block({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" });
    const result = todayBlocks([b1, b2], new Date("2026-08-03T08:00:00.000Z"), "UTC");
    expect(result.map((b) => b.id)).toEqual([b2.id, b1.id]);
  });
});

describe("freeMinutesForDay", () => {
  it("is the full window for an empty day", () => {
    expect(freeMinutesForDay("2026-08-03", [], "UTC")).toEqual({ freeMinutes: 720, blockCount: 1 });
  });

  it("subtracts a class and counts the remaining free segments", () => {
    const b = block({ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:30:00.000Z" });
    const result = freeMinutesForDay("2026-08-03", [b], "UTC");
    expect(result.blockCount).toBe(2); // before and after the class
    expect(result.freeMinutes).toBe(720 - 90);
  });

  it("ignores all-day events (they don't consume timed free time)", () => {
    const allDay = block({ startAt: "2026-08-03T00:00:00.000Z", endAt: "2026-08-04T00:00:00.000Z", isAllDay: true });
    expect(freeMinutesForDay("2026-08-03", [allDay], "UTC").freeMinutes).toBe(720);
  });
});

describe("positionEvent", () => {
  it("positions an in-window event proportionally", () => {
    const pos = positionEvent(9 * 60, 10 * 60); // 09:00-10:00 within 08:00-20:00
    expect(pos.topPct).toBeCloseTo((60 / 720) * 100);
    expect(pos.heightPct).toBeCloseTo((60 / 720) * 100);
    expect(pos.clampedStart).toBe(false);
    expect(pos.clampedEnd).toBe(false);
  });

  it("clamps an event that starts before the grid", () => {
    const pos = positionEvent(6 * 60, 9 * 60);
    expect(pos.topPct).toBe(0);
    expect(pos.clampedStart).toBe(true);
  });

  it("clamps an event that ends after the grid", () => {
    const pos = positionEvent(19 * 60, 22 * 60);
    expect(pos.clampedEnd).toBe(true);
    expect(pos.topPct + pos.heightPct).toBeCloseTo(100);
  });
});

describe("layoutOverlappingEvents", () => {
  it("gives a single non-overlapping event its own full-width column", () => {
    const events = [{ startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" }];
    const layout = layoutOverlappingEvents(events);
    expect(layout[0]).toMatchObject({ column: 0, columnCount: 1 });
  });

  it("places two overlapping events side by side", () => {
    const events = [
      { startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" },
      { startAt: "2026-08-03T09:30:00.000Z", endAt: "2026-08-03T10:30:00.000Z" },
    ];
    const layout = layoutOverlappingEvents(events);
    expect(layout.every((l) => l.columnCount === 2)).toBe(true);
    expect(new Set(layout.map((l) => l.column)).size).toBe(2);
  });

  it("does not widen a later, non-overlapping event's cluster", () => {
    const events = [
      { startAt: "2026-08-03T09:00:00.000Z", endAt: "2026-08-03T10:00:00.000Z" },
      { startAt: "2026-08-03T09:30:00.000Z", endAt: "2026-08-03T10:30:00.000Z" },
      { startAt: "2026-08-03T14:00:00.000Z", endAt: "2026-08-03T15:00:00.000Z" },
    ];
    const layout = layoutOverlappingEvents(events);
    const solo = layout.find((l) => l.event.startAt === "2026-08-03T14:00:00.000Z");
    expect(solo?.columnCount).toBe(1);
  });
});

describe("isCurrentDisplayedRange", () => {
  it("is true when now falls inside the range", () => {
    expect(
      isCurrentDisplayedRange(
        { start: "2026-08-03T00:00:00.000Z", end: "2026-08-10T00:00:00.000Z" },
        new Date("2026-08-05T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("is false for a past or future range", () => {
    const range = { start: "2026-08-03T00:00:00.000Z", end: "2026-08-10T00:00:00.000Z" };
    expect(isCurrentDisplayedRange(range, new Date("2026-08-01T00:00:00.000Z"))).toBe(false);
    expect(isCurrentDisplayedRange(range, new Date("2026-08-11T00:00:00.000Z"))).toBe(false);
  });
});
