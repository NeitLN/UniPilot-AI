// Manual Schedule events (Apple Calendar-style "New Event" sheet): title,
// course, location, all-day toggle, start/end, repeat, and an alert before
// the event. Recurring events are materialized into one row per occurrence
// (see generateOccurrences) rather than stored as an RRULE, matching how
// Google Calendar sync already fills class_blocks one row per event.

export type EventRepeat = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export const REPEAT_OPTIONS: { value: EventRepeat; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
];

/** Minutes-before-start, as the string form form fields carry. "" = no alert. */
export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "0", label: "At time of event" },
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

/** Hard ceiling on materialized rows per recurring event — keeps a mistaken
 * "repeat until 2099" from generating an unbounded insert. */
export const MAX_OCCURRENCES = 200;

export interface EventInput {
  title: string;
  courseId: string; // "" = no course linked
  location: string;
  isAllDay: boolean;
  startAt: string; // datetime-local value
  endAt: string; // datetime-local value
  repeat: EventRepeat;
  repeatUntil: string; // date value, required when repeat !== "none"
  reminder: string; // minutes-before as a string, "" = none — see REMINDER_OPTIONS
  notes: string;
}

export type EventFieldErrors = Partial<
  Record<"title" | "startAt" | "endAt" | "repeatUntil", string>
>;

export function validateEvent(input: EventInput): EventFieldErrors {
  const errors: EventFieldErrors = {};

  if (!input.title.trim()) {
    errors.title = "Title is required.";
  }
  if (!input.startAt) {
    errors.startAt = "Start is required.";
  }
  if (!input.endAt) {
    errors.endAt = "End is required.";
  }

  if (input.startAt && input.endAt) {
    const start = new Date(input.startAt);
    const end = new Date(input.endAt);
    if (end.getTime() < start.getTime()) {
      errors.endAt = "End must be after start.";
    }
  }

  if (input.repeat !== "none") {
    if (!input.repeatUntil) {
      errors.repeatUntil = "Pick when the repeat ends.";
    } else if (input.startAt) {
      const start = new Date(input.startAt);
      const until = new Date(input.repeatUntil);
      if (until.getTime() < start.getTime()) {
        errors.repeatUntil = "Repeat end must be after the start date.";
      }
    }
  }

  return errors;
}

export function reminderMinutesFromInput(reminder: string): number | null {
  if (reminder === "") return null;
  const minutes = Number(reminder);
  return Number.isNaN(minutes) ? null : minutes;
}

/** One calendar month later, day-of-month clamped like lib/calendar/view.ts shiftDate. */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function stepFor(repeat: EventRepeat): { days?: number; months?: number } {
  switch (repeat) {
    case "daily":
      return { days: 1 };
    case "weekly":
      return { days: 7 };
    case "biweekly":
      return { days: 14 };
    case "monthly":
      return { months: 1 };
    case "none":
      return {};
  }
}

export interface EventOccurrence {
  start: Date;
  end: Date;
}

/**
 * Expands a single start/end into every occurrence up to (and including)
 * `until`, capped at MAX_OCCURRENCES. `repeat: "none"` always returns
 * exactly the one occurrence regardless of `until`.
 */
export function generateOccurrences(
  start: Date,
  end: Date,
  repeat: EventRepeat,
  until: Date | null,
): EventOccurrence[] {
  const durationMs = end.getTime() - start.getTime();
  if (repeat === "none" || !until) return [{ start, end }];

  const step = stepFor(repeat);
  const occurrences: EventOccurrence[] = [];
  let cursorStart = start;

  while (cursorStart.getTime() <= until.getTime() && occurrences.length < MAX_OCCURRENCES) {
    occurrences.push({
      start: cursorStart,
      end: new Date(cursorStart.getTime() + durationMs),
    });
    cursorStart = step.months
      ? addMonths(cursorStart, step.months)
      : new Date(cursorStart.getTime() + (step.days ?? 1) * 86_400_000);
  }

  return occurrences;
}
