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
import { generateOccurrences, type EventRepeat } from "@/lib/rules/event";
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
    score: formData.get("score") ? Number(formData.get("score")) : null,
    repeat: (formData.get("repeat") as EventRepeat) || "none",
    repeatUntil: String(formData.get("repeatUntil") ?? ""),
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
    score: input.score,
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

  // F-01: reuse Schedule's occurrence expansion — a due date is just a
  // zero-duration "event" for this purpose (start === end). Only the first
  // occurrence keeps the reminder: a single absolute reminderAt can't sanely
  // apply to every future due date in the series, and there's no per-row
  // input to offset it from the way Schedule does with "minutes before".
  const dueAt = new Date(input.dueAt);
  const until = input.repeatUntil ? new Date(`${input.repeatUntil}T23:59:59`) : null;
  const occurrences = generateOccurrences(dueAt, dueAt, input.repeat, until);
  const recurrenceGroupId = occurrences.length > 1 ? crypto.randomUUID() : null;
  const baseRow = toRow(input);

  const { data: created, error } = await supabase
    .from("assignments")
    .insert(
      occurrences.map((o, i) => ({
        user_id: user.id,
        ...baseRow,
        due_at: o.start.toISOString(),
        reminder_at: i === 0 ? baseRow.reminder_at : null,
        recurrence_group_id: recurrenceGroupId,
      })),
    )
    .select("id");

  if (error || !created || created.length === 0) {
    return { errors: {}, formError: error?.message ?? "Couldn't save this assignment." };
  }

  await syncAssignmentReminder(
    supabase,
    user.id,
    created[0].id,
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

/** Used by the offline mutation queue to detect a server-side edit that
 * happened after an offline edit was made, so a queued update never silently
 * clobbers a newer server row (Phase 10 conflict handling). */
export async function getAssignmentUpdatedAt(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("updated_at")
    .eq("id", id)
    .maybeSingle();
  return data?.updated_at ?? null;
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

/** B-03: the inverse of archiveAssignment — no confirmation needed since,
 * unlike archiving, restoring can't lose anything (the reminder was already
 * cancelled on archive and isn't recreated here). */
export async function restoreAssignment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/assignments");
}
