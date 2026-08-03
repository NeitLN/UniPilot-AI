"use client";

import { useState, useTransition } from "react";
import { restoreAssignment, setAssignmentStatus } from "@/app/(app)/assignments/actions";
import {
  overdueLabel,
  priorityLabel,
  progressTone,
  statusLabel,
  statusTone,
} from "@/lib/rules/assignment";
import { Tag, type TagTone } from "@/components/ui/Tag";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { AssignmentForm, type CourseOption } from "./AssignmentForm";
import { ArchiveDialog } from "./ArchiveDialog";
import { DeleteAssignmentDialog } from "./DeleteAssignmentDialog";
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface AssignmentRow {
  id: string;
  title: string;
  courseId: string;
  courseName: string | null;
  dueAt: string;
  weight: number;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  progress: number;
  notes: string | null;
  reminderAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
  score: number | null;
  recurrenceGroupId: string | null;
}

/** One semantic badge per card (brief §6.3 — never stack overdue + status +
 * priority): overdue always wins if present, then high priority, otherwise
 * the plain status. */
function primaryBadge(assignment: AssignmentRow): { tone: TagTone; label: string } {
  const overdue = overdueLabel(assignment);
  if (overdue) return { tone: "coral", label: overdue };
  if (assignment.priority === "high" && assignment.status !== "done") {
    return { tone: "tangerine", label: priorityLabel(assignment) };
  }
  return { tone: statusTone(assignment), label: statusLabel(assignment) };
}

export function AssignmentCard({
  assignment,
  courses,
  isArchivedView = false,
}: {
  assignment: AssignmentRow;
  courses: CourseOption[];
  isArchivedView?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [restoring, startRestore] = useTransition();
  const [togglingDone, startToggleDone] = useTransition();
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function handleRestore() {
    startRestore(async () => {
      try {
        await restoreAssignment(assignment.id);
      } catch (err) {
        setRestoreError(err instanceof Error ? err.message : "Couldn't restore this assignment.");
      }
    });
  }

  function handleToggleDone() {
    const nextStatus: AssignmentStatus = assignment.status === "done" ? "in_progress" : "done";
    setToggleError(null);
    startToggleDone(async () => {
      try {
        await setAssignmentStatus(assignment.id, nextStatus);
      } catch (err) {
        setToggleError(err instanceof Error ? err.message : "Couldn't update this assignment.");
      }
    });
  }

  const done = assignment.status === "done";
  const tone = progressTone(assignment);
  const due = new Date(assignment.dueAt);
  const badge = primaryBadge(assignment);

  const actionItems = isArchivedView
    ? [
        {
          label: restoring ? "Restoring…" : "Restore",
          onClick: handleRestore,
          disabled: restoring,
          danger: false,
        },
        {
          label: "Delete permanently",
          onClick: () => setDeleting(true),
          disabled: false,
          danger: true,
        },
      ]
    : [
        { label: "Edit", onClick: () => setEditing(true), disabled: false, danger: false },
        { label: "Archive", onClick: () => setArchiving(true), disabled: false, danger: false },
      ];

  return (
    <div data-testid="assignment-card" className="rounded-ctl bg-card p-3.5">
      {/* A `w-full` mobile progress bar used to sit as a flex *sibling* in
          this same row — a width:100% flex item fights the title's flex-1
          sibling for space and can starve it to 0px width (caught via a
          real headless-browser measurement, not just visual review: the
          title's bounding box measured 0 wide at 390px). Its own block
          below the row avoids that entirely. */}
      <div className="flex items-start gap-3 sm:items-center">
        {!isArchivedView && (
          <button
            type="button"
            onClick={handleToggleDone}
            disabled={togglingDone}
            aria-pressed={done}
            aria-label={done ? `Mark "${assignment.title}" as not done` : `Mark "${assignment.title}" as done`}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold motion-safe:transition-colors motion-safe:duration-200 disabled:opacity-60 ${
              done
                ? "border-mint bg-mint text-white"
                : "border-border-cb text-transparent hover:border-violet"
            }`}
          >
            ✓
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {assignment.title}
            {assignment.recurrenceGroupId !== null && (
              <span
                aria-label="Recurring assignment"
                title="Recurring assignment"
                className="ml-1.5 inline-block text-ink-3"
              >
                ↻
              </span>
            )}
          </p>
          {/* toLocaleString reflects the server's timezone during SSR and the
              browser's on hydration — expected to differ, not a real mismatch. */}
          <p
            className="mt-0.5 truncate text-[11.5px] font-semibold text-ink-3"
            suppressHydrationWarning
          >
            {assignment.courseName ?? "No course"} · Due{" "}
            {due.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {assignment.score !== null && ` · Score ${assignment.score}%`}
          </p>
          <div className="mt-1.5 sm:hidden">
            <Tag tone={badge.tone}>{badge.label}</Tag>
          </div>
          {restoreError && <FieldError className="mt-1.5 text-[11px]">{restoreError}</FieldError>}
          {toggleError && <FieldError className="mt-1.5 text-[11px]">{toggleError}</FieldError>}
        </div>

        <div className="hidden shrink-0 sm:block">
          <Tag tone={badge.tone}>{badge.label}</Tag>
        </div>

        <ProgressBar value={assignment.progress} tone={tone} emphasizePercent className="hidden sm:flex sm:w-[130px]" />

        <button
          type="button"
          onClick={() => setShowActions(true)}
          aria-label={`Actions for ${assignment.title}`}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ctl bg-line text-lg font-bold text-ink-2 hover:bg-line-hover"
        >
          ⋯
        </button>
      </div>

      <div className="mt-2.5 sm:hidden">
        <ProgressBar value={assignment.progress} tone={tone} emphasizePercent />
      </div>

      <Modal open={showActions} onClose={() => setShowActions(false)} title="Actions">
        <h2 className="font-display text-lg font-bold text-foreground">{assignment.title}</h2>
        <div className="mt-4 flex flex-col gap-2">
          {actionItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setShowActions(false);
                item.onClick();
              }}
              disabled={item.disabled}
              className={`flex min-h-11 w-full items-center justify-center rounded-ctl py-2.5 text-sm font-bold disabled:opacity-60 ${
                item.danger
                  ? "bg-coral-tint text-coral-text hover:bg-coral-tint/80"
                  : "bg-line text-ink-2 hover:bg-line-hover"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowActions(false)}
            className="flex min-h-11 w-full items-center justify-center rounded-ctl py-2.5 text-sm font-bold text-ink-3 hover:bg-line"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit assignment">
        <AssignmentForm
          courses={courses}
          initialValues={{
            id: assignment.id,
            title: assignment.title,
            courseId: assignment.courseId,
            dueAt: toLocalInputValue(assignment.dueAt),
            weight: assignment.weight,
            priority: assignment.priority,
            status: assignment.status,
            progress: assignment.progress,
            notes: assignment.notes ?? "",
            reminderAt: assignment.reminderAt
              ? toLocalInputValue(assignment.reminderAt)
              : "",
            updatedAt: assignment.updatedAt,
            score: assignment.score,
          }}
          isRecurring={assignment.recurrenceGroupId !== null}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <ArchiveDialog
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        isRecurring={assignment.recurrenceGroupId !== null}
        open={archiving}
        onClose={() => setArchiving(false)}
      />

      <DeleteAssignmentDialog
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        open={deleting}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}

/** `datetime-local` inputs need `YYYY-MM-DDTHH:mm` in the viewer's local time. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
