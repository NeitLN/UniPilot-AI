import { describe, expect, it } from "vitest";
import {
  dragsGpaDown,
  estimateGradePoint,
  gpa,
  gpaBySemester,
  gpaChartDomain,
  gpaContribution,
  predictedCourseScore,
  projectGpaScenarios,
  qualityPoints,
  requiredAverage,
  strongestCourseInsight,
  validateGrade,
  type GradeLike,
  type SemesterGpaPoint,
} from "@/lib/rules/gpa";

describe("projectGpaScenarios", () => {
  it("returns null when no in-progress course has any assignment weight", () => {
    expect(projectGpaScenarios([], [{ courseId: "c1", courseName: "A", creditHours: 3, assignments: [] }])).toBeNull();
  });

  it("worst <= likely <= best for a partially-scored course", () => {
    const result = projectGpaScenarios(
      [],
      [
        {
          courseId: "c1",
          courseName: "Database",
          creditHours: 3,
          assignments: [
            { weight: 40, score: 90 },
            { weight: 60, score: null },
          ],
        },
      ],
    );
    expect(result).not.toBeNull();
    expect(result!.worst).toBeLessThanOrEqual(result!.likely);
    expect(result!.likely).toBeLessThanOrEqual(result!.best);
  });

  it("all three scenarios agree when every assignment is already scored", () => {
    const result = projectGpaScenarios(
      [],
      [
        {
          courseId: "c1",
          courseName: "Web Programming",
          creditHours: 3,
          assignments: [{ weight: 100, score: 88 }],
        },
      ],
    );
    expect(result!.worst).toBe(result!.likely);
    expect(result!.likely).toBe(result!.best);
  });

  it("excludes an entirely-unscored course from 'likely' instead of assuming 0%", () => {
    const official: GradeLike[] = [{ gradePoint: 3.0, creditHours: 3 }];
    const result = projectGpaScenarios(official, [
      {
        courseId: "c1",
        courseName: "Brand New Course",
        creditHours: 3,
        assignments: [{ weight: 100, score: null }], // nothing graded at all
      },
    ]);
    expect(result).not.toBeNull();
    // "Likely" should fall back to just the official grade (3.0) since the
    // ungraded course has no real signal to project — not a 0.00 dragging
    // the whole GPA down.
    expect(result!.likely).toBe(3.0);
    // Worst/best still apply their fixed hypothetical regardless.
    expect(result!.worst).toBeLessThan(result!.likely);
    expect(result!.best).toBeGreaterThan(result!.likely);
  });

  it("folds in fixed official grades alongside the projected course", () => {
    const official: GradeLike[] = [{ gradePoint: 4.0, creditHours: 3 }];
    const result = projectGpaScenarios(official, [
      {
        courseId: "c1",
        courseName: "Requirements Engineering",
        creditHours: 3,
        assignments: [{ weight: 100, score: 0 }],
      },
    ]);
    // 4.0 official course pulls every scenario above the projected course's
    // own 0-point grade, but never above 4.0.
    expect(result!.worst).toBeGreaterThan(0);
    expect(result!.best).toBeLessThanOrEqual(4.0);
  });
});

describe("strongestCourseInsight", () => {
  it("prefers the highest official grade when any official grades exist", () => {
    const insight = strongestCourseInsight(
      [
        { courseName: "Web Programming", gradePoint: 4.0 },
        { courseName: "Artificial Intelligence", gradePoint: 3.0 },
      ],
      [{ courseName: "Database", predictedScore: 99, scoredWeight: 100 }],
    );
    expect(insight).toEqual({ courseName: "Web Programming", basis: "official" });
  });

  it("falls back to a sufficiently-scored predicted course when no official grades exist", () => {
    const insight = strongestCourseInsight(
      [],
      [
        { courseName: "Database", predictedScore: 92, scoredWeight: 50 },
        { courseName: "AI", predictedScore: 70, scoredWeight: 40 },
      ],
    );
    expect(insight).toEqual({ courseName: "Database", basis: "predicted" });
  });

  it("ignores predicted courses with too little scored weight to be meaningful", () => {
    const insight = strongestCourseInsight([], [{ courseName: "Database", predictedScore: 100, scoredWeight: 5 }]);
    expect(insight).toBeNull();
  });

  it("returns null when there's no official or sufficiently-scored predicted data at all", () => {
    expect(strongestCourseInsight([], [])).toBeNull();
  });
});

describe("qualityPoints", () => {
  it("multiplies grade point by credit hours", () => {
    expect(qualityPoints(3.5, 4)).toBe(14);
  });
});

describe("gpa", () => {
  it("computes the credit-weighted average", () => {
    const rows: GradeLike[] = [
      { gradePoint: 3.2, creditHours: 3 },
      { gradePoint: 3.7, creditHours: 3 },
      { gradePoint: 2.8, creditHours: 4 },
      { gradePoint: 3.5, creditHours: 3 },
    ];
    // qp = 9.6 + 11.1 + 11.2 + 10.5 = 42.4, credits = 13 -> 3.2615...
    expect(gpa(rows)).toBe(3.26);
  });

  it("is 0 with no rows", () => {
    expect(gpa([])).toBe(0);
  });

  it("always shows exactly 2 decimals, even for a whole-ish number (3.50, not 3.5)", () => {
    const rows: GradeLike[] = [{ gradePoint: 3.5, creditHours: 3 }];
    expect(gpa(rows)).toBe(3.5);
    expect(gpa(rows).toFixed(2)).toBe("3.50");
  });
});

describe("gpaContribution", () => {
  it("is this course's quality points over total credits", () => {
    const rows: GradeLike[] = [
      { gradePoint: 3.2, creditHours: 3 },
      { gradePoint: 2.8, creditHours: 4 },
    ];
    // total credits = 7; course 1 qp = 9.6 -> 9.6/7 = 1.3714...
    expect(gpaContribution(rows[0], rows)).toBe(1.37);
  });

  it("is 0 when there are no credits at all", () => {
    expect(gpaContribution({ gradePoint: 3, creditHours: 3 }, [])).toBe(0);
  });
});

describe("dragsGpaDown", () => {
  it("is true when the course's grade point is below the overall average", () => {
    expect(dragsGpaDown({ gradePoint: 2.8, creditHours: 4 }, 3.26)).toBe(true);
  });

  it("is false when at or above the overall average", () => {
    expect(dragsGpaDown({ gradePoint: 3.7, creditHours: 3 }, 3.26)).toBe(false);
    expect(dragsGpaDown({ gradePoint: 3.26, creditHours: 3 }, 3.26)).toBe(false);
  });
});

describe("requiredAverage", () => {
  it("computes the average needed on remaining credits to hit the target", () => {
    // target 3.6, done 30 credits at current QP 100.5, 10 credits remaining
    // required = (3.6*40 - 100.5)/10 = (144 - 100.5)/10 = 4.35
    const result = requiredAverage(3.6, 30, 10, 100.5);
    expect(result.value).toBe(4.35);
    expect(result.achievable).toBe(false);
  });

  it("marks the target achievable when required average is at or under 4.0", () => {
    // target 3.2, done 30 credits at QP 96 (avg exactly 3.2), 10 remaining
    // required = (3.2*40 - 96)/10 = (128-96)/10 = 3.2
    const result = requiredAverage(3.2, 30, 10, 96);
    expect(result.value).toBe(3.2);
    expect(result.achievable).toBe(true);
  });

  it("never clamps an over-4.0 result down to look achievable", () => {
    const result = requiredAverage(4.0, 10, 5, 20); // required = (4*15-20)/5 = 8
    expect(result.value).toBe(8);
    expect(result.achievable).toBe(false);
  });
});

describe("gpaBySemester", () => {
  it("computes one GPA point per semester, sorted ascending", () => {
    const rows = [
      { semester: "232", gradePoint: 3.0, creditHours: 3 },
      { semester: "231", gradePoint: 3.5, creditHours: 3 },
      { semester: "232", gradePoint: 3.6, creditHours: 3 },
    ];
    const points = gpaBySemester(rows);
    expect(points.map((p) => p.semester)).toEqual(["231", "232"]);
    expect(points[0].gpa).toBe(3.5);
    expect(points[1].gpa).toBe(3.3); // (3.0*3+3.6*3)/6 = 3.3
    expect(points[1].credits).toBe(6);
  });
});

describe("validateGrade", () => {
  const base = { courseId: "c1", semester: "253", gradePoint: 3.5, creditHours: 3 };

  it("passes for valid input", () => {
    expect(validateGrade(base)).toEqual({});
  });

  it("rejects grade point 4.5 (over 4.0)", () => {
    expect(validateGrade({ ...base, gradePoint: 4.5 }).gradePoint).toBeDefined();
  });

  it("rejects a negative grade point", () => {
    expect(validateGrade({ ...base, gradePoint: -0.1 }).gradePoint).toBeDefined();
  });

  it("accepts the boundaries 0.0 and 4.0", () => {
    expect(validateGrade({ ...base, gradePoint: 0 }).gradePoint).toBeUndefined();
    expect(validateGrade({ ...base, gradePoint: 4 }).gradePoint).toBeUndefined();
  });

  it("rejects credit hours <= 0", () => {
    expect(validateGrade({ ...base, creditHours: 0 }).creditHours).toBeDefined();
    expect(validateGrade({ ...base, creditHours: -2 }).creditHours).toBeDefined();
  });

  it("requires a course and a semester", () => {
    const errors = validateGrade({ ...base, courseId: "", semester: "  " });
    expect(errors.courseId).toBeDefined();
    expect(errors.semester).toBeDefined();
  });
});

describe("predictedCourseScore", () => {
  it("weights graded assignments by their own weight, ignoring ungraded ones", () => {
    // (90*30 + 80*20) / (30+20) = 4300/50 = 86
    expect(
      predictedCourseScore([
        { weight: 30, score: 90 },
        { weight: 20, score: 80 },
        { weight: 50, score: null },
      ]),
    ).toBe(86);
  });

  it("returns null when nothing is graded yet", () => {
    expect(predictedCourseScore([{ weight: 30, score: null }])).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(predictedCourseScore([])).toBeNull();
  });
});

describe("estimateGradePoint", () => {
  it("maps 100% to 4.0 and 75% to 3.0", () => {
    expect(estimateGradePoint(100)).toBe(4);
    expect(estimateGradePoint(75)).toBe(3);
  });

  it("clamps to the 0-4.0 range", () => {
    expect(estimateGradePoint(-10)).toBe(0);
    expect(estimateGradePoint(150)).toBe(4);
  });
});

describe("gpaChartDomain", () => {
  const point = (semester: string, gpaValue: number): SemesterGpaPoint => ({
    semester,
    gpa: gpaValue,
    credits: 15,
  });

  it("compresses to ±0.3 around the real min/max when there's a spread", () => {
    const domain = gpaChartDomain([point("242", 3.25), point("251", 3.49), point("252", 3.57)]);
    expect(domain).toEqual({ min: 2.95, max: 3.87 });
  });

  it("clamps the compressed range to [0, 4]", () => {
    expect(gpaChartDomain([point("242", 0.1), point("251", 0.2)])).toEqual({ min: 0, max: 0.5 });
    expect(gpaChartDomain([point("242", 3.9), point("251", 3.95)])).toEqual({ min: 3.6, max: 4 });
  });

  it("falls back to the full range for a single semester — nothing to compress", () => {
    expect(gpaChartDomain([point("253", 3.5)])).toEqual({ min: 0, max: 4 });
  });

  it("falls back to the full range when every semester has the same GPA", () => {
    expect(gpaChartDomain([point("242", 3.5), point("251", 3.5)])).toEqual({ min: 0, max: 4 });
  });

  it("falls back to the full range for an empty list", () => {
    expect(gpaChartDomain([])).toEqual({ min: 0, max: 4 });
  });
});
