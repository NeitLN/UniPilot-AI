import { Suspense } from "react";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/KpiCard";
import { GpaKpi } from "@/components/dashboard/GpaKpi";
import { ActiveTasksKpi } from "@/components/dashboard/ActiveTasksKpi";
import { FocusWeekKpi } from "@/components/dashboard/FocusWeekKpi";
import { DueSoonSection } from "@/components/dashboard/DueSoonSection";
import { TodaySection } from "@/components/dashboard/TodaySection";
import { AssignmentSummarySkeleton } from "@/components/dashboard/AssignmentSummaryCard";
import { RiskHud } from "@/components/dashboard/RiskHud";
import { FocusCard, FocusCardSkeleton } from "@/components/dashboard/FocusCard";
import { PlanCard, PlanCardSkeleton } from "@/components/dashboard/PlanCard";
import { GpaTrendCard, GpaTrendCardSkeleton } from "@/components/dashboard/GpaTrendCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          Dashboard
        </h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">
          Semester 253 · week 6
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <Suspense fallback={<KpiCardSkeleton tone="violet" />}>
          <GpaKpi />
        </Suspense>
        <Suspense fallback={<KpiCardSkeleton tone="coral" />}>
          <ActiveTasksKpi />
        </Suspense>
        <Suspense fallback={<KpiCardSkeleton tone="mint" />}>
          <FocusWeekKpi />
        </Suspense>
        <KpiCard
          tone="tangerine"
          label="Workload risk"
          value="—"
          hint="Lands in Phase 8"
        />
      </div>

      <RiskHud />

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-3.5">
          <Suspense fallback={<AssignmentSummarySkeleton title="Due soon" />}>
            <DueSoonSection />
          </Suspense>
          <Suspense fallback={<AssignmentSummarySkeleton title="Today" />}>
            <TodaySection />
          </Suspense>
        </div>

        <div className="flex flex-col gap-3.5">
          <Suspense fallback={<FocusCardSkeleton />}>
            <FocusCard />
          </Suspense>
          <Suspense fallback={<PlanCardSkeleton />}>
            <PlanCard />
          </Suspense>
          <Suspense fallback={<GpaTrendCardSkeleton />}>
            <GpaTrendCard />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
