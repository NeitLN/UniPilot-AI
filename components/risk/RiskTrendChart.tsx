export interface RiskTrendPoint {
  scoreDate: string; // YYYY-MM-DD
  score: number;
}

const CHART_HEIGHT = 100;
const THRESHOLD = 60;

/** Only ever plots real `risk_scores` rows — a day with no computed score
 * simply isn't a point on the line, never interpolated (brief §6.4). Falls
 * back to a sparse-state message rather than a misleadingly confident
 * single-point "trend" when there's fewer than 2 real points. */
export function RiskTrendChart({ points }: { points: RiskTrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-card bg-card p-5">
        <h2 className="font-display text-lg font-bold text-foreground">7-day trend</h2>
        <p className="mt-3 text-[12.5px] font-semibold text-ink-3">
          {points.length === 0
            ? "No scores computed yet — check back after a few days."
            : "Only one day of history so far — a trend needs at least two."}
        </p>
      </div>
    );
  }

  const thresholdTop = CHART_HEIGHT - THRESHOLD;

  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">7-day trend</h2>
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-ink-3">
          <span className="inline-block h-0 w-3 border-t border-dashed border-coral" />
          Risk threshold ({THRESHOLD})
        </span>
      </div>

      <div className="relative mt-4" style={{ height: CHART_HEIGHT }}>
        <div className="absolute inset-x-0 border-t border-dashed border-coral" style={{ top: thresholdTop }} />
        <svg
          viewBox={`0 0 ${(points.length - 1) * 60} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <polyline
            fill="none"
            className="stroke-violet"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            points={points.map((p, i) => `${i * 60},${CHART_HEIGHT - p.score}`).join(" ")}
          />
        </svg>
        <div className="absolute inset-0 flex justify-between">
          {points.map((p) => (
            <div key={p.scoreDate} className="relative flex-1">
              <span
                aria-hidden="true"
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet"
                style={{ left: "50%", top: `${CHART_HEIGHT - p.score}px` }}
              />
              <span
                className="absolute -translate-x-1/2 -translate-y-full text-[10px] font-bold text-foreground tabular-nums"
                style={{ left: "50%", top: `${CHART_HEIGHT - p.score - 6}px` }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex justify-between">
        {points.map((p) => (
          <span key={p.scoreDate} className="flex-1 text-center text-[10.5px] font-bold text-ink-3">
            {new Date(`${p.scoreDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}
          </span>
        ))}
      </div>

      <p className="sr-only">
        {points.map((p) => `${p.scoreDate}: ${p.score}.`).join(" ")}
      </p>
    </div>
  );
}
