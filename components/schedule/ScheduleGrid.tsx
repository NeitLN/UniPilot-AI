"use client";

import { useState } from "react";
import Link from "next/link";
import { Pilo } from "@/components/brand/Pilo";
import { FadeIn } from "@/components/motion/FadeIn";
import type { CourseOption } from "@/components/assignments/AssignmentForm";
import {
  addDays,
  isSameDay,
  toDateParam,
  type ScheduleView,
} from "@/lib/calendar/view";
import { ClassDetailPanel } from "./ClassDetailPanel";
import type { AssignmentLink, ClassBlockData } from "./types";

export interface ScheduleGridProps {
  view: ScheduleView;
  rangeStart: string; // ISO date the view range starts on
  blocks: ClassBlockData[];
  courses: CourseOption[];
  assignmentsByCourse: Record<string, AssignmentLink[]>;
}

export function ScheduleGrid({
  view,
  rangeStart,
  blocks,
  courses,
  assignmentsByCourse,
}: ScheduleGridProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const today = new Date();
  const start = new Date(rangeStart);

  return (
    <>
      {view === "day" && <DayList blocks={blocks} onSelect={setSelectedId} />}
      {view === "week" && (
        <WeekColumns
          start={start}
          today={today}
          blocks={blocks}
          onSelect={setSelectedId}
        />
      )}
      {view === "month" && (
        <MonthGrid
          start={start}
          today={today}
          blocks={blocks}
          onSelect={setSelectedId}
        />
      )}

      <ClassDetailPanel
        key={selected?.id ?? "none"}
        block={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        courses={courses}
        linkedAssignments={
          selected?.courseId
            ? (assignmentsByCourse[selected.courseId] ?? [])
            : []
        }
      />
    </>
  );
}

function BlockCard({
  block,
  onSelect,
}: {
  block: ClassBlockData;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(block.id)}
      className="w-full rounded-ctl bg-line px-3 py-2 text-left hover:bg-line-hover"
    >
      <p className="break-words text-[12.5px] font-bold text-foreground">
        {block.title}
      </p>
      {/* Formatted in the runtime's local timezone — expected to differ
          between SSR and hydration, not a real mismatch. */}
      {/* D-03 (docs/UIUX_REVIEW.md): text-ink-3 measured 4.4:1 on this
          card's bg-line background — just under the 4.5:1 AA floor.
          text-ink-2 clears it comfortably in both themes (8.0:1 light,
          6.22:1 dark). */}
      <p
        className="mt-0.5 break-words text-[11px] font-semibold text-ink-2"
        suppressHydrationWarning
      >
        {blockSubtitle(block)}
      </p>
    </button>
  );
}

// UX-03 (docs/PRODUCT_REVIEW.md): used to always show start time + course
// name, even when the course name was identical to the block's own title
// (the common case — class blocks are usually titled after their course),
// which read as the same text printed twice. Also never showed an end
// time, so there was no way to tell a class's length from the grid alone.
function blockSubtitle(
  block: Pick<
    ClassBlockData,
    "startAt" | "endAt" | "isAllDay" | "title" | "courseName"
  >,
): string {
  const timeRange = block.isAllDay
    ? "All day"
    : `${formatTime(block.startAt)}–${formatTime(block.endAt)}`;
  const showCourse = block.courseName && block.courseName !== block.title;
  return showCourse ? `${timeRange} · ${block.courseName}` : timeRange;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function DayList({
  blocks,
  onSelect,
}: {
  blocks: ClassBlockData[];
  onSelect: (id: string) => void;
}) {
  if (blocks.length === 0) {
    return (
      <FadeIn className="flex flex-col items-center gap-2 rounded-card bg-card py-10 text-center">
        <Pilo mood="sleepy" size={64} />
        <p className="text-[12.5px] font-semibold text-ink-2">
          No classes on this day.
        </p>
      </FadeIn>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-card p-4">
      {blocks.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onSelect(b.id)}
          className="flex items-center gap-3 rounded-ctl border-t border-line px-2 py-3 text-left first:border-t-0 hover:bg-line"
        >
          {/* Formatted in the runtime's local timezone — expected to differ
              between SSR and hydration, not a real mismatch. */}
          <div
            className="flex w-16 shrink-0 flex-col text-[11.5px] font-bold text-ink-3"
            suppressHydrationWarning
          >
            {b.isAllDay ? (
              "All day"
            ) : (
              <>
                <span>{formatTime(b.startAt)}</span>
                <span className="text-ink-3/70">{formatTime(b.endAt)}</span>
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {b.title}
            </p>
            <p className="truncate text-[11.5px] font-semibold text-ink-3">
              {b.location ?? "No location"}
              {b.courseName && b.courseName !== b.title
                ? ` · ${b.courseName}`
                : ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function WeekColumns({
  start,
  today,
  blocks,
  onSelect,
}: {
  start: Date;
  today: Date;
  blocks: ClassBlockData[];
  onSelect: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dayEntries = days.map((day) => ({
    day,
    dayBlocks: blocks
      .filter((b) => isSameDay(new Date(b.startAt), day))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  }));

  // UX-06 (docs/PRODUCT_REVIEW.md): a bare weekend usually adds 2 empty
  // cards to scroll past on mobile's stacked grid-cols-1 layout — collapsed
  // into one row there when neither day has anything.
  // D-02 (docs/UIUX_REVIEW.md): desktop's sm:grid-cols-7 used to keep both
  // individual empty cells instead, so a bare weekend went from one clear
  // message on mobile to two silent blank columns on desktop. The weekend
  // is always the last two columns (week starts Monday), so the collapsed
  // message spans them with sm:col-span-2 instead of only ever showing on
  // mobile's single-column stack.
  const isWeekend = (day: Date) => day.getDay() === 0 || day.getDay() === 6;
  const weekendEntries = dayEntries.filter((e) => isWeekend(e.day));
  const weekendEmpty =
    weekendEntries.length === 2 &&
    weekendEntries.every((e) => e.dayBlocks.length === 0);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
      {dayEntries.map(({ day, dayBlocks }) => (
        <DayColumn
          key={day.toISOString()}
          day={day}
          dayBlocks={dayBlocks}
          isToday={isSameDay(day, today)}
          onSelect={onSelect}
          className={weekendEmpty && isWeekend(day) ? "hidden" : undefined}
        />
      ))}
      {weekendEmpty && (
        <div className="rounded-card bg-card p-3 text-center sm:col-span-2">
          <p className="text-[11.5px] font-semibold text-ink-3">
            Weekend — no schedule
          </p>
        </div>
      )}
    </div>
  );
}

function DayColumn({
  day,
  dayBlocks,
  isToday,
  onSelect,
  className,
}: {
  day: Date;
  dayBlocks: ClassBlockData[];
  isToday: boolean;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`rounded-card bg-card p-3 ${className ?? ""}`}>
      {/* Weekday/day-of-month reflect the runtime's local timezone —
          expected to differ between SSR and hydration, not a real mismatch. */}
      <p
        className={`text-center text-[11px] font-extrabold uppercase tracking-wide ${
          isToday ? "text-violet" : "text-ink-3"
        }`}
        suppressHydrationWarning
      >
        {day.toLocaleDateString(undefined, { weekday: "short" })}
      </p>
      <p
        className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-center text-[12.5px] font-bold ${
          isToday ? "bg-violet text-white" : "text-foreground"
        }`}
        suppressHydrationWarning
      >
        {day.getDate()}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {dayBlocks.map((b) => (
          <BlockCard key={b.id} block={b} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function MonthGrid({
  start,
  today,
  blocks,
  onSelect,
}: {
  start: Date;
  today: Date;
  blocks: ClassBlockData[];
  onSelect: (id: string) => void;
}) {
  const firstWeekday = (start.getDay() + 6) % 7; // 0 = Monday
  const gridStart = addDays(start, -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = start.getMonth();

  return (
    <div className="grid grid-cols-7 gap-1.5 rounded-card bg-card p-3">
      {cells.map((day) => {
        const dayBlocks = blocks
          .filter((b) => isSameDay(new Date(b.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        const inMonth = day.getMonth() === month;
        const isToday = isSameDay(day, today);
        const visible = dayBlocks.slice(0, 2);
        const overflow = dayBlocks.length - visible.length;

        return (
          <div
            key={day.toISOString()}
            className={`min-h-[84px] rounded-ctl p-1.5 ${inMonth ? "bg-canvas" : "bg-canvas/40"}`}
          >
            {/* Day-of-month reflects the runtime's local timezone — expected
                to differ between SSR and hydration, not a real mismatch. */}
            <p
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                isToday
                  ? "bg-violet text-white"
                  : inMonth
                    ? "text-foreground"
                    : "text-ink-3"
              }`}
              suppressHydrationWarning
            >
              {day.getDate()}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              {visible.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="truncate rounded-[6px] bg-violet-tint px-1.5 py-0.5 text-left text-[10px] font-bold text-violet"
                >
                  {b.title}
                </button>
              ))}
              {overflow > 0 && (
                <Link
                  href={`?view=day&date=${toDateParam(day)}`}
                  className="text-[10px] font-bold text-ink-3 hover:underline"
                >
                  +{overflow} more
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
