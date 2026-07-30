import { createClient } from "@/lib/supabase/server";
import { getCourseUsage } from "./actions";
import { Pilo } from "@/components/brand/Pilo";
import { AddCourseButton } from "@/components/courses/AddCourseButton";
import { CourseListItem, type CourseRow } from "@/components/courses/CourseListItem";
import { FieldError } from "@/components/ui/FieldError";

export default async function CoursesPage() {
  const supabase = await createClient();

  const { data: courseRows, error } = await supabase
    .from("courses")
    .select("id, name, code, credits, semester")
    .order("semester", { ascending: false })
    .order("name", { ascending: true });

  const courses = courseRows ?? [];
  const usages = await Promise.all(courses.map((c) => getCourseUsage(c.id)));

  const rows: CourseRow[] = courses.map((c, i) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    credits: c.credits,
    semester: c.semester,
    usage: usages[i],
  }));

  const bySemester = new Map<string, CourseRow[]>();
  for (const row of rows) {
    const list = bySemester.get(row.semester) ?? [];
    list.push(row);
    bySemester.set(row.semester, list);
  }
  // Rows already arrived ordered by semester desc from the query — Map
  // preserves first-insertion order for its keys, so this stays desc too.
  const semesters = [...bySemester.keys()];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Courses</h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            {rows.length} course{rows.length === 1 ? "" : "s"} across {semesters.length}{" "}
            semester{semesters.length === 1 ? "" : "s"}
          </p>
        </div>
        <AddCourseButton />
      </div>

      {error && (
        <div className="rounded-card bg-card p-5">
          <FieldError className="text-sm">
            Couldn&rsquo;t load courses: {error.message}
          </FieldError>
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-card py-14 text-center">
          <Pilo mood="sleepy" size={72} />
          <p className="text-sm font-semibold text-ink-2">
            No courses yet — add your first one to start linking assignments and grades to it.
          </p>
        </div>
      )}

      {semesters.map((semester) => (
        <div key={semester} className="rounded-card bg-card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-3">
            Semester {semester}
          </h2>
          <div className="mt-2">
            {bySemester.get(semester)!.map((course) => (
              <CourseListItem key={course.id} course={course} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
