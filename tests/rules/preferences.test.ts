import { describe, expect, it } from "vitest";
import { validateStudyPreferences, type StudyPreferencesInput } from "@/lib/rules/preferences";

const base: StudyPreferencesInput = {
  defaultFocusMinutes: 25,
  dailyFocusGoalCycles: 4,
  preferredStudyDays: [1, 2, 3, 4, 5],
};

describe("validateStudyPreferences", () => {
  it("passes for valid input", () => {
    expect(validateStudyPreferences(base)).toEqual({});
  });

  it("only accepts 25/45/60 for default focus minutes", () => {
    expect(validateStudyPreferences({ ...base, defaultFocusMinutes: 30 }).defaultFocusMinutes).toBeDefined();
    expect(validateStudyPreferences({ ...base, defaultFocusMinutes: 45 }).defaultFocusMinutes).toBeUndefined();
  });

  it("rejects a daily goal outside 1-12", () => {
    expect(validateStudyPreferences({ ...base, dailyFocusGoalCycles: 0 }).dailyFocusGoalCycles).toBeDefined();
    expect(validateStudyPreferences({ ...base, dailyFocusGoalCycles: 13 }).dailyFocusGoalCycles).toBeDefined();
    expect(validateStudyPreferences({ ...base, dailyFocusGoalCycles: 1 }).dailyFocusGoalCycles).toBeUndefined();
    expect(validateStudyPreferences({ ...base, dailyFocusGoalCycles: 12 }).dailyFocusGoalCycles).toBeUndefined();
  });

  it("rejects non-integer daily goal", () => {
    expect(validateStudyPreferences({ ...base, dailyFocusGoalCycles: 2.5 }).dailyFocusGoalCycles).toBeDefined();
  });

  it("rejects out-of-range or duplicate preferred days", () => {
    expect(validateStudyPreferences({ ...base, preferredStudyDays: [0, 1] }).preferredStudyDays).toBeDefined();
    expect(validateStudyPreferences({ ...base, preferredStudyDays: [8] }).preferredStudyDays).toBeDefined();
    expect(validateStudyPreferences({ ...base, preferredStudyDays: [1, 1] }).preferredStudyDays).toBeDefined();
  });

  it("accepts an empty preferred-days list", () => {
    expect(validateStudyPreferences({ ...base, preferredStudyDays: [] }).preferredStudyDays).toBeUndefined();
  });
});
