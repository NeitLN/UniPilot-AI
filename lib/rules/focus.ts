// BR-04 — Pomodoro classification, streak, and weekly stats.
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 5.
import type { FocusResult, FocusSessionSource } from "@/lib/supabase/types";

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

/** Only reaching the full chosen duration counts as `completed` — anything
 * shorter is `partial` (BR-04). `targetSeconds` defaults to the classic
 * 25:00 Pomodoro for callers that don't have a variable duration to pass
 * (manual entries, pre-Phase-4-redesign stored sessions) — UNIPILOT_8_SCREENS
 * Step 4.1 adds 45/60 min options, so a 45-min session stopped at 30:00 must
 * not misclassify as "completed" just because it beat the old fixed 25:00. */
export function classify(elapsedSeconds: number, targetSeconds: number = POMODORO_SECONDS): FocusResult {
  return elapsedSeconds >= targetSeconds ? "completed" : "partial";
}

// FR-22 (docs/PRODUCT_REVIEW.md) — logging a past session by hand, for
// study that happened offline/without the timer running.

/** A session longer than this reads as a data-entry mistake (a whole day,
 * a wrong AM/PM, forgetting to stop a timer) rather than a real study
 * block — rejected outright instead of quietly accepted into the
 * streak/minutes totals. */
export const MAX_MANUAL_SESSION_MINUTES = 600;

export interface ManualSessionInput {
  startedAt: string; // ISO
  durationMinutes: number;
}

export type ManualSessionFieldErrors = Partial<Record<"startedAt" | "durationMinutes", string>>;

/** `now` is injectable (rather than defaulting silently to `new Date()`
 * inside) so this stays a pure function callers can unit test
 * deterministically — matching every other validate* in lib/rules. */
export function validateManualSession(
  input: ManualSessionInput,
  now: Date = new Date(),
): ManualSessionFieldErrors {
  const errors: ManualSessionFieldErrors = {};

  const started = new Date(input.startedAt);
  if (Number.isNaN(started.getTime())) {
    errors.startedAt = "Pick a valid start time.";
  } else if (started.getTime() > now.getTime()) {
    errors.startedAt = "Start time can't be in the future.";
  }

  const durationMinutes = Math.round(input.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    errors.durationMinutes = "Enter a duration greater than 0.";
  } else if (durationMinutes > MAX_MANUAL_SESSION_MINUTES) {
    errors.durationMinutes = `Sessions over ${MAX_MANUAL_SESSION_MINUTES / 60} hours aren't accepted — check the duration.`;
  } else if (!errors.startedAt) {
    const endedAtMs = started.getTime() + durationMinutes * 60_000;
    if (endedAtMs > now.getTime()) {
      errors.durationMinutes =
        "That duration would end in the future — shorten it or pick an earlier start.";
    }
  }

  return errors;
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
  // FR-22: optional so every existing call site/fixture that doesn't care
  // about the timer/manual distinction doesn't need to start passing it —
  // absent is treated the same as "timer" (weeklyStats only tallies
  // manualMinutes for an explicit "manual").
  source?: FocusSessionSource;
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
export function dayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Shifts a `YYYY-MM-DD` key by whole days. Date.UTC here is just a calendar
 * calculator (no real instant/timezone involved), so it's DST-safe. */
export function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function defaultTimeZone(): string {
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
  /** FR-22: minutes from sessions logged by hand rather than the Pomodoro
   * timer, so the UI can disclose the split without needing to reach into
   * individual session rows. */
  manualMinutes: number;
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
    manualMinutes: 0,
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
    if (s.source === "manual") stats.manualMinutes += minutes;
  }

  // completedMinutes rounds — it only ever backs the headline "Minutes" KPI,
  // where a whole number reads better. partialMinutes stays fractional: it
  // (and every by-course/by-assignment breakdown) goes through
  // formatMinutes() below, which needs the real value to tell "a few
  // seconds" apart from "genuinely nothing" instead of both showing "0 min".
  stats.completedMinutes = Math.round(stats.completedMinutes);
  return stats;
}

export interface DayActivity {
  /** `YYYY-MM-DD`. */
  dayKey: string;
  completedCycles: number;
  minutes: number;
}

/** Per-day totals for the last `days` days (today inclusive) — backs the
 * Focus Timer's weekly activity strip (UNIPILOT_8_SCREENS Step 4.4). Always
 * returns one bucket per day, including days with zero sessions — a day
 * that's genuinely empty is "Rest", not an absent data point. */
export function dailyActivity(
  sessions: Pick<FocusSessionLike, "startedAt" | "durationSeconds" | "result">[],
  now: Date = new Date(),
  timeZone: string = defaultTimeZone(),
  days = 7,
): DayActivity[] {
  const todayKey = dayKey(now, timeZone);
  const buckets: DayActivity[] = Array.from({ length: days }, (_, i) => ({
    dayKey: shiftDayKey(todayKey, -(days - 1 - i)),
    completedCycles: 0,
    minutes: 0,
  }));
  const byKey = new Map(buckets.map((b) => [b.dayKey, b]));

  for (const s of sessions) {
    const bucket = byKey.get(dayKey(new Date(s.startedAt), timeZone));
    if (!bucket) continue;
    bucket.minutes += s.durationSeconds / 60;
    if (s.result === "completed") bucket.completedCycles++;
  }

  return buckets.map((b) => ({ ...b, minutes: Math.round(b.minutes) }));
}

export type ActivityTone = "great" | "good" | "heavy" | "light" | "rest";

/**
 * Classifies a day's load *relative to the viewer's own daily goal* — never
 * an absolute judgment ("3 cycles" means different things to different
 * students). `goalCycles <= 0` (no real goal set) can only ever distinguish
 * Rest from "did something", since there's nothing real to compare against.
 */
export function activityTone(completedCycles: number, goalCycles: number): ActivityTone {
  if (completedCycles === 0) return "rest";
  if (goalCycles <= 0) return "good";
  if (completedCycles >= goalCycles * 1.5) return "heavy";
  if (completedCycles >= goalCycles) return "great";
  if (completedCycles >= goalCycles / 2) return "good";
  return "light";
}

/** Completed work cycles that started on the viewer's *today* — the Daily
 * goal card's numerator (Step 4.3). Only full "completed" cycles count;
 * partial/manual entries don't silently inflate progress toward the goal. */
export function completedCyclesToday(
  sessions: Pick<FocusSessionLike, "startedAt" | "result">[],
  now: Date = new Date(),
  timeZone: string = defaultTimeZone(),
): number {
  const todayKey = dayKey(now, timeZone);
  return sessions.filter((s) => s.result === "completed" && dayKey(new Date(s.startedAt), timeZone) === todayKey)
    .length;
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

/**
 * Round y-axis ticks for a bar chart, from zero up to at least `maxValue`.
 *
 * Picks a 1/2/5-times-power-of-ten step so the top tick is a number people
 * read at a glance (0/20/40/60), rather than scaling the axis to whatever
 * the tallest bar happens to be (0/17/34/51). Always returns at least
 * [0, step] so an all-zero week still draws a labelled axis instead of a
 * bare baseline.
 */
export function chartAxisTicks(maxValue: number, targetIntervals = 4): number[] {
  const target = Math.max(maxValue, 1);
  const rough = target / Math.max(1, targetIntervals);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const top = Math.ceil(target / step) * step;

  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 1000; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}
