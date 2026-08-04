"use client";

import { useState, useTransition } from "react";
import { BookOpen, Info, MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/FieldError";
import { GradeForm } from "./GradeForm";
import { deleteGrade } from "@/app/(app)/gpa/actions";
import {
  dragsGpaDown,
  gpaContribution,
  gpaContributionPct,
  letterGrade,
  qualityPoints,
  semesterLabel,
  type GradeLike,
} from "@/lib/rules/gpa";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";
import type { CourseOption } from "@/components/assignments/AssignmentForm";

export interface GradeRow extends GradeLike {
  id: string;
  courseId: string;
  courseName: string;
  semester: string;
}

// P-03: the table always rendered every grade at once. GPA/trend still need
// the full list to compute correctly (a per-page slice would silently give
// a wrong cumulative GPA), so only the *table rows* are capped — a "Show
// all" toggle reveals the rest without re-fetching anything.
const INITIAL_ROWS = 10;

export function CourseBreakdown({
  grades,
  courses,
  overallGpa,
}: {
  grades: GradeRow[];
  courses: CourseOption[];
  overallGpa: number;
}) {
  const [actionsFor, setActionsFor] = useState<GradeRow | null>(null);
  const [editing, setEditing] = useState<GradeRow | null>(null);
  const [deleting, setDeleting] = useState<GradeRow | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visibleGrades = showAll ? grades : grades.slice(0, INITIAL_ROWS);
  const hiddenCount = grades.length - visibleGrades.length;
  // Denominator behind the Contribution column, spelled out in its tooltip so
  // the percentages aren't an unexplained figure.
  const totalQualityPoints = grades.reduce((s, g) => s + qualityPoints(g.gradePoint, g.creditHours), 0);

  return (
    <div className="min-w-0 rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Course breakdown</h2>

      {grades.length === 0 ? (
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          No grades yet — add your first one.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-semibold text-ink-3">
                <th className="pb-2.5 pr-3 font-semibold">Course</th>
                <th className="whitespace-nowrap pb-2.5 pr-3 font-semibold">Credits</th>
                <th className="whitespace-nowrap pb-2.5 pr-3 font-semibold">Current grade</th>
                <th className="pb-2.5 pr-3 font-semibold">
                  <span className="flex items-center gap-1.5">
                    Contribution
                    <span
                      title={`Share of the ${totalQualityPoints.toFixed(1)} quality points behind your ${overallGpa.toFixed(2)} GPA. Every course's share adds up to 100%.`}
                      className="inline-flex"
                    >
                      <Info className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                      <span className="sr-only">
                        Contribution is each course&rsquo;s share of the quality points behind your GPA.
                      </span>
                    </span>
                  </span>
                </th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleGrades.map((g) => {
                const draggingDown = dragsGpaDown(g, overallGpa);
                const tone = COURSE_TONE_CLASSES[courseTone(g.courseId)];
                const pct = gpaContributionPct(g, grades);
                return (
                  <tr key={g.id} className="border-b border-line last:border-b-0">
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-3">
                        {/* Course-toned tile, replacing the 8px dot — the
                            concept leads each row with it, and at this row
                            height the dot read as a stray bullet. */}
                        <span
                          aria-hidden="true"
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl ${tone.tint} ${tone.text}`}
                        >
                          <BookOpen className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-foreground">{g.courseName}</span>
                          {/* Semester lost its own column to the concept's
                              four; it stays here as the course's subtitle. */}
                          <span className="block truncate text-[11.5px] font-semibold text-ink-3">
                            {semesterLabel(g.semester)}
                            {draggingDown && " · Below average"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-ink-2 tabular-nums">{g.creditHours}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-flex min-w-[34px] justify-center rounded-pill px-2 py-1 text-[11.5px] font-extrabold ${tone.tint} ${tone.text}`}
                        >
                          {letterGrade(g.gradePoint)}
                        </span>
                        <span className="font-semibold text-ink-2 tabular-nums">{g.gradePoint.toFixed(2)}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="h-2 w-full min-w-[56px] max-w-[110px] overflow-hidden rounded-full bg-line"
                        >
                          <span className={`block h-full rounded-full ${tone.solid}`} style={{ width: `${pct}%` }} />
                        </span>
                        <span
                          className="shrink-0 font-semibold text-ink-2 tabular-nums"
                          title={`${gpaContribution(g, grades).toFixed(2)} of your ${overallGpa.toFixed(2)} GPA · ${qualityPoints(g.gradePoint, g.creditHours).toFixed(1)} quality points`}
                        >
                          {pct}%
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setActionsFor(g)}
                        aria-label={`Actions for ${g.courseName}`}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-ctl text-ink-3 hover:bg-line hover:text-ink-2"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-ctl bg-line text-xs font-bold text-ink-2 hover:bg-line-hover"
        >
          Show all {grades.length} courses ({hiddenCount} more)
        </button>
      )}

      <Modal open={actionsFor !== null} onClose={() => setActionsFor(null)} title="Actions">
        {actionsFor && (
          <>
            <h2 className="font-display text-lg font-bold text-foreground">{actionsFor.courseName}</h2>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(actionsFor);
                  setActionsFor(null);
                }}
                className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleting(actionsFor);
                  setActionsFor(null);
                }}
                className="flex min-h-11 w-full items-center justify-center rounded-ctl bg-coral-tint py-2.5 text-sm font-bold text-coral-text hover:bg-coral-tint/80"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setActionsFor(null)}
                className="flex min-h-11 w-full items-center justify-center rounded-ctl py-2.5 text-sm font-bold text-ink-3 hover:bg-line"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </Modal>

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
      <h2 className="font-display text-lg font-bold text-foreground">Delete this grade?</h2>
      <p className="mt-2 text-sm font-semibold text-ink-2">
        {`"${grade.courseName}" (${grade.semester}) will be removed from your GPA calculation.`}
      </p>
      {error && (
        <FieldError className="mt-2 text-xs">{error}</FieldError>
      )}
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 flex-1 items-center justify-center rounded-ctl bg-line py-2.5 text-sm font-bold text-ink-2 hover:bg-line-hover"
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
