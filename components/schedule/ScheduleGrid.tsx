"use client";

import { useState } from "react";
import Link from "next/link";
import { Pilo } from "@/components/brand/Pilo";
import type { CourseOption } from "@/components/assignments/AssignmentForm";
import { addDays, isSameDay, toDateParam, type ScheduleView } from "@/lib/calendar/view";
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
        <WeekColumns start={start} today={today} blocks={blocks} onSelect={setSelectedId} />
      )}
      {view === "month" && (
        <MonthGrid start={start} today={today} blocks={blocks} onSelect={setSelectedId} />
      )}

      <ClassDetailPanel
        block={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        courses={courses}
        linkedAssignments={
          selected?.courseId ? (assignmentsByCourse[selected.courseId] ?? []) : []
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
      className="w-full rounded-ctl bg-line px-3 py-2 text-left hover:bg-[#E6E2F2]"
    >
      <p className="truncate text-[12.5px] font-bold text-ink">{block.title}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-ink-3">
        {new Date(block.startAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
        {block.courseName ? ` · ${block.courseName}` : ""}
      </p>
    </button>
  );
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
      <div className="flex flex-col items-center gap-2 rounded-card bg-white py-10 text-center">
        <Pilo mood="sleepy" size={64} />
        <p className="text-[12.5px] font-semibold text-ink-2">
          No classes on this day.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-card bg-white p-4">
      {blocks.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onSelect(b.id)}
          className="flex items-center gap-3 rounded-ctl border-t border-line px-2 py-3 text-left first:border-t-0 hover:bg-line"
        >
          <div className="w-16 shrink-0 text-[11.5px] font-bold text-ink-3">
            {new Date(b.startAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{b.title}</p>
            <p className="truncate text-[11.5px] font-semibold text-ink-3">
              {b.location ?? "No location"}
              {b.courseName ? ` · ${b.courseName}` : ""}
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

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
      {days.map((day) => {
        const dayBlocks = blocks
          .filter((b) => isSameDay(new Date(b.startAt), day))
          .sort((a, b) => a.startAt.localeCompare(b.startAt));
        const isToday = isSameDay(day, today);

        return (
          <div key={day.toISOString()} className="rounded-card bg-white p-3">
            <p
              className={`text-center text-[11px] font-extrabold uppercase tracking-wide ${
                isToday ? "text-violet" : "text-ink-3"
              }`}
            >
              {day.toLocaleDateString(undefined, { weekday: "short" })}
            </p>
            <p
              className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-center text-[12.5px] font-bold ${
                isToday ? "bg-violet text-white" : "text-ink"
              }`}
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
      })}
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
    <div className="grid grid-cols-7 gap-1.5 rounded-card bg-white p-3">
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
            <p
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                isToday ? "bg-violet text-white" : inMonth ? "text-ink" : "text-ink-3"
              }`}
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
