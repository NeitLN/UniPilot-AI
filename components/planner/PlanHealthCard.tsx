import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { IconChip } from "@/components/ui/IconChip";
import { formatMinutes, planHealthLabel } from "@/lib/rules/plan-presentation";

export function PlanHealthCard({
  sessionCount,
  totalMinutes,
  coveredCount,
  coveragePct,
}: {
  sessionCount: number;
  totalMinutes: number;
  coveredCount: number;
  coveragePct: number | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-card bg-lime p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold text-ink">Plan health</h2>
        <dl className="mt-3 flex flex-col gap-3 text-ink">
          <div className="flex items-center gap-2.5">
            <IconChip icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} tone="white" size="sm" />
            <dt className="sr-only">Sessions</dt>
            <dd className="font-display text-2xl font-bold leading-none">{sessionCount}</dd>
            <dd className="text-[12.5px] font-semibold text-ink/70">sessions</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <IconChip icon={<Clock className="h-4 w-4" aria-hidden="true" />} tone="white" size="sm" />
            <dt className="sr-only">Total focus time</dt>
            <dd className="font-display text-2xl font-bold leading-none">{formatMinutes(totalMinutes)}</dd>
            <dd className="text-[12.5px] font-semibold text-ink/70">total focus time</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <IconChip icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} tone="white" size="sm" />
            <dt className="sr-only">Deadlines covered</dt>
            <dd className="font-display text-2xl font-bold leading-none">{coveredCount}</dd>
            <dd className="text-[12.5px] font-semibold text-ink/70">deadlines covered</dd>
          </div>
        </dl>
      </div>

      <div className="shrink-0 border-l border-ink/15 pl-4">
        <ProgressRing
          value={coveragePct ?? 0}
          size={104}
          strokeWidth={9}
          tone="ink"
          track="light"
          label={coveragePct === null ? "No deadlines due this week" : `Plan coverage, ${coveragePct}%`}
        >
          <div>
            <p className="font-display text-xl font-bold text-ink">
              {coveragePct === null ? "—" : `${coveragePct}%`}
            </p>
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-ink/70">coverage</p>
          </div>
        </ProgressRing>
        <p className="mt-1.5 text-center text-[11px] font-bold text-ink/80">{planHealthLabel(coveragePct)}</p>
      </div>
    </div>
  );
}

export function PlanHealthCardSkeleton() {
  return (
    <div className="animate-pulse rounded-card bg-lime p-5">
      <div className="h-4 w-24 rounded-full bg-ink/15" />
      <div className="mt-4 h-16 w-full rounded-ctl bg-ink/10" />
    </div>
  );
}
