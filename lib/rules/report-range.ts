// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 7 (Weekly Report) —
// pure date-range helpers for the ?week=YYYY-MM-DD navigation. Mirrors the
// Monday-start convention already used by Schedule (lib/calendar/view.ts)
// and AI Planner (app/api/plan/generate/route.ts).
import { dayKey, defaultTimeZone, shiftDayKey } from "@/lib/rules/focus";

/** Monday `YYYY-MM-DD` of the calendar week containing `date`, in `timeZone`. */
export function mondayOf(date: Date, timeZone: string = defaultTimeZone()): string {
  const key = dayKey(date, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (weekday + 6) % 7; // days since Monday
  return shiftDayKey(key, -mondayOffset);
}

/** Validates and normalizes an untrusted `?week=` param — falls back to the
 * viewer's current week for anything missing/malformed/not-a-Monday, so a
 * hand-edited or stale URL can never desync the report from a real week. */
export function parseWeekParam(
  value: string | undefined,
  now: Date = new Date(),
  timeZone: string = defaultTimeZone(),
): string {
  const currentMonday = mondayOf(now, timeZone);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return currentMonday;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(parsed.getTime())) return currentMonday;
  // Must itself be a Monday — otherwise silently re-anchor rather than
  // report a lopsided "week" starting mid-week.
  if (mondayOf(parsed, "UTC") !== value) return currentMonday;
  return value;
}

export interface WeekRange {
  /** Monday 00:00, as a real Date instant in `timeZone`. */
  start: Date;
  /** The following Monday 00:00 (exclusive end). */
  end: Date;
}

/** Converts a Monday `YYYY-MM-DD` key into actual UTC instants for the
 * given viewer timezone, for use in Postgres range queries. */
export function weekRangeForMonday(
  mondayKey: string,
  timeZone: string = defaultTimeZone(),
): WeekRange {
  // The offset between this local calendar day and UTC, sampled at local
  // noon to dodge any DST transition landing exactly at midnight.
  const noonLocal = new Date(`${mondayKey}T12:00:00`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(noonLocal);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const zonedNoon = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = noonLocal.getTime() - zonedNoon;

  const [y, m, d] = mondayKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMs);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}

export function previousWeek(mondayKey: string): string {
  return shiftDayKey(mondayKey, -7);
}

export function nextWeek(mondayKey: string): string {
  return shiftDayKey(mondayKey, 7);
}

/** Never navigate into a week that hasn't started yet. */
export function isFutureWeek(
  mondayKey: string,
  now: Date = new Date(),
  timeZone: string = defaultTimeZone(),
): boolean {
  return mondayKey > mondayOf(now, timeZone);
}
