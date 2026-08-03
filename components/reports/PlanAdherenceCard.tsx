import { Target } from "lucide-react";

export function PlanAdherenceCard({ adherence, elapsed, kept }: { adherence: number | null; elapsed: number; kept: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card bg-lime p-5">
      <div className="min-w-0">
        <h2 className="font-display text-sm font-bold text-ink">Plan adherence</h2>
        {adherence === null ? (
          <p className="mt-2 text-[12.5px] font-semibold text-ink/70">No AI planner sessions have come due yet this week.</p>
        ) : (
          <>
            <p className="mt-1 font-display text-5xl font-bold leading-none text-ink">{Math.round(adherence * 100)}%</p>
            <p className="mt-2 text-[12.5px] font-semibold text-ink/70">
              {kept} of {elapsed} planned session{elapsed === 1 ? "" : "s"} completed
            </p>
          </>
        )}
      </div>
      <Target className="h-10 w-10 shrink-0 text-ink/25" aria-hidden="true" strokeWidth={1.5} />
    </div>
  );
}
