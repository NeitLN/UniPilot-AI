"use client";

import { CheckCircle2 } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { GoogleCalendarMark } from "./GoogleCalendarMark";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import type { CalendarSyncStatus } from "@/lib/supabase/types";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled.",
  state_mismatch: "That sign-in link expired — try connecting again.",
  missing_refresh_token: "Google didn't grant offline access — try connecting again.",
  storage_failed: "Couldn't save the connection. Try again.",
  token_exchange_failed: "Couldn't finish connecting to Google. Try again.",
};

export interface SyncStatusBarProps {
  connected: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: CalendarSyncStatus;
  lastSyncError: string | null;
  oauthError?: string;
}

/**
 * Status only — the connect/sync action lives in the header's
 * SyncCalendarButton (concept §8 shows this card as a plain status row with
 * a check, no button). Keeping a second "Sync now" here would be two
 * controls firing the same server action.
 *
 * Still a client component: the offline banner depends on `navigator.onLine`
 * via useOnlineStatus, which has no server equivalent.
 */
export function SyncStatusBar({
  connected,
  lastSyncedAt,
  lastSyncStatus,
  lastSyncError,
  oauthError,
}: SyncStatusBarProps) {
  const isOnline = useOnlineStatus();

  const banner =
    (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) ||
    (lastSyncStatus === "error" ? lastSyncError : null) ||
    (!isOnline ? "You're offline — Calendar sync needs a connection." : null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-card bg-card px-5 py-3.5">
        {/* The real Google mark, not a generic calendar glyph — it's the same
            service the header button connects to, and the concept shows the
            brand mark in both places. */}
        <IconChip icon={<GoogleCalendarMark className="h-[18px] w-[18px]" />} tone="sky" size="md" square />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-foreground">Google Calendar</p>
          {/* Formatted in the runtime's local timezone — expected to differ
              between SSR and hydration, not a real mismatch. */}
          <p className="mt-0.5 text-[11.5px] font-semibold text-ink-3" suppressHydrationWarning>
            {!connected
              ? "Not connected yet"
              : lastSyncStatus === "error"
                ? "Last sync failed"
                : lastSyncedAt
                  ? `Last synced ${new Date(lastSyncedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}`
                  : "Connected — not synced yet"}
          </p>
        </div>
        {connected && lastSyncStatus !== "error" && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-mint-text" aria-hidden="true" />
        )}
      </div>

      {banner && (
        <p
          role="alert"
          className="rounded-ctl bg-coral-tint px-4 py-2.5 text-[12.5px] font-semibold text-coral-text"
        >
          {banner}
        </p>
      )}
    </div>
  );
}
