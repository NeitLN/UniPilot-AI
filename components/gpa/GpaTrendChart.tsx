import type { SemesterGpaPoint } from "@/lib/rules/gpa";

const CHART_HEIGHT = 120;

export function GpaTrendChart({ points }: { points: SemesterGpaPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-card bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink">GPA trend</h2>
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          Enter grades across semesters to see your trend.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-white p-5">
      <h2 className="font-display text-lg font-bold text-ink">GPA trend</h2>
      <div className="mt-4 flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
        {points.map((p) => {
          const barHeight = Math.max(6, Math.round((p.gpa / 4) * CHART_HEIGHT));
          return (
            <div
              key={p.semester}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
              style={{ height: CHART_HEIGHT }}
            >
              <span className="text-[11px] font-bold text-ink tabular-nums">
                {p.gpa.toFixed(2)}
              </span>
              <div
                className="w-full rounded-t-[6px] bg-violet"
                style={{ height: barHeight }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-3">
        {points.map((p) => (
          <span
            key={p.semester}
            className="flex-1 text-center text-[10.5px] font-bold text-ink-3"
          >
            {p.semester}
          </span>
        ))}
      </div>
    </div>
  );
}
