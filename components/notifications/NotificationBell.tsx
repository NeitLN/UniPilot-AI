import { createClient } from "@/lib/supabase/server";
import { deliverDueNotifications } from "@/lib/push/deliver";
import {
  NotificationBellClient,
  type NotificationItem,
} from "./NotificationBellClient";

export async function NotificationBell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Opportunistic, idempotent (same pattern as risk compute): a due
  // reminder gets its in-app row stamped `delivered_at` on whichever page
  // load happens to notice it first.
  await deliverDueNotifications(supabase, user.id);

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, title, body, scheduled_at, read_at")
    .not("delivered_at", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(20);

  const notifications: NotificationItem[] = (rows ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    scheduledAt: n.scheduled_at,
    readAt: n.read_at,
  }));

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <NotificationBellClient notifications={notifications} unreadCount={unreadCount} />
  );
}
