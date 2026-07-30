"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { assignCourseToBlock, deleteEvent } from "@/app/(app)/schedule/actions";
import type { CourseOption } from "@/components/assignments/AssignmentForm";
import { EventForm, type EventFormValues } from "./EventForm";
import { REMINDER_OPTIONS } from "@/lib/rules/event";
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
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  if (!block) return null;

  const isManual = !block.gcalEventId;
  const start = new Date(block.startAt);
  const end = new Date(block.endAt);
  const timeRange = block.isAllDay
    ? start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : `${start.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

  function handleCourseChange(courseId: string) {
    startTransition(async () => {
      try {
        await assignCourseToBlock(block!.id, courseId || null);
        setCourseError(null);
      } catch (err) {
        setCourseError(err instanceof Error ? err.message : "Couldn't link this course.");
      }
    });
  }

  if (editing) {
    return (
      <Modal open={open} onClose={onClose} title={`Edit ${block.title}`} size="lg">
        <EventForm
          courses={courses}
          initialValues={toEventFormValues(block)}
          onSaved={() => {
            setEditing(false);
            onClose();
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    );
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={block.title}>
        <h2 className="font-display text-lg font-bold text-foreground">{block.title}</h2>
        <p className="mt-1 text-sm font-semibold text-ink-2">{timeRange}</p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-ink-3">
          {block.location ?? "No location"} · {isManual ? "Manual" : "Google Calendar"}
        </p>

        {block.reminderMinutesBefore !== null && (
          <p className="mt-0.5 text-[12.5px] font-semibold text-ink-3">
            Alert:{" "}
            {REMINDER_OPTIONS.find(
              (o) => o.value === String(block.reminderMinutesBefore),
            )?.label ?? `${block.reminderMinutesBefore} min before`}
          </p>
        )}

        {block.notes && (
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] font-semibold text-ink-2">
            {block.notes}
          </p>
        )}

        <label className="mt-4 flex flex-col gap-1 text-xs font-bold text-ink-2">
          Course
          <select
            defaultValue={block.courseId ?? ""}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={pending}
            className="w-full rounded-ctl border border-border-subtle px-3.5 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-violet focus:border-violet disabled:opacity-60"
          >
            <option value="">No course linked</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
          {courseError && (
            <FieldError as="span" className="text-[11px]">
              {courseError}
            </FieldError>
          )}
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
                  className="flex items-center justify-between rounded-ctl bg-line px-3 py-2 text-[12.5px] font-semibold text-foreground"
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

        {isManual ? (
          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
          >
            Close
          </button>
        )}
      </Modal>

      <DeleteEventDialog
        block={block}
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onDeleted={() => {
          setConfirmingDelete(false);
          onClose();
        }}
      />
    </>
  );
}

function DeleteEventDialog({
  block,
  open,
  onClose,
  onDeleted,
}: {
  block: ClassBlockData;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isRecurring = block.recurrenceGroupId !== null;

  function handleConfirm(scope: "this" | "following") {
    startTransition(async () => {
      try {
        await deleteEvent(block.id, scope);
        onDeleted();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete this event.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete event">
      <h2 className="font-display text-lg font-bold text-foreground">Delete event?</h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        {`"${block.title}" will be removed from your schedule. You can't undo this.`}
      </p>

      {error && <FieldError className="mt-2 text-xs">{error}</FieldError>}

      <div className="mt-4 flex flex-col gap-2.5">
        {isRecurring ? (
          <>
            <button
              type="button"
              onClick={() => handleConfirm("this")}
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete this event"}
            </button>
            <button
              type="button"
              onClick={() => handleConfirm("following")}
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete this and following events"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => handleConfirm("this")}
            disabled={pending}
            className="w-full rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `datetime-local` inputs need `YYYY-MM-DDTHH:mm` in the viewer's local time. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toEventFormValues(block: ClassBlockData): EventFormValues {
  return {
    id: block.id,
    title: block.title,
    courseId: block.courseId ?? "",
    location: block.location ?? "",
    isAllDay: block.isAllDay,
    startAt: toLocalInputValue(block.startAt),
    endAt: toLocalInputValue(block.endAt),
    reminder: block.reminderMinutesBefore === null ? "" : String(block.reminderMinutesBefore),
    notes: block.notes ?? "",
  };
}
