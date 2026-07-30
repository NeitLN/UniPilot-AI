import { gpaChartDomain, type SemesterGpaPoint } from "@/lib/rules/gpa";

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

function scaleToHeight(value: number, domain: { min: number; max: number }, maxHeight: number): number {
  const span = domain.max - domain.min;
  if (span <= 0) return 0;
  const clamped = Math.max(domain.min, Math.min(domain.max, value));
  return Math.round(((clamped - domain.min) / span) * maxHeight);
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
  // Only worth disclosing when the axis is actually doing something
  // non-obvious — the [0, 4] fallback (one semester, or a flat trend)
  // genuinely does start at 0, so there's nothing to caveat there.
  const isCompressed = domain.min > 0 || domain.max < 4;
  const targetHeight =
    targetGpa !== null && targetGpa !== undefined
      ? scaleToHeight(targetGpa, domain, BAR_MAX_HEIGHT)
      : null;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">GPA trend</h2>
      {isCompressed && (
        <p className="mt-0.5 text-[10.5px] font-semibold text-ink-3">
          Axis runs {domain.min.toFixed(2)}–{domain.max.toFixed(2)}, not 0–4.0.
        </p>
      )}
      {targetHeight !== null && (
        // A floating label pinned to the line itself risks colliding with
        // whichever bar's own value label happens to sit at a similar
        // height (found by testing against the real account's data, where
        // the target and the tallest bar's label overlapped into
        // unreadable text) — a fixed-position legend line sidesteps that
        // regardless of where the target falls.
        //
        // text-ink-2, not text-tangerine-text: tangerine-text is tuned for
        // contrast against a light tangerine-tint *background* (see the
        // Phase 11/F-06 notes in globals.css) — standing alone on bg-card
        // it's a dark, hard-to-read brown once bg-card itself flips dark
        // (found by checking this exact chart in dark mode). Only the
        // dashed swatch itself needs the accent color.
        <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-2">
          <span className="inline-block h-0 w-3 border-t border-dashed border-tangerine" />
          Target GPA {targetGpa!.toFixed(2)}
        </p>
      )}

      <div className="relative mt-4" style={{ height: CHART_HEIGHT }}>
        {targetHeight !== null && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-tangerine"
            style={{ bottom: targetHeight }}
          />
        )}

        <div className="flex h-full items-end gap-3">
          {points.map((p) => {
            const barHeight = Math.max(6, scaleToHeight(p.gpa, domain, BAR_MAX_HEIGHT));
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
