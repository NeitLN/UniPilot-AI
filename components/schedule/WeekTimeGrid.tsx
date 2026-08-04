"use client";

import { useState } from "react";
import { addDays, isSameDay } from "@/lib/calendar/view";
import {
  SCHEDULE_WINDOW_END_MIN,
  SCHEDULE_WINDOW_START_MIN,
  formatClockShort,
  isCurrentDisplayedRange,
  layoutOverlappingEvents,
  positionEvent,
} from "@/lib/rules/schedule-presentation";
import { FileText } from "lucide-react";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";
import { ClassDetailPanel } from "./ClassDetailPanel";
import type { AssignmentLink, ClassBlockData } from "./types";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

const HOURS = Array.from(
  { length: SCHEDULE_WINDOW_END_MIN / 60 - SCHEDULE_WINDOW_START_MIN / 60 + 1 },
  (_, i) => SCHEDULE_WINDOW_START_MIN / 60 + i,
);
const GRID_HEIGHT_PX = 624; // 13 hour-rows x 48px

function hourLabel(h: number): string {
  const period = h < 12 || h === 24 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

function minutesOfDayLocal(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** An assignment deadline plotted onto the week grid (concept §8's
 * "Lab 3 report due" chip). Separate from AssignmentLink, which is the
 * course-keyed list ClassDetailPanel shows inside a class's modal. */
export interface DeadlineMarker {
  id: string;
  title: string;
  dueAt: string;
  courseId: string | null;
}

export function WeekTimeGrid({
  rangeStart,
  rangeEnd,
  blocks,
  courses,
  assignmentsByCourse,
  deadlines = [],
}: {
  rangeStart: Date;
  rangeEnd: Date;
  blocks: ClassBlockData[];
  courses: CourseOption[];
  assignmentsByCourse: Record<string, AssignmentLink[]>;
  deadlines?: DeadlineMarker[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const now = new Date();
  const showCurrentTime = isCurrentDisplayedRange({ start: rangeStart, end: rangeEnd }, now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  const nowMinutes = minutesOfDayLocal(now);

  const timedBlocks = blocks.filter((b) => !b.isAllDay);
  const allDayBlocks = blocks.filter((b) => b.isAllDay);

  return (
    <div className="overflow-x-auto">
      {/* 560px is what the 48px gutter + 7 readable day columns + gaps
          actually need. It was 720px, which forced a horizontal scrollbar
          at ordinary laptop widths once the right rail and the app-wide
          1.2x zoom took their share — the week view is meant to show all
          seven days without scrolling. */}
      {/* pb-2 leaves room for the bottom hour label, which sits at top:100%
          with a -50% translate and would otherwise be sliced in half by the
          card edge. */}
      <div className="min-w-[560px] pb-2">
        {allDayBlocks.length > 0 && (
          <div className="mb-2 grid grid-cols-[48px_repeat(7,1fr)]">
            <div />
            {days.map((day) => {
              const dayAllDay = allDayBlocks.filter((b) => isSameDay(new Date(b.startAt), day));
              return (
                <div key={day.toISOString()} className="flex flex-col gap-1 px-0.5">
                  {dayAllDay.map((b) => {
                    const tone = b.courseId ? courseTone(b.courseId) : null;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedId(b.id)}
                        className={`truncate rounded-[6px] px-1.5 py-0.5 text-left text-[10px] font-bold ${tone ? COURSE_TONE_CLASSES[tone].tint : "bg-line"} ${tone ? COURSE_TONE_CLASSES[tone].text : "text-ink-2"}`}
                      >
                        {b.title}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Day headers — "Mon 3" on one line, as the concept has it. The
            previous two-row stack with a filled circle on today ate vertical
            space and made the weekday read as a separate label from its date.
            Today keeps a violet tint: the red rule below spans all seven
            columns, so nothing else on the grid says which day is today. */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)]">
          <div />
          {days.map((day) => {
            const today = isSameDay(day, now);
            return (
              <div key={day.toISOString()} className="pb-2 text-center">
                <p className={`text-[12px] font-bold ${today ? "text-violet-text" : "text-foreground"}`}>
                  {day.toLocaleDateString(undefined, { weekday: "short" })} {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid. `relative` so the current-time rule below can span the
            full width as one element instead of a separate stub inside each
            day column — that's what lets it carry a single clock label in
            the gutter (concept §8) rather than repeating it seven times. */}
        <div className="relative grid grid-cols-[48px_repeat(7,1fr)]">
          <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
            {HOURS.map((h, i) => (
              <span
                key={h}
                className="absolute -translate-y-1/2 text-[10px] font-bold text-ink-3"
                style={{ top: `${(i / (HOURS.length - 1)) * 100}%` }}
              >
                {hourLabel(h)}
              </span>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const dayBlocks = timedBlocks.filter((b) => isSameDay(new Date(b.startAt), day));
            const laidOut = layoutOverlappingEvents(dayBlocks);
            const dayDeadlines = deadlines.filter((d) => isSameDay(new Date(d.dueAt), day));

            return (
              // One continuous ruled grid, per the concept: hairline column
              // rules on the card's own surface, instead of seven detached
              // rounded `bg-canvas` slabs separated by gaps. The gaps used to
              // break every hour line into seven disconnected segments, so the
              // eye couldn't track a time across the week.
              <div
                key={day.toISOString()}
                className={`relative border-l border-border-subtle-2 ${dayIndex === 6 ? "border-r" : ""}`}
                style={{ height: GRID_HEIGHT_PX }}
              >
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border-subtle-2"
                    style={{ top: `${(i / (HOURS.length - 1)) * 100}%` }}
                  />
                ))}

                {laidOut.map(({ event: b, column, columnCount }) => {
                  const start = new Date(b.startAt);
                  const end = new Date(b.endAt);
                  const pos = positionEvent(minutesOfDayLocal(start), minutesOfDayLocal(end));
                  const tone = b.courseId ? courseTone(b.courseId) : null;
                  const widthPct = 100 / columnCount;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={`absolute overflow-hidden rounded-[8px] p-1.5 text-left shadow-sm ${
                        tone
                          ? `${COURSE_TONE_CLASSES[tone].solid} ${COURSE_TONE_CLASSES[tone].onSolid}`
                          : "bg-line text-ink-2"
                      }`}
                      // The 2px inset replaces the column gap the grid used to
                      // have: absolute children resolve against the padding
                      // box, so padding on the column would not have insetted
                      // them.
                      style={{
                        top: `${pos.topPct}%`,
                        height: `${Math.max(pos.heightPct, 3)}%`,
                        left: `calc(${column * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                    >
                      {/* Wraps to two lines when the block is tall enough to
                          show them — a truncated "Require…" tells you far
                          less than the concept's wrapped course name. */}
                      <p className={`text-[10px] font-extrabold leading-tight ${pos.heightPct > 9 ? "line-clamp-2" : "truncate"}`}>
                        {b.title}
                      </p>
                      {/* Local-time formatting differs SSR vs hydration by design. */}
                      <p className="truncate text-[9px] font-semibold opacity-80" suppressHydrationWarning>
                        {formatClockShort(start)}
                        {pos.heightPct > 8 && `–${formatClockShort(end)}`}
                      </p>
                      {b.location && pos.heightPct > 11 && (
                        <p className="truncate text-[9px] font-semibold opacity-75">{b.location}</p>
                      )}
                    </button>
                  );
                })}

                {/* Deadlines are a point in time, not a span, and most land
                    late at night — outside the 08:00-20:00 window entirely.
                    Rather than drop them or stretch the window to 24h for
                    one chip a week, they pin to the foot of their own day
                    with the real due time spelled out. */}
                {dayDeadlines.length > 0 && (
                  <div className="absolute inset-x-1 bottom-1 z-10 flex flex-col gap-1">
                    {dayDeadlines.map((d) => (
                      <div
                        key={d.id}
                        title={`${d.title} — due ${new Date(d.dueAt).toLocaleString()}`}
                        className="relative rounded-[8px] border border-coral/40 bg-coral-tint px-1.5 py-1"
                      >
                        {/* The dot on the top edge is what marks this as a
                            point in time rather than a block that occupies
                            one — the chip's own body is only as tall as its
                            text, which would otherwise read as a duration. */}
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-coral"
                        />
                        {/* Wraps rather than truncates: "Lab 3 re…" hides the
                            one thing the chip exists to tell you. */}
                        <p className="flex items-start gap-1 text-[9.5px] font-extrabold text-coral-text">
                          <FileText className="mt-px h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          <span className="line-clamp-2">{d.title} due</span>
                        </p>
                        {/* Local-time formatting differs SSR vs hydration by
                            design, same as every other time label here. */}
                        <p className="truncate text-[9px] font-semibold text-coral-text/80" suppressHydrationWarning>
                          {new Date(d.dueAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {showCurrentTime && nowMinutes >= SCHEDULE_WINDOW_START_MIN && nowMinutes <= SCHEDULE_WINDOW_END_MIN && (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex -translate-y-1/2 items-center"
              style={{ top: `${positionEvent(nowMinutes, nowMinutes + 1).topPct}%` }}
            >
              {/* The rule itself is a coral fill, but its clock label is
                  *text* on the card's own background, where the bare accent
                  token measures ~3.1:1 — under AA. The darker paired token is
                  the one that's safe here (D-03 / semantic-color-text-guard). */}
              <span
                className="w-12 shrink-0 pr-1.5 text-right text-[9.5px] font-extrabold text-coral-text"
                suppressHydrationWarning
              >
                {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </span>
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
              <span aria-hidden="true" className="h-[2px] flex-1 bg-coral" />
            </div>
          )}
        </div>
      </div>

      <ClassDetailPanel
        key={selected?.id ?? "none"}
        block={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        courses={courses}
        linkedAssignments={selected?.courseId ? (assignmentsByCourse[selected.courseId] ?? []) : []}
      />
    </div>
  );
}
