"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { courseBelongsToCaller } from "@/lib/supabase/ownership";
import {
  validateGrade,
  type GradeInput,
  type GradeFieldErrors,
} from "@/lib/rules/gpa";

export interface GradeFormState {
  errors: GradeFieldErrors;
  formError?: string;
  ok?: boolean;
}

function readInput(formData: FormData): GradeInput {
  return {
    courseId: String(formData.get("courseId") ?? ""),
    semester: String(formData.get("semester") ?? "").trim(),
    gradePoint: Number(formData.get("gradePoint")),
    creditHours: Number(formData.get("creditHours")),
  };
}

function toRow(input: GradeInput) {
  return {
    course_id: input.courseId,
    semester: input.semester,
    grade_point: input.gradePoint,
    credit_hours: input.creditHours,
  };
}

const DUPLICATE_MESSAGE =
  "You already have a grade for this course in this semester.";

export async function createGrade(
  _prevState: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  const input = readInput(formData);
  const errors = validateGrade(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  if (!(await courseBelongsToCaller(supabase, input.courseId))) {
    return { errors: { courseId: "Pick a course from the list." } };
  }

  const { error } = await supabase
    .from("grades")
    .insert({ user_id: user.id, ...toRow(input) });

  if (error) {
    return {
      errors: {},
      formError: error.code === "23505" ? DUPLICATE_MESSAGE : error.message,
    };
  }

  revalidatePath("/gpa");
  revalidatePath("/");
  return { errors: {}, ok: true };
}

export async function updateGrade(
  id: string,
  _prevState: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  const input = readInput(formData);
  const errors = validateGrade(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();

  if (!(await courseBelongsToCaller(supabase, input.courseId))) {
    return { errors: { courseId: "Pick a course from the list." } };
  }

  const { error } = await supabase.from("grades").update(toRow(input)).eq("id", id);

  if (error) {
    return {
      errors: {},
      formError: error.code === "23505" ? DUPLICATE_MESSAGE : error.message,
    };
  }

  revalidatePath("/gpa");
  revalidatePath("/");
  return { errors: {}, ok: true };
}

export async function deleteGrade(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/gpa");
  revalidatePath("/");
}

export async function updateTargetGpa(targetGpa: number) {
  if (Number.isNaN(targetGpa) || targetGpa < 0 || targetGpa > 4) {
    throw new Error("Target GPA must be between 0.0 and 4.0.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — sign in again.");

  const { error } = await supabase
    .from("profiles")
    .update({ target_gpa: targetGpa })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/gpa");
}
