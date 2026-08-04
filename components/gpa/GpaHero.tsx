/**
 * Cumulative GPA hero (concept §5.1). Sits beside OnTrackCard, which only
 * renders once the viewer has saved a target GPA and total program credits
 * in Settings — see lib/rules/gpa.ts onTrackProgress.
 */
export function GpaHero({
  overallGpa,
  doneCredits,
  targetGpa,
  className,
}: {
  overallGpa: number;
  doneCredits: number;
  targetGpa: number | null;
  className?: string;
}) {
  const hasGrades = doneCredits > 0;
  const pct = hasGrades ? Math.max(0, Math.min(100, (overallGpa / 4) * 100)) : 0;

  // Drawn here rather than with the shared ProgressRing: the concept nests a
  // filled disc carrying the target inside the arc, which that component's
  // children slot can't produce at this size without fighting its own layout.
  const size = 148;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`flex items-center justify-between gap-5 rounded-card bg-violet p-6 text-white ${className ?? ""}`}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-white/85">Cumulative GPA</p>
        {/* tracking-normal on the suffix: the headline's -0.04em tracking
            pulled "/4.0" into the last digit, reading as "3.39/40". */}
        <p className="mt-1.5 font-display text-[58px] font-bold leading-none tracking-[-0.04em] tabular-nums">
          {hasGrades ? overallGpa.toFixed(2) : "—"}
          <span className="ml-2 align-baseline text-xl font-bold tracking-normal text-white/70">/4.0</span>
        </p>
        <p className="mt-3 text-[12.5px] font-semibold text-white/80">
          {hasGrades
            ? `${doneCredits} credit${doneCredits === 1 ? "" : "s"} completed`
            : "Add a grade to see your GPA"}
        </p>
      </div>

      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={
          hasGrades
            ? `Cumulative GPA ${overallGpa.toFixed(2)} out of 4.0${targetGpa !== null ? `, target ${targetGpa.toFixed(2)}` : ""}`
            : "No grades recorded yet"
        }
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-white/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            className="stroke-white motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
          />
        </svg>
        {/* The inner disc: a lighter violet plate so the target reads as a
            separate figure from the arc measuring the actual GPA. */}
        <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-violet-soft text-center">
          {targetGpa !== null ? (
            <>
              <p className="text-[11.5px] font-semibold text-white/75">Target</p>
              <p className="font-display text-[26px] font-bold leading-none tabular-nums">
                {targetGpa.toFixed(2)}
              </p>
            </>
          ) : (
            <p className="px-3 text-[11px] font-semibold leading-tight text-white/75">
              Set a target in Settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
