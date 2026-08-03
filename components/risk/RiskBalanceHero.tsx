import { riskRange, type RiskResult } from "@/lib/rules/risk";
import { RefreshScoreButton } from "./RefreshScoreButton";

const SEGMENTS = [
  { from: 0, to: 40, className: "bg-mint" },
  { from: 40, to: 60, className: "bg-tangerine" },
  { from: 60, to: 100, className: "bg-coral" },
];

const RANGE_LABEL = {
  balanced: "Balanced",
  moderate: "Moderate",
  overloaded: "Overloaded",
} as const;

const FACTORS: { key: "workload" | "overdue" | "focus"; label: string; weight: string }[] = [
  { key: "workload", label: "Workload", weight: "×0.40" },
  { key: "overdue", label: "Overdue", weight: "×0.35" },
  { key: "focus", label: "Focus", weight: "×0.25" },
];

/** Active range is marked by a dot + bold white text, not colored text —
 * sidesteps the semantic-color-text-guard (bare text-mint/coral/tangerine
 * is reserved for the *-tint-paired pattern, tuned for light backgrounds;
 * this hero is dark) while still never relying on color alone. */
function RangeLabel({ active, dotClass, label }: { active: boolean; dotClass: string; label: string }) {
  return (
    <span className={`flex items-center gap-1 ${active ? "font-extrabold text-white" : ""}`}>
      {active && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
}

export function RiskBalanceHero({ result, computedAt }: { result: RiskResult; computedAt: string | null }) {
  const range = riskRange(result.score);

  return (
    <div className="rounded-card bg-ink p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Your weekly balance</h2>
          <p className="mt-0.5 text-[11.5px] font-semibold text-dusk-hud">
            {computedAt
              ? `Computed ${new Date(computedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Computed just now"}
          </p>
        </div>
        <RefreshScoreButton />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="flex items-baseline gap-1.5">
          <p className="font-display text-6xl font-bold tabular-nums">{result.score}</p>
          <p className="text-lg font-bold text-dusk-hud">/100</p>
        </div>
        <span
          className={`rounded-pill px-3 py-1.5 text-[12px] font-extrabold ${
            range === "overloaded"
              ? "bg-coral-deep text-white"
              : range === "moderate"
                ? "bg-tangerine-tint text-tangerine-text"
                : "bg-mint text-mint-text"
          }`}
        >
          {result.warn ? "Above threshold" : "Within a healthy range"}
        </span>
      </div>

      {/* Gauge — a text label (RANGE_LABEL) always accompanies the color,
          never color alone (brief §5.4 accessibility). */}
      <div className="relative mt-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full">
          {SEGMENTS.map((s) => (
            <div key={s.from} className={s.className} style={{ width: `${s.to - s.from}%` }} />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute -top-1 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-white"
          style={{ left: `${Math.max(0, Math.min(100, result.score))}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] font-bold text-dusk-hud">
        <RangeLabel active={range === "balanced"} dotClass="bg-mint" label="Balanced" />
        <RangeLabel active={range === "moderate"} dotClass="bg-tangerine" label="Moderate" />
        <RangeLabel active={range === "overloaded"} dotClass="bg-coral" label="Overloaded" />
      </div>
      <p className="sr-only">Current range: {RANGE_LABEL[range]}.</p>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-dusk-border pt-4">
        {FACTORS.map((f) => (
          <div key={f.key}>
            <p className="text-[11px] font-bold text-dusk-hud">
              {f.label} <span className="text-dusk-label">{f.weight}</span>
            </p>
            <p className="mt-0.5 font-display text-lg font-bold">{result[f.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
