import { predictedCourseScore, estimateGradePoint } from "@/lib/rules/gpa";

export interface PredictedGradeCourse {
  id: string;
  name: string;
  assignments: { weight: number; score: number | null }[];
}

/** F-03: courses that don't have an official grade recorded yet, but do
 * have at least one scored assignment — gives a directional "here's roughly
 * where this course stands" instead of nothing until the semester ends. */
export function PredictedGrades({ courses }: { courses: PredictedGradeCourse[] }) {
  const rows = courses
    .map((c) => ({
      id: c.id,
      name: c.name,
      predicted: predictedCourseScore(c.assignments),
    }))
    .filter((r): r is { id: string; name: string; predicted: number } => r.predicted !== null);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-card border border-black/5 bg-white p-4">
      <h2 className="font-display text-sm font-bold text-ink">Predicted grades</h2>
      <p className="mt-0.5 text-[11.5px] font-semibold text-ink-3">
        Rough estimate from graded assignments — not yet an official grade.
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-ink-2">{r.name}</span>
            <span className="shrink-0 font-bold text-ink">
              {r.predicted.toFixed(1)}% · ~{estimateGradePoint(r.predicted).toFixed(2)} GPA
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
