import { createClient } from "@/lib/supabase/server";
import { sortByDueDate } from "@/lib/rules/assignment";
import { AssignmentSummaryCard } from "./AssignmentSummaryCard";

export async function TodaySection() {
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).toISOString();

  const [{ data: courseRows }, { data: rows }] = await Promise.all([
    supabase.from("courses").select("id, name"),
    supabase
      .from("assignments")
      .select("id, title, course_id, due_at, status, priority, archived_at")
      .is("archived_at", null)
      .gte("due_at", startOfDay)
      .lt("due_at", endOfDay)
      .order("due_at", { ascending: true }),
  ]);

  const courseNameById = new Map((courseRows ?? []).map((c) => [c.id, c.name]));
  const items = sortByDueDate(
    (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      courseName: r.course_id ? (courseNameById.get(r.course_id) ?? null) : null,
      dueAt: r.due_at,
      status: r.status,
      priority: r.priority,
      archivedAt: r.archived_at,
    })),
  );

  return (
    <AssignmentSummaryCard
      title="Today"
      items={items}
      emptyMessage="No deadlines today."
    />
  );
}
