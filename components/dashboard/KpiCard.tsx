export type KpiTone = "violet" | "coral" | "mint" | "tangerine";

const TONE_BG: Record<KpiTone, string> = {
  violet: "bg-violet",
  // coral-deep, not coral: plain white text on solid coral never reaches
  // 4.5:1 contrast at any opacity (Lighthouse a11y audit, Phase 11).
  coral: "bg-coral-deep",
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
  // Solid white, not bg-card — these bars sit on a permanently-bright
  // violet/coral card and must read as a light fill in both themes.
  violet: "bg-white",
  coral: "bg-white",
  mint: "bg-ink",
  tangerine: "bg-ink",
};

// Same split as TONE_TEXT: the icon inherits the card's own text color, so
// the translucent disc behind it has to be light on the dark violet/coral
// cards and dark on the bright mint/tangerine ones.
const TONE_ICON_DISC: Record<KpiTone, string> = {
  violet: "bg-white/20",
  coral: "bg-white/20",
  mint: "bg-ink/10",
  tangerine: "bg-ink/10",
};

export interface KpiCardProps {
  tone: KpiTone;
  label: string;
  value: string;
  unit?: string;
  hint: string;
  barPct?: number;
  /** Decorative only — every card already states its meaning in `label`,
   * so the icon is aria-hidden by its own caller and never the sole cue. */
  icon?: React.ReactNode;
}

export function KpiCard({ tone, label, value, unit, hint, barPct, icon }: KpiCardProps) {
  return (
    // h-full + a bottom-pinned footer: only the Workload risk card carries a
    // progress bar, so without this it was visibly taller than the other
    // three and their hint lines sat at three different heights.
    <div className={`flex h-full flex-col rounded-card ${TONE_BG[tone]} ${TONE_TEXT[tone]} px-5 py-[18px] pb-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold">{label}</p>
          <p className="mt-1 font-display text-[46px] font-bold leading-none tracking-[-0.045em]">
            {value}
            {unit && (
              <span className="ml-1.5 text-[13px] font-bold tracking-normal">{unit}</span>
            )}
          </p>
        </div>
        {icon && (
          <span
            aria-hidden="true"
            className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full ${TONE_ICON_DISC[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>
      {/* Bar and hint travel together at the card's foot, so every card's
          hint line lands on the same baseline whether or not it has a bar. */}
      <div className="mt-auto pt-3">
        {typeof barPct === "number" && (
          <div className={`h-[7px] rounded-full ${TONE_TRACK[tone]}`}>
            <div
              className={`h-full rounded-full ${TONE_FILL[tone]}`}
              style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }}
            />
          </div>
        )}
        <p className={`text-[11.5px] font-semibold ${typeof barPct === "number" ? "mt-2.5" : ""}`}>
          {hint}
        </p>
      </div>
    </div>
  );
}

export function KpiCardSkeleton({ tone }: { tone: KpiTone }) {
  return (
    <div className={`h-full animate-pulse rounded-card ${TONE_BG[tone]} px-5 py-[18px] pb-5`}>
      <div className="h-3 w-20 rounded-full bg-white/30" />
      <div className="mt-3 h-9 w-16 rounded-full bg-white/30" />
      <div className="mt-4 h-[7px] w-full rounded-full bg-white/20" />
    </div>
  );
}
