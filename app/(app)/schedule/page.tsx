import { Suspense } from "react";
import {
  getViewRange,
  parseDateParam,
  type ScheduleView,
} from "@/lib/calendar/view";
import { ScheduleContent, ScheduleContentSkeleton } from "@/components/schedule/ScheduleContent";

const VALID_VIEWS: ScheduleView[] = ["day", "week", "month"];

interface SchedulePageProps {
  searchParams: Promise<{
    view?: string;
    date?: string;
    error?: string;
    connected?: string;
  }>;
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const params = await searchParams;
  const view: ScheduleView = VALID_VIEWS.includes(params.view as ScheduleView)
    ? (params.view as ScheduleView)
    : "week";
  const anchorDate = parseDateParam(params.date);
  const { start, end } = getViewRange(view, anchorDate);

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="font-display text-3xl font-semibold text-foreground">Schedule</h1>

      <Suspense fallback={<ScheduleContentSkeleton />}>
        <ScheduleContent
          view={view}
          anchorDate={anchorDate}
          start={start}
          end={end}
          oauthError={params.error}
        />
      </Suspense>
    </div>
  );
}
