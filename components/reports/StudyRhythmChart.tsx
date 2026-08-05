import type { DayMinutes } from "@/lib/rules/insights";

const PLOT_HEIGHT = 110;
const LABEL_SPACE = 20;
const AXIS_WIDTH = 32;
const AXIS_STEPS = 4;

/** Rounds the chart ceiling up to a "nice" multiple (30/60/90…) so the axis
 * labels read like round numbers instead of the raw max minutes value. */
function niceCeiling(max: number): number {
  const step = 30;
  return Math.max(step, Math.ceil(max / step) * step);
}

/** `thisWeek`/`lastWeek` are both real, already-bucketed per-day series
 * (lib/rules/insights.ts dailyMinutesForWeek) — an empty day is a genuine
 * 0, not a missing data point (brief §7.5). */
export function StudyRhythmChart({
  thisWeek,
  lastWeek,
  children,
}: {
  thisWeek: DayMinutes[];
  lastWeek: DayMinutes[];
  /** "Where your time went" breakdown, rendered inside the same card as the
   * chart (concept §7.5: they share one white surface, not two stacked cards). */
  children?: React.ReactNode;
}) {
  const rawMax = Math.max(1, ...thisWeek.map((d) => d.minutes), ...lastWeek.map((d) => d.minutes));
  const axisMax = niceCeiling(rawMax);
  const lastWeekByKey = new Map(lastWeek.map((d, i) => [i, d.minutes]));
  const ticks = Array.from({ length: AXIS_STEPS + 1 }, (_, i) => (axisMax / AXIS_STEPS) * i);
  const pctOf = (minutes: number) => (minutes / axisMax) * 100;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Your study rhythm</h2>

      {/* "(min)" spelled out in the legend: the y-axis carries no unit of
          its own, so the series had to say what its numbers are. */}
      <div className="mt-2 flex gap-4 text-[11px] font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px] bg-violet" /> This week
          (min)
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0 w-4 border-t-2 border-violet-soft" /> Last week
          (min)
        </span>
      </div>

      {/* One explicit plot box, with the bars anchored to its own baseline.
          The bars used to live in a taller flex row that also held their
          value labels, which left every bar hanging LABEL_SPACE below the
          zero gridline and overlapping the weekday labels. */}
      <div className="mt-4 flex" style={{ height: PLOT_HEIGHT + LABEL_SPACE }}>
        <div
          className="relative shrink-0 text-[10px] font-semibold text-ink-3 tabular-nums"
          style={{ width: AXIS_WIDTH, marginTop: LABEL_SPACE }}
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 translate-y-1/2"
              style={{ bottom: `${pctOf(t)}%` }}
            >
              {Math.round(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 bottom-0" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((t) => (
              <span
                key={t}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-line"
                style={{ bottom: `${pctOf(t)}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-2">
              {thisWeek.map((d) => (
                <div key={d.dayKey} className="flex min-w-0 flex-1 justify-center self-stretch">
                  <div
                    className="mt-auto w-full max-w-[46px] rounded-t-[4px] bg-violet"
                    style={{ height: d.minutes > 0 ? `${Math.max(2, pctOf(d.minutes))}%` : 2 }}
                  />
                </div>
              ))}
            </div>

            {/* Solid line with a node per day, not a dashed grey run: the
                concept reads it as a second series to compare against, and
                the dashes were indistinguishable from the gridlines. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              <polyline
                fill="none"
                className="stroke-violet-soft"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
                points={thisWeek
                  .map((_, i) => {
                    const x = ((i + 0.5) / thisWeek.length) * 100;
                    const y = 100 - pctOf(lastWeekByKey.get(i) ?? 0);
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
            </svg>
            {thisWeek.map((d, i) => (
              <span
                key={`node-${d.dayKey}`}
                aria-hidden="true"
                className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-violet-soft"
                style={{
                  left: `${((i + 0.5) / thisWeek.length) * 100}%`,
                  bottom: `${pctOf(lastWeekByKey.get(i) ?? 0)}%`,
                }}
              />
            ))}
          </div>

          {/* Value labels ride the same scale as the bars they sit above. */}
          {thisWeek.map((d, i) =>
            d.minutes > 0 ? (
              <span
                key={`label-${d.dayKey}`}
                className="absolute -translate-x-1/2 text-[10px] font-bold text-foreground tabular-nums"
                style={{
                  left: `${((i + 0.5) / thisWeek.length) * 100}%`,
                  bottom: `${(pctOf(d.minutes) / 100) * PLOT_HEIGHT + 4}px`,
                }}
              >
                {d.minutes}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <div className="mt-1.5 flex gap-2" style={{ paddingLeft: AXIS_WIDTH }}>
        {thisWeek.map((d) => (
          <span
            key={d.dayKey}
            className="min-w-0 flex-1 text-center text-[10px] font-semibold text-ink-3"
          >
            {d.label}
          </span>
        ))}
      </div>

      <p className="sr-only">
        This week: {thisWeek.map((d) => `${d.label} ${d.minutes} minutes`).join(", ")}. Last week:{" "}
        {lastWeek.map((d) => `${d.label} ${d.minutes} minutes`).join(", ")}.
      </p>

      {children && <div className="mt-5 border-t border-line pt-4">{children}</div>}
    </div>
  );
}
