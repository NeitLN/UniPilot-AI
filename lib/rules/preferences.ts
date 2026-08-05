// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.5/8.3 — validation for
// the study-preferences fields added to `profiles` in migration 0015.

export const FOCUS_DURATION_OPTIONS = [25, 45, 60] as const;
export const DAILY_GOAL_MIN = 1;
export const DAILY_GOAL_MAX = 12;

export interface StudyPreferencesInput {
  defaultFocusMinutes: number;
  dailyFocusGoalCycles: number;
  /** ISO weekday numbers, 1=Monday..7=Sunday. */
  preferredStudyDays: number[];
  /** Total credits required to graduate — null means "not set", distinct
   * from 0 (GPA's On-track card needs to tell those apart). */
  programTotalCredits: number | null;
}

export type StudyPreferencesErrors = Partial<
  Record<
    "defaultFocusMinutes" | "dailyFocusGoalCycles" | "preferredStudyDays" | "programTotalCredits",
    string
  >
>;

export function validateStudyPreferences(input: StudyPreferencesInput): StudyPreferencesErrors {
  const errors: StudyPreferencesErrors = {};

  if (!(FOCUS_DURATION_OPTIONS as readonly number[]).includes(input.defaultFocusMinutes)) {
    errors.defaultFocusMinutes = "Pick 25, 45, or 60 minutes.";
  }

  if (
    !Number.isInteger(input.dailyFocusGoalCycles) ||
    input.dailyFocusGoalCycles < DAILY_GOAL_MIN ||
    input.dailyFocusGoalCycles > DAILY_GOAL_MAX
  ) {
    errors.dailyFocusGoalCycles = `Enter a whole number between ${DAILY_GOAL_MIN} and ${DAILY_GOAL_MAX}.`;
  }

  const days = input.preferredStudyDays;
  const validRange = days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  const unique = new Set(days).size === days.length;
  if (!validRange || !unique) {
    errors.preferredStudyDays = "Preferred study days must be valid, unique weekdays.";
  }

  if (
    input.programTotalCredits !== null &&
    (!Number.isFinite(input.programTotalCredits) || input.programTotalCredits <= 0)
  ) {
    errors.programTotalCredits = "Enter a positive number of credits, or leave it blank.";
  }

  return errors;
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};
