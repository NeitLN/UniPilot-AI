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

/**
 * The heading above the grid: "Aug 3–9, 2026" for a week, "Aug 4, 2026" for a
 * day, "August 2026" for a month. Week view previously showed only the anchor
 * date ("August 4, 2026"), which said nothing about the six other days on
 * screen — the concept labels the span, not the cursor.
 *
 * `getViewRange` returns an exclusive end, so the last visible day is end-1;
 * the year is printed once when both ends share it, and the month is repeated
 * only when the span actually crosses one.
 */
export function formatViewRangeLabel(
  view: ScheduleView,
  date: Date,
  locale?: string,
): string {
  const { start, end } = getViewRange(view, date);
  const last = addDays(end, -1);

  if (view === "month") {
    return start.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  if (view === "day") {
    return start.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  const sameYear = start.getFullYear() === last.getFullYear();
  const sameMonth = sameYear && start.getMonth() === last.getMonth();

  if (sameMonth) {
    const head = start.toLocaleDateString(locale, { month: "short", day: "numeric" });
    return `${head}–${last.getDate()}, ${last.getFullYear()}`;
  }
  if (sameYear) {
    const head = start.toLocaleDateString(locale, { month: "short", day: "numeric" });
    const tail = last.toLocaleDateString(locale, { month: "short", day: "numeric" });
    return `${head}–${tail}, ${last.getFullYear()}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString(locale, opts)}–${last.toLocaleDateString(locale, opts)}`;
}

export function parseDateParam(value: string | undefined): Date {
  if (!value) return startOfDay(new Date());
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return startOfDay(new Date());
  return new Date(y, m - 1, d);
}
