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
