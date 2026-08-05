import type { GpaScenarios } from "@/lib/rules/gpa";

const CARDS: {
  key: keyof GpaScenarios;
  label: string;
  hint: string;
  text: string;
  border: string;
  stroke: string;
}[] = [
  {
    key: "worst",
    label: "Likely worst case",
    hint: "If performance slips",
    text: "text-coral-text",
    border: "border-coral/40",
    stroke: "stroke-coral",
  },
  {
    key: "likely",
    label: "Most likely",
    hint: "Keep doing what you're doing",
    text: "text-violet-text",
    border: "border-violet/40",
    stroke: "stroke-violet",
  },
  {
    key: "best",
    label: "Likely best case",
    hint: "If performance improves",
    text: "text-mint-text",
    border: "border-mint/50",
    stroke: "stroke-mint",
  },
];

/**
 * A two-point sparkline: where the GPA stands now, and where this scenario
 * lands it. Not decoration — the slope is the scenario's actual direction,
 * drawn from the same numbers printed beside it.
 */
function Sparkline({ from, to, stroke }: { from: number; to: number; stroke: string }) {
  // Scaled against the pair's own span (with a floor, so a scenario that
  // barely moves draws a near-flat line rather than a full-height jump).
  const span = Math.max(0.3, Math.abs(to - from));
  const mid = (from + to) / 2;
  const y = (v: number) => 14 - ((v - (mid - span / 2)) / span) * 12;

  return (
    <svg viewBox="0 0 40 16" className="h-4 w-10 overflow-visible" aria-hidden="true">
      <polyline
        points={`2,${y(from)} 38,${y(to)}`}
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={stroke}
      />
      <circle cx="38" cy={y(to)} r="2" className={`${stroke} fill-card`} strokeWidth="1.4" />
    </svg>
  );
}

/** `scenarios` comes from the pure, unit-tested `projectGpaScenarios` — see
 * its doc comment for the exact, documented assumption behind each case
 * (never a random/undocumented number). Renders nothing when there's no
 * in-progress course to project from, rather than showing three identical
 * copies of the current GPA (brief §5.4). */
export function PredictedScenarios({
  scenarios,
  currentGpa,
}: {
  scenarios: GpaScenarios | null;
  /** Where each sparkline starts — today's cumulative GPA. */
  currentGpa: number;
}) {
  if (!scenarios) return null;

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">Predicted grades</h2>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.key} className={`rounded-ctl border ${c.border} bg-card p-3`}>
            <p className={`text-[11px] font-bold ${c.text}`}>{c.label}</p>
            <div className="mt-1 flex items-end justify-between gap-2">
              <p
                className={`font-display text-[26px] font-bold leading-none tabular-nums ${c.text}`}
              >
                {scenarios[c.key].toFixed(2)}
              </p>
              <Sparkline from={currentGpa} to={scenarios[c.key]} stroke={c.stroke} />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-ink-3">{c.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10.5px] font-semibold text-ink-3">
        Directional estimate from ungraded assignment weight — not an official grade.
      </p>
    </div>
  );
}
