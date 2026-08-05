import { createClient } from "@/lib/supabase/server";
import { NotificationBellClient, type NotificationItem } from "./NotificationBellClient";

export async function NotificationBell() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // SR-04 (docs/PRODUCT_REVIEW_3.md): this used to also call
  // deliverDueNotifications() here — a write (push send + DB update) inside
  // a Server Component's render, on every single page load. Delivery is now
  // the cron's job alone (.github/workflows/notifications-cron.yml, every
  // 15 min) plus NotificationBellClient's own client-side call below for
  // the "still fresh while the app is open" case; this component only reads.
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

  return <NotificationBellClient notifications={notifications} unreadCount={unreadCount} />;
}
