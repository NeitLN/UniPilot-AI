import type { SemesterGpaPoint } from "@/lib/rules/gpa";

// QA-01 (docs/PRODUCT_REVIEW.md): the per-bar column used to be exactly
// CHART_HEIGHT tall while also holding the value label + gap above the bar.
// Once a bar's own height (up to CHART_HEIGHT at gpa=4.0) plus the label
// exceeded that fixed column height, flexbox's default shrink-to-fit
// silently clamped every bar to whatever room was left over — so every
// semester rendered at the same height regardless of its actual GPA.
// BAR_MAX_HEIGHT stays the scale basis (unchanged bar heights for a given
// GPA); LABEL_SPACE is now reserved separately so the tallest possible bar
// always has room, and `shrink-0` on the bar itself is a second, explicit
// guard against the same class of bug recurring silently.
const BAR_MAX_HEIGHT = 120;
const LABEL_SPACE = 22;
const CHART_HEIGHT = BAR_MAX_HEIGHT + LABEL_SPACE;

export function GpaTrendChart({ points }: { points: SemesterGpaPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-card bg-card p-5">
        <h2 className="font-display text-lg font-bold text-foreground">GPA trend</h2>
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          Enter grades across semesters to see your trend.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">GPA trend</h2>
      <div className="mt-4 flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
        {points.map((p) => {
          const barHeight = Math.max(6, Math.round((p.gpa / 4) * BAR_MAX_HEIGHT));
          return (
            <div
              key={p.semester}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
              style={{ height: CHART_HEIGHT }}
            >
              <span className="text-[11px] font-bold text-foreground tabular-nums">
                {p.gpa.toFixed(2)}
              </span>
              <div
                className="w-full shrink-0 rounded-t-[6px] bg-violet"
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
