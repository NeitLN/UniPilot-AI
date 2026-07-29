"use client";

import { useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { assignCourseToBlock } from "@/app/(app)/schedule/actions";
import type { CourseOption } from "@/components/assignments/AssignmentForm";
import type { AssignmentLink, ClassBlockData } from "./types";

export interface ClassDetailPanelProps {
  block: ClassBlockData | null;
  open: boolean;
  onClose: () => void;
  courses: CourseOption[];
  linkedAssignments: AssignmentLink[];
}

export function ClassDetailPanel({
  block,
  open,
  onClose,
  courses,
  linkedAssignments,
}: ClassDetailPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!block) return null;

  const start = new Date(block.startAt);
  const end = new Date(block.endAt);
  const timeRange = `${start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

  function handleCourseChange(courseId: string) {
    startTransition(async () => {
      await assignCourseToBlock(block!.id, courseId || null);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={block.title}>
      <h2 className="font-display text-lg font-bold text-ink">{block.title}</h2>
      <p className="mt-1 text-sm font-semibold text-ink-2">{timeRange}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-ink-3">
        {block.location ?? "No location"} ·{" "}
        {block.gcalEventId ? "Google Calendar" : "Manual"}
      </p>

      <label className="mt-4 flex flex-col gap-1 text-xs font-bold text-ink-2">
        Course
        <select
          defaultValue={block.courseId ?? ""}
          onChange={(e) => handleCourseChange(e.target.value)}
          disabled={pending}
          className="w-full rounded-ctl border border-black/10 px-3.5 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-violet focus:border-violet disabled:opacity-60"
        >
          <option value="">No course linked</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code} — ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        <p className="text-xs font-bold text-ink-2">
          {linkedAssignments.length === 1
            ? "1 linked assignment"
            : `${linkedAssignments.length} linked assignments`}
        </p>
        {linkedAssignments.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] font-semibold text-ink-3">
            {block.courseId
              ? "No assignments for this course yet."
              : "Link a course to see its assignments here."}
          </p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {linkedAssignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-ctl bg-line px-3 py-2 text-[12.5px] font-semibold text-ink"
              >
                <span className="truncate">{a.title}</span>
                <span className="shrink-0 text-ink-3">
                  {new Date(a.dueAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
      >
        Close
      </button>
    </Modal>
  );
}
