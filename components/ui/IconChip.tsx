const TONE_CLASSES = {
  violet: "bg-violet-tint text-violet-text",
  lime: "bg-lime text-ink",
  mint: "bg-mint-tint text-mint-text",
  coral: "bg-coral-tint text-coral-text",
  tangerine: "bg-tangerine-tint text-tangerine-text",
  sky: "bg-sky-tint text-sky-text",
  ink: "bg-white/10 text-white",
  white: "bg-white text-ink",
} as const;

export type IconChipTone = keyof typeof TONE_CLASSES;

const SIZE_CLASSES = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-[18px] [&_svg]:w-[18px]",
  lg: "h-12 w-12 [&_svg]:h-5 [&_svg]:w-5",
} as const;

export type IconChipSize = keyof typeof SIZE_CLASSES;

/** Rounded tinted icon container — the recurring "icon chip" motif from the
 * approved concepts (metric cards, evidence rows, notification rows, plan
 * health, etc.). Never bare emoji per the pixel-match spec §4.5. */
export function IconChip({
  icon,
  tone = "violet",
  size = "md",
  square = false,
  /** Replaces the tone-derived bg/text classes entirely — for callers that
   * need a dynamic per-item color (e.g. a course's accent) instead of one
   * of the fixed tones. */
  colorClassName,
  className,
}: {
  icon: React.ReactNode;
  tone?: IconChipTone;
  size?: IconChipSize;
  /** rounded-full by default; square=true for the softer rounded-ctl squares. */
  square?: boolean;
  colorClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${square ? "rounded-ctl" : "rounded-full"} ${SIZE_CLASSES[size]} ${colorClassName ?? TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      {icon}
    </div>
  );
}
