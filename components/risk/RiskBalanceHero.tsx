import { evidenceImpact, riskRange, type ImpactLevel, type RiskResult } from "@/lib/rules/risk";

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

/** Same three tiers EvidenceCard's impact badge already uses — High mirrors
 * "strong", Low mirrors "protective", so the hero's per-factor read never
 * disagrees with the evidence list right below it on the same page. */
const LEVEL_LABEL: Record<ImpactLevel, string> = { strong: "High", moderate: "Moderate", protective: "Low" };
const LEVEL_DOT_CLASS: Record<ImpactLevel, string> = { strong: "bg-coral", moderate: "bg-tangerine", protective: "bg-mint" };
const LEVEL_FILL_CLASS: Record<ImpactLevel, string> = { strong: "bg-coral", moderate: "bg-tangerine", protective: "bg-mint" };
const PIP_COUNT = 5;

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
      <div>
        <h2 className="font-display text-lg font-bold">Your weekly balance</h2>
        <p className="mt-0.5 text-[11.5px] font-semibold text-dusk-hud">
          {computedAt
            ? `Computed ${new Date(computedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
            : "Computed just now"}
        </p>
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
        {FACTORS.map((f) => {
          const level = evidenceImpact(f.key, result[f.key]);
          const filledPips = Math.max(1, Math.min(PIP_COUNT, Math.ceil((result[f.key] / 100) * PIP_COUNT)));
          return (
            <div key={f.key}>
              <p className="text-[11px] font-bold text-dusk-hud">
                {f.label} <span className="text-dusk-label">{f.weight}</span>
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold leading-none">{result[f.key]}</p>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: PIP_COUNT }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < filledPips ? LEVEL_FILL_CLASS[level] : "bg-white/12"}`}
                  />
                ))}
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-extrabold text-dusk-hud">
                <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_DOT_CLASS[level]}`} />
                {LEVEL_LABEL[level]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
