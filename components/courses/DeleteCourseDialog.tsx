"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { deleteCourse, type CourseUsage } from "@/app/(app)/courses/actions";

export interface DeleteCourseDialogProps {
  course: { id: string; name: string } | null;
  usage: CourseUsage | null;
  open: boolean;
  onClose: () => void;
}

function usageParts(usage: CourseUsage): string[] {
  const parts: string[] = [];
  if (usage.assignmentCount > 0) {
    parts.push(`${usage.assignmentCount} assignment${usage.assignmentCount === 1 ? "" : "s"}`);
  }
  if (usage.gradeCount > 0) {
    parts.push(`${usage.gradeCount} grade${usage.gradeCount === 1 ? "" : "s"}`);
  }
  if (usage.classBlockCount > 0) {
    parts.push(`${usage.classBlockCount} class${usage.classBlockCount === 1 ? "" : "es"}`);
  }
  return parts;
}

/** FR-20 AC-4 (docs/PRODUCT_REVIEW.md): a course with any linked data
 * can't be deleted at all — no "delete anyway" override — since courses
 * are the thing assignments/grades/schedule blocks hang off of, and a
 * hard delete of a course with grades would cascade-delete those grades
 * at the DB level (see deleteCourse's comment). */
export function DeleteCourseDialog({ course, usage, open, onClose }: DeleteCourseDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!course || !usage) return null;

  const blocked = usage.assignmentCount > 0 || usage.gradeCount > 0 || usage.classBlockCount > 0;

  function handleConfirm() {
    if (!course) return;
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (result.ok) {
        onClose();
      } else {
        setError("This course now has linked data — refresh and try again.");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete course">
      {blocked ? (
        <>
          <h2 className="font-display text-lg font-bold text-foreground">
            Can&rsquo;t delete &ldquo;{course.name}&rdquo;
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink-2">
            This course still has {usageParts(usage).join(" and ")} linked to it. Move or
            remove those first.
          </p>
          {/* No onClick={onClose} here on purpose — these navigate to a
              different route entirely, so the whole page (dialog included)
              unmounts anyway. Closing the dialog first raced the Link's own
              click handling and canceled the navigation outright. */}
          <div className="mt-3 flex flex-col gap-1.5 text-[12.5px] font-bold text-violet">
            {usage.assignmentCount > 0 && (
              <Link href={`/assignments?course=${course.id}`}>View linked assignments →</Link>
            )}
            {usage.gradeCount > 0 && <Link href="/gpa">View grades →</Link>}
            {usage.classBlockCount > 0 && <Link href="/schedule">View schedule →</Link>}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-lg font-bold text-foreground">
            Delete &ldquo;{course.name}&rdquo;?
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink-2">
            This course has no assignments, grades, or schedule blocks linked to it —
            deleting it can&rsquo;t be undone.
          </p>
          {error && <FieldError className="mt-2 text-xs">{error}</FieldError>}
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-[#E6E2F2]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-coral py-2.5 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
