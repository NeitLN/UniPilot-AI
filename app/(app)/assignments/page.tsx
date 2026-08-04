import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import {
  deriveQuickWins,
  isDueThisWeek,
  isDueToday,
  pickPiloAssignment,
  sectionForAssignment,
  sortByDueDate,
  type AssignmentSection as AssignmentSectionKind,
} from "@/lib/rules/assignment";
import { Pilo } from "@/components/brand/Pilo";
import { FadeIn } from "@/components/motion/FadeIn";
import { AddAssignmentButton } from "@/components/assignments/AddAssignmentButton";
import { AssignmentCommandBar } from "@/components/assignments/AssignmentCommandBar";
import { AssignmentSection } from "@/components/assignments/AssignmentSection";
import { AssignmentCard, type AssignmentRow } from "@/components/assignments/AssignmentCard";
import { PiloPickCard } from "@/components/assignments/PiloPickCard";
import { AssignmentWeekProgress } from "@/components/assignments/AssignmentWeekProgress";
import { AssignmentQuickWins } from "@/components/assignments/AssignmentQuickWins";
import { AssignmentQuickActions } from "@/components/assignments/AssignmentQuickActions";
import { Pagination } from "@/components/ui/Pagination";
import { FieldError } from "@/components/ui/FieldError";
import type { AssignmentStatus } from "@/lib/supabase/types";

const STATUS_VALUES: AssignmentStatus[] = ["not_started", "in_progress", "done"];
const PAGE_SIZE = 20;

function isAssignmentStatus(value: string): value is AssignmentStatus {
  return (STATUS_VALUES as string[]).includes(value);
}

interface AssignmentsPageProps {
  searchParams: Promise<{
    course?: string;
    status?: string;
    q?: string;
    page?: string;
    when?: string;
  }>;
}

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const { course, status, q, page: pageParam, when } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();
  const timeZone = await getViewerTimeZone();
  const now = new Date();

  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, name, code")
    .order("name");
  const courses = courseRows ?? [];
  const courseNameById = new Map(courses.map((c) => [c.id, c.name]));

  // B-05/§13: header counts, Pilo's pick, and the This week widget must
  // reflect the viewer's whole account, never just the current filtered
  // page of results — one lightweight, unpaginated query (bounded to a
  // personal assignment list, not N+1) feeds all three.
  const { data: statsRows } = await supabase
    .from("assignments")
    .select("id, title, due_at, priority, status, archived_at, progress")
    .is("archived_at", null)
    .order("due_at", { ascending: true });
  const allNonArchived = statsRows ?? [];
  const allActive = allNonArchived.filter((r) => r.status !== "done");

  const activeCount = allActive.length;
  const attentionCount = allActive.filter(
    (r) =>
      sectionForAssignment(
        { dueAt: r.due_at, status: r.status, priority: r.priority, archivedAt: r.archived_at },
        now,
        timeZone,
      ) === "attention",
  ).length;

  const weekRows = allNonArchived.filter((r) => isDueThisWeek(r.due_at, now, timeZone));
  const weekTotal = weekRows.length;
  const weekCompleted = weekRows.filter((r) => r.status === "done").length;

  const piloPick = pickPiloAssignment(
    allActive.map((r) => ({
      id: r.id,
      title: r.title,
      dueAt: r.due_at,
      status: r.status,
      priority: r.priority,
      archivedAt: r.archived_at,
    })),
    now,
  );

  const activeTitleById = new Map(allActive.map((r) => [r.id, r.title]));
  const quickWins = deriveQuickWins(
    allActive.map((r) => ({
      id: r.id,
      progress: r.progress,
      status: r.status,
      archivedAt: r.archived_at,
      dueAt: r.due_at,
    })),
  ).map((w) => ({ ...w, title: activeTitleById.get(w.id) ?? "Untitled assignment" }));

  // Main list — respects course/status/search exactly as before. `when`
  // (today/week) is new: it can't be pushed into the DB query without
  // reconstructing the viewer's UTC offset server-side, so it's applied in
  // JS against the same timezone-aware helpers as the stats above, and
  // pagination is computed after that filter instead of before it.
  let query = supabase
    .from("assignments")
    .select(
      "id, course_id, title, due_at, weight, priority, status, progress, notes, reminder_at, archived_at, updated_at, recurrence_group_id, score",
      { count: "exact" },
    )
    .order("due_at", { ascending: true });

  const isArchivedView = status === "archived";
  if (isArchivedView) {
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
  if (q) query = query.ilike("title", `%${q}%`);

  const dateFiltered = when === "today" || when === "week";
  if (!dateFiltered) {
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  }

  const { data: queryRows, error, count } = await query;
  let rows = queryRows ?? [];
  let total = count ?? 0;

  if (dateFiltered) {
    const matchesWhen =
      when === "today"
        ? (r: (typeof rows)[number]) => isDueToday(r.due_at, now, timeZone)
        : (r: (typeof rows)[number]) => isDueThisWeek(r.due_at, now, timeZone);
    rows = rows.filter(matchesWhen);
    total = rows.length;
    rows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

  const assignments: AssignmentRow[] = sortByDueDate(
    rows.map((r) => ({
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
      recurrenceGroupId: r.recurrence_group_id,
    })),
  );

  // Priority-bucketed sections only apply to the true default view — every
  // other lens (a specific status, Today/This week, Archived) is already a
  // single, coherent slice and reads better as one flat, titled section.
  const showPrioritySections = !isArchivedView && !status && !when;
  const buckets: Record<Exclude<AssignmentSectionKind, "completed">, AssignmentRow[]> = {
    attention: [],
    thisWeek: [],
    later: [],
  };
  if (showPrioritySections) {
    for (const a of assignments) {
      const section = sectionForAssignment(a, now, timeZone);
      if (section === "completed") continue;
      buckets[section].push(a);
    }
  }

  const sectionTitle = isArchivedView
    ? "Archived"
    : when === "today"
      ? "Today"
      : when === "week"
        ? "This week"
        : status === "done"
          ? "Completed"
          : status === "not_started"
            ? "Not started"
            : status === "in_progress"
              ? "In progress"
              : "Results";

  const hasActiveFilters = Boolean(q || course || status || when);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Assignments
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {activeCount} active · {attentionCount} need attention
          </p>
        </div>
        <AddAssignmentButton courses={courses} />
      </div>

      <div className="mt-4">
        <AssignmentCommandBar courses={courses} />
      </div>

      <div className="mt-4 flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="order-2 flex min-w-0 flex-col gap-3.5 lg:order-1">
          {error && (
            <div className="rounded-card-sm bg-card p-5">
              <FieldError className="text-sm">
                Couldn&rsquo;t load assignments: {error.message}
              </FieldError>
            </div>
          )}

          {!error && assignments.length === 0 && (
            <FadeIn className="flex flex-col items-center gap-3 rounded-card-sm bg-card py-10 text-center">
              <Pilo mood="sleepy" size={72} />
              {q ? (
                <>
                  <p className="text-sm font-semibold text-ink-2">
                    No assignments match &ldquo;{q}&rdquo;.
                  </p>
                  <Link
                    href="/assignments"
                    className="flex min-h-11 items-center rounded-ctl bg-line px-4 text-xs font-bold text-ink-2 hover:bg-line-hover"
                  >
                    Clear filters
                  </Link>
                </>
              ) : hasActiveFilters ? (
                <>
                  <p className="text-sm font-semibold text-ink-2">
                    No assignments match these filters yet.
                  </p>
                  <Link
                    href="/assignments"
                    className="flex min-h-11 items-center rounded-ctl bg-line px-4 text-xs font-bold text-ink-2 hover:bg-line-hover"
                  >
                    Clear filters
                  </Link>
                </>
              ) : (
                <p className="text-sm font-semibold text-ink-2">
                  All clear — add your next assignment when you&rsquo;re ready.
                </p>
              )}
            </FadeIn>
          )}

          {!error &&
            assignments.length > 0 &&
            (showPrioritySections ? (
              <>
                <AssignmentSection title="Needs attention" tone="attention" count={buckets.attention.length}>
                  {buckets.attention.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} courses={courses} />
                  ))}
                </AssignmentSection>
                <AssignmentSection title="Due this week" tone="neutral" count={buckets.thisWeek.length}>
                  {buckets.thisWeek.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} courses={courses} />
                  ))}
                </AssignmentSection>
                <AssignmentSection
                  title="Later"
                  tone="neutral"
                  count={buckets.later.length}
                  collapsible
                  // Never default-collapsed: a just-created assignment
                  // landing here must stay visible without an extra click
                  // (a real bug caught in E2E — new items silently
                  // vanished into a pre-collapsed section on accounts that
                  // already had a long "Later" list).
                  defaultCollapsed={false}
                >
                  {buckets.later.map((a) => (
                    <AssignmentCard key={a.id} assignment={a} courses={courses} />
                  ))}
                </AssignmentSection>
              </>
            ) : (
              <AssignmentSection
                title={sectionTitle}
                tone={isArchivedView ? "muted" : "neutral"}
                count={assignments.length}
              >
                {assignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    courses={courses}
                    isArchivedView={isArchivedView}
                  />
                ))}
              </AssignmentSection>
            ))}

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-3.5 lg:order-2">
          <PiloPickCard pick={piloPick} now={now} />
          <AssignmentWeekProgress total={weekTotal} completed={weekCompleted} />
          <div className="hidden md:block">
            {quickWins.length > 0 ? (
              <AssignmentQuickWins items={quickWins} />
            ) : (
              <AssignmentQuickActions courses={courses} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
