"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "./CourseForm";
import { DeleteCourseDialog } from "./DeleteCourseDialog";
import type { CourseUsage } from "@/app/(app)/courses/actions";

export interface CourseRow {
  id: string;
  name: string;
  code: string | null;
  credits: number;
  semester: string;
  usage: CourseUsage;
}

function usageLabel(usage: CourseUsage): string {
  return `${usage.assignmentCount} assignment${usage.assignmentCount === 1 ? "" : "s"} · ${usage.gradeCount} grade${usage.gradeCount === 1 ? "" : "s"} · ${usage.classBlockCount} class${usage.classBlockCount === 1 ? "" : "es"}`;
}

export function CourseListItem({ course }: { course: CourseRow }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-t border-line py-[11px] first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {course.code ? `${course.code} — ${course.name}` : course.name}
        </p>
        <p className="mt-0.5 text-[11.5px] font-semibold text-ink-3">
          {course.credits} credit{course.credits === 1 ? "" : "s"} · {usageLabel(course.usage)}
        </p>
      </div>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-h-11 items-center rounded-ctl bg-line px-3 py-2 text-xs font-bold text-ink-2 hover:bg-line-hover"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setDeleting(true)}
          className="flex min-h-11 items-center rounded-ctl bg-line px-3 py-2 text-xs font-bold text-ink-2 hover:bg-line-hover"
        >
          Delete
        </button>
      </div>

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
