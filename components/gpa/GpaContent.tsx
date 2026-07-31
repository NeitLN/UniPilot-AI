import { createClient } from "@/lib/supabase/server";
import { gpa, gpaBySemester, qualityPoints } from "@/lib/rules/gpa";
import { AddGradeButton } from "@/components/gpa/AddGradeButton";
import { CourseBreakdown, type GradeRow } from "@/components/gpa/CourseBreakdown";
import { GpaTrendChart } from "@/components/gpa/GpaTrendChart";
import { ForecastCard } from "@/components/gpa/ForecastCard";
import { PredictedGrades, type PredictedGradeCourse } from "@/components/gpa/PredictedGrades";

export async function GpaContent() {
  const supabase = await createClient();

  const [{ data: courseRows }, { data: gradeRows }, { data: profile }, { data: assignmentRows }] =
    await Promise.all([
      supabase.from("courses").select("id, name, code").order("name"),
      supabase
        .from("grades")
        .select("id, course_id, semester, grade_point, credit_hours")
        .order("semester", { ascending: true }),
      supabase.from("profiles").select("target_gpa").maybeSingle(),
      supabase
        .from("assignments")
        .select("course_id, weight, score")
        .is("archived_at", null)
        .not("course_id", "is", null),
    ]);

  const courses = courseRows ?? [];
  const courseNameById = new Map(
    courses.map((c) => [c.id, c.code ? `${c.code} — ${c.name}` : c.name]),
  );

  const grades: GradeRow[] = (gradeRows ?? []).map((g) => ({
    id: g.id,
    courseId: g.course_id,
    courseName: courseNameById.get(g.course_id) ?? "Unknown course",
    semester: g.semester,
    gradePoint: g.grade_point,
    creditHours: g.credit_hours,
  }));

  const overallGpa = gpa(grades);
  const doneCredits = grades.reduce((s, g) => s + g.creditHours, 0);
  const currentQP = grades.reduce(
    (s, g) => s + qualityPoints(g.gradePoint, g.creditHours),
    0,
  );
  const trendPoints = gpaBySemester(grades);

  // F-03: only courses with no official grade yet are candidates — once a
  // real grade exists, the prediction would just be a confusing duplicate.
  const gradedCourseIds = new Set(grades.map((g) => g.courseId));
  const predictedCourses: PredictedGradeCourse[] = courses
    .filter((c) => !gradedCourseIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.code ? `${c.code} — ${c.name}` : c.name,
      assignments: (assignmentRows ?? [])
        .filter((a) => a.course_id === c.id)
        .map((a) => ({ weight: a.weight, score: a.score })),
    }));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-2">
          Cumulative GPA:{" "}
          <span className="font-bold text-foreground">{overallGpa.toFixed(2)}</span> ·{" "}
          {doneCredits} credits
        </p>
        <AddGradeButton courses={courses} />
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <CourseBreakdown grades={grades} courses={courses} overallGpa={overallGpa} />

        <div className="flex min-w-0 flex-col gap-3.5">
          <GpaTrendChart points={trendPoints} targetGpa={profile?.target_gpa ?? null} />
          <PredictedGrades courses={predictedCourses} />
          <ForecastCard
            initialTargetGpa={profile?.target_gpa ?? 3.6}
            doneCredits={doneCredits}
            currentQP={currentQP}
          />
        </div>
      </div>
    </>
  );
}

export function GpaContentSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-4 w-40 animate-pulse rounded-full bg-ink/10" />
        <div className="h-11 w-32 animate-pulse rounded-ctl bg-ink/10" />
      </div>
      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="h-64 min-w-0 animate-pulse rounded-card bg-card" />
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="h-40 animate-pulse rounded-card bg-card" />
          <div className="h-40 animate-pulse rounded-card bg-card" />
        </div>
      </div>
    </>
  );
}
