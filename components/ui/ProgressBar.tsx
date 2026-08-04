import type { ProgressTone } from "@/lib/rules/assignment";

const FILL_CLASSES: Record<ProgressTone, string> = {
  coral: "bg-coral",
  tangerine: "bg-tangerine",
  violet: "bg-violet",
  muted: "bg-ink-3",
};

const TEXT_CLASSES: Record<ProgressTone, string> = {
  coral: "text-coral-text",
  tangerine: "text-tangerine-text",
  violet: "text-violet-text",
  muted: "text-ink-2",
};

export interface ProgressBarProps {
  value: number;
  tone: ProgressTone;
  className?: string;
  /** Larger, tone-colored percent readout — the concept's row style, where
   * the number is the primary signal instead of a small neutral caption. */
  emphasizePercent?: boolean;
}

export function ProgressBar({ value, tone, className, emphasizePercent = false }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      className={`flex w-full items-center gap-2 sm:w-[92px] ${className ?? ""}`}
    >
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[7px] flex-1 overflow-hidden rounded-full bg-line"
      >
        {/* Width is the one CSS property this project intentionally
            transitions despite the general transform/opacity preference —
            there's no equivalent way to represent "percent filled" for a
            simple bar without it. motion-safe: keeps this instant under
            prefers-reduced-motion. */}
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out ${FILL_CLASSES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-right font-bold tabular-nums ${
          emphasizePercent ? `w-10 text-sm ${TEXT_CLASSES[tone]}` : "w-8 text-[10.5px] text-ink-2"
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
