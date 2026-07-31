import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sendPushNotification } from "./send";
import { notificationTargetUrl } from "@/lib/notifications/target-url";

export interface DeliverResult {
  deliveredCount: number;
}

type PushStatus = "sent" | "failed" | "no_subscription";
type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };

function pushErrorStatusCode(cause: unknown): number | null {
  if (typeof cause === "object" && cause !== null && "statusCode" in cause) {
    const raw = (cause as { statusCode: unknown }).statusCode;
    return typeof raw === "number" ? raw : null;
  }
  return null;
}

/** Attempts a push across every one of the user's subscribed devices.
 * TC-05: the caller always stamps `delivered_at` regardless of this
 * result — the in-app list must never depend on push actually working
 * (permission declined, no subscription yet, or a failed send all still
 * count as "delivered to the in-app list"). Also reports back which
 * subscriptions came back 404/410 (the push service confirming the
 * endpoint is gone) so the caller can delete them — otherwise a dead
 * device's subscription gets retried forever on every cron tick. */
async function pushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  notification: { kind: string; title: string; body: string | null },
): Promise<{ status: PushStatus; deadSubscriptionIds: string[] }> {
  if (subscriptions.length === 0) return { status: "no_subscription", deadSubscriptionIds: [] };

  let status: PushStatus = "failed";
  const deadSubscriptionIds: string[] = [];
  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: notification.title,
        body: notification.body ?? "",
        url: notificationTargetUrl(notification.kind),
      });
      status = "sent";
    } catch (cause) {
      // One dead endpoint (e.g. an old device) shouldn't stop the others.
      const statusCode = pushErrorStatusCode(cause);
      if (statusCode === 404 || statusCode === 410) {
        deadSubscriptionIds.push(sub.id);
      }
    }
  }
  return { status, deadSubscriptionIds };
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
    .select("id, kind, title, body")
    .eq("user_id", userId)
    .is("delivered_at", null)
    .lte("scheduled_at", now);

  if (!due || due.length === 0) return { deliveredCount: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  const deadSubscriptionIds = new Set<string>();
  for (const notification of due) {
    const { status, deadSubscriptionIds: dead } = await pushToSubscriptions(
      subscriptions ?? [],
      notification,
    );
    for (const id of dead) deadSubscriptionIds.add(id);
    await supabase
      .from("notifications")
      .update({ delivered_at: now, push_status: status })
      .eq("id", notification.id);
  }

  if (deadSubscriptionIds.size > 0) {
    await supabase.from("push_subscriptions").delete().in("id", [...deadSubscriptionIds]);
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
    .select("id, user_id, kind, title, body")
    .is("delivered_at", null)
    .lte("scheduled_at", now);

  if (!due || due.length === 0) return { deliveredCount: 0 };

  const userIds = [...new Set(due.map((n) => n.user_id))];
  const { data: subscriptionRows } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const s of subscriptionRows ?? []) {
    const list = subscriptionsByUser.get(s.user_id) ?? [];
    list.push({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subscriptionsByUser.set(s.user_id, list);
  }

  const idsByStatus: Record<PushStatus, string[]> = {
    sent: [],
    failed: [],
    no_subscription: [],
  };
  const deadSubscriptionIds = new Set<string>();
  for (const notification of due) {
    const { status, deadSubscriptionIds: dead } = await pushToSubscriptions(
      subscriptionsByUser.get(notification.user_id) ?? [],
      notification,
    );
    idsByStatus[status].push(notification.id);
    for (const id of dead) deadSubscriptionIds.add(id);
  }

  if (deadSubscriptionIds.size > 0) {
    await supabase.from("push_subscriptions").delete().in("id", [...deadSubscriptionIds]);
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
