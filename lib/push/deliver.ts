import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sendPushNotification } from "./send";

export interface DeliverResult {
  deliveredCount: number;
}

type PushStatus = "sent" | "failed" | "no_subscription";
type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

/** Attempts a push across every one of the user's subscribed devices.
 * TC-05: the caller always stamps `delivered_at` regardless of this
 * result — the in-app list must never depend on push actually working
 * (permission declined, no subscription yet, or a failed send all still
 * count as "delivered to the in-app list"). */
async function pushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  notification: { title: string; body: string | null },
): Promise<PushStatus> {
  if (subscriptions.length === 0) return "no_subscription";

  let status: PushStatus = "failed";
  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: notification.title,
        body: notification.body ?? "",
      });
      status = "sent";
    } catch {
      // One dead endpoint (e.g. an old device) shouldn't stop the others.
    }
  }
  return status;
}

/**
 * Finds this user's due-but-undelivered notifications and attempts a push
 * for each. Single-user scope (called opportunistically from the client
 * while that user's app is open, see /api/push/send) — small enough per
 * call that per-notification updates are fine; deliverAllDueNotifications
 * below is the one that needs batching, since it can span every user.
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
    const pushStatus = await pushToSubscriptions(subscriptions ?? [], notification);
    await supabase
      .from("notifications")
      .update({ delivered_at: now, push_status: pushStatus })
      .eq("id", notification.id);
  }

  return { deliveredCount: due.length };
}

/**
 * FR-03: delivers every user's due-but-undelivered notifications, not just
 * the signed-in caller's — the cron's job (app/api/cron/notifications/route.ts).
 * Pass a service-role client (lib/supabase/service.ts) so this can read
 * across every user regardless of RLS.
 *
 * SR-05 (docs/PRODUCT_REVIEW_3.md): used to loop over each distinct user
 * and call deliverDueNotifications above per user — 2 extra queries per
 * user plus 1 UPDATE per notification, against an unindexed table. Now a
 * single sweep: one query for every due notification, one query for every
 * involved user's subscriptions, then at most 3 batched UPDATEs (one per
 * resulting push_status) instead of one per notification. Sending the
 * pushes themselves still happens per notification/subscription — that's
 * an external HTTP call to each push service, not a DB query, so it isn't
 * something batching can reduce further.
 */
export async function deliverAllDueNotifications(
  supabase: SupabaseClient<Database>,
): Promise<DeliverResult> {
  const now = new Date().toISOString();

  const { data: due } = await supabase
    .from("notifications")
    .select("id, user_id, title, body")
    .is("delivered_at", null)
    .lte("scheduled_at", now);

  if (!due || due.length === 0) return { deliveredCount: 0 };

  const userIds = [...new Set(due.map((n) => n.user_id))];
  const { data: subscriptionRows } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const s of subscriptionRows ?? []) {
    const list = subscriptionsByUser.get(s.user_id) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subscriptionsByUser.set(s.user_id, list);
  }

  const idsByStatus: Record<PushStatus, string[]> = {
    sent: [],
    failed: [],
    no_subscription: [],
  };
  for (const notification of due) {
    const status = await pushToSubscriptions(
      subscriptionsByUser.get(notification.user_id) ?? [],
      notification,
    );
    idsByStatus[status].push(notification.id);
  }

  for (const [status, ids] of Object.entries(idsByStatus) as [PushStatus, string[]][]) {
    if (ids.length === 0) continue;
    await supabase
      .from("notifications")
      .update({ delivered_at: now, push_status: status })
      .in("id", ids);
  }

  return { deliveredCount: due.length };
}
