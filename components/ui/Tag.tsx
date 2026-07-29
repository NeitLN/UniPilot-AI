export type TagTone = "coral" | "tangerine" | "violet" | "mint" | "neutral";

const TONE_CLASSES: Record<TagTone, string> = {
  coral: "bg-coral-tint text-coral-text",
  tangerine: "bg-tangerine-tint text-tangerine-text",
  violet: "bg-violet-tint text-violet",
  mint: "bg-mint-tint text-mint-text",
  neutral: "bg-line text-ink-2",
};

export interface TagProps {
  tone: TagTone;
  children: React.ReactNode;
  className?: string;
}

/** Text-first status pill — color is a secondary cue, never the only signal (BR-01). */
export function Tag({ tone, children, className }: TagProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-extrabold ${TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
