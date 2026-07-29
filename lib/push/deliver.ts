import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sendPushNotification } from "./send";

export interface DeliverResult {
  deliveredCount: number;
}

/**
 * Finds this user's due-but-undelivered notifications and attempts a push
 * for each (across every subscribed device). TC-05: `delivered_at` is
 * stamped regardless of whether the push itself succeeds — the in-app
 * notification list must never depend on push actually working (permission
 * declined, no subscription yet, or a failed send all still count as
 * "delivered to the in-app list").
 */
export async function deliverDueNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DeliverResult> {
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("notifications")
    .select("id, title, body")
    .eq("user_id", userId)
    .is("delivered_at", null)
    .lte("scheduled_at", now);

  if (!due || due.length === 0) return { deliveredCount: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  for (const notification of due) {
    let pushStatus: "sent" | "failed" | "no_subscription" = "no_subscription";

    if (subscriptions && subscriptions.length > 0) {
      pushStatus = "failed";
      for (const sub of subscriptions) {
        try {
          await sendPushNotification(sub, {
            title: notification.title,
            body: notification.body ?? "",
          });
          pushStatus = "sent";
        } catch {
          // One dead endpoint (e.g. an old device) shouldn't stop the
          // in-app fallback below from being marked delivered.
        }
      }
    }

    await supabase
      .from("notifications")
      .update({ delivered_at: now, push_status: pushStatus })
      .eq("id", notification.id);
  }

  return { deliveredCount: due.length };
}

/**
 * FR-03: delivers every user's due-but-undelivered notifications, not just
 * the signed-in caller's — meant for a cron trigger (see
 * app/api/cron/notifications/route.ts), since `deliverDueNotifications`
 * above only fires opportunistically when that user's browser is open.
 * Pass a service-role client (lib/supabase/service.ts) so this can read
 * across every user regardless of RLS.
 */
export async function deliverAllDueNotifications(
  supabase: SupabaseClient<Database>,
): Promise<DeliverResult> {
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("notifications")
    .select("user_id")
    .is("delivered_at", null)
    .lte("scheduled_at", now);

  const userIds = [...new Set((due ?? []).map((n) => n.user_id))];

  let deliveredCount = 0;
  for (const userId of userIds) {
    const result = await deliverDueNotifications(supabase, userId);
    deliveredCount += result.deliveredCount;
  }

  return { deliveredCount };
}
