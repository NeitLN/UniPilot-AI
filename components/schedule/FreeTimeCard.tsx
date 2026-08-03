import { CalendarRange } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { formatMinutes } from "@/lib/rules/plan-presentation";

/** "Free time this week" card — right rail, below the Google sync status
 * (concept §8, "Free time" tile). `freeMinutesTotal`/`freeBlockCount` are
 * the same real per-day figures ScheduleSummaryStrip already derives from
 * `freeMinutesForDay`, just summed across the week so this never invents a
 * second, disagreeing notion of "free". */
export function FreeTimeCard({
  freeMinutesTotal,
  freeBlockCount,
  availableMinutesTotal,
}: {
  freeMinutesTotal: number;
  freeBlockCount: number;
  /** Denominator for the progress bar — total minutes across the week's
   * scheduling window. Null hides the bar rather than dividing by zero. */
  availableMinutesTotal: number | null;
}) {
  const pct =
    availableMinutesTotal && availableMinutesTotal > 0
      ? Math.min(100, Math.round((freeMinutesTotal / availableMinutesTotal) * 100))
      : null;

  return (
    <div className="rounded-card bg-card p-4">
      <div className="flex items-center gap-3">
        <IconChip icon={<CalendarRange className="h-[18px] w-[18px]" aria-hidden="true" />} tone="mint" />
        <div>
          <p className="font-display text-2xl font-bold leading-none text-foreground">{formatMinutes(freeMinutesTotal)}</p>
          <p className="mt-1 text-[11.5px] font-bold text-ink-3">available this week</p>
        </div>
      </div>
      {pct !== null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-mint" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-2 text-[11.5px] font-semibold text-ink-3">
        {freeBlockCount} block{freeBlockCount === 1 ? "" : "s"} remaining
      </p>
    </div>
  );
}
