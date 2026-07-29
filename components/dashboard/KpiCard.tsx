export type KpiTone = "violet" | "coral" | "mint" | "tangerine";

const TONE_BG: Record<KpiTone, string> = {
  violet: "bg-violet",
  coral: "bg-coral",
  mint: "bg-mint",
  tangerine: "bg-tangerine",
};

// Text on solid mint/tangerine uses a dark shade of the same hue, never gray
// (DESIGN.md §2.2). Violet/coral stay white.
const TONE_TEXT: Record<KpiTone, string> = {
  violet: "text-white",
  coral: "text-white",
  mint: "text-mint-text",
  tangerine: "text-tangerine-text",
};

const TONE_TRACK: Record<KpiTone, string> = {
  violet: "bg-white/25",
  coral: "bg-white/25",
  mint: "bg-ink/15",
  tangerine: "bg-ink/15",
};

const TONE_FILL: Record<KpiTone, string> = {
  violet: "bg-white",
  coral: "bg-white",
  mint: "bg-ink",
  tangerine: "bg-ink",
};

export interface KpiCardProps {
  tone: KpiTone;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  barPct?: number;
}

export function KpiCard({ tone, label, value, unit, hint, barPct }: KpiCardProps) {
  return (
    <div className={`rounded-card ${TONE_BG[tone]} ${TONE_TEXT[tone]} px-5 py-[18px] pb-5`}>
      <p className="text-[12.5px] font-bold opacity-75">{label}</p>
      <p className="mt-1 font-display text-[46px] font-bold leading-none tracking-[-0.045em]">
        {value}
        {unit && <span className="ml-1.5 text-[13px] font-bold opacity-70">{unit}</span>}
      </p>
      {typeof barPct === "number" && (
        <div className={`mt-3 h-[7px] rounded-full ${TONE_TRACK[tone]}`}>
          <div
            className={`h-full rounded-full ${TONE_FILL[tone]}`}
            style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}
          />
        </div>
      )}
      <p className="mt-2.5 text-[11.5px] font-semibold opacity-72">{hint}</p>
    </div>
  );
}

export function KpiCardSkeleton({ tone }: { tone: KpiTone }) {
  return (
    <div className={`animate-pulse rounded-card ${TONE_BG[tone]} px-5 py-[18px] pb-5`}>
      <div className="h-3 w-20 rounded-full bg-white/30" />
      <div className="mt-3 h-9 w-16 rounded-full bg-white/30" />
      <div className="mt-4 h-[7px] w-full rounded-full bg-white/20" />
    </div>
  );
}
