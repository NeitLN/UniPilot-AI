import type { DayMinutes } from "@/lib/rules/insights";

const BAR_MAX_HEIGHT = 90;
const LABEL_SPACE = 18;
const CHART_HEIGHT = BAR_MAX_HEIGHT + LABEL_SPACE;

/** `thisWeek`/`lastWeek` are both real, already-bucketed per-day series
 * (lib/rules/insights.ts dailyMinutesForWeek) — an empty day is a genuine
 * 0, not a missing data point (brief §7.5). */
export function StudyRhythmChart({ thisWeek, lastWeek }: { thisWeek: DayMinutes[]; lastWeek: DayMinutes[] }) {
  const maxMinutes = Math.max(1, ...thisWeek.map((d) => d.minutes), ...lastWeek.map((d) => d.minutes));
  const lastWeekByKey = new Map(lastWeek.map((d, i) => [i, d.minutes]));

  return (
    <div className="rounded-card bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Your study rhythm</h2>
      </div>
      <div className="mt-1 flex gap-3 text-[10.5px] font-semibold text-ink-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-violet" /> This week
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0 w-3 border-t border-dashed border-ink-3" /> Last week
        </span>
      </div>

      <div className="relative mt-4 flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
        {/* Last-week comparison line, drawn behind the bars. */}
        <svg
          viewBox={`0 0 ${thisWeek.length * 40} ${BAR_MAX_HEIGHT}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-[18px] h-[90px] w-full"
        >
          <polyline
            fill="none"
            className="stroke-ink-3"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            points={thisWeek
              .map((_, i) => {
                const m = lastWeekByKey.get(i) ?? 0;
                const y = BAR_MAX_HEIGHT - Math.round((m / maxMinutes) * BAR_MAX_HEIGHT);
                return `${i * 40 + 20},${y}`;
              })
              .join(" ")}
          />
        </svg>

        {thisWeek.map((d) => {
          const barHeight = d.minutes === 0 ? 2 : Math.max(4, Math.round((d.minutes / maxMinutes) * BAR_MAX_HEIGHT));
          return (
            <div key={d.dayKey} className="flex flex-1 shrink-0 flex-col items-center justify-end gap-1" style={{ height: CHART_HEIGHT }}>
              <span className="text-[9px] font-bold text-ink-3 tabular-nums">{d.minutes > 0 ? d.minutes : ""}</span>
              <div className="w-full shrink-0 rounded-t-[4px] bg-violet" style={{ height: barHeight }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {thisWeek.map((d) => (
          <span key={d.dayKey} className="flex-1 text-center text-[9.5px] font-bold text-ink-3">
            {d.label}
          </span>
        ))}
      </div>

      <p className="sr-only">
        This week: {thisWeek.map((d) => `${d.label} ${d.minutes} minutes`).join(", ")}. Last week:{" "}
        {lastWeek.map((d) => `${d.label} ${d.minutes} minutes`).join(", ")}.
      </p>
    </div>
  );
}
