import { createClient } from "@/lib/supabase/server";
import { ViewSwitcher } from "@/components/schedule/ViewSwitcher";
import { SyncStatusBar } from "@/components/schedule/SyncStatusBar";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { AddEventButton } from "@/components/schedule/AddEventButton";
import { AddCourseButton } from "@/components/courses/AddCourseButton";
import type { ScheduleView } from "@/lib/calendar/view";
import { toDateParam } from "@/lib/calendar/view";
import type { AssignmentLink, ClassBlockData } from "@/components/schedule/types";

export async function ScheduleContent({
  view,
  anchorDate,
  start,
  end,
  oauthError,
}: {
  view: ScheduleView;
  anchorDate: Date;
  start: Date;
  end: Date;
  oauthError?: string;
}) {
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
      .select(
        "id, title, location, start_at, end_at, course_id, gcal_event_id, is_all_day, notes, reminder_minutes_before, recurrence_group_id",
      )
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
    isAllDay: r.is_all_day,
    notes: r.notes,
    reminderMinutesBefore: r.reminder_minutes_before,
    recurrenceGroupId: r.recurrence_group_id,
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
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-2">
          {blocks.length} {blocks.length === 1 ? "class" : "classes"} this {view}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AddCourseButton />
          <AddEventButton courses={courses} />
          <ViewSwitcher view={view} date={toDateParam(anchorDate)} />
        </div>
      </div>

      <SyncStatusBar
        connected={Boolean(connection)}
        lastSyncedAt={connection?.last_synced_at ?? null}
        lastSyncStatus={connection?.last_sync_status ?? "never"}
        lastSyncError={connection?.last_sync_error ?? null}
        oauthError={oauthError}
      />

      <ScheduleGrid
        view={view}
        rangeStart={start.toISOString()}
        blocks={blocks}
        courses={courses}
        assignmentsByCourse={assignmentsByCourse}
      />
    </>
  );
}

export function ScheduleContentSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-ink/10" />
        <div className="flex items-center gap-2">
          <div className="h-11 w-28 animate-pulse rounded-ctl bg-ink/10" />
          <div className="h-11 w-28 animate-pulse rounded-ctl bg-ink/10" />
          <div className="h-11 w-44 animate-pulse rounded-ctl bg-ink/10" />
        </div>
      </div>
      <div className="h-14 animate-pulse rounded-card bg-white" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-white" />
        ))}
      </div>
    </>
  );
}
