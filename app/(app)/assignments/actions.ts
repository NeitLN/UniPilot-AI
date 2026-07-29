"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { courseBelongsToCaller } from "@/lib/supabase/ownership";
import { syncAssignmentReminder, cancelAssignmentReminder } from "@/lib/notifications/sync";
import {
  validateAssignment,
  type AssignmentInput,
  type FieldErrors,
} from "@/lib/rules/assignment";
import type { AssignmentPriority, AssignmentStatus } from "@/lib/supabase/types";

export interface AssignmentFormState {
  errors: FieldErrors;
  formError?: string;
  ok?: boolean;
}

function readInput(formData: FormData): AssignmentInput {
  return {
    title: String(formData.get("title") ?? "").trim(),
    courseId: String(formData.get("courseId") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    weight: Number(formData.get("weight")),
    priority: (formData.get("priority") as AssignmentPriority) ?? "",
    status: (formData.get("status") as AssignmentStatus) ?? "not_started",
    progress: Number(formData.get("progress") ?? 0),
    notes: String(formData.get("notes") ?? "").trim(),
    reminderAt: String(formData.get("reminderAt") ?? ""),
  };
}

function toRow(input: AssignmentInput) {
  return {
    course_id: input.courseId,
    title: input.title,
    due_at: new Date(input.dueAt).toISOString(),
    weight: input.weight,
    priority: input.priority as AssignmentPriority,
    status: input.status,
    progress: input.progress,
    notes: input.notes || null,
    reminder_at: input.reminderAt ? new Date(input.reminderAt).toISOString() : null,
  };
}

export async function createAssignment(
  _prevState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const input = readInput(formData);
  const errors = validateAssignment(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  if (!(await courseBelongsToCaller(supabase, input.courseId))) {
    return { errors: { courseId: "Pick a course from the list." } };
  }

  const { data: created, error } = await supabase
    .from("assignments")
    .insert({ user_id: user.id, ...toRow(input) })
    .select("id")
    .single();

  if (error || !created) {
    return { errors: {}, formError: error?.message ?? "Couldn't save this assignment." };
  }

  await syncAssignmentReminder(
    supabase,
    user.id,
    created.id,
    input.title,
    input.reminderAt ? new Date(input.reminderAt).toISOString() : null,
  );

  revalidatePath("/assignments");
  return { errors: {}, ok: true };
}

export async function updateAssignment(
  id: string,
  _prevState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const input = readInput(formData);
  const errors = validateAssignment(input);
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
    .from("assignments")
    .update(toRow(input))
    .eq("id", id);

  if (error) return { errors: {}, formError: error.message };

  await syncAssignmentReminder(
    supabase,
    user.id,
    id,
    input.title,
    input.reminderAt ? new Date(input.reminderAt).toISOString() : null,
  );

  revalidatePath("/assignments");
  return { errors: {}, ok: true };
}

export async function archiveAssignment(id: string) {
  const supabase = await createClient();
  // Archiving cancels any pending reminder for this assignment (FR-19).
  const { error } = await supabase
    .from("assignments")
    .update({ archived_at: new Date().toISOString(), reminder_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await cancelAssignmentReminder(supabase, id);
  revalidatePath("/assignments");
}
