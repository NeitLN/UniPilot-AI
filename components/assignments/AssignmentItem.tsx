"use client";

import { useState, useTransition } from "react";
import { restoreAssignment } from "@/app/(app)/assignments/actions";
import {
  overdueLabel,
  priorityLabel,
  progressTone,
  statusLabel,
  statusTone,
} from "@/lib/rules/assignment";
import { Tag } from "@/components/ui/Tag";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Modal } from "@/components/ui/Modal";
import { AssignmentForm, type CourseOption } from "./AssignmentForm";
import { ArchiveDialog } from "./ArchiveDialog";
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
}

export function AssignmentItem({
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
  const [restoring, startRestore] = useTransition();

  function handleRestore() {
    startRestore(() => restoreAssignment(assignment.id));
  }

  const overdue = overdueLabel(assignment);
  const tone = progressTone(assignment);
  const due = new Date(assignment.dueAt);
  const statusTagTone = statusTone(assignment);

  return (
    <div className="flex flex-col gap-3 border-t border-line py-[11px] first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{assignment.title}</p>
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
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {overdue ? (
            <Tag tone="coral">{overdue}</Tag>
          ) : (
            <Tag tone={statusTagTone}>{statusLabel(assignment)}</Tag>
          )}
          {assignment.priority === "high" && (
            <Tag tone="tangerine">{priorityLabel(assignment)}</Tag>
          )}
          {assignment.score !== null && (
            <Tag tone="violet">Score {assignment.score}%</Tag>
          )}
        </div>
      </div>

      <ProgressBar value={assignment.progress} tone={tone} className="sm:w-[92px]" />

      <div className="flex shrink-0 gap-1.5">
        {isArchivedView ? (
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="flex min-h-11 items-center rounded-ctl bg-line px-3 py-2 text-xs font-bold text-ink-2 hover:bg-[#E6E2F2] disabled:opacity-60"
          >
            {restoring ? "Restoring…" : "Restore"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex min-h-11 items-center rounded-ctl bg-line px-3 py-2 text-xs font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setArchiving(true)}
              className="flex min-h-11 items-center rounded-ctl bg-line px-3 py-2 text-xs font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Archive
            </button>
          </>
        )}
      </div>

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
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <ArchiveDialog
        assignmentId={assignment.id}
        assignmentTitle={assignment.title}
        open={archiving}
        onClose={() => setArchiving(false)}
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
