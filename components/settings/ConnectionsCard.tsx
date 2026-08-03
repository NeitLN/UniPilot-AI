import Link from "next/link";
import type { CalendarSyncStatus } from "@/lib/supabase/types";

export interface ConnectionsCardProps {
  connected: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: CalendarSyncStatus;
  lastSyncError: string | null;
}

/** Step 8.6 — Google Calendar status only. "Manage" links to Schedule
 * (real, existing destination — sync/reconnect controls already live in
 * SyncStatusBar there) rather than fabricating a disconnect action that
 * doesn't exist in the codebase. */
export function ConnectionsCard({
  connected,
  lastSyncedAt,
  lastSyncStatus,
  lastSyncError,
}: ConnectionsCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-ctl bg-line px-4 py-3.5">
      <div>
        <p className="text-sm font-bold text-foreground">Google Calendar</p>
        <p className="mt-0.5 text-[12.5px] font-semibold text-ink-3" suppressHydrationWarning>
          {!connected
            ? "Not connected."
            : lastSyncStatus === "error"
              ? (lastSyncError ?? "Last sync failed.")
              : lastSyncedAt
                ? `Last synced ${new Date(lastSyncedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "Connected — not synced yet."}
        </p>
      </div>

      {connected ? (
        <Link
          href="/schedule"
          className="flex min-h-11 items-center rounded-ctl bg-card px-3.5 text-xs font-bold text-foreground hover:bg-line-hover"
        >
          Manage
        </Link>
      ) : (
        <a
          href="/api/calendar/oauth/start"
          className="flex min-h-11 items-center rounded-ctl bg-violet px-3.5 text-xs font-bold text-white hover:bg-violet-deep"
        >
          Connect
        </a>
      )}
    </div>
  );
}
