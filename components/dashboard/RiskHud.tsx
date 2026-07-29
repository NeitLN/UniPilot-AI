const FACTORS = ["Workload", "Overdue", "Focus"] as const;

/**
 * Mock shell — real scoring lands in Phase 8 (lib/rules/risk.ts, BR-06).
 * BR-06 also requires "not enough data" instead of a fake 0, which happens
 * to already be true here since the phase doesn't exist yet.
 */
export function RiskHud() {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-ink px-6 py-5 text-white sm:flex-row sm:items-center">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-[19px] font-bold">Workload risk</h2>
          <span className="rounded-pill bg-tangerine px-2.5 py-1 text-[11.5px] font-extrabold text-tangerine-text">
            Not enough data
          </span>
        </div>
        <p className="mt-1.5 max-w-[430px] text-[12.5px] font-medium leading-relaxed text-dusk-hud">
          Planning aid, not a medical assessment. Needs 7 days of focus
          history plus your availability and pending work — lands in Phase 8.
        </p>
      </div>

      <div className="flex gap-6">
        {FACTORS.map((label) => (
          <div key={label} className="w-[104px]">
            <p className="text-[11px] font-bold text-dusk-hud">{label}</p>
            <p className="font-display text-base font-bold text-white">—</p>
            <div className="mt-1.5 flex gap-[3px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-[9px] flex-1 rounded-[3px] bg-dusk-seg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
