import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import type { NotificationItem } from "@/components/notifications/NotificationBellClient";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, title, body, scheduled_at, read_at")
    .not("delivered_at", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(100);

  const notifications: NotificationItem[] = (rows ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    scheduledAt: n.scheduled_at,
    readAt: n.read_at,
  }));

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Notifications</h1>
        <p className="mt-1 text-sm font-semibold text-ink-2">{notifications.length} total</p>
      </div>

      <NotificationsList notifications={notifications} unreadCount={unreadCount} />
    </div>
  );
}
