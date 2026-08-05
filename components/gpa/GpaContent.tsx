import { createClient } from "@/lib/supabase/server";
import {
  gpa,
  gpaBySemester,
  onTrackProgress,
  projectGpaScenarios,
  qualityPoints,
  strongestCourseInsight,
  type ScenarioCourse,
} from "@/lib/rules/gpa";
import { AddGradeButton } from "@/components/gpa/AddGradeButton";
import { GpaHero } from "@/components/gpa/GpaHero";
import { OnTrackCard } from "@/components/gpa/OnTrackCard";
import { OnTrackSetupCard } from "@/components/gpa/OnTrackSetupCard";
import { CourseBreakdown, type GradeRow } from "@/components/gpa/CourseBreakdown";
import { GpaTrendChart } from "@/components/gpa/GpaTrendChart";
import { ForecastCard } from "@/components/gpa/ForecastCard";
import { PredictedGrades, type PredictedGradeCourse } from "@/components/gpa/PredictedGrades";
import { PredictedScenarios } from "@/components/gpa/PredictedScenarios";
import { PiloGpaInsight } from "@/components/gpa/PiloGpaInsight";

export async function GpaContent() {
  const supabase = await createClient();

  const [{ data: courseRows }, { data: gradeRows }, { data: profile }, { data: assignmentRows }] =
    await Promise.all([
      supabase.from("courses").select("id, name, code, credits").order("name"),
      supabase
        .from("grades")
        .select("id, course_id, semester, grade_point, credit_hours")
        .order("semester", { ascending: true }),
      supabase.from("profiles").select("target_gpa, program_total_credits").maybeSingle(),
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
  const inProgressCourses = courses.filter((c) => !gradedCourseIds.has(c.id));
  const predictedCourses: PredictedGradeCourse[] = inProgressCourses.map((c) => ({
    id: c.id,
    name: c.code ? `${c.code} — ${c.name}` : c.name,
    assignments: (assignmentRows ?? [])
      .filter((a) => a.course_id === c.id)
      .map((a) => ({ weight: a.weight, score: a.score })),
  }));

  const scenarioCourses: ScenarioCourse[] = inProgressCourses
    .map((c) => ({
      courseId: c.id,
      courseName: c.code ? `${c.code} — ${c.name}` : c.name,
      creditHours: c.credits,
      assignments: (assignmentRows ?? [])
        .filter((a) => a.course_id === c.id)
        .map((a) => ({ weight: a.weight, score: a.score })),
    }))
    .filter((c) => c.creditHours > 0);
  const scenarios = projectGpaScenarios(grades, scenarioCourses);

  const insight = strongestCourseInsight(
    grades.map((g) => ({ courseName: g.courseName, gradePoint: g.gradePoint })),
    predictedCourses
      .map((c) => {
        const scoredWeight = c.assignments.filter((a) => a.score !== null).reduce((s, a) => s + a.weight, 0);
        const totalWeight = c.assignments.reduce((s, a) => s + a.weight, 0);
        const scoredPoints = c.assignments.reduce((s, a) => s + (a.score ?? 0) * (a.score !== null ? a.weight : 0), 0);
        return {
          courseName: c.name,
          predictedScore: scoredWeight > 0 ? scoredPoints / scoredWeight : 0,
          scoredWeight: totalWeight > 0 ? (scoredWeight / totalWeight) * 100 : 0,
        };
      })
      .filter((c) => c.scoredWeight > 0),
  );

  // Hoisted so the JSX below can narrow `targetGpa` to `number` via a plain
  // `&&` chain instead of re-asserting it non-null with `!` right next to
  // the ternary that already proved it — one guard, not two copies of it.
  const targetGpa = profile?.target_gpa ?? null;
  const programTotalCredits = profile?.program_total_credits ?? null;
  const onTrack =
    programTotalCredits && targetGpa
      ? onTrackProgress(programTotalCredits, doneCredits, targetGpa, currentQP)
      : null;

  return (
    <>
      {/* Equal halves: the concept gives the GPA and the on-track readout the
          same weight, where the hero used to take 1.4 of the row. */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch">
        <GpaHero
          overallGpa={overallGpa}
          doneCredits={doneCredits}
          targetGpa={targetGpa}
          className="sm:flex-1"
        />
        {onTrack && targetGpa ? (
          <OnTrackCard result={onTrack} targetGpa={targetGpa} />
        ) : (
          // Not omitted when the inputs are missing: an absent card told the
          // student nothing, so the feature was invisible rather than
          // switched off. See OnTrackSetupCard.
          <OnTrackSetupCard
            hasTargetGpa={targetGpa !== null}
            hasProgramCredits={programTotalCredits !== null}
          />
        )}
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1.45fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          <CourseBreakdown grades={grades} courses={courses} overallGpa={overallGpa} />
          <PiloGpaInsight insight={insight} />
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          <GpaTrendChart points={trendPoints} targetGpa={targetGpa} />
          <PredictedScenarios scenarios={scenarios} currentGpa={overallGpa} />
          <ForecastCard
            initialTargetGpa={targetGpa ?? 3.6}
            doneCredits={doneCredits}
            currentQP={currentQP}
          />
          <PredictedGrades courses={predictedCourses} />
        </div>
      </div>
    </>
  );
}

/** Just the header action, so the page can put it on the title's own row
 * (as the concept does) while the heading itself stays outside Suspense and
 * renders immediately. Re-queries only the course list. */
export async function AddGradeAction() {
  const supabase = await createClient();
  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, name, code, credits")
    .order("name");
  return <AddGradeButton courses={courseRows ?? []} />;
}

export function GpaContentSkeleton() {
  return (
    <>
      <div className="h-40 animate-pulse rounded-card bg-card" />
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
