// BR-05 — GPA calculation, forecast, and per-course/per-semester breakdowns.
// docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 6.

export interface GradeLike {
  gradePoint: number;
  creditHours: number;
}

export const qualityPoints = (gradePoint: number, creditHours: number): number =>
  gradePoint * creditHours;

/** Cumulative GPA across all rows, always rounded to exactly 2 decimals (BR-05). */
export function gpa(rows: GradeLike[]): number {
  const qp = rows.reduce((s, r) => s + qualityPoints(r.gradePoint, r.creditHours), 0);
  const cr = rows.reduce((s, r) => s + r.creditHours, 0);
  return cr === 0 ? 0 : Number((qp / cr).toFixed(2));
}

/** This course's share of the overall GPA: its quality points ÷ total credits. */
export function gpaContribution(row: GradeLike, allRows: GradeLike[]): number {
  const totalCredits = allRows.reduce((s, r) => s + r.creditHours, 0);
  if (totalCredits === 0) return 0;
  return Number(
    (qualityPoints(row.gradePoint, row.creditHours) / totalCredits).toFixed(2),
  );
}

/** A course drags the overall average down if its own grade point sits below it. */
export function dragsGpaDown(row: GradeLike, overallGpa: number): boolean {
  return row.gradePoint < overallGpa;
}

export interface RequiredAverageResult {
  value: number;
  achievable: boolean;
}

/**
 * Required average = [target × (done + remaining) − currentQP] ÷ remaining.
 * Never clamped/rounded down to look nicer — if `value` is over 4.0 the
 * target genuinely isn't reachable with these assumptions (BR-05).
 */
export function requiredAverage(
  target: number,
  doneCredits: number,
  remainingCredits: number,
  currentQP: number,
): RequiredAverageResult {
  const v =
    (target * (doneCredits + remainingCredits) - currentQP) / remainingCredits;
  return { value: Number(v.toFixed(2)), achievable: v <= 4.0 };
}

export interface SemesterGpaPoint {
  semester: string;
  gpa: number;
  credits: number;
}

/** One point per semester (that semester's own GPA, not cumulative), sorted ascending. */
export function gpaBySemester(
  rows: (GradeLike & { semester: string })[],
): SemesterGpaPoint[] {
  const bySemester = new Map<string, GradeLike[]>();
  for (const r of rows) {
    const list = bySemester.get(r.semester) ?? [];
    list.push(r);
    bySemester.set(r.semester, list);
  }
  return Array.from(bySemester.entries())
    .map(([semester, list]) => ({
      semester,
      gpa: gpa(list),
      credits: list.reduce((s, r) => s + r.creditHours, 0),
    }))
    .sort((a, b) => a.semester.localeCompare(b.semester));
}

// F-03 (future_update.md) — rolling an assignment's `weight` (previously
// stored but never used anywhere) up into a predicted course grade.

export interface ScoredAssignmentLike {
  weight: number;
  score: number | null;
}

/**
 * Weighted average of only the *graded* assignments (score !== null),
 * normalized by their own weight sum rather than a full 100 — so a course
 * with 2 of 5 assignments graded still shows a real number instead of one
 * artificially dragged toward 0 by ungraded work. Returns null when
 * nothing is graded yet (there's nothing to predict from).
 */
export function predictedCourseScore(assignments: ScoredAssignmentLike[]): number | null {
  const graded = assignments.filter(
    (a): a is ScoredAssignmentLike & { score: number } => a.score !== null,
  );
  const totalWeight = graded.reduce((s, a) => s + a.weight, 0);
  if (graded.length === 0 || totalWeight === 0) return null;
  const weighted = graded.reduce((s, a) => s + a.score * a.weight, 0);
  return Number((weighted / totalWeight).toFixed(2));
}

/**
 * Rough percent-to-4.0 linear estimate (100% -> 4.0, 75% -> 3.0, ...).
 * This is intentionally a straight line, not the registrar's actual
 * letter-grade curve — it exists to give a *directional* GPA estimate from
 * in-progress coursework, not a guaranteed final grade point.
 */
export function estimateGradePoint(percentScore: number): number {
  return Number(Math.max(0, Math.min(4, percentScore / 25)).toFixed(2));
}

export interface GradeInput {
  courseId: string;
  semester: string;
  gradePoint: number;
  creditHours: number;
}

export type GradeFieldErrors = Partial<
  Record<"courseId" | "semester" | "gradePoint" | "creditHours", string>
>;

export function validateGrade(input: GradeInput): GradeFieldErrors {
  const errors: GradeFieldErrors = {};

  if (!input.courseId) {
    errors.courseId = "Pick a course.";
  }
  if (!input.semester.trim()) {
    errors.semester = "Semester is required.";
  }
  if (Number.isNaN(input.gradePoint)) {
    errors.gradePoint = "Grade point is required.";
  } else if (input.gradePoint < 0 || input.gradePoint > 4) {
    errors.gradePoint = "Grade point must be between 0.0 and 4.0.";
  }
  if (Number.isNaN(input.creditHours)) {
    errors.creditHours = "Credit hours is required.";
  } else if (input.creditHours <= 0) {
    errors.creditHours = "Credit hours must be greater than 0.";
  }

  return errors;
}
