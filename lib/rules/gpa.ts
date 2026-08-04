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

export type OnTrackStatus = "reached" | "on-track" | "at-risk" | "impossible";

export interface OnTrackResult {
  status: OnTrackStatus;
  /** Null once every remaining credit is spoken for (status "reached" or
   * "impossible" with 0 credits left) — there's nothing left to average. */
  requiredAverage: number | null;
  remainingCredits: number;
  completedPct: number;
}

/**
 * GPA's "On track" card (concept §5.1) — was dropped entirely from the
 * pixel-match pass because `programTotalCredits` didn't exist as a real
 * column (see GpaHero.tsx's original comment). Now that Settings collects
 * it, this answers "am I on track to hit my target GPA" the same way
 * ForecastCard's What-if simulator already does (requiredAverage), just
 * pinned to the profile's own saved target/remaining instead of a
 * viewer-adjustable what-if.
 *
 * "at-risk" vs "on-track" is a judgment call, not a hard rule from any
 * spec: a required average above 3.7 needs near-perfect grades on every
 * remaining course, which reads as "technically possible, practically
 * risky" rather than comfortably on track.
 */
export function onTrackProgress(
  programTotalCredits: number,
  doneCredits: number,
  targetGpa: number,
  currentQP: number,
): OnTrackResult {
  const remainingCredits = Math.max(0, programTotalCredits - doneCredits);
  const completedPct =
    programTotalCredits > 0 ? Math.min(100, Math.round((doneCredits / programTotalCredits) * 100)) : 0;

  if (remainingCredits === 0) {
    const overall = doneCredits > 0 ? currentQP / doneCredits : 0;
    return {
      status: overall >= targetGpa ? "reached" : "impossible",
      requiredAverage: null,
      remainingCredits,
      completedPct,
    };
  }

  const req = requiredAverage(targetGpa, doneCredits, remainingCredits, currentQP);
  const status: OnTrackStatus = req.value > 4 ? "impossible" : req.value > 3.7 ? "at-risk" : "on-track";
  return { status, requiredAverage: req.value, remainingCredits, completedPct };
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

export interface ChartDomain {
  min: number;
  max: number;
}

/**
 * UX-01 (docs/PRODUCT_REVIEW.md): a trend chart scaled against the full
 * 0-4.0 range makes a real 3.25 -> 3.57 improvement look like a flat line —
 * only ~8% of the chart's height. Compressing the axis to just past the
 * data (±0.3, clamped to the valid GPA range) makes the same swing fill
 * most of the chart instead.
 *
 * Deliberately falls back to the full [0, 4] range — instead of
 * compressing — whenever there's no real spread to show: one semester
 * alone has no trend to exaggerate, and every semester landing on the same
 * GPA would otherwise divide by a zero-width domain.
 */
export function gpaChartDomain(points: SemesterGpaPoint[]): ChartDomain {
  if (points.length <= 1) return { min: 0, max: 4 };

  const values = points.map((p) => p.gpa);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  if (rawMin === rawMax) return { min: 0, max: 4 };

  return {
    min: Math.max(0, Number((rawMin - 0.3).toFixed(2))),
    max: Math.min(4, Number((rawMax + 0.3).toFixed(2))),
  };
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

export interface ScenarioCourse {
  courseId: string;
  courseName: string;
  creditHours: number;
  assignments: ScoredAssignmentLike[];
}

export interface GpaScenarios {
  worst: number;
  likely: number;
  best: number;
}

/**
 * Three directional GPA projections for in-progress (not-yet-officially-
 * graded) courses, combined with the *fixed* official grades already on the
 * books. UNIPILOT_8_SCREENS Step 5.4 requires every assumption to be
 * documented, not a random number:
 *  - Worst case: every ungraded assignment assumed at 60% (a conservative,
 *    C-range assumption — not a catastrophic one).
 *  - Likely: ungraded weight assumed to score the same as the course's own
 *    already-graded average (neutral "if performance stays the same").
 *  - Best case: every ungraded assignment assumed at 100%.
 * Returns null when there's no in-progress course with any scored (or
 * scorable) assignment at all — nothing to project, so no scenario cards
 * should render instead of showing three copies of the same official GPA.
 */
export function projectGpaScenarios(
  officialGrades: GradeLike[],
  inProgressCourses: ScenarioCourse[],
): GpaScenarios | null {
  const officialQP = officialGrades.reduce((s, g) => s + qualityPoints(g.gradePoint, g.creditHours), 0);
  const officialCredits = officialGrades.reduce((s, g) => s + g.creditHours, 0);

  function courseScenarioPct(assignments: ScoredAssignmentLike[], unscoredAssumptionPct: number | null): number | null {
    const totalWeight = assignments.reduce((s, a) => s + a.weight, 0);
    if (totalWeight === 0) return null;
    const scored = assignments.filter((a): a is ScoredAssignmentLike & { score: number } => a.score !== null);
    const scoredWeight = scored.reduce((s, a) => s + a.weight, 0);
    const scoredPoints = scored.reduce((s, a) => s + a.score * a.weight, 0);
    const unscoredWeight = totalWeight - scoredWeight;
    if (unscoredWeight === 0) return scoredPoints / totalWeight;
    // "Likely" (unscoredAssumptionPct === null) has no neutral fallback to
    // assume when literally nothing in the course is graded yet — assuming
    // 0% would read as a real, alarming prediction instead of "no signal".
    // Worst/best still apply their fixed assumption regardless, since those
    // are deliberate hypotheticals, not an attempt at a neutral estimate.
    if (unscoredAssumptionPct === null && scoredWeight === 0) return null;
    const assumedPct = unscoredAssumptionPct ?? scoredPoints / scoredWeight;
    return (scoredPoints + unscoredWeight * assumedPct) / totalWeight;
  }

  function scenario(unscoredAssumptionPct: number | null): number | null {
    let qp = officialQP;
    let credits = officialCredits;
    for (const c of inProgressCourses) {
      const pct = courseScenarioPct(c.assignments, unscoredAssumptionPct);
      if (pct === null) continue;
      qp += estimateGradePoint(pct) * c.creditHours;
      credits += c.creditHours;
    }
    // null only when there's truly nothing — no official grades AND no
    // in-progress course contributed a projection for this scenario.
    if (credits === 0) return null;
    return Number((qp / credits).toFixed(2));
  }

  const hasProjectableCourse = inProgressCourses.some(
    (c) => c.assignments.reduce((s, a) => s + a.weight, 0) > 0,
  );
  if (!hasProjectableCourse) return null;

  const worst = scenario(60);
  const likely = scenario(null);
  const best = scenario(100);
  if (worst === null || likely === null || best === null) return null;
  return { worst, likely, best };
}

export interface GpaInsight {
  courseName: string;
  basis: "official" | "predicted";
}

/**
 * "Your strongest course is X" — never invented. Prefers the highest
 * *official* grade point; only falls back to a predicted course when no
 * official grades exist yet, and only among courses with enough scored
 * weight (>=30%) to be a meaningful signal, not a single quiz.
 */
export function strongestCourseInsight(
  officialGrades: { courseName: string; gradePoint: number }[],
  predictedCourses: { courseName: string; predictedScore: number; scoredWeight: number }[],
): GpaInsight | null {
  if (officialGrades.length > 0) {
    const top = [...officialGrades].sort((a, b) => b.gradePoint - a.gradePoint)[0];
    return { courseName: top.courseName, basis: "official" };
  }
  const sufficient = predictedCourses.filter((c) => c.scoredWeight >= 30);
  if (sufficient.length === 0) return null;
  const top = [...sufficient].sort((a, b) => b.predictedScore - a.predictedScore)[0];
  return { courseName: top.courseName, basis: "predicted" };
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
