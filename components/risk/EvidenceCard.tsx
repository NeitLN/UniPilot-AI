import { ClipboardList, CalendarClock, Timer } from "lucide-react";
import { IconChip, type IconChipTone } from "@/components/ui/IconChip";
import { evidenceImpact, type RiskResult, type SuggestionType } from "@/lib/rules/risk";
import type { RiskEvidence } from "@/lib/risk/compute";

const IMPACT_LABEL = {
  strong: "Strong impact",
  moderate: "Moderate impact",
  protective: "Protective impact",
};
const IMPACT_CLASSES = {
  strong: "bg-coral-tint text-coral-text",
  moderate: "bg-tangerine-tint text-tangerine-text",
  protective: "bg-mint-tint text-mint-text",
};
/* The headline sits on bg-line, which flips to a dark surface in dark mode,
   while coral-text/tangerine-text/mint-text are fixed dark shades chosen for
   a light tint. That pairing rendered dark-on-dark — mint-text measured
   1:1 on the dark --line. The impact tone is already carried by the chip and
   the IconChip beside it, both of which keep the correct tint+text pairing,
   so the headline itself just needs a token that flips with its surface. */
const HEADLINE_CLASS = "text-foreground";
const IMPACT_CHIP_TONE: Record<keyof typeof IMPACT_CLASSES, IconChipTone> = {
  strong: "coral",
  moderate: "tangerine",
  protective: "mint",
};
const IMPACT_CHIP_DOT: Record<keyof typeof IMPACT_CLASSES, string> = {
  strong: "bg-coral",
  moderate: "bg-tangerine",
  protective: "bg-mint",
};

interface EvidenceItem {
  type: SuggestionType;
  icon: React.ReactNode;
  headline: string;
  detail: string;
}

export function EvidenceCard({ result, evidence }: { result: RiskResult; evidence: RiskEvidence }) {
  const items: EvidenceItem[] = [
    {
      type: "overdue",
      icon: <ClipboardList className="h-[18px] w-[18px]" aria-hidden="true" />,
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
      icon: <CalendarClock className="h-[18px] w-[18px]" aria-hidden="true" />,
      headline: `${Math.round(evidence.plannedHours)}h planned of ${Math.round(evidence.availableHours)}h available`,
      detail:
        evidence.plannedHours > evidence.availableHours
          ? "Planned hours exceed what you told us you have available."
          : "A full week ahead — manageable with a solid plan.",
    },
    {
      type: "focus",
      icon: <Timer className="h-[18px] w-[18px]" aria-hidden="true" />,
      headline: `${evidence.completedFocusMinutes7d} focused minutes`,
      detail:
        evidence.completedCycles7d > 0
          ? "Recent focus time — this protects your balance."
          : "No completed focus sessions in the last 7 days.",
    },
  ];

  return (
    <div className="rounded-card bg-card p-5">
      <h2 className="font-display text-lg font-bold text-foreground">
        What&rsquo;s shaping your score
      </h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => {
          const impact = evidenceImpact(item.type, result[item.type]);
          const strength = impact === "strong" ? 5 : impact === "moderate" ? 3 : 1;
          return (
            <li key={item.type} className="flex items-center gap-3 rounded-ctl bg-line p-3">
              <IconChip icon={item.icon} tone={IMPACT_CHIP_TONE[impact]} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${HEADLINE_CLASS}`}>{item.headline}</p>
                <p className="text-[11.5px] font-semibold text-ink-3">{item.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-pill px-2.5 py-1 text-[10.5px] font-extrabold ${IMPACT_CLASSES[impact]}`}
                >
                  {IMPACT_LABEL[impact]}
                </span>
                <span className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i < strength ? IMPACT_CHIP_DOT[impact] : "bg-ink/10"}`}
                    />
                  ))}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
