const TONE_CLASSES = {
  card: "bg-card",
  violet: "bg-violet text-white",
  lime: "bg-lime text-ink",
  mint: "bg-mint-tint text-mint-text",
  coral: "bg-coral-tint text-coral-text",
  ink: "bg-ink text-white",
} as const;

export type StatTileTone = keyof typeof TONE_CLASSES;

const HINT_CLASSES: Record<StatTileTone, string> = {
  card: "text-ink-3",
  violet: "text-white/75",
  lime: "text-ink/70",
  mint: "text-mint-text/80",
  coral: "text-coral-text/80",
  ink: "text-dusk-hud",
};

/** Small metric tile — Schedule's "3 classes today", Focus's "This week"
 * stat trio, GPA breakdown counters, etc. (shared per roadmap Step 0.3). */
export function StatTile({
  icon,
  label,
  value,
  unit,
  hint,
  tone = "card",
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: StatTileTone;
  className?: string;
}) {
  return (
    <div className={`rounded-ctl p-4 ${TONE_CLASSES[tone]} ${className ?? ""}`}>
      {icon && <div className="mb-1.5 flex h-8 w-8 items-center justify-center">{icon}</div>}
      <p className="font-display text-2xl font-bold leading-none">
        {value}
        {unit && <span className="ml-1 text-xs font-bold">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[11.5px] font-bold">{label}</p>
      {hint && <p className={`mt-0.5 text-[11px] font-semibold ${HINT_CLASSES[tone]}`}>{hint}</p>}
    </div>
  );
}
