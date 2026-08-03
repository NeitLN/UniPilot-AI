import { evidenceImpact, type RiskResult, type SuggestionType } from "@/lib/rules/risk";
import type { RiskEvidence } from "@/lib/risk/compute";

const IMPACT_LABEL = { strong: "Strong impact", moderate: "Moderate impact", protective: "Protective impact" };
const IMPACT_CLASSES = {
  strong: "bg-coral-tint text-coral-text",
  moderate: "bg-tangerine-tint text-tangerine-text",
  protective: "bg-mint-tint text-mint-text",
};

interface EvidenceItem {
  type: SuggestionType;
  icon: string;
  headline: string;
  detail: string;
}

export function EvidenceCard({ result, evidence }: { result: RiskResult; evidence: RiskEvidence }) {
  const items: EvidenceItem[] = [
    {
      type: "overdue",
      icon: "📋",
      headline:
        evidence.overdueCount === 0
          ? "No overdue assignments"
          : `${evidence.overdueCount} overdue assignment${evidence.overdueCount === 1 ? "" : "s"}`,
      detail:
        evidence.overdueCount === 0
          ? "Nothing overdue right now — this factor isn't adding to your score."
          : "Overdue work adds stress and increases your risk the most.",
    },
    {
      type: "workload",
      icon: "🗓",
      headline: `${Math.round(evidence.plannedHours)}h planned of ${Math.round(evidence.availableHours)}h available`,
      detail:
        evidence.plannedHours > evidence.availableHours
          ? "Planned hours exceed what you told us you have available."
          : "A full week ahead — manageable with a solid plan.",
    },
    {
      type: "focus",
      icon: "⏱",
      headline: `${evidence.completedFocusMinutes7d} focused minutes`,
      detail:
        evidence.completedCycles7d > 0
          ? "Recent focus time — this protects your balance."
          : "No completed focus sessions in the last 7 days.",
    },
  ];

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">What&rsquo;s shaping your score</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => {
          const impact = evidenceImpact(item.type, result[item.type]);
          return (
            <li key={item.type} className="flex items-center gap-3 rounded-ctl bg-line p-3">
              <span aria-hidden="true" className="text-lg">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{item.headline}</p>
                <p className="text-[11.5px] font-semibold text-ink-3">{item.detail}</p>
              </div>
              <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[10.5px] font-extrabold ${IMPACT_CLASSES[impact]}`}>
                {IMPACT_LABEL[impact]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
