// BR-04 — Pomodoro classification, streak, and weekly stats.
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 5.
import type { FocusResult } from "@/lib/supabase/types";

export const POMODORO_SECONDS = 25 * 60;

/** Only a full 25:00 counts as `completed` — anything shorter is `partial` (BR-04). */
export function classify(elapsedSeconds: number): FocusResult {
  return elapsedSeconds >= POMODORO_SECONDS ? "completed" : "partial";
}

export interface FocusSessionLike {
  assignmentId: string;
  startedAt: string;
  durationSeconds: number;
  result: FocusResult;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Consecutive days (walking back from today) with at least one `completed`
 * session. If today has none yet, the streak is anchored at yesterday
 * instead of being broken — today just hasn't happened yet.
 */
export function streakDays(
  sessions: Pick<FocusSessionLike, "startedAt" | "result">[],
  today = new Date(),
): number {
  const completedDays = new Set(
    sessions
      .filter((s) => s.result === "completed")
      .map((s) => dayKey(new Date(s.startedAt))),
  );

  let cursor = startOfDay(today);
  if (!completedDays.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (completedDays.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
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

/** Sessions from the 7 days up to and including `now`. */
export function weeklyStats(
  sessions: FocusSessionLike[],
  now = new Date(),
): WeeklyFocusStats {
  const weekAgo = addDays(startOfDay(now), -6).getTime();
  const recent = sessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo);

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
    stats.minutesByAssignment[s.assignmentId] =
      (stats.minutesByAssignment[s.assignmentId] ?? 0) + minutes;
  }

  stats.completedMinutes = Math.round(stats.completedMinutes);
  stats.partialMinutes = Math.round(stats.partialMinutes);
  return stats;
}
