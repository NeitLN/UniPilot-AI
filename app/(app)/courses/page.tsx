import { createClient } from "@/lib/supabase/server";
import { getViewerTimeZone } from "@/lib/timezone";
import { isOverdue } from "@/lib/rules/assignment";
import {
  courseLoadSummary,
  courseProgress,
  filterCourses,
  nextCourseDeadline,
  type CourseAssignmentLite,
} from "@/lib/rules/course-presentation";
import { courseTone } from "@/lib/ui/course-tone";
import { AddCourseButton } from "@/components/courses/AddCourseButton";
import { CourseCard, type CourseCardData } from "@/components/courses/CourseCard";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { CourseLoadSummary } from "@/components/courses/CourseLoadSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import type { CourseUsage } from "./actions";

interface CoursesPageProps {
  searchParams: Promise<{ q?: string; semester?: string; status?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { q, semester, status } = await searchParams;
  const supabase = await createClient();
  const timeZone = await getViewerTimeZone();
  const now = new Date();

  // Step 3.1 — batched, not per-course: one round of parallel queries
  // instead of getCourseUsage() called once per course (previously 3N
  // queries for N courses).
  const [{ data: courseRows, error }, { data: assignmentRows }, { data: gradeRows }, { data: classBlockRows }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, code, credits, semester")
        .order("semester", { ascending: false })
        .order("name", { ascending: true }),
      supabase
        .from("assignments")
        .select("id, course_id, title, due_at, status, priority, progress, archived_at")
        .not("course_id", "is", null),
      supabase.from("grades").select("id, course_id"),
      supabase.from("class_blocks").select("id, course_id"),
    ]);

  const allCourses = courseRows ?? [];

  const assignmentsByCourse = new Map<string, CourseAssignmentLite[]>();
  for (const a of assignmentRows ?? []) {
    if (!a.course_id) continue;
    const list = assignmentsByCourse.get(a.course_id) ?? [];
    list.push({
      id: a.id,
      courseId: a.course_id,
      title: a.title,
      dueAt: a.due_at,
      status: a.status,
      priority: a.priority,
      progress: a.progress,
      archivedAt: a.archived_at,
    });
    assignmentsByCourse.set(a.course_id, list);
  }
  const gradeCountByCourse = new Map<string, number>();
  for (const g of gradeRows ?? []) {
    gradeCountByCourse.set(g.course_id, (gradeCountByCourse.get(g.course_id) ?? 0) + 1);
  }
  const classBlockCountByCourse = new Map<string, number>();
  for (const b of classBlockRows ?? []) {
    if (!b.course_id) continue;
    classBlockCountByCourse.set(b.course_id, (classBlockCountByCourse.get(b.course_id) ?? 0) + 1);
  }

  const semesters = [...new Set(allCourses.map((c) => c.semester))];

  let visibleCourses = filterCourses(allCourses, q ?? "");
  if (semester) visibleCourses = visibleCourses.filter((c) => c.semester === semester);

  const cards: CourseCardData[] = visibleCourses.map((c) => {
    const courseAssignments = assignmentsByCourse.get(c.id) ?? [];
    const usage: CourseUsage = {
      assignmentCount: courseAssignments.filter((a) => !a.archivedAt).length,
      gradeCount: gradeCountByCourse.get(c.id) ?? 0,
      classBlockCount: classBlockCountByCourse.get(c.id) ?? 0,
    };
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      credits: c.credits,
      semester: c.semester,
      tone: courseTone(c.id),
      usage,
      progress: courseProgress(courseAssignments),
      nextDeadline: nextCourseDeadline(courseAssignments, now),
    };
  });

  const filteredCards = cards.filter((c) => {
    if (status === "attention") {
      const courseAssignments = assignmentsByCourse.get(c.id) ?? [];
      return courseAssignments.some((a) => isOverdue(a, now));
    }
    if (status === "caught_up") return c.nextDeadline === null;
    return true;
  });

  const allAssignmentsFlat = [...assignmentsByCourse.values()].flat();
  const summary = courseLoadSummary(
    allCourses.map((c) => ({ id: c.id, name: c.name })),
    allAssignmentsFlat,
    now,
    timeZone,
  );

  const hasActiveFilters = Boolean(q || semester || status);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Courses</h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {allCourses.length} course{allCourses.length === 1 ? "" : "s"}
            {semesters.length > 0 && ` · Semester ${semesters[0]}`}
          </p>
        </div>
        <AddCourseButton />
      </div>

      <CourseFilters semesters={semesters} />

      {error && (
        <div className="rounded-card bg-card p-5">
          <FieldError className="text-sm">Couldn&rsquo;t load courses: {error.message}</FieldError>
        </div>
      )}

      {!error && allCourses.length === 0 && (
        <EmptyState
          pilo="sleepy"
          heading="No courses yet"
          copy="Add your first one to start linking assignments and grades to it."
        />
      )}

      {!error && allCourses.length > 0 && filteredCards.length === 0 && (
        <EmptyState
          heading={hasActiveFilters ? "No courses match these filters" : "No courses match"}
          copy={hasActiveFilters ? "Try a different search, semester, or status filter." : "Try a different search."}
        />
      )}

      {filteredCards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {allCourses.length > 0 && <CourseLoadSummary summary={summary} />}
    </div>
  );
}
