"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "./CourseForm";
import { DeleteCourseDialog } from "./DeleteCourseDialog";
import { COURSE_TONE_CLASSES, type CourseTone } from "@/lib/ui/course-tone";
import type { CourseUsage } from "@/app/(app)/courses/actions";
import type { NextDeadline } from "@/lib/rules/course-presentation";

export interface CourseCardData {
  id: string;
  name: string;
  code: string | null;
  credits: number;
  semester: string;
  tone: CourseTone;
  usage: CourseUsage;
  progress: number | null;
  nextDeadline: NextDeadline | null;
}

function formatDeadline(d: NextDeadline): string {
  const date = new Date(d.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.overdue ? "Overdue" : date;
}

/** Menu-first pattern (same as AssignmentCard): the "⋯" trigger opens one
 * small Actions sheet with Edit/Delete, rather than two always-visible
 * buttons competing with the card's own content for space. */
export function CourseCard({ course }: { course: CourseCardData }) {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const tone = COURSE_TONE_CLASSES[course.tone];

  return (
    <div
      data-testid="course-card"
      className={`flex flex-col gap-3 rounded-card-sm border-2 ${tone.border}/70 ${tone.tint} p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        {course.code ? (
          <span
            className={`rounded-pill bg-card px-2.5 py-1 text-[10.5px] font-extrabold ${tone.text}`}
          >
            {course.code}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setShowActions(true)}
          aria-label={`Actions for ${course.name}`}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ctl bg-card text-lg font-bold text-ink-2 hover:bg-card/70"
        >
          ⋯
        </button>
      </div>

      <div>
        {/* h2, not h3: the page's own heading is the <h1>, and nothing sits
            between them, so an h3 here reported a missing level to anyone
            navigating by heading. The <h2> further down at line 110 is
            inside the detail dialog, where a new heading context starts, so
            that one is already correct. */}
        <h2 className="font-display text-base font-bold leading-snug text-foreground line-clamp-2">
          {course.name}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-ink-3">
          <span>
            {course.credits} credit{course.credits === 1 ? "" : "s"}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-pill bg-card px-2 py-0.5 text-[10.5px] font-extrabold ${tone.text}`}
          >
            {course.usage.assignmentCount} assignment{course.usage.assignmentCount === 1 ? "" : "s"}
          </span>
        </p>
      </div>

      {course.progress === null ? (
        <p className="text-[11.5px] font-semibold text-ink-3">No assignments yet</p>
      ) : (
        <div className="flex w-full items-center gap-2">
          <span className="shrink-0 text-[11px] font-bold text-ink-3">Progress</span>
          <div
            role="progressbar"
            aria-valuenow={Math.round(course.progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${course.name} progress`}
            className="h-[7px] flex-1 overflow-hidden rounded-full bg-line"
          >
            <div
              className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out ${tone.solid}`}
              style={{ width: `${Math.max(0, Math.min(100, Math.round(course.progress)))}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-[10.5px] font-bold tabular-nums text-ink-2">
            {Math.round(course.progress)}%
          </span>
        </div>
      )}

      <div
        className={`flex items-center gap-1.5 text-[11.5px] font-bold ${
          course.nextDeadline?.overdue ? "text-coral-text" : "text-ink-2"
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {course.nextDeadline ? (
          <span className="truncate">
            Next: {course.nextDeadline.title} · {formatDeadline(course.nextDeadline)}
          </span>
        ) : (
          <span>All caught up</span>
        )}
      </div>

      <Modal open={showActions} onClose={() => setShowActions(false)} title="Actions">
        <h2 className="font-display text-lg font-bold text-foreground">{course.name}</h2>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setShowActions(false);
              setEditing(true);
            }}
            className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setShowActions(false);
              setDeleting(true);
            }}
            className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral-tint py-2.5 text-sm font-bold text-coral-text hover:bg-coral-tint/80"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setShowActions(false)}
            className="flex min-h-11 w-full items-center justify-center rounded-ctl py-2.5 text-sm font-bold text-ink-3 hover:bg-line"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit course">
        <CourseForm
          initialValues={{
            id: course.id,
            name: course.name,
            code: course.code ?? "",
            credits: course.credits,
            semester: course.semester,
            hasGrades: course.usage.gradeCount > 0,
          }}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>

      <DeleteCourseDialog
        course={{ id: course.id, name: course.name }}
        usage={course.usage}
        open={deleting}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
