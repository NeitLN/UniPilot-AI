// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 1 (AI Planner) — pure
// presentation helpers for the timeline/health/note redesign. Kept
// dependency-free of Supabase so every function here is directly
// unit-testable (tests/rules/plan-presentation.test.ts).
import { dayKey, defaultTimeZone, shiftDayKey } from "@/lib/rules/focus";

export interface PlanSessionLite {
  id: string;
  assignmentId: string | null;
  assignmentTitle: string;
  courseId: string | null;
  courseName: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export interface DayTab {
  dayKey: string;
  /** "Mon 3" */
  shortLabel: string;
  /** "Monday, Aug 3" */
  longLabel: string;
}

/** The plan's 7-day week (Mon-Sun) as day tabs, even for days with zero
 * sessions — the concept always shows all 7 tabs, not just days that have
 * something scheduled. `weekStartDate` is the plan's own `week_start`
 * column (already Monday, see app/api/plan/generate/route.ts), read as a
 * plain YYYY-MM-DD date rather than reinterpreted through a timezone — the
 * label formatting below is local-display-only (noon-anchored to dodge any
 * DST-edge date shift), the same "expected to differ SSR vs hydration, not
 * a real mismatch" pattern already used for time labels elsewhere in this
 * app, so there's no viewer timeZone parameter to thread through here. */
export function weekDayTabs(weekStartDate: string): DayTab[] {
  const startKey = weekStartDate.slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDayKey(startKey, i);
    const asDate = new Date(`${key}T12:00:00`); // noon avoids any DST-edge date shift
    return {
      dayKey: key,
      shortLabel: asDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      longLabel: asDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    };
  });
}

/** Buckets sessions onto the viewer's local calendar day. */
export function groupSessionsByViewerDay(
  sessions: PlanSessionLite[],
  timeZone: string = defaultTimeZone(),
): Map<string, PlanSessionLite[]> {
  const map = new Map<string, PlanSessionLite[]>();
  for (const s of [...sessions].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const key = dayKey(new Date(s.startAt), timeZone);
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return map;
}

export function totalPlannedMinutes(sessions: PlanSessionLite[]): number {
  return sessions.reduce(
    (sum, s) => sum + (new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60000,
    0,
  );
}

export function formatMinutes(totalMinutes: number): string {
  const mins = Math.round(totalMinutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function coveredAssignmentCount(sessions: PlanSessionLite[]): number {
  return new Set(sessions.map((s) => s.assignmentId).filter((id): id is string => Boolean(id)))
    .size;
}

/** Coverage = unique assignments with a session / assignments due within
 * the plan's window. `null` (not 0) when the denominator is 0 — the
 * roadmap explicitly forbids showing a misleading 0% when there was
 * nothing to cover in the first place. */
export function planCoverage(dueAssignmentCount: number, coveredCount: number): number | null {
  if (dueAssignmentCount <= 0) return null;
  return Math.round((Math.min(coveredCount, dueAssignmentCount) / dueAssignmentCount) * 100);
}

export function planHealthLabel(coveragePct: number | null): string {
  if (coveragePct === null) return "No deadlines this week";
  if (coveragePct >= 75) return "Great balance!";
  if (coveragePct >= 40) return "Solid coverage";
  return "A few deadlines may need more time";
}

export interface DayLoad {
  dayKey: string;
  label: string;
  minutes: number;
  sessionCount: number;
}

/**
 * Deterministic, evidence-only note — never invents a reason the data can't
 * support (e.g. never claims "after your afternoon class" unless a class
 * block was actually checked). Tiers, in priority order:
 *  1. One day is meaningfully heavier than the rest → name it.
 *  2. Exactly one weekday (Mon-Fri) among otherwise-scheduled weekdays has
 *     zero sessions → name it as a kept-light day.
 *  3. Neutral fallback — no claim strong enough to make confidently.
 */
export function derivePiloPlanNote(days: DayLoad[]): string {
  const active = days.filter((d) => d.sessionCount > 0);
  if (active.length === 0) return "No sessions scheduled yet.";

  const totalMinutes = active.reduce((sum, d) => sum + d.minutes, 0);
  const avgMinutes = totalMinutes / active.length;
  const heaviest = [...active].sort((a, b) => b.minutes - a.minutes)[0];

  if (active.length >= 2 && heaviest.minutes > avgMinutes * 1.5) {
    return `${heaviest.label} is your heaviest day — ${heaviest.sessionCount} session${heaviest.sessionCount === 1 ? "" : "s"}, ${formatMinutes(heaviest.minutes)}.`;
  }

  const weekdays = days.slice(0, 5); // Mon-Fri, days[] is always Mon-first
  const emptyWeekdays = weekdays.filter((d) => d.sessionCount === 0);
  const busyWeekdays = weekdays.filter((d) => d.sessionCount > 0);
  if (emptyWeekdays.length === 1 && busyWeekdays.length >= 2) {
    return `I kept ${emptyWeekdays[0].label} light — no sessions scheduled that day.`;
  }

  return "Your sessions are spread across the week.";
}

export const AVAILABILITY_WINDOW_START_MIN = 8 * 60; // 08:00
export const AVAILABILITY_WINDOW_END_MIN = 20 * 60; // 20:00
const NOON_MIN = 12 * 60;
/** Last two hours of the display window (18:00-20:00) — tagged "low"
 * instead of "afternoon". This is a clock-time rule applied identically to
 * every viewer, not a claim about any individual's actual energy or
 * behavior — same category of deterministic planning heuristic as the
 * Workload Risk score itself, not fabricated per-user data. */
const LOW_ENERGY_START_MIN = 18 * 60;

function minutesOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

export interface BusyRange {
  startAt: string;
  endAt: string;
}

export interface AvailabilityBand {
  startMinute: number;
  endMinute: number;
  period: "morning" | "afternoon" | "low";
}

/**
 * Free time within the 08:00-20:00 display window for one calendar day —
 * the complement of every busy range (class blocks + plan sessions) that
 * falls on `targetDayKey`. Assumes each busy range starts and ends on the
 * same local day (true for every class block and study session in this
 * app); a range spanning midnight would be clamped to the window rather
 * than mis-rendered.
 */
export function freeAvailabilityBands(
  targetDayKey: string,
  busyRanges: BusyRange[],
  timeZone: string = defaultTimeZone(),
): AvailabilityBand[] {
  const busyOnDay = busyRanges
    .filter((r) => dayKey(new Date(r.startAt), timeZone) === targetDayKey)
    .map((r) => ({
      start: Math.max(AVAILABILITY_WINDOW_START_MIN, minutesOfDay(new Date(r.startAt), timeZone)),
      end: Math.min(AVAILABILITY_WINDOW_END_MIN, minutesOfDay(new Date(r.endAt), timeZone)),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping/adjacent busy ranges before taking the complement.
  const merged: { start: number; end: number }[] = [];
  for (const r of busyOnDay) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  const free: { start: number; end: number }[] = [];
  let cursor = AVAILABILITY_WINDOW_START_MIN;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < AVAILABILITY_WINDOW_END_MIN)
    free.push({ start: cursor, end: AVAILABILITY_WINDOW_END_MIN });

  // Split each free interval at noon and again at 18:00 so morning/
  // afternoon/low-energy can be tinted differently (brief §1.2 — legend
  // must have real text, not color alone).
  const bands: AvailabilityBand[] = [];
  for (const f of free) {
    if (f.start < NOON_MIN) {
      bands.push({ startMinute: f.start, endMinute: Math.min(f.end, NOON_MIN), period: "morning" });
    }
    if (f.end > NOON_MIN && f.start < LOW_ENERGY_START_MIN) {
      bands.push({
        startMinute: Math.max(f.start, NOON_MIN),
        endMinute: Math.min(f.end, LOW_ENERGY_START_MIN),
        period: "afternoon",
      });
    }
    if (f.end > LOW_ENERGY_START_MIN) {
      bands.push({
        startMinute: Math.max(f.start, LOW_ENERGY_START_MIN),
        endMinute: f.end,
        period: "low",
      });
    }
  }
  return bands.filter((b) => b.endMinute > b.startMinute);
}
