// Pure date-range math for the Day/Week/Month schedule views
// (docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 4).

export type ScheduleView = "day" | "week" | "month";

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** [start, end) — end is exclusive. Week starts Monday. */
export function getViewRange(view: ScheduleView, date: Date): { start: Date; end: Date } {
  const day = startOfDay(date);

  if (view === "day") {
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    return { start: day, end };
  }

  if (view === "week") {
    const mondayOffset = (day.getDay() + 6) % 7; // 0 = Monday
    const start = new Date(day);
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  const start = new Date(day.getFullYear(), day.getMonth(), 1);
  const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
  return { start, end };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** YYYY-MM-DD, safe for a `?date=` URL param without timezone drift. */
export function toDateParam(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Steps the anchor date by one unit of the current view (month-aware, not
 * +30 days). Month steps land on the 1st — `setMonth` on e.g. Jan 31 would
 * otherwise overflow into March when the target month has fewer days, and
 * month view only reads year/month anyway (see getViewRange).
 */
export function shiftDate(view: ScheduleView, date: Date, direction: 1 | -1): Date {
  if (view === "day") return addDays(date, direction);
  if (view === "week") return addDays(date, direction * 7);
  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}

export function parseDateParam(value: string | undefined): Date {
  if (!value) return startOfDay(new Date());
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return startOfDay(new Date());
  return new Date(y, m - 1, d);
}
