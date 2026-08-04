/** The concept's dartboard: concentric rings with a dart through them.
 * Drawn inline rather than pulled from an icon set — lucide's Target is a
 * thin outline that reads as a generic crosshair at this size, where the
 * point here is "you hit the plan". */
function Dartboard() {
  return (
    <span aria-hidden="true" className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-card" />
      <span className="absolute inset-[14px] rounded-full bg-lime" />
      <span className="absolute inset-[26px] rounded-full bg-card" />
      <span className="absolute inset-[38px] rounded-full bg-violet" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full overflow-visible">
        {/* Shaft from the upper right into the bullseye, with fletching. */}
        <line x1="112" y1="8" x2="60" y2="60" className="stroke-ink" strokeWidth="5" strokeLinecap="round" />
        <path d="M112 8 L96 6 L114 24 Z" className="fill-ink" />
      </svg>
    </span>
  );
}

export function PlanAdherenceCard({
  adherence,
  elapsed,
  kept,
}: {
  adherence: number | null;
  elapsed: number;
  kept: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-card bg-lime p-6">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-ink">Plan adherence</h2>
        {adherence === null ? (
          <p className="mt-2 text-[12.5px] font-semibold text-ink/70">
            No AI planner sessions have come due yet this week.
          </p>
        ) : (
          <>
            <p className="mt-1 font-display text-[62px] font-bold leading-none text-ink tabular-nums">
              {Math.round(adherence * 100)}%
            </p>
            <p className="mt-3 text-[12.5px] font-semibold text-ink/70">
              {kept} of {elapsed} planned session{elapsed === 1 ? "" : "s"} completed
            </p>
          </>
        )}
      </div>
      {adherence !== null && <Dartboard />}
    </div>
  );
}
