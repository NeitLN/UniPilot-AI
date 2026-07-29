import type { ProgressTone } from "@/lib/rules/assignment";

const FILL_CLASSES: Record<ProgressTone, string> = {
  coral: "bg-coral",
  tangerine: "bg-tangerine",
  violet: "bg-violet",
  muted: "bg-ink-3",
};

export interface ProgressBarProps {
  value: number;
  tone: ProgressTone;
  className?: string;
}

export function ProgressBar({ value, tone, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`flex w-full items-center gap-2 sm:w-[92px] ${className ?? ""}`}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[7px] flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className={`h-full rounded-full ${FILL_CLASSES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10.5px] font-bold tabular-nums text-ink-2">
        {pct}%
      </span>
    </div>
  );
}
