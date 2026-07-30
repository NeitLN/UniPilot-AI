import { createClient } from "@/lib/supabase/server";
import { sortByDueDate } from "@/lib/rules/assignment";
import { Pilo } from "@/components/brand/Pilo";
import { AddAssignmentButton } from "@/components/assignments/AddAssignmentButton";
import { AssignmentFilters } from "@/components/assignments/AssignmentFilters";
import { AssignmentItem } from "@/components/assignments/AssignmentItem";
import { Pagination } from "@/components/ui/Pagination";
import type { AssignmentStatus } from "@/lib/supabase/types";

const STATUS_VALUES: AssignmentStatus[] = ["not_started", "in_progress", "done"];
const PAGE_SIZE = 20;

function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (STATUS_VALUES as string[]).includes(value);
}

/** Text shown for "N ___" under the page title — kept in sync with
 * whatever the current status filter actually selects (B-01: this used to
 * always say "active" even while showing Done items, which disagreed with
 * the Dashboard's definition of active). */
function countLabel(status: string | undefined): string {
  if (status === "archived") return "archived";
  if (status && isAssignmentStatus(status)) {
    return status === "not_started" ? "not started" : status.replace("_", " ");
  }
  return "active";
}

interface AssignmentsPageProps {
  searchParams: Promise<{ course?: string; status?: string; q?: string; page?: string }>;
}

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const { course, status, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
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
      "id, course_id, title, due_at, weight, score, priority, status, progress, notes, reminder_at, archived_at, updated_at",
      { count: "exact" },
    )
    .order("due_at", { ascending: true });

  if (status === "archived") {
    // B-03: archived items previously had no way back into view at all.
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
    if (status && isAssignmentStatus(status)) {
      query = query.eq("status", status);
    } else {
      // Default list = "active" — must agree with the Dashboard's
      // definition (not done, not archived), not just "not archived".
      query = query.neq("status", "done");
    }
  }

  if (course) query = query.eq("course_id", course);
  // F-04: no search existed at all — filtering was course/status dropdowns
  // only, which doesn't scale past a handful of items.
  if (q) query = query.ilike("title", `%${q}%`);

  // P-03: neither this page nor grades had any limit at all before this —
  // fine at a handful of rows, but nothing stopped it from growing
  // unbounded. 20/page, matched by an actual Prev/Next control below.
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: rows, error, count } = await query;
  const total = count ?? 0;

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
      updatedAt: r.updated_at,
      score: r.score,
    })),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Assignments
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {total} {countLabel(status)} · sorted by due date
          </p>
        </div>
        <AddAssignmentButton courses={courses} />
      </div>

      <div className="mt-4">
        <AssignmentFilters courses={courses} />
      </div>

      <div className="mt-4 rounded-card bg-card p-5">
        {error && (
          <p className="text-sm font-semibold text-coral-text">
            Couldn&rsquo;t load assignments: {error.message}
          </p>
        )}

        {!error && assignments.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Pilo mood="sleepy" size={72} />
            <p className="text-sm font-semibold text-ink-2">
              {q
                ? `No assignments match "${q}".`
                : "No assignments match these filters yet."}
            </p>
          </div>
        )}

        {assignments.map((a) => (
          <AssignmentItem
            key={a.id}
            assignment={a}
            courses={courses}
            isArchivedView={status === "archived"}
          />
        ))}
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
