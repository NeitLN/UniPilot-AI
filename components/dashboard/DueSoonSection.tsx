import { createClient } from "@/lib/supabase/server";
import { sortByDueDate } from "@/lib/rules/assignment";
import { AssignmentSummaryCard } from "./AssignmentSummaryCard";

export async function DueSoonSection() {
  const supabase = await createClient();

  const [{ data: courseRows }, { data: rows }] = await Promise.all([
    supabase.from("courses").select("id, name"),
    supabase
      .from("assignments")
      .select("id, title, course_id, due_at, status, priority, archived_at")
      .is("archived_at", null)
      .neq("status", "done")
      .order("due_at", { ascending: true })
      .limit(5),
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
      title="Due soon"
      items={items}
      emptyMessage="Nothing due — you're all caught up."
    />
  );
}
