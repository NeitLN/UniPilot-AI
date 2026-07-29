import { createClient } from "@/lib/supabase/server";
import {
  getViewRange,
  parseDateParam,
  toDateParam,
  type ScheduleView,
} from "@/lib/calendar/view";
import { ViewSwitcher } from "@/components/schedule/ViewSwitcher";
import { SyncStatusBar } from "@/components/schedule/SyncStatusBar";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import type { AssignmentLink, ClassBlockData } from "@/components/schedule/types";

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
  const dateParam = toDateParam(anchorDate);
  const { start, end } = getViewRange(view, anchorDate);

  const supabase = await createClient();

  // RLS scopes every query below to the signed-in user — no need to filter
  // by user_id explicitly (same convention as the assignments/dashboard pages).
  const [
    { data: connection },
    { data: courseRows },
    { data: blockRows },
    { data: assignmentRows },
  ] = await Promise.all([
    supabase
      .from("google_calendar_connections")
      .select("connected_at, last_synced_at, last_sync_status, last_sync_error")
      .maybeSingle(),
    supabase.from("courses").select("id, name, code").order("name"),
    supabase
      .from("class_blocks")
      .select("id, title, location, start_at, end_at, course_id, gcal_event_id")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true }),
    supabase
      .from("assignments")
      .select("id, title, due_at, course_id")
      .is("archived_at", null),
  ]);

  const courses = courseRows ?? [];
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));

  const blocks: ClassBlockData[] = (blockRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    location: r.location,
    startAt: r.start_at,
    endAt: r.end_at,
    courseId: r.course_id,
    courseName: r.course_id ? (courseNameById.get(r.course_id) ?? null) : null,
    gcalEventId: r.gcal_event_id,
  }));

  const assignmentsByCourse: Record<string, AssignmentLink[]> = {};
  for (const a of assignmentRows ?? []) {
    if (!a.course_id) continue;
    (assignmentsByCourse[a.course_id] ??= []).push({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Schedule
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {blocks.length} {blocks.length === 1 ? "class" : "classes"} this{" "}
            {view}
          </p>
        </div>
        <ViewSwitcher view={view} date={dateParam} />
      </div>

      <SyncStatusBar
        connected={Boolean(connection)}
        lastSyncedAt={connection?.last_synced_at ?? null}
        lastSyncStatus={connection?.last_sync_status ?? "never"}
        lastSyncError={connection?.last_sync_error ?? null}
        oauthError={params.error}
      />

      <ScheduleGrid
        view={view}
        rangeStart={start.toISOString()}
        blocks={blocks}
        courses={courses}
        assignmentsByCourse={assignmentsByCourse}
      />
    </div>
  );
}
