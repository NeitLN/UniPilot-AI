import type { WeekMinutes } from "@/lib/rules/focus";
import { formatMinutes } from "@/lib/rules/focus";

const CHART_HEIGHT = 100;

export interface CourseTimeGrade {
  name: string;
  minutes: number;
  gradePoint: number | null;
}

export interface LearningStatsProps {
  weeklySeries: WeekMinutes[];
  byCourse: CourseTimeGrade[];
}

function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split("-").map(Number);
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** §5 "Thống kê học tập theo thời gian": hours/week over time, which course
 * eats the most focus time, and — loosely, a full correlation coefficient
 * needs more graded courses than most students will have — how that time
 * lines up against the grade each course ended up with. */
export function LearningStats({ weeklySeries, byCourse }: LearningStatsProps) {
  const maxMinutes = Math.max(1, ...weeklySeries.map((w) => w.minutes));
  const topCourse = byCourse[0];

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Learning stats</h2>
      <p className="mt-0.5 text-[11.5px] font-semibold text-ink-3">
        Focus time over the last {weeklySeries.length} weeks.
      </p>

      <div className="mt-4 flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {weeklySeries.map((w) => {
          const barHeight = w.minutes === 0 ? 2 : Math.max(4, Math.round((w.minutes / maxMinutes) * CHART_HEIGHT));
          return (
            <div
              key={w.weekStart}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              style={{ height: CHART_HEIGHT }}
            >
              <div className="w-full rounded-t-[4px] bg-violet" style={{ height: barHeight }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {weeklySeries.map((w) => (
          <span
            key={w.weekStart}
            className="flex-1 text-center text-[9.5px] font-bold text-ink-3"
          >
            {weekLabel(w.weekStart)}
          </span>
        ))}
      </div>

      {byCourse.length === 0 ? (
        <p className="mt-4 text-[12.5px] font-semibold text-ink-3">
          No focus sessions logged yet.
        </p>
      ) : (
        <>
          {topCourse && topCourse.minutes > 0 && (
            <p className="mt-4 text-[12.5px] font-semibold text-ink-2">
              Most time spent:{" "}
              <span className="font-bold text-foreground">{topCourse.name}</span> —{" "}
              {formatMinutes(topCourse.minutes)}
            </p>
          )}

          <table className="mt-2 w-full text-[12.5px]">
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
                  <td className="min-w-0 truncate py-1.5 pr-2 font-semibold text-foreground">
                    {c.name}
                  </td>
                  <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-ink-2">
                    {formatMinutes(c.minutes)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-ink-2">
                    {c.gradePoint === null ? "—" : c.gradePoint.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
