import { describe, expect, it } from "vitest";
import {
  generateOccurrences,
  reminderMinutesFromInput,
  validateEvent,
  MAX_OCCURRENCES,
  type EventInput,
} from "@/lib/rules/event";

const baseInput: EventInput = {
  title: "Study group",
  courseId: "",
  location: "",
  isAllDay: false,
  startAt: "2026-08-03T09:00",
  endAt: "2026-08-03T10:00",
  repeat: "none",
  repeatUntil: "",
  reminder: "",
  notes: "",
};

describe("validateEvent", () => {
  it("passes for fully valid input", () => {
    expect(validateEvent(baseInput)).toEqual({});
  });

  it("requires a title, start, and end", () => {
    const errors = validateEvent({ ...baseInput, title: "  ", startAt: "", endAt: "" });
    expect(errors.title).toBeDefined();
    expect(errors.startAt).toBeDefined();
    expect(errors.endAt).toBeDefined();
  });

  it("flags an end before the start", () => {
    const errors = validateEvent({
      ...baseInput,
      startAt: "2026-08-03T10:00",
      endAt: "2026-08-03T09:00",
    });
    expect(errors.endAt).toBeDefined();
  });

  it("requires repeatUntil when repeat is set", () => {
    const errors = validateEvent({ ...baseInput, repeat: "weekly", repeatUntil: "" });
    expect(errors.repeatUntil).toBeDefined();
  });

  it("flags repeatUntil before the start date", () => {
    const errors = validateEvent({
      ...baseInput,
      repeat: "weekly",
      repeatUntil: "2026-08-01",
    });
    expect(errors.repeatUntil).toBeDefined();
  });

  it("accepts a valid repeating event", () => {
    const errors = validateEvent({
      ...baseInput,
      repeat: "weekly",
      repeatUntil: "2026-09-01",
    });
    expect(errors).toEqual({});
  });
});

describe("reminderMinutesFromInput", () => {
  it("returns null for no alert", () => {
    expect(reminderMinutesFromInput("")).toBeNull();
  });

  it("parses a minutes value", () => {
    expect(reminderMinutesFromInput("15")).toBe(15);
  });

  it("treats 0 as a real value, not 'no alert'", () => {
    expect(reminderMinutesFromInput("0")).toBe(0);
  });
});

describe("generateOccurrences", () => {
  it("returns a single occurrence when repeat is none, ignoring until", () => {
    const start = new Date("2026-08-03T09:00:00");
    const end = new Date("2026-08-03T10:00:00");
    const occurrences = generateOccurrences(start, end, "none", new Date("2026-12-01"));
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].start).toEqual(start);
  });

  it("steps weekly up to and including the until date", () => {
    const start = new Date("2026-08-03T09:00:00"); // Monday
    const end = new Date("2026-08-03T10:00:00");
    const until = new Date("2026-08-24T23:59:59");
    const occurrences = generateOccurrences(start, end, "weekly", until);
    expect(occurrences).toHaveLength(4);
    expect(occurrences[3].start).toEqual(new Date("2026-08-24T09:00:00"));
  });

  it("preserves each occurrence's duration", () => {
    const start = new Date("2026-08-03T09:00:00");
    const end = new Date("2026-08-03T10:30:00");
    const until = new Date("2026-08-10T23:59:59");
    const occurrences = generateOccurrences(start, end, "daily", until);
    for (const o of occurrences) {
      expect(o.end.getTime() - o.start.getTime()).toBe(90 * 60_000);
    }
  });

  it("caps at MAX_OCCURRENCES for a runaway range", () => {
    const start = new Date("2026-01-01T09:00:00");
    const end = new Date("2026-01-01T10:00:00");
    const until = new Date("2099-01-01T00:00:00");
    const occurrences = generateOccurrences(start, end, "daily", until);
    expect(occurrences).toHaveLength(MAX_OCCURRENCES);
  });
});
