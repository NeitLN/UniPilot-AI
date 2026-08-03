/** Right column's "This week" card — `total`/`completed` must come from a
 * dataset covering the viewer's whole account, not just the current page of
 * results (brief §13), so this stays a pure display component fed real
 * numbers from the page. */
export function AssignmentWeekProgress({
  total,
  completed,
}: {
  total: number;
  completed: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-card bg-lime p-5">
      <h2 className="font-display text-lg font-bold text-ink">This week</h2>

      {total === 0 ? (
        <p className="mt-2 text-[12.5px] font-semibold text-ink/70">
          Nothing due this week — you&rsquo;re ahead.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[12.5px] font-semibold text-ink/70">
            {completed} of {total} done
          </p>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="This week's completion"
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-ink motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[11px] font-bold tabular-nums text-ink/70">
            {pct}%
          </p>
        </>
      )}
    </div>
  );
}

export function AssignmentWeekProgressSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-lime p-5">
      <div className="h-4 w-20 rounded-full bg-ink/15" />
      <div className="mt-4 h-2.5 w-full rounded-full bg-ink/10" />
    </div>
  );
}
