import { describe, expect, it } from "vitest";
import {
  courseLoadSummary,
  courseProgress,
  filterCourses,
  nextCourseDeadline,
  type CourseAssignmentLite,
} from "@/lib/rules/course-presentation";

function assignment(overrides: Partial<CourseAssignmentLite> & Pick<CourseAssignmentLite, "dueAt">): CourseAssignmentLite {
  return {
    id: crypto.randomUUID(),
    courseId: "c1",
    title: "Test",
    status: "not_started",
    priority: "medium",
    progress: 0,
    archivedAt: null,
    ...overrides,
  };
}

describe("courseProgress", () => {
  it("returns null (not 0) when there are no active assignments", () => {
    expect(courseProgress([])).toBeNull();
    expect(courseProgress([assignment({ dueAt: "2026-08-01T00:00:00Z", archivedAt: "2026-08-01T00:00:00Z" })])).toBeNull();
  });

  it("averages progress across active assignments only", () => {
    const list = [
      assignment({ dueAt: "2026-08-01T00:00:00Z", progress: 100 }),
      assignment({ dueAt: "2026-08-02T00:00:00Z", progress: 50 }),
      assignment({ dueAt: "2026-08-03T00:00:00Z", progress: 0, archivedAt: "2026-08-01T00:00:00Z" }),
    ];
    expect(courseProgress(list)).toBe(75);
  });
});

describe("nextCourseDeadline", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("is null (All caught up) when nothing is pending", () => {
    const list = [assignment({ dueAt: "2026-08-01T00:00:00Z", status: "done" })];
    expect(nextCourseDeadline(list, now)).toBeNull();
  });

  it("picks the soonest pending assignment and flags overdue correctly", () => {
    const list = [
      assignment({ id: "later", dueAt: "2026-08-05T00:00:00Z" }),
      assignment({ id: "soonest-overdue", dueAt: "2026-07-27T00:00:00Z" }),
    ];
    const next = nextCourseDeadline(list, now);
    expect(next?.assignmentId).toBe("soonest-overdue");
    expect(next?.overdue).toBe(true);
  });
});

describe("courseLoadSummary", () => {
  const courses = [
    { id: "c1", name: "Course One" },
    { id: "c2", name: "Course Two" },
  ];
  const now = new Date("2026-07-29T12:00:00.000Z");

  it("counts only active (non-archived, non-done) assignments", () => {
    const assignments = [
      assignment({ courseId: "c1", dueAt: "2026-07-30T00:00:00Z" }),
      assignment({ courseId: "c1", dueAt: "2026-07-31T00:00:00Z", status: "done" }),
      assignment({ courseId: "c2", dueAt: "2026-08-20T00:00:00Z" }),
    ];
    const summary = courseLoadSummary(courses, assignments, now, "UTC");
    expect(summary.totalAssignments).toBe(2);
    expect(summary.distribution).toEqual([
      { courseId: "c1", courseName: "Course One", count: 1 },
      { courseId: "c2", courseName: "Course Two", count: 1 },
    ]);
  });

  it("counts due-this-week using the same isDueThisWeek rule as Assignments", () => {
    const assignments = [
      assignment({ courseId: "c1", dueAt: "2026-07-30T00:00:00Z" }), // this week
      assignment({ courseId: "c2", dueAt: "2026-09-01T00:00:00Z" }), // not this week
    ];
    expect(courseLoadSummary(courses, assignments, now, "UTC").dueThisWeek).toBe(1);
  });

  it("omits courses with zero active assignments from the distribution", () => {
    const assignments = [assignment({ courseId: "c1", dueAt: "2026-07-30T00:00:00Z" })];
    const summary = courseLoadSummary(courses, assignments, now, "UTC");
    expect(summary.distribution.map((d) => d.courseId)).toEqual(["c1"]);
  });
});

describe("filterCourses", () => {
  const courses = [
    { name: "Advanced Database", code: "DB253" },
    { name: "Artificial Intelligence", code: "AI253" },
  ];

  it("returns everything for an empty query", () => {
    expect(filterCourses(courses, "")).toHaveLength(2);
  });

  it("matches by name or code, case-insensitively", () => {
    expect(filterCourses(courses, "database")).toHaveLength(1);
    expect(filterCourses(courses, "ai253")).toHaveLength(1);
    expect(filterCourses(courses, "zzz")).toHaveLength(0);
  });
});
