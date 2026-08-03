import type { GpaScenarios } from "@/lib/rules/gpa";

const CARDS: { key: keyof GpaScenarios; label: string; hint: string; tone: string }[] = [
  { key: "worst", label: "Likely worst case", hint: "If performance slips", tone: "text-coral-text" },
  { key: "likely", label: "Most likely", hint: "Keep doing what you're doing", tone: "text-violet" },
  { key: "best", label: "Likely best case", hint: "If performance improves", tone: "text-mint-text" },
];

/** `scenarios` comes from the pure, unit-tested `projectGpaScenarios` — see
 * its doc comment for the exact, documented assumption behind each case
 * (never a random/undocumented number). Renders nothing when there's no
 * in-progress course to project from, rather than showing three identical
 * copies of the current GPA (brief §5.4). */
export function PredictedScenarios({ scenarios }: { scenarios: GpaScenarios | null }) {
  if (!scenarios) return null;

  return (
    <div className="rounded-card-sm bg-card p-4">
      <h2 className="font-display text-sm font-bold text-foreground">Predicted grades</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CARDS.map((c) => (
          <div key={c.key} className="rounded-ctl bg-line p-3 text-center">
            <p className="text-[10px] font-bold text-ink-3">{c.label}</p>
            <p className={`mt-1 font-display text-xl font-bold tabular-nums ${c.tone}`}>
              {scenarios[c.key].toFixed(2)}
            </p>
            <p className="mt-0.5 text-[9.5px] font-semibold text-ink-3">{c.hint}</p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[10.5px] font-semibold text-ink-3">
        Directional estimate from ungraded assignment weight — not an official grade.
      </p>
    </div>
  );
}
