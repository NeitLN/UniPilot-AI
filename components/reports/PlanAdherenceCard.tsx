export function PlanAdherenceCard({ adherence, elapsed, kept }: { adherence: number | null; elapsed: number; kept: number }) {
  return (
    <div className="rounded-card bg-lime p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-ink">Plan adherence</h2>
        <span aria-hidden="true">🎯</span>
      </div>
      {adherence === null ? (
        <p className="mt-2 text-[12.5px] font-semibold text-ink/70">No AI planner sessions have come due yet this week.</p>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl font-bold text-ink">{Math.round(adherence * 100)}%</p>
          <p className="mt-1 text-[12.5px] font-semibold text-ink/70">
            {kept} of {elapsed} planned session{elapsed === 1 ? "" : "s"} completed
          </p>
        </>
      )}
    </div>
  );
}
