import { ProgressRing } from "@/components/ui/ProgressRing";

/** Right column's "This week" card — `total`/`completed` must come from a
 * dataset covering the viewer's whole account, not just the current page of
 * results (brief §13), so this stays a pure display component fed real
 * numbers from the page. */
export function AssignmentWeekProgress({ total, completed }: { total: number; completed: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-card bg-lime p-5">
      <h2 className="font-display text-lg font-bold text-ink">This week</h2>

      {total === 0 ? (
        <p className="mt-2 text-[12.5px] font-semibold text-ink/70">
          Nothing due this week — you&rsquo;re ahead.
        </p>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-5">
            <div>
              <p className="font-display text-3xl font-bold leading-none text-ink">{total}</p>
              <p className="mt-1.5 text-[11.5px] font-bold text-ink/70">tasks</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold leading-none text-ink">{completed}</p>
              <p className="mt-1.5 text-[11.5px] font-bold text-ink/70">completed</p>
            </div>
          </div>
          <ProgressRing
            value={pct}
            size={72}
            strokeWidth={8}
            tone="ink"
            track="light"
            label={`This week's completion, ${pct}%`}
          >
            <span className="font-display text-base font-bold text-ink">{pct}%</span>
          </ProgressRing>
        </div>
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
