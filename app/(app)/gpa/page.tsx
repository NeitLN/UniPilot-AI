import { createClient } from "@/lib/supabase/server";
import { gpa, gpaBySemester, qualityPoints } from "@/lib/rules/gpa";
import { AddGradeButton } from "@/components/gpa/AddGradeButton";
import { CourseBreakdown, type GradeRow } from "@/components/gpa/CourseBreakdown";
import { GpaTrendChart } from "@/components/gpa/GpaTrendChart";
import { ForecastCard } from "@/components/gpa/ForecastCard";

export default async function GpaPage() {
  const supabase = await createClient();

  const [{ data: courseRows }, { data: gradeRows }, { data: profile }] =
    await Promise.all([
      supabase.from("courses").select("id, name, code").order("name"),
      supabase
        .from("grades")
        .select("id, course_id, semester, grade_point, credit_hours")
        .order("semester", { ascending: true }),
      supabase.from("profiles").select("target_gpa").maybeSingle(),
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

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            GPA tracker
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">
            Cumulative GPA:{" "}
            <span className="font-bold text-ink">{overallGpa.toFixed(2)}</span> ·{" "}
            {doneCredits} credits
          </p>
        </div>
        <AddGradeButton courses={courses} />
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <CourseBreakdown grades={grades} courses={courses} overallGpa={overallGpa} />

        <div className="flex flex-col gap-3.5">
          <GpaTrendChart points={trendPoints} />
          <ForecastCard
            initialTargetGpa={profile?.target_gpa ?? 3.6}
            doneCredits={doneCredits}
            currentQP={currentQP}
          />
        </div>
      </div>
    </div>
  );
}
