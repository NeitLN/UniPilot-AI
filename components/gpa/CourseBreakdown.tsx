"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { GradeForm } from "./GradeForm";
import { deleteGrade } from "@/app/(app)/gpa/actions";
import {
  dragsGpaDown,
  gpaContribution,
  qualityPoints,
  type GradeLike,
} from "@/lib/rules/gpa";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

export interface GradeRow extends GradeLike {
  id: string;
  courseId: string;
  courseName: string;
  semester: string;
}

export function CourseBreakdown({
  grades,
  courses,
  overallGpa,
}: {
  grades: GradeRow[];
  courses: CourseOption[];
  overallGpa: number;
}) {
  const [editing, setEditing] = useState<GradeRow | null>(null);
  const [deleting, setDeleting] = useState<GradeRow | null>(null);

  return (
    <div className="rounded-card bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">Course breakdown</h2>

      {grades.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          No grades yet — add your first one.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wide text-ink-3">
                <th className="pb-2 pr-3">Course</th>
                <th className="pb-2 pr-3">Semester</th>
                <th className="pb-2 pr-3 text-right">Grade</th>
                <th className="pb-2 pr-3 text-right">Credits</th>
                <th className="pb-2 pr-3 text-right">Quality pts</th>
                <th className="pb-2 pr-3 text-right">Contribution</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => {
                const draggingDown = dragsGpaDown(g, overallGpa);
                return (
                  <tr key={g.id} className="border-b border-line last:border-b-0">
                    <td
                      className={`py-2 pr-3 font-bold ${draggingDown ? "text-coral-text" : "text-ink"}`}
                    >
                      <span className="truncate">{g.courseName}</span>
                      {draggingDown && (
                        <span className="ml-1.5 inline-block rounded-pill bg-coral-tint px-2 py-0.5 text-[10px] font-extrabold text-coral-text">
                          Below average
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-ink-3">{g.semester}</td>
                    <td className="py-2 pr-3 text-right font-bold text-ink tabular-nums">
                      {g.gradePoint.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-3 tabular-nums">
                      {g.creditHours}
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-3 tabular-nums">
                      {qualityPoints(g.gradePoint, g.creditHours).toFixed(1)}
                    </td>
                    <td className="py-2 pr-3 text-right text-ink-3 tabular-nums">
                      {gpaContribution(g, grades).toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(g)}
                          className="flex min-h-11 items-center rounded-ctl bg-line px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:bg-[#E6E2F2]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(g)}
                          className="flex min-h-11 items-center rounded-ctl bg-line px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:bg-[#E6E2F2]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit grade">
        {editing && (
          <GradeForm
            courses={courses}
            initialValues={{
              id: editing.id,
              courseId: editing.courseId,
              semester: editing.semester,
              gradePoint: editing.gradePoint,
              creditHours: editing.creditHours,
            }}
            onSaved={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <DeleteGradeDialog
        grade={deleting}
        open={deleting !== null}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function DeleteGradeDialog({
  grade,
  open,
  onClose,
}: {
  grade: GradeRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!grade) return;
    startTransition(async () => {
      try {
        await deleteGrade(grade.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't delete this grade.");
      }
    });
  }

  if (!grade) return null;

  return (
    <Modal open={open} onClose={onClose} title="Delete grade">
      <h2 className="font-display text-lg font-bold text-ink">Delete this grade?</h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        {`"${grade.courseName}" (${grade.semester}) will be removed from your GPA calculation.`}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-coral-text">
          {error}
        </p>
      )}
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
    </Modal>
  );
}
