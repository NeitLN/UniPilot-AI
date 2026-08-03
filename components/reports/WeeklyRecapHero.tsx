import { Pilo } from "@/components/brand/Pilo";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { formatMinutes } from "@/lib/rules/focus";

/** Headline copy is deterministic, based on real activity — never a
 * generic platitude unrelated to what actually happened (brief §7.3). */
function headline(completedMinutes: number, completedCount: number, streak: number): string {
  if (completedMinutes === 0 && completedCount === 0) return "A quiet week.";
  if (streak >= 5) return "You kept showing up.";
  if (completedCount > 0) return "Good progress this week.";
  return "You put in the time.";
}

export function WeeklyRecapHero({
  completedMinutes,
  completedCount,
  streak,
  /** Goal minutes = weekly_availability_hours × 60 (brief §7.3) — null when
   * the viewer has no availability set, in which case the arc is hidden
   * entirely rather than dividing by zero or claiming a goal nobody set. */
  goalMinutes,
}: {
  completedMinutes: number;
  completedCount: number;
  streak: number;
  goalMinutes: number | null;
}) {
  const pct = goalMinutes && goalMinutes > 0 ? Math.min(100, Math.round((completedMinutes / goalMinutes) * 100)) : null;

  return (
    <div className="flex flex-wrap items-center gap-5 rounded-card bg-violet p-5 text-white sm:p-6">
      <Pilo mood={completedMinutes > 0 || completedCount > 0 ? "happy" : "sleepy"} size={64} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-bold">{headline(completedMinutes, completedCount, streak)}</h1>
        <p className="mt-1.5 text-[13px] font-medium text-white/88">
          {formatMinutes(completedMinutes)} focused and {completedCount} assignment{completedCount === 1 ? "" : "s"}{" "}
          completed.
        </p>
        {streak > 0 && (
          <span className="mt-2 inline-flex items-center rounded-pill bg-lime px-2.5 py-1 text-[11px] font-extrabold text-ink">
            {streak} day streak
          </span>
        )}
      </div>

      {pct !== null && (
        <ProgressRing
          value={pct}
          size={92}
          strokeWidth={8}
          tone="lime"
          track="dark"
          label={`${formatMinutes(completedMinutes)} of your ${formatMinutes(goalMinutes!)} available study time this week, ${pct}%`}
        >
          <div>
            <p className="font-display text-base font-bold">{pct}%</p>
            <p className="text-[8px] font-bold uppercase tracking-wide text-white/70">of available time</p>
          </div>
        </ProgressRing>
      )}
    </div>
  );
}
