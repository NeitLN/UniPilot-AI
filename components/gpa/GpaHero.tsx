import { ProgressRing } from "@/components/ui/ProgressRing";

/**
 * Only the real, always-computable half of the concept's hero row (concept
 * §5.1 also shows a separate "On track" card driven by "credits remaining
 * to graduate" — this schema has no total-program-credits field to derive
 * that from, and inventing one wasn't in scope for this pass; see
 * ForecastCard, which already asks the viewer for remaining credits
 * directly and answers the same "am I on track" question honestly instead
 * of assuming a number nobody entered).
 */
export function GpaHero({
  overallGpa,
  doneCredits,
  targetGpa,
}: {
  overallGpa: number;
  doneCredits: number;
  targetGpa: number | null;
}) {
  const hasGrades = doneCredits > 0;
  const ringValue = hasGrades ? (overallGpa / 4) * 100 : 0;

  return (
    <div className="flex items-center justify-between gap-5 rounded-card bg-violet p-5 text-white">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Cumulative GPA</p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums">
          {hasGrades ? overallGpa.toFixed(2) : "—"} <span className="text-lg font-semibold text-white/70">/4.0</span>
        </p>
        <p className="mt-1 text-[12.5px] font-semibold text-white/80">
          {hasGrades ? `${doneCredits} credit${doneCredits === 1 ? "" : "s"} completed` : "Add a grade to see your GPA"}
        </p>
      </div>
      <ProgressRing
        value={ringValue}
        size={120}
        strokeWidth={10}
        tone="lime"
        track="dark"
        label={hasGrades ? `Cumulative GPA ${overallGpa.toFixed(2)} out of 4.0` : "No grades recorded yet"}
      >
        <div>
          {targetGpa !== null && (
            <p className="text-[9px] font-bold uppercase tracking-wide text-white/70">Target {targetGpa.toFixed(2)}</p>
          )}
        </div>
      </ProgressRing>
    </div>
  );
}
