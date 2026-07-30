"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCourse, type CourseInput } from "@/lib/rules/course";
import type { CourseFormState } from "@/app/(app)/schedule/actions";

function readCourseInput(formData: FormData): CourseInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    credits: Number(formData.get("credits")),
    semester: String(formData.get("semester") ?? "").trim(),
  };
}

export async function updateCourse(
  id: string,
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const input = readCourseInput(formData);
  const errors = validateCourse(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  // RLS scopes the update to the caller's own rows on its own — no separate
  // ownership check needed the way courseBelongsToCaller guards a *foreign*
  // key write elsewhere; this is a direct write to the row itself.
  const { error } = await supabase
    .from("courses")
    .update({
      name: input.name,
      code: input.code || null,
      credits: input.credits,
      semester: input.semester,
    })
    .eq("id", id);

  if (error) return { errors: {}, formError: error.message };

  revalidatePath("/courses");
  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/gpa");
  revalidatePath("/");
  return { errors: {}, ok: true, id };
}

export interface CourseUsage {
  assignmentCount: number;
  gradeCount: number;
  classBlockCount: number;
}

/** Used both to show "3 assignments · 1 grade · 4 classes" on the courses
 * list and to decide whether deleteCourse is allowed to proceed — the same
 * number backs both, so the UI can never claim a course is empty right
 * before the delete blocks on it not being empty. */
export async function getCourseUsage(courseId: string): Promise<CourseUsage> {
  const supabase = await createClient();
  const [{ count: assignmentCount }, { count: gradeCount }, { count: classBlockCount }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase
        .from("grades")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
      supabase
        .from("class_blocks")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId),
    ]);

  return {
    assignmentCount: assignmentCount ?? 0,
    gradeCount: gradeCount ?? 0,
    classBlockCount: classBlockCount ?? 0,
  };
}

export type DeleteCourseResult =
  | { ok: true }
  | { ok: false; reason: "in_use"; usage: CourseUsage };

/**
 * BR-new (docs/PRODUCT_REVIEW.md FR-20): never cascade a course delete.
 * grades.course_id is `not null references courses on delete cascade` at
 * the DB level — a raw delete would silently wipe every grade recorded
 * for this course. Checking usage first and refusing to even attempt the
 * delete when non-zero means that cascade is never reached; a user's
 * grade history is never something a course-cleanup click should be able
 * to take with it.
 */
export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
  const usage = await getCourseUsage(courseId);
  if (usage.assignmentCount > 0 || usage.gradeCount > 0 || usage.classBlockCount > 0) {
    return { ok: false, reason: "in_use", usage };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw new Error(error.message);

  revalidatePath("/courses");
  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/gpa");
  revalidatePath("/");
  return { ok: true };
}
