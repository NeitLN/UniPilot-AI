// BR-04 — Pomodoro classification, streak, and weekly stats.
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 5.
import type { FocusResult } from "@/lib/supabase/types";

export const POMODORO_SECONDS = 25 * 60;

// F-01: the SRS glossary defines Pomodoro as 25-minute work intervals
// *followed by 5-minute breaks* — the timer only had the work half. A short
// break follows every completed work cycle; a long break replaces it every
// 4th (the standard Pomodoro Technique cadence).
export const SHORT_BREAK_SECONDS = 5 * 60;
export const LONG_BREAK_SECONDS = 15 * 60;
export const CYCLES_BEFORE_LONG_BREAK = 4;

/** `completedCycleNumber` is 1-indexed (the cycle that was just finished). */
export function breakKindForCycle(completedCycleNumber: number): "short" | "long" {
  return completedCycleNumber % CYCLES_BEFORE_LONG_BREAK === 0 ? "long" : "short";
}

/** Only a full 25:00 counts as `completed` — anything shorter is `partial` (BR-04). */
export function classify(elapsedSeconds: number): FocusResult {
  return elapsedSeconds >= POMODORO_SECONDS ? "completed" : "partial";
}

export interface FocusSessionLike {
  // Phase 4.1: null once the assignment this session was logged against
  // has since been deleted (migration 0012 — assignment_id goes null
  // rather than cascade-deleting the session itself, preserving streak
  // and minute history).
  assignmentId: string | null;
  startedAt: string;
  durationSeconds: number;
  result: FocusResult;
}

/** Sentinel key `minutesByAssignment` groups orphaned sessions under —
 * never a valid assignment id, so it can't collide with a real one. */
export const ORPHANED_SESSION_KEY = "__deleted__";

/**
 * `YYYY-MM-DD` for `d` as seen in `timeZone` — not the server's local zone.
 * A server that runs in UTC (typical for Vercel) would otherwise bucket a
 * late-evening session into the *next* calendar day for anyone west of UTC,
 * silently breaking streaks that felt consecutive to the user.
 */
function dayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Shifts a `YYYY-MM-DD` key by whole days. Date.UTC here is just a calendar
 * calculator (no real instant/timezone involved), so it's DST-safe. */
function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function defaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export interface StreakOptions {
  today?: Date;
  timeZone?: string;
}

/**
 * Consecutive days (walking back from today) with at least one `completed`
 * session. If today has none yet, the streak is anchored at yesterday
 * instead of being broken — today just hasn't happened yet.
 *
 * `today`/`timeZone` are optional and grouped in one options object (rather
 * than positional params) so a caller who only wants to override `timeZone`
 * never has to also write `new Date()` at the call site — that would be a
 * direct impure call inside a Server Component's render body.
 */
export function streakDays(
  sessions: Pick<FocusSessionLike, "startedAt" | "result">[],
  options: StreakOptions = {},
): number {
  const { today = new Date(), timeZone = defaultTimeZone() } = options;
  const completedDays = new Set(
    sessions
      .filter((s) => s.result === "completed")
      .map((s) => dayKey(new Date(s.startedAt), timeZone)),
  );

  let cursorKey = dayKey(today, timeZone);
  if (!completedDays.has(cursorKey)) {
    cursorKey = shiftDayKey(cursorKey, -1);
  }

  let streak = 0;
  while (completedDays.has(cursorKey)) {
    streak++;
    cursorKey = shiftDayKey(cursorKey, -1);
  }
  return streak;
}

export interface WeeklyFocusStats {
  completedCycles: number;
  partialSessions: number;
  completedMinutes: number;
  partialMinutes: number;
  minutesByAssignment: Record<string, number>;
}

export interface WeeklyStatsOptions {
  now?: Date;
  timeZone?: string;
}

/** Sessions from the 7 days (in `timeZone`) up to and including `now`. */
export function weeklyStats(
  sessions: FocusSessionLike[],
  options: WeeklyStatsOptions = {},
): WeeklyFocusStats {
  const { now = new Date(), timeZone = defaultTimeZone() } = options;
  const todayKey = dayKey(now, timeZone);
  const weekAgoKey = shiftDayKey(todayKey, -6);
  const recent = sessions.filter(
    (s) => dayKey(new Date(s.startedAt), timeZone) >= weekAgoKey,
  );

  const stats: WeeklyFocusStats = {
    completedCycles: 0,
    partialSessions: 0,
    completedMinutes: 0,
    partialMinutes: 0,
    minutesByAssignment: {},
  };

  for (const s of recent) {
    const minutes = s.durationSeconds / 60;
    if (s.result === "completed") {
      stats.completedCycles++;
      stats.completedMinutes += minutes;
    } else {
      stats.partialSessions++;
      stats.partialMinutes += minutes;
    }
    const key = s.assignmentId ?? ORPHANED_SESSION_KEY;
    stats.minutesByAssignment[key] = (stats.minutesByAssignment[key] ?? 0) + minutes;
  }

  // completedMinutes rounds — it only ever backs the headline "Minutes" KPI,
  // where a whole number reads better. partialMinutes stays fractional: it
  // (and every by-course/by-assignment breakdown) goes through
  // formatMinutes() below, which needs the real value to tell "a few
  // seconds" apart from "genuinely nothing" instead of both showing "0 min".
  stats.completedMinutes = Math.round(stats.completedMinutes);
  return stats;
}

/** B-02: a sub-minute session used to render as a flat "0 min", reading as
 * lost data. `< 1 min` says something real happened; anything at or past a
 * minute rounds normally. */
export function formatMinutes(minutes: number): string {
  if (minutes > 0 && minutes < 1) return "< 1 min";
  return `${Math.round(minutes)} min`;
}

export interface WeekMinutes {
  /** `YYYY-MM-DD` of the bucket's first day. */
  weekStart: string;
  minutes: number;
}

/**
 * §5 "Thống kê học tập theo thời gian" — rolling 7-day buckets counted back
 * from `now`, oldest first, matching weeklyStats' own week definition rather
 * than ISO week numbers (so "this week" always means the same thing in both
 * places).
 */
export function weeklyMinutesSeries(
  sessions: FocusSessionLike[],
  options: WeeklyStatsOptions & { weeks?: number } = {},
): WeekMinutes[] {
  const { now = new Date(), timeZone = defaultTimeZone(), weeks = 8 } = options;
  const todayKey = dayKey(now, timeZone);

  const buckets: WeekMinutes[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: shiftDayKey(shiftDayKey(todayKey, -7 * i), -6), minutes: 0 });
  }

  for (const s of sessions) {
    const key = dayKey(new Date(s.startedAt), timeZone);
    const bucket = buckets.find((b) => key >= b.weekStart && key <= shiftDayKey(b.weekStart, 6));
    if (bucket) bucket.minutes += s.durationSeconds / 60;
  }

  return buckets.map((b) => ({ ...b, minutes: Math.round(b.minutes) }));
}
