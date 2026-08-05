import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
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
    <div className="flex items-center gap-3 rounded-ctl bg-line px-4 py-3.5">
      <IconChip
        icon={<CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />}
        tone="sky"
        square
      />
      <div className="min-w-0 flex-1">
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
        <div className="flex shrink-0 items-center gap-2">
          {lastSyncStatus !== "error" && (
            <span className="flex items-center gap-1 rounded-pill bg-mint-tint px-2 py-1 text-[10.5px] font-extrabold text-mint-text">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Connected
            </span>
          )}
          <Link
            href="/schedule"
            className="flex min-h-11 items-center rounded-ctl border border-violet/30 bg-card px-3.5 text-xs font-bold text-violet-text hover:bg-violet-tint"
          >
            Manage
          </Link>
        </div>
      ) : (
        <a
          href="/api/calendar/oauth/start"
          className="flex min-h-11 shrink-0 items-center rounded-ctl bg-violet px-3.5 text-xs font-bold text-white hover:bg-violet-deep"
        >
          Connect
        </a>
      )}
    </div>
  );
}
