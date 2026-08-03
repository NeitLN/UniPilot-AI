"use client";

import { useState } from "react";
import { addDays, isSameDay } from "@/lib/calendar/view";
import {
  SCHEDULE_WINDOW_END_MIN,
  SCHEDULE_WINDOW_START_MIN,
  isCurrentDisplayedRange,
  layoutOverlappingEvents,
  positionEvent,
} from "@/lib/rules/schedule-presentation";
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

export function WeekTimeGrid({
  rangeStart,
  rangeEnd,
  blocks,
  courses,
  assignmentsByCourse,
}: {
  rangeStart: Date;
  rangeEnd: Date;
  blocks: ClassBlockData[];
  courses: CourseOption[];
  assignmentsByCourse: Record<string, AssignmentLink[]>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const now = new Date();
  const showCurrentTime = isCurrentDisplayedRange({ start: rangeStart, end: rangeEnd }, now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));

  const timedBlocks = blocks.filter((b) => !b.isAllDay);
  const allDayBlocks = blocks.filter((b) => b.isAllDay);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {allDayBlocks.length > 0 && (
          <div className="mb-2 grid grid-cols-[48px_repeat(7,1fr)] gap-1.5">
            <div />
            {days.map((day) => {
              const dayAllDay = allDayBlocks.filter((b) => isSameDay(new Date(b.startAt), day));
              return (
                <div key={day.toISOString()} className="flex flex-col gap-1">
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

        {/* Day headers */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1.5">
          <div />
          {days.map((day) => {
            const today = isSameDay(day, now);
            return (
              <div key={day.toISOString()} className="pb-1.5 text-center">
                <p className={`text-[10.5px] font-extrabold uppercase tracking-wide ${today ? "text-violet" : "text-ink-3"}`}>
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </p>
                <p
                  className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-bold ${
                    today ? "bg-violet text-white" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1.5">
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

          {days.map((day) => {
            const dayBlocks = timedBlocks.filter((b) => isSameDay(new Date(b.startAt), day));
            const laidOut = layoutOverlappingEvents(dayBlocks);
            const today = isSameDay(day, now);
            const nowMinutes = minutesOfDayLocal(now);
            const nowPos = positionEvent(nowMinutes, nowMinutes + 1);

            return (
              <div
                key={day.toISOString()}
                className="relative rounded-ctl bg-canvas"
                style={{ height: GRID_HEIGHT_PX }}
              >
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border-subtle-2"
                    style={{ top: `${(i / (HOURS.length - 1)) * 100}%` }}
                  />
                ))}

                {today && showCurrentTime && nowMinutes >= SCHEDULE_WINDOW_START_MIN && nowMinutes <= SCHEDULE_WINDOW_END_MIN && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 z-10 h-[2px] bg-coral"
                    style={{ top: `${nowPos.topPct}%` }}
                  />
                )}

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
                      className={`absolute overflow-hidden rounded-[8px] p-1.5 text-left shadow-sm ${tone ? COURSE_TONE_CLASSES[tone].tint : "bg-line"}`}
                      style={{
                        top: `${pos.topPct}%`,
                        height: `${Math.max(pos.heightPct, 3)}%`,
                        left: `${column * widthPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <p className={`truncate text-[10.5px] font-extrabold ${tone ? COURSE_TONE_CLASSES[tone].text : "text-ink-2"}`}>
                        {b.title}
                      </p>
                      <p className="truncate text-[9.5px] font-semibold text-ink-3">
                        {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        {pos.heightPct > 8 && `–${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
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
