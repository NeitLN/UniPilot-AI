import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Keeps at most one pending "assignment_reminder" notification in sync with
 * an assignment's own reminder_at — created, rescheduled, or removed to
 * match whatever the form just saved (FR-19: no reminder_at means no
 * pending reminder). Only ever touches an undelivered one; a reminder
 * that already fired is left alone as in-app history.
 */
export async function syncAssignmentReminder(
  supabase: SupabaseClient<Database>,
  userId: string,
  assignmentId: string,
  assignmentTitle: string,
  reminderAt: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("kind", "assignment_reminder")
    .is("delivered_at", null)
    .maybeSingle();

  if (!reminderAt) {
    if (existing) {
      await supabase.from("notifications").delete().eq("id", existing.id);
    }
    return;
  }

  // Settings → Notifications → "Assignment reminders" (notification_preferences,
  // migration 0016): the reminder_at input still saves on the assignment
  // itself either way (it drives other UI), but no notification row is
  // created/kept while this category is off.
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("assignment_reminders")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefs?.assignment_reminders === false) {
    if (existing) {
      await supabase.from("notifications").delete().eq("id", existing.id);
    }
    return;
  }

  if (existing) {
    await supabase
      .from("notifications")
      .update({
        title: `Reminder: ${assignmentTitle}`,
        body: "This assignment is due soon.",
        scheduled_at: reminderAt,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("notifications").insert({
      user_id: userId,
      kind: "assignment_reminder",
      assignment_id: assignmentId,
      title: `Reminder: ${assignmentTitle}`,
      body: "This assignment is due soon.",
      scheduled_at: reminderAt,
    });
  }
}

/** FR-19: archiving cancels a still-pending reminder outright. */
export async function cancelAssignmentReminder(
  supabase: SupabaseClient<Database>,
  assignmentId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .delete()
    .eq("assignment_id", assignmentId)
    .is("delivered_at", null);
}

/**
 * Creates the "event_reminder" notification for one class_block occurrence,
 * fired `reminderMinutesBefore` minutes ahead of its start_at. A null
 * reminderMinutesBefore means the event has no alert — nothing is created.
 * Unlike assignment reminders this is insert-only: each occurrence of a
 * recurring event is its own class_block row, so there's nothing to
 * reconcile against on create.
 */
export async function scheduleEventReminder(
  supabase: SupabaseClient<Database>,
  userId: string,
  classBlockId: string,
  eventTitle: string,
  startAt: string,
  reminderMinutesBefore: number | null,
): Promise<void> {
  if (reminderMinutesBefore === null) return;

  const scheduledAt = new Date(
    new Date(startAt).getTime() - reminderMinutesBefore * 60_000,
  ).toISOString();

  await supabase.from("notifications").insert({
    user_id: userId,
    kind: "event_reminder",
    class_block_id: classBlockId,
    title: eventTitle,
    body:
      reminderMinutesBefore === 0
        ? "Starting now."
        : `Starts in ${reminderMinutesBefore < 60 ? `${reminderMinutesBefore} min` : `${Math.round(reminderMinutesBefore / 60)}h`}.`,
    scheduled_at: scheduledAt,
  });
}

/** Drops this occurrence's still-pending alert, then reschedules it against
 * whatever was just edited — used when a single event occurrence is updated. */
export async function rescheduleEventReminder(
  supabase: SupabaseClient<Database>,
  userId: string,
  classBlockId: string,
  eventTitle: string,
  startAt: string,
  reminderMinutesBefore: number | null,
): Promise<void> {
  await supabase
    .from("notifications")
    .delete()
    .eq("class_block_id", classBlockId)
    .is("delivered_at", null);

  await scheduleEventReminder(
    supabase,
    userId,
    classBlockId,
    eventTitle,
    startAt,
    reminderMinutesBefore,
  );
}
