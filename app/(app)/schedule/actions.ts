"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncCalendarForUser } from "@/lib/calendar/sync";
import { courseBelongsToCaller } from "@/lib/supabase/ownership";
import { scheduleEventReminder, rescheduleEventReminder } from "@/lib/notifications/sync";
import {
  validateEvent,
  generateOccurrences,
  reminderMinutesFromInput,
  type EventInput,
  type EventFieldErrors,
  type EventRepeat,
} from "@/lib/rules/event";
import { validateCourse, type CourseInput, type CourseFieldErrors } from "@/lib/rules/course";

export interface SyncNowResult {
  status: "ok" | "error";
  message?: string;
  eventCount?: number;
}

export async function syncNow(): Promise<SyncNowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Session expired — sign in again." };
  }

  const result = await syncCalendarForUser(supabase, user.id);
  revalidatePath("/schedule");

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "not_connected" ? "Google Calendar isn't connected." : result.message,
    };
  }
  return { status: "ok", eventCount: result.eventCount };
}

export async function assignCourseToBlock(blockId: string, courseId: string | null) {
  const supabase = await createClient();

  if (courseId && !(await courseBelongsToCaller(supabase, courseId))) {
    throw new Error("That course isn't yours to link.");
  }

  const { error } = await supabase
    .from("class_blocks")
    .update({ course_id: courseId })
    .eq("id", blockId);

  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

// ─────────────────────────────────────────────────────────────
// Manual events (Apple Calendar-style New Event sheet)
// ─────────────────────────────────────────────────────────────

export interface EventFormState {
  errors: EventFieldErrors;
  formError?: string;
  ok?: boolean;
}

function readEventInput(formData: FormData): EventInput {
  return {
    title: String(formData.get("title") ?? "").trim(),
    courseId: String(formData.get("courseId") ?? ""),
    location: String(formData.get("location") ?? "").trim(),
    isAllDay: formData.get("isAllDay") === "on",
    startAt: String(formData.get("startAt") ?? ""),
    endAt: String(formData.get("endAt") ?? ""),
    repeat: (formData.get("repeat") as EventRepeat) || "none",
    repeatUntil: String(formData.get("repeatUntil") ?? ""),
    reminder: String(formData.get("reminder") ?? ""),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

/** Only a manual (non-synced) block may be edited or deleted here — a
 * Google-synced one gets overwritten on the next sync anyway, so editing it
 * in place would just be lost. */
async function requireManualBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blockId: string,
): Promise<{ start_at: string; recurrence_group_id: string | null }> {
  const { data } = await supabase
    .from("class_blocks")
    .select("start_at, recurrence_group_id, gcal_event_id")
    .eq("id", blockId)
    .maybeSingle();

  if (!data) throw new Error("Event not found.");
  if (data.gcal_event_id) {
    throw new Error("This event is synced from Google Calendar — edit it there.");
  }
  return data;
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const input = readEventInput(formData);
  const errors = validateEvent(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  if (input.courseId && !(await courseBelongsToCaller(supabase, input.courseId))) {
    return { errors: {}, formError: "That course isn't yours to link." };
  }

  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  const until = input.repeatUntil ? new Date(`${input.repeatUntil}T23:59:59`) : null;
  const occurrences = generateOccurrences(start, end, input.repeat, until);
  const recurrenceGroupId = occurrences.length > 1 ? crypto.randomUUID() : null;
  const reminderMinutes = reminderMinutesFromInput(input.reminder);

  const { data: created, error } = await supabase
    .from("class_blocks")
    .insert(
      occurrences.map((o) => ({
        user_id: user.id,
        course_id: input.courseId || null,
        title: input.title,
        location: input.location || null,
        start_at: o.start.toISOString(),
        end_at: o.end.toISOString(),
        is_all_day: input.isAllDay,
        notes: input.notes || null,
        reminder_minutes_before: reminderMinutes,
        recurrence_group_id: recurrenceGroupId,
      })),
    )
    .select("id, start_at");

  if (error || !created) {
    return { errors: {}, formError: error?.message ?? "Couldn't save this event." };
  }

  await Promise.all(
    created.map((row) =>
      scheduleEventReminder(supabase, user.id, row.id, input.title, row.start_at, reminderMinutes),
    ),
  );

  revalidatePath("/schedule");
  return { errors: {}, ok: true };
}

export async function updateEvent(
  id: string,
  _prevState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const input = readEventInput(formData);
  const errors = validateEvent(input);
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: {}, formError: "Session expired — sign in again." };

  try {
    await requireManualBlock(supabase, id);
  } catch (e) {
    return { errors: {}, formError: e instanceof Error ? e.message : "Couldn't load this event." };
  }

  if (input.courseId && !(await courseBelongsToCaller(supabase, input.courseId))) {
    return { errors: {}, formError: "That course isn't yours to link." };
  }

  const startAt = new Date(input.startAt).toISOString();
  const reminderMinutes = reminderMinutesFromInput(input.reminder);

  const { error } = await supabase
    .from("class_blocks")
    .update({
      course_id: input.courseId || null,
      title: input.title,
      location: input.location || null,
      start_at: startAt,
      end_at: new Date(input.endAt).toISOString(),
      is_all_day: input.isAllDay,
      notes: input.notes || null,
      reminder_minutes_before: reminderMinutes,
    })
    .eq("id", id);

  if (error) return { errors: {}, formError: error.message };

  await rescheduleEventReminder(supabase, user.id, id, input.title, startAt, reminderMinutes);

  revalidatePath("/schedule");
  return { errors: {}, ok: true };
}

/** `scope: "following"` removes this and every later occurrence in the same
 * recurring series; `"this"` (the default, and the only option for a
 * one-off event) removes just this row. */
export async function deleteEvent(id: string, scope: "this" | "following" = "this") {
  const supabase = await createClient();
  const block = await requireManualBlock(supabase, id);

  if (scope === "following" && block.recurrence_group_id) {
    const { error } = await supabase
      .from("class_blocks")
      .delete()
      .eq("recurrence_group_id", block.recurrence_group_id)
      .gte("start_at", block.start_at);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("class_blocks").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/schedule");
}

// ─────────────────────────────────────────────────────────────
// Course creation
// ─────────────────────────────────────────────────────────────

export interface CourseFormState {
  errors: CourseFieldErrors;
  formError?: string;
  ok?: boolean;
  id?: string;
}

function readCourseInput(formData: FormData): CourseInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim(),
    credits: Number(formData.get("credits")),
    semester: String(formData.get("semester") ?? "").trim(),
  };
}

export async function createCourse(
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

  const { data: created, error } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      name: input.name,
      code: input.code || null,
      credits: input.credits,
      semester: input.semester,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { errors: {}, formError: error?.message ?? "Couldn't save this course." };
  }

  revalidatePath("/schedule");
  revalidatePath("/assignments");
  revalidatePath("/gpa");
  revalidatePath("/courses");
  return { errors: {}, ok: true, id: created.id };
}
