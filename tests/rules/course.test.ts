import { describe, expect, it } from "vitest";
import { validateCourse, type CourseInput } from "@/lib/rules/course";

const baseInput: CourseInput = {
  name: "Database Systems",
  code: "CS301",
  credits: 3,
  semester: "253",
};

describe("validateCourse", () => {
  it("passes for fully valid input", () => {
    expect(validateCourse(baseInput)).toEqual({});
  });

  it("requires a name", () => {
    expect(validateCourse({ ...baseInput, name: "  " }).name).toBeDefined();
  });

  it("requires a semester", () => {
    expect(validateCourse({ ...baseInput, semester: "" }).semester).toBeDefined();
  });

  it("rejects non-positive credits", () => {
    expect(validateCourse({ ...baseInput, credits: 0 }).credits).toBeDefined();
    expect(validateCourse({ ...baseInput, credits: NaN }).credits).toBeDefined();
  });

  it("allows an empty course code", () => {
    expect(validateCourse({ ...baseInput, code: "" })).toEqual({});
  });
});
