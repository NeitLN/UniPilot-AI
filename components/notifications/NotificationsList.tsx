"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(app)/notifications/actions";
import { Pilo } from "@/components/brand/Pilo";
import { FieldError } from "@/components/ui/FieldError";
import type { NotificationItem } from "./NotificationBellClient";

export function NotificationsList({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      try {
        await markNotificationRead(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't mark this as read.");
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't mark all as read.");
      }
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-card py-14 text-center">
        <Pilo mood="sleepy" size={72} />
        <p className="text-sm font-semibold text-ink-2">No notifications yet.</p>
        <p className="text-[12.5px] font-semibold text-ink-3">
          Reminders for assignments, plan sessions, and workload warnings show up
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-card p-4">
      {error && <FieldError className="mb-3 text-[12.5px]">{error}</FieldError>}

      {unreadCount > 0 && (
        <div className="flex items-center justify-between border-b border-line pb-3">
          <p className="text-[12.5px] font-semibold text-ink-2">
            {unreadCount} unread
          </p>
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="flex min-h-11 items-center text-[12.5px] font-bold text-violet hover:underline disabled:opacity-60"
          >
            Mark all read
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-1.5 pt-3 first:pt-0">
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => !n.readAt && handleMarkRead(n.id)}
              disabled={pending}
              className={`w-full rounded-ctl px-3.5 py-3 text-left disabled:opacity-60 ${
                n.readAt ? "bg-transparent" : "bg-violet-tint"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-foreground">{n.title}</p>
                {!n.readAt && (
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-violet" />
                )}
              </div>
              {/* D-03 (docs/UIUX_REVIEW.md): text-ink-3 measured 4.21:1 on
                  the unread row's bg-violet-tint in light mode. text-ink-2
                  clears both themes (7.64:1 light, 6.76:1 dark) and still
                  reads fine on read rows' plain bg-transparent. */}
              {n.body && (
                <p className="mt-0.5 text-[12.5px] font-semibold text-ink-2">
                  {n.body}
                </p>
              )}
              {n.scheduledAt && (
                <p className="mt-1 text-[11px] font-bold text-ink-2">
                  {new Date(n.scheduledAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
