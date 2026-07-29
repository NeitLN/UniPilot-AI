import { createClient } from "@/lib/supabase/server";
import { sortByDueDate } from "@/lib/rules/assignment";
import { Pilo } from "@/components/brand/Pilo";
import { AddAssignmentButton } from "@/components/assignments/AddAssignmentButton";
import { AssignmentFilters } from "@/components/assignments/AssignmentFilters";
import { AssignmentItem } from "@/components/assignments/AssignmentItem";
import type { AssignmentStatus } from "@/lib/supabase/types";

const STATUS_VALUES: AssignmentStatus[] = ["not_started", "in_progress", "done"];

function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (STATUS_VALUES as string[]).includes(value);
}

interface AssignmentsPageProps {
  searchParams: Promise<{ course?: string; status?: string }>;
}

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const { course, status } = await searchParams;
  const supabase = await createClient();

  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, name, code")
    .order("name");
  const courses = courseRows ?? [];
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));

  let query = supabase
    .from("assignments")
    .select(
      "id, course_id, title, due_at, weight, priority, status, progress, notes, reminder_at, archived_at",
    )
    .is("archived_at", null)
    .order("due_at", { ascending: true });

  if (course) query = query.eq("course_id", course);
  if (status && isAssignmentStatus(status)) query = query.eq("status", status);

  const { data: rows, error } = await query;

  const assignments = sortByDueDate(
    (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      courseId: r.course_id ?? "",
      courseName: r.course_id ? (courseNameById.get(r.course_id) ?? null) : null,
      dueAt: r.due_at,
      weight: r.weight,
      priority: r.priority,
      status: r.status,
      progress: r.progress,
      notes: r.notes,
      reminderAt: r.reminder_at,
      archivedAt: r.archived_at,
    })),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Assignments
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {assignments.length} active · sorted by due date
          </p>
        </div>
        <AddAssignmentButton courses={courses} />
      </div>

      <div className="mt-4">
        <AssignmentFilters courses={courses} />
      </div>

      <div className="mt-4 rounded-card bg-white p-5">
        {error && (
          <p className="text-sm font-semibold text-coral-text">
            Couldn&rsquo;t load assignments: {error.message}
          </p>
        )}

        {!error && assignments.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Pilo mood="sleepy" size={72} />
            <p className="text-sm font-semibold text-ink-2">
              No assignments match these filters yet.
            </p>
          </div>
        )}

        {assignments.map((a) => (
          <AssignmentItem key={a.id} assignment={a} courses={courses} />
        ))}
      </div>
    </div>
  );
}
