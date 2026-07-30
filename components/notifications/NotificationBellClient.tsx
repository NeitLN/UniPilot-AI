"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(app)/notifications/actions";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  scheduledAt: string | null;
  readAt: string | null;
}

export function NotificationBellClient({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-line text-foreground hover:bg-[#E6E2F2]"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-extrabold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card bg-card p-3 shadow-xl">
            <div className="flex items-center justify-between px-1">
              <p className="font-display text-sm font-bold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-[11px] font-bold text-violet hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-1.5 px-1 text-[11px] font-semibold text-coral">
                {error}
              </p>
            )}

            {notifications.length === 0 ? (
              <p className="px-1 py-6 text-center text-[12.5px] font-semibold text-ink-3">
                No notifications yet.
              </p>
            ) : (
              <ul className="mt-2 flex max-h-80 flex-col gap-1 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.readAt && handleMarkRead(n.id)}
                      className={`w-full rounded-ctl px-2.5 py-2 text-left ${
                        n.readAt ? "bg-transparent" : "bg-violet-tint"
                      }`}
                    >
                      <p className="truncate text-[12.5px] font-bold text-foreground">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-ink-3">
                          {n.body}
                        </p>
                      )}
                      {n.scheduledAt && (
                        <p className="mt-0.5 text-[10px] font-bold text-ink-3">
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
            )}

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="mt-2 flex min-h-11 items-center justify-center rounded-ctl px-2.5 py-2 text-center text-[12.5px] font-bold text-violet hover:bg-violet-tint"
            >
              View all
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3a6 6 0 0 0-6 6v3.5c0 .7-.27 1.37-.76 1.87L4 15.7c-.9.93-.25 2.5 1.04 2.5h13.92c1.3 0 1.95-1.57 1.04-2.5l-1.24-1.33A2.7 2.7 0 0 1 18 12.5V9a6 6 0 0 0-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19a2.5 2.5 0 0 0 5 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
