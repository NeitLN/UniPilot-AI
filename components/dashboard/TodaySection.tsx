import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { dayKey, defaultTimeZone } from "@/lib/rules/focus";
import { TodayAgendaCard, type AgendaEntry } from "./TodayAgendaCard";

/**
 * Today's real scheduled time — classes plus the confirmed plan's study
 * sessions, merged chronologically. Deliberately *not* "assignments due
 * today": those already appear in "Due soon" directly above, and a deadline
 * isn't a block of time you can look at and know what you're doing at 10:30.
 */
export async function TodaySection() {
  const supabase = await createClient();
  const timeZone = (await getViewerTimeZone()) ?? defaultTimeZone();
  const now = new Date();

  // Widened a day and a half either side of "now" so a viewer whose
  // timezone differs from the server's still gets their own full local day;
  // the exact day match is done below with the timezone-aware `dayKey`.
  const from = new Date(now.getTime() - 36 * 3_600_000).toISOString();
  const to = new Date(now.getTime() + 36 * 3_600_000).toISOString();

  const [{ data: courseRows }, { data: blockRows }, { data: activePlan }] = await Promise.all([
    supabase.from("courses").select("id, name"),
    supabase
      .from("class_blocks")
      .select("id, title, location, start_at, end_at, course_id, is_all_day")
      .gte("start_at", from)
      .lt("start_at", to),
    supabase
      .from("study_plans")
      .select("id")
      .eq("status", "active")
      .order("confirmed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Only a *confirmed* plan's sessions count as scheduled time — a draft is
  // explicitly "nothing is scheduled until you confirm it" (BR-02), so
  // surfacing its sessions here would contradict the planner's own warning.
  const { data: sessionRows } = activePlan
    ? await supabase
        .from("study_sessions")
        .select("id, assignment_id, start_at, end_at")
        .eq("plan_id", activePlan.id)
        .gte("start_at", from)
        .lt("start_at", to)
    : {
        data: [] as {
          id: string;
          assignment_id: string | null;
          start_at: string;
          end_at: string;
        }[],
      };

  const sessionAssignmentIds = [
    ...new Set(
      (sessionRows ?? []).map((s) => s.assignment_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: assignmentRows } = sessionAssignmentIds.length
    ? await supabase.from("assignments").select("id, title").in("id", sessionAssignmentIds)
    : { data: [] as { id: string; title: string }[] };

  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const assignmentTitleById = new Map((assignmentRows ?? []).map((a) => [a.id, a.title]));
  const todayKey = dayKey(now, timeZone);

  const classEntries: AgendaEntry[] = (blockRows ?? [])
    .filter((b) => dayKey(new Date(b.start_at), timeZone) === todayKey)
    .map((b) => ({
      id: b.id,
      kind: "class" as const,
      title: b.title,
      subtitle: b.location ?? (b.course_id ? (courseNameById.get(b.course_id) ?? null) : null),
      startAt: b.start_at,
      endAt: b.end_at,
      courseId: b.course_id,
      isAllDay: b.is_all_day,
    }));

  const focusEntries: AgendaEntry[] = (sessionRows ?? [])
    .filter((s) => dayKey(new Date(s.start_at), timeZone) === todayKey)
    .map((s) => ({
      id: s.id,
      kind: "focus" as const,
      title: s.assignment_id
        ? (assignmentTitleById.get(s.assignment_id) ?? "Study session")
        : "Study session",
      subtitle: "Focus session",
      startAt: s.start_at,
      endAt: s.end_at,
      courseId: null,
      isAllDay: false,
    }));

  const entries = [...classEntries, ...focusEntries].sort((a, b) => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return a.startAt.localeCompare(b.startAt);
  });

  return <TodayAgendaCard entries={entries} now={now} />;
}
