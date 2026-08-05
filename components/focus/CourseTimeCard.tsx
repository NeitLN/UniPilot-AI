import { formatMinutes } from "@/lib/rules/focus";

export interface CourseTimeGrade {
  name: string;
  minutes: number;
  gradePoint: number | null;
}

/**
 * §5's "which course ate the time, and how did it turn out" table.
 *
 * Its own card rather than a tail on Learning rhythm: with a real course
 * list appended, that card ran to roughly twice the height of Focus history
 * beside it, and the row read as lopsided. The concept draws Learning rhythm
 * as the chart alone.
 */
export function CourseTimeCard({ byCourse }: { byCourse: CourseTimeGrade[] }) {
  if (byCourse.length === 0) return null;
  const topCourse = byCourse[0];

  return (
    <div className="min-w-0 rounded-card bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-foreground">Time by course</h2>
        {topCourse && topCourse.minutes > 0 && (
          <p className="text-[12.5px] font-semibold text-ink-2">
            Most time spent: <span className="font-bold text-foreground">{topCourse.name}</span> —{" "}
            {formatMinutes(topCourse.minutes)}
          </p>
        )}
      </div>

      <table className="mt-3 w-full text-[12.5px]">
        <thead>
          <tr className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink-3">
            <th className="pb-1.5 font-bold">Course</th>
            <th className="pb-1.5 font-bold">Time</th>
            <th className="pb-1.5 text-right font-bold">Grade</th>
          </tr>
        </thead>
        <tbody>
          {byCourse.map((c) => (
            <tr key={c.name} className="border-t border-line">
              <td className="min-w-0 truncate py-2 pr-2 font-semibold text-foreground">{c.name}</td>
              <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-ink-2">
                {formatMinutes(c.minutes)}
              </td>
              <td className="py-2 text-right tabular-nums text-ink-2">
                {c.gradePoint === null ? "—" : c.gradePoint.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
