import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { dayKey, defaultTimeZone } from "@/lib/rules/focus";
import { pickPiloAssignment } from "@/lib/rules/assignment";
import { freeMinutesForDay, nextClass, todayBlocks } from "@/lib/rules/schedule-presentation";
import { ViewSwitcher } from "@/components/schedule/ViewSwitcher";
import { SyncStatusBar } from "@/components/schedule/SyncStatusBar";
import { ScheduleGrid } from "@/components/schedule/ScheduleGrid";
import { WeekTimeGrid } from "@/components/schedule/WeekTimeGrid";
import { ScheduleSummaryStrip } from "@/components/schedule/ScheduleSummaryStrip";
import { TodayAgendaCard } from "@/components/schedule/TodayAgendaCard";
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
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const todayNeedsOwnQuery = todayStart.getTime() < start.getTime() || todayEnd.getTime() > end.getTime();

  // RLS scopes every query below to the signed-in user — no need to filter
  // by user_id explicitly (same convention as the assignments/dashboard pages).
  const [
    { data: connection },
    { data: courseRows },
    { data: blockRows },
    { data: todayBlockRows },
    { data: assignmentRows },
    { data: activeAssignmentRows },
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
    todayNeedsOwnQuery
      ? supabase
          .from("class_blocks")
          .select("id, title, location, start_at, end_at, course_id, is_all_day")
          .gte("start_at", todayStart.toISOString())
          .lt("start_at", todayEnd.toISOString())
          .order("start_at", { ascending: true })
      : Promise.resolve({ data: null }),
    supabase
      .from("assignments")
      .select("id, title, due_at, course_id")
      .is("archived_at", null),
    // For TodayAgendaCard's "Start focus" deep link — same deterministic
    // pick already used by Assignments' Pilo card, reused here rather than
    // inventing a second "which assignment matters most" rule.
    supabase
      .from("assignments")
      .select("id, title, due_at, priority, status, archived_at")
      .is("archived_at", null)
      .neq("status", "done"),
  ]);

  const courses = courseRows ?? [];
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));

  const toClassBlockData = (r: {
    id: string;
    title: string;
    location: string | null;
    start_at: string;
    end_at: string;
    course_id: string | null;
    gcal_event_id?: string | null;
    is_all_day: boolean;
    notes?: string | null;
    reminder_minutes_before?: number | null;
    recurrence_group_id?: string | null;
  }): ClassBlockData => ({
    id: r.id,
    title: r.title,
    location: r.location,
    startAt: r.start_at,
    endAt: r.end_at,
    courseId: r.course_id,
    courseName: r.course_id ? (courseNameById.get(r.course_id) ?? null) : null,
    gcalEventId: r.gcal_event_id ?? null,
    isAllDay: r.is_all_day,
    notes: r.notes ?? null,
    reminderMinutesBefore: r.reminder_minutes_before ?? null,
    recurrenceGroupId: r.recurrence_group_id ?? null,
  });

  const blocks: ClassBlockData[] = (blockRows ?? []).map(toClassBlockData);
  const todaysBlocksSource = todayNeedsOwnQuery ? (todayBlockRows ?? []).map(toClassBlockData) : blocks;

  const assignmentsByCourse: Record<string, AssignmentLink[]> = {};
  for (const a of assignmentRows ?? []) {
    if (!a.course_id) continue;
    (assignmentsByCourse[a.course_id] ??= []).push({ id: a.id, title: a.title, dueAt: a.due_at });
  }

  const todaysAgenda = todayBlocks(todaysBlocksSource, now, timeZone);
  const nextClassBlock = nextClass(todaysBlocksSource, now);
  const { freeMinutes, blockCount } = freeMinutesForDay(dayKey(now, timeZone), todaysBlocksSource, timeZone);

  const focusPick = pickPiloAssignment(
    (activeAssignmentRows ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      dueAt: a.due_at,
      priority: a.priority,
      status: a.status,
      archivedAt: a.archived_at,
    })),
    now,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AddCourseButton />
          <AddEventButton courses={courses} />
        </div>
        <ViewSwitcher view={view} date={toDateParam(anchorDate)} />
      </div>

      <ScheduleSummaryStrip
        nextClassBlock={nextClassBlock}
        now={now}
        classesTodayCount={todaysAgenda.filter((b) => !b.isAllDay).length}
        freeBlockCount={blockCount}
        freeMinutesTotal={freeMinutes}
      />

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          {view === "week" ? (
            <WeekTimeGrid
              rangeStart={start}
              rangeEnd={end}
              blocks={blocks}
              courses={courses}
              assignmentsByCourse={assignmentsByCourse}
            />
          ) : (
            <ScheduleGrid
              view={view}
              rangeStart={start.toISOString()}
              blocks={blocks}
              courses={courses}
              assignmentsByCourse={assignmentsByCourse}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <TodayAgendaCard blocks={todaysAgenda} focusAssignmentId={focusPick?.id ?? null} />
          <SyncStatusBar
            connected={Boolean(connection)}
            lastSyncedAt={connection?.last_synced_at ?? null}
            lastSyncStatus={connection?.last_sync_status ?? "never"}
            lastSyncError={connection?.last_sync_error ?? null}
            oauthError={oauthError}
          />
        </div>
      </div>
    </>
  );
}

export function ScheduleContentSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-11 w-28 animate-pulse rounded-ctl bg-ink/10" />
          <div className="h-11 w-28 animate-pulse rounded-ctl bg-ink/10" />
        </div>
        <div className="h-11 w-44 animate-pulse rounded-ctl bg-ink/10" />
      </div>
      <div className="flex gap-2.5">
        <div className="h-20 flex-1 animate-pulse rounded-card bg-card" />
        <div className="h-20 flex-1 animate-pulse rounded-card bg-card" />
        <div className="h-20 flex-1 animate-pulse rounded-card bg-card" />
      </div>
      <div className="h-96 animate-pulse rounded-card bg-card" />
    </>
  );
}
