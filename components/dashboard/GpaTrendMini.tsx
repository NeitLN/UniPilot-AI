import { Target } from "lucide-react";
import { gpaChartDomain, type SemesterGpaPoint } from "@/lib/rules/gpa";

const CHART_HEIGHT = 116;
const LABEL_SPACE = 20;
/** Horizontal inset (percent) so the first and last points aren't flush
 * against the plot edges — their centered value labels overflow either side
 * and would otherwise collide with the y-axis ticks (seen with a real
 * 3-semester trend: "3.28" landed on top of the "3.4" tick). */
const X_PAD = 13;

/** 0 = bottom of the plot area, 1 = top. */
function ratio(value: number, domain: { min: number; max: number }): number {
  const span = domain.max - domain.min;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (value - domain.min) / span));
}

/**
 * Dashboard's line-chart take on the GPA trend. Deliberately a separate
 * component from `components/gpa/GpaTrendChart` (the bar chart on /gpa):
 * that one matches its own approved concept and is shared with the GPA
 * page's layout, so re-shaping it here would silently redesign that screen
 * too. Both read the same `gpaBySemester` data and the same
 * `gpaChartDomain` scaling, so they can't disagree about the numbers.
 */
export function GpaTrendMini({
  points,
  targetGpa,
}: {
  points: SemesterGpaPoint[];
  targetGpa: number | null;
}) {
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

  const domain = gpaChartDomain(points);
  const current = points[points.length - 1].gpa;
  const xAt = (i: number) =>
    points.length === 1 ? 50 : X_PAD + (i / (points.length - 1)) * (100 - 2 * X_PAD);
  const targetRatio = targetGpa !== null ? ratio(targetGpa, domain) : null;
  const gap = targetGpa !== null ? Number((targetGpa - current).toFixed(2)) : null;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">GPA trend</h2>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 gap-2">
          {/* y-axis ticks — the real domain, which gpaChartDomain may have
              compressed away from 0–4.0 to keep a flat trend legible. */}
          <div
            className="flex shrink-0 flex-col justify-between text-right text-[9.5px] font-bold text-ink-3 tabular-nums"
            style={{ height: CHART_HEIGHT }}
          >
            <span>{domain.max.toFixed(1)}</span>
            <span>{((domain.max + domain.min) / 2).toFixed(1)}</span>
            <span>{domain.min.toFixed(1)}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: CHART_HEIGHT }}>
              {targetRatio !== null && (
                <div
                  className="absolute inset-x-0 border-t border-dashed border-tangerine"
                  style={{ bottom: targetRatio * (CHART_HEIGHT - LABEL_SPACE) }}
                />
              )}

              {/* preserveAspectRatio="none" + non-scaling-stroke: the same
                  approach StudyRhythmChart uses so the polyline stretches to
                  the container width without also stretching its stroke. */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-x-0 w-full"
                style={{ top: LABEL_SPACE, height: CHART_HEIGHT - LABEL_SPACE }}
              >
                <polyline
                  fill="none"
                  className="stroke-violet"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  points={points.map((p, i) => `${xAt(i)},${100 - ratio(p.gpa, domain) * 100}`).join(" ")}
                />
              </svg>

              {points.map((p, i) => {
                const isLast = i === points.length - 1;
                return (
                  <div
                    key={p.semester}
                    className="absolute -translate-x-1/2"
                    style={{
                      left: `${xAt(i)}%`,
                      bottom: ratio(p.gpa, domain) * (CHART_HEIGHT - LABEL_SPACE) - 5,
                    }}
                  >
                    <span
                      className={`absolute -top-[19px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill px-1.5 text-[10px] font-bold tabular-nums ${
                        isLast ? "bg-violet py-0.5 text-white" : "text-foreground"
                      }`}
                    >
                      {p.gpa.toFixed(2)}
                    </span>
                    <span className="block h-2.5 w-2.5 rounded-full border-2 border-violet bg-card" />
                  </div>
                );
              })}
            </div>

            {/* Positioned off the same xAt() as the points themselves, so
                each label stays under its own marker no matter how many
                semesters there are. */}
            <div className="relative mt-1 h-4">
              {points.map((p, i) => (
                <span
                  key={p.semester}
                  className="absolute -translate-x-1/2 whitespace-nowrap text-[9.5px] font-bold text-ink-3"
                  style={{ left: `${xAt(i)}%` }}
                >
                  Sem {p.semester}
                </span>
              ))}
            </div>
          </div>
        </div>

        <dl className="flex shrink-0 flex-col gap-2 lg:w-[168px]">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet" />
            <dt className="flex-1 text-[11.5px] font-semibold text-ink-2">Current GPA</dt>
            <dd className="text-[12.5px] font-bold tabular-nums text-foreground">
              {current.toFixed(2)} <span className="text-[10px] font-bold text-ink-3">/4.0</span>
            </dd>
          </div>
          {targetGpa !== null && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-0 w-3 shrink-0 border-t border-dashed border-tangerine" />
              <dt className="flex-1 text-[11.5px] font-semibold text-ink-2">Target GPA</dt>
              <dd className="text-[12.5px] font-bold tabular-nums text-foreground">
                {targetGpa.toFixed(2)} <span className="text-[10px] font-bold text-ink-3">/4.0</span>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {gap !== null && (
        <div className="mt-4 flex items-center gap-2.5 rounded-ctl bg-violet-tint px-3.5 py-2.5">
          <Target className="h-4 w-4 shrink-0 text-violet" aria-hidden="true" />
          <p className="text-[12px] font-semibold text-ink-2">
            {gap > 0
              ? `You're ${gap.toFixed(2)} away from your target GPA.`
              : "You've reached your target GPA — keep it up."}
          </p>
        </div>
      )}
    </div>
  );
}
