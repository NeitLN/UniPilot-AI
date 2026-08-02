import { Suspense } from "react";
import { StaggerList, StaggerItem } from "@/components/motion/StaggerList";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import {
  WeeklyReportTeaser,
  WeeklyReportTeaserSkeleton,
} from "@/components/dashboard/WeeklyReportTeaser";
import { KpiCardSkeleton } from "@/components/dashboard/KpiCard";
import {
  SemesterLabel,
  SemesterLabelSkeleton,
} from "@/components/dashboard/SemesterLabel";
import { GpaKpi } from "@/components/dashboard/GpaKpi";
import { ActiveTasksKpi } from "@/components/dashboard/ActiveTasksKpi";
import { FocusWeekKpi } from "@/components/dashboard/FocusWeekKpi";
import { DueSoonSection } from "@/components/dashboard/DueSoonSection";
import { TodaySection } from "@/components/dashboard/TodaySection";
import { AssignmentSummarySkeleton } from "@/components/dashboard/AssignmentSummaryCard";
import { RiskHud, RiskHudSkeleton } from "@/components/dashboard/RiskHud";
import { WorkloadRiskKpi } from "@/components/dashboard/WorkloadRiskKpi";
import { FocusCard, FocusCardSkeleton } from "@/components/dashboard/FocusCard";
import { PlanCard, PlanCardSkeleton } from "@/components/dashboard/PlanCard";
import {
  GpaTrendCard,
  GpaTrendCardSkeleton,
} from "@/components/dashboard/GpaTrendCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Dashboard
        </h1>
        <Suspense
          fallback={
            <SemesterLabelSkeleton className="mt-1 h-4 w-28 rounded-full bg-ink/10" />
          }
        >
          <SemesterLabel className="mt-1 text-sm font-semibold text-ink-2" />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>

      {/* P1 (docs/ANIMATION_SYSTEM.md): a restrained, one-time-per-session
          stagger for these 4 cards. sessionKey guards against replaying it
          every time the user navigates back to "/" — Next.js remounts a
          page's tree on each visit, only the (app) layout persists. */}
      <StaggerList
        sessionKey="dashboard-kpis"
        className="grid grid-cols-2 gap-3.5 md:grid-cols-4"
      >
        <StaggerItem>
          <Suspense fallback={<KpiCardSkeleton tone="violet" />}>
            <GpaKpi />
          </Suspense>
        </StaggerItem>
        <StaggerItem>
          <Suspense fallback={<KpiCardSkeleton tone="coral" />}>
            <ActiveTasksKpi />
          </Suspense>
        </StaggerItem>
        <StaggerItem>
          <Suspense fallback={<KpiCardSkeleton tone="mint" />}>
            <FocusWeekKpi />
          </Suspense>
        </StaggerItem>
        <StaggerItem>
          <Suspense fallback={<KpiCardSkeleton tone="tangerine" />}>
            <WorkloadRiskKpi />
          </Suspense>
        </StaggerItem>
      </StaggerList>

      <Suspense fallback={<RiskHudSkeleton />}>
        <RiskHud />
      </Suspense>

      <Suspense fallback={<WeeklyReportTeaserSkeleton />}>
        <WeeklyReportTeaser />
      </Suspense>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          <Suspense fallback={<AssignmentSummarySkeleton title="Due soon" />}>
            <DueSoonSection />
          </Suspense>
          <Suspense fallback={<AssignmentSummarySkeleton title="Today" />}>
            <TodaySection />
          </Suspense>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
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
