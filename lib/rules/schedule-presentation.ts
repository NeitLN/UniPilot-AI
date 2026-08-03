// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 2 (Schedule) — pure
// presentation helpers for the week time-grid redesign. No Supabase/DOM
// dependency, so every function is directly unit-testable
// (tests/rules/schedule-presentation.test.ts).
import { dayKey, defaultTimeZone } from "@/lib/rules/focus";

export interface ClassBlockLite {
  id: string;
  title: string;
  location: string | null;
  startAt: string;
  endAt: string;
  courseId: string | null;
  courseName: string | null;
  isAllDay: boolean;
}

/** The soonest class that hasn't ended yet — "happening now" if its start
 * has already passed, otherwise genuinely upcoming. All-day blocks are
 * excluded (brief §2.2: "Next class" is a real timed class, not an
 * all-day marker). */
export function nextClass(blocks: ClassBlockLite[], now: Date = new Date()): ClassBlockLite | null {
  const candidates = blocks.filter((b) => !b.isAllDay && new Date(b.endAt).getTime() > now.getTime());
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
}

export function isHappeningNow(block: Pick<ClassBlockLite, "startAt" | "endAt">, now: Date = new Date()): boolean {
  const start = new Date(block.startAt).getTime();
  const end = new Date(block.endAt).getTime();
  return start <= now.getTime() && now.getTime() < end;
}

export function todayBlocks(
  blocks: ClassBlockLite[],
  now: Date = new Date(),
  timeZone: string = defaultTimeZone(),
): ClassBlockLite[] {
  const todayKey = dayKey(now, timeZone);
  return blocks
    .filter((b) => dayKey(new Date(b.startAt), timeZone) === todayKey)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export const SCHEDULE_WINDOW_START_MIN = 8 * 60; // 08:00
export const SCHEDULE_WINDOW_END_MIN = 20 * 60; // 20:00

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

/**
 * Minutes of genuinely free time within the 08:00-20:00 display window for
 * one calendar day — the complement of every (non-all-day) class block on
 * that day. Mirrors lib/rules/plan-presentation.ts's freeAvailabilityBands
 * but returns a single total (Schedule's "free blocks" stat is a count +
 * total, not a per-band render).
 */
export function freeMinutesForDay(
  targetDayKey: string,
  blocks: ClassBlockLite[],
  timeZone: string = defaultTimeZone(),
): { freeMinutes: number; blockCount: number } {
  const busy = blocks
    .filter((b) => !b.isAllDay && dayKey(new Date(b.startAt), timeZone) === targetDayKey)
    .map((b) => ({
      start: Math.max(SCHEDULE_WINDOW_START_MIN, minutesOfDay(new Date(b.startAt), timeZone)),
      end: Math.min(SCHEDULE_WINDOW_END_MIN, minutesOfDay(new Date(b.endAt), timeZone)),
    }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const r of busy) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }

  let freeMinutes = 0;
  let blockCount = 0;
  let cursor = SCHEDULE_WINDOW_START_MIN;
  for (const b of merged) {
    if (b.start > cursor) {
      freeMinutes += b.start - cursor;
      blockCount += 1;
    }
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < SCHEDULE_WINDOW_END_MIN) {
    freeMinutes += SCHEDULE_WINDOW_END_MIN - cursor;
    blockCount += 1;
  }
  return { freeMinutes, blockCount };
}

/** Vertical position (0-100) of an event within a time grid spanning
 * [gridStartMin, gridEndMin) — clamps events that start before or end
 * after the grid instead of rendering off-canvas, and flags the clamp so
 * the caller can show a "continues before/after" indicator. */
export interface EventPosition {
  topPct: number;
  heightPct: number;
  clampedStart: boolean;
  clampedEnd: boolean;
}

export function positionEvent(
  startMin: number,
  endMin: number,
  gridStartMin: number = SCHEDULE_WINDOW_START_MIN,
  gridEndMin: number = SCHEDULE_WINDOW_END_MIN,
): EventPosition {
  const span = gridEndMin - gridStartMin;
  const clampedStart = startMin < gridStartMin;
  const clampedEnd = endMin > gridEndMin;
  const s = Math.max(gridStartMin, Math.min(startMin, gridEndMin));
  const e = Math.max(gridStartMin, Math.min(endMin, gridEndMin));
  return {
    topPct: ((s - gridStartMin) / span) * 100,
    heightPct: Math.max(0, ((e - s) / span) * 100),
    clampedStart,
    clampedEnd,
  };
}

export interface OverlapLayout<T> {
  event: T;
  column: number;
  columnCount: number;
}

/** Side-by-side column assignment for overlapping events on the same day —
 * greedy interval-graph coloring: sorted by start, each event takes the
 * first column whose previous occupant has already ended; the group's
 * column count is the max concurrent overlap so every event in a cluster
 * renders at the same width (not just squeezed against its one neighbor). */
export function layoutOverlappingEvents<T extends { startAt: string; endAt: string }>(
  events: T[],
): OverlapLayout<T>[] {
  const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const columnEndTimes: number[] = []; // columnEndTimes[i] = end time (ms) of the last event placed in column i
  const placements: { event: T; column: number }[] = [];

  for (const ev of sorted) {
    const start = new Date(ev.startAt).getTime();
    const end = new Date(ev.endAt).getTime();
    let column = columnEndTimes.findIndex((endTime) => endTime <= start);
    if (column === -1) {
      column = columnEndTimes.length;
      columnEndTimes.push(end);
    } else {
      columnEndTimes[column] = end;
    }
    placements.push({ event: ev, column });
  }

  // Cluster overlapping placements together so each cluster shares one
  // columnCount (an event that overlaps 3 others should be 1/3 width, even
  // if a later non-overlapping event in the same list only ever used 1
  // column) — recomputed per maximal run of mutually-connected intervals.
  const result: OverlapLayout<T>[] = [];
  let clusterStart = 0;
  while (clusterStart < placements.length) {
    let clusterEnd = new Date(placements[clusterStart].event.endAt).getTime();
    let i = clusterStart + 1;
    while (i < placements.length && new Date(placements[i].event.startAt).getTime() < clusterEnd) {
      clusterEnd = Math.max(clusterEnd, new Date(placements[i].event.endAt).getTime());
      i += 1;
    }
    const cluster = placements.slice(clusterStart, i);
    const columnCount = Math.max(...cluster.map((p) => p.column)) + 1;
    for (const p of cluster) result.push({ event: p.event, column: p.column, columnCount });
    clusterStart = i;
  }
  return result;
}

export interface DateRangeLike {
  start: string | Date;
  end: string | Date;
}

/** Whether `now` falls inside a [start, end) range — used to decide if the
 * current-time line should render at all (only ever on the week/day that's
 * actually being displayed, never a past or future one). */
export function isCurrentDisplayedRange(range: DateRangeLike, now: Date = new Date()): boolean {
  const start = new Date(range.start).getTime();
  const end = new Date(range.end).getTime();
  const t = now.getTime();
  return t >= start && t < end;
}
