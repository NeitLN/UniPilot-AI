import { gpaChartDomain, semesterLabel, type SemesterGpaPoint } from "@/lib/rules/gpa";

// QA-01 (docs/PRODUCT_REVIEW.md): the per-bar column used to be exactly
// CHART_HEIGHT tall while also holding the value label + gap above the bar.
// Once a bar's own height (up to CHART_HEIGHT at gpa=4.0) plus the label
// exceeded that fixed column height, flexbox's default shrink-to-fit
// silently clamped every bar to whatever room was left over — so every
// semester rendered at the same height regardless of its actual GPA. The
// plot area is now an explicit, absolutely-positioned box, so a bar's height
// can never be negotiated against its label again.
const PLOT_HEIGHT = 132;
const LABEL_SPACE = 26;
const AXIS_WIDTH = 30;

function pctOfDomain(value: number, domain: { min: number; max: number }): number {
  const span = domain.max - domain.min;
  if (span <= 0) return 0;
  const clamped = Math.max(domain.min, Math.min(domain.max, value));
  return ((clamped - domain.min) / span) * 100;
}

/** Ticks across the visible domain. Whole steps when the axis is the plain
 * 0–4 scale (the concept's 0.0/1.0/2.0/3.0/4.0), otherwise four evenly
 * spaced marks across whatever compressed range gpaChartDomain chose. */
function axisTicks(domain: { min: number; max: number }): number[] {
  if (domain.min === 0 && domain.max === 4) return [0, 1, 2, 3, 4];
  const step = (domain.max - domain.min) / 4;
  return Array.from({ length: 5 }, (_, i) => domain.min + step * i);
}

export interface GpaTrendChartProps {
  points: SemesterGpaPoint[];
  /** Renders a dashed reference line at this GPA, clamped into the visible
   * chart range — omitted entirely when there's no target set. */
  targetGpa?: number | null;
}

export function GpaTrendChart({ points, targetGpa }: GpaTrendChartProps) {
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
  const ticks = axisTicks(domain);
  const hasTarget = targetGpa !== null && targetGpa !== undefined;
  const targetPct = hasTarget ? pctOfDomain(targetGpa, domain) : null;
  // Only worth disclosing when the axis is actually doing something
  // non-obvious — the [0, 4] fallback genuinely does start at 0.
  const isCompressed = domain.min > 0 || domain.max < 4;
  const lastIndex = points.length - 1;

  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="font-display text-lg font-bold text-foreground">GPA trend</h2>
        {hasTarget && (
          // A fixed legend rather than a label pinned to the line itself,
          // which collided with whichever bar's value label sat at a similar
          // height. text-ink-2, not text-tangerine-text: that token is tuned
          // for contrast on a tangerine-tint background and turns into an
          // unreadable brown standing alone once bg-card flips dark.
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
            <span
              aria-hidden="true"
              className="inline-block h-0 w-5 border-t-2 border-dashed border-violet"
            />
            Target {targetGpa.toFixed(2)}
          </p>
        )}
      </div>
      {isCompressed && (
        <p className="mt-0.5 text-[10.5px] font-semibold text-ink-3">
          Axis runs {domain.min.toFixed(2)}–{domain.max.toFixed(2)}, not 0–4.0.
        </p>
      )}

      <div className="mt-4 flex" style={{ height: PLOT_HEIGHT + LABEL_SPACE }}>
        <div
          className="relative shrink-0 text-[10px] font-semibold text-ink-3 tabular-nums"
          style={{ width: AXIS_WIDTH, marginTop: LABEL_SPACE }}
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 translate-y-1/2"
              style={{ bottom: `${pctOfDomain(t, domain)}%` }}
            >
              {t.toFixed(1)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines sit in the plot box only, below LABEL_SPACE, so the
              value labels above the bars never overlap a rule. */}
          <div className="absolute inset-x-0 bottom-0" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((t) => (
              <span
                key={t}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border-subtle-2"
                style={{ bottom: `${pctOfDomain(t, domain)}%` }}
              />
            ))}
            {targetPct !== null && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t-2 border-dashed border-violet"
                style={{ bottom: `${targetPct}%` }}
              />
            )}

            <div className="absolute inset-0 flex items-end gap-3">
              {points.map((p) => (
                <div key={p.semester} className="flex min-w-0 flex-1 justify-center self-stretch">
                  {/* Height, not transform — there's no way to express
                      "value scaled to domain" as a transform without faking
                      the layout box too. */}
                  <div
                    className="mt-auto w-full max-w-[54px] rounded-t-[6px] bg-violet motion-safe:transition-[height] motion-safe:duration-300 motion-safe:ease-out"
                    style={{ height: `${Math.max(4, pctOfDomain(p.gpa, domain))}%` }}
                  />
                </div>
              ))}
            </div>

            {/* Trend line + node per semester, drawn over the bars: the bars
                give each semester its own weight, the line gives the shape of
                the change between them. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                className="text-violet-text"
                points={points
                  .map((p, i) => {
                    const x = ((i + 0.5) / points.length) * 100;
                    const y = 100 - pctOfDomain(p.gpa, domain);
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
            {points.map((p, i) => (
              <span
                key={p.semester}
                aria-hidden="true"
                className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-violet bg-card"
                style={{
                  left: `${((i + 0.5) / points.length) * 100}%`,
                  bottom: `${pctOfDomain(p.gpa, domain)}%`,
                }}
              />
            ))}
          </div>

          {/* Value labels, positioned against the same scale as the nodes so
              each sits directly above its own point. The latest reading gets
              a filled chip — it's the number the rest of the page is about. */}
          {points.map((p, i) => (
            <span
              key={p.semester}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-bold tabular-nums ${
                i === lastIndex
                  ? "rounded-[6px] bg-violet px-1.5 py-0.5 text-white"
                  : "text-foreground"
              }`}
              style={{
                left: `${((i + 0.5) / points.length) * 100}%`,
                bottom: `${(pctOfDomain(p.gpa, domain) / 100) * PLOT_HEIGHT + 12}px`,
              }}
            >
              {p.gpa.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex gap-3" style={{ paddingLeft: AXIS_WIDTH }}>
        {points.map((p) => (
          <span
            key={p.semester}
            className="min-w-0 flex-1 truncate text-center text-[10.5px] font-semibold text-ink-3"
          >
            {semesterLabel(p.semester)}
          </span>
        ))}
      </div>
    </div>
  );
}
