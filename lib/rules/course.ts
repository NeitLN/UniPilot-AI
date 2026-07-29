// Course creation — kept minimal on purpose (name, code, credits, semester)
// since courses only exist to be linked from assignments/grades/events.

export interface CourseInput {
  name: string;
  code: string;
  credits: number;
  semester: string;
}

export type CourseFieldErrors = Partial<
  Record<"name" | "credits" | "semester", string>
>;

export function validateCourse(input: CourseInput): CourseFieldErrors {
  const errors: CourseFieldErrors = {};

  if (!input.name.trim()) {
    errors.name = "Name is required.";
  }
  if (!input.semester.trim()) {
    errors.semester = "Semester is required.";
  }
  if (Number.isNaN(input.credits) || input.credits <= 0) {
    errors.credits = "Credits must be a positive number.";
  }

  return errors;
}
