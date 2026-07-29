"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncNow } from "@/app/(app)/schedule/actions";
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

export function SyncStatusBar({
  connected,
  lastSyncedAt,
  lastSyncStatus,
  lastSyncError,
  oauthError,
}: SyncStatusBarProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [runError, setRunError] = useState<string | null>(null);

  function handleSyncNow() {
    setRunError(null);
    startTransition(async () => {
      const result = await syncNow();
      if (result.status === "error") setRunError(result.message ?? "Sync failed.");
      router.refresh();
    });
  }

  const banner =
    (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) ||
    runError ||
    (lastSyncStatus === "error" ? lastSyncError : null) ||
    (!isOnline ? "You're offline — Calendar sync needs a connection." : null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-white px-5 py-3.5">
        <div className="text-[12.5px] font-semibold text-ink-2">
          {!connected ? (
            "Google Calendar isn't connected yet."
          ) : lastSyncedAt ? (
            <>
              Last synced{" "}
              {new Date(lastSyncedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </>
          ) : (
            "Connected — not synced yet."
          )}
        </div>

        {connected ? (
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={pending || !isOnline}
            className="rounded-ctl bg-violet px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-deep disabled:opacity-60"
          >
            {pending ? "Syncing…" : "Sync now"}
          </button>
        ) : isOnline ? (
          <a
            href="/api/calendar/oauth/start"
            className="rounded-ctl bg-violet px-3.5 py-2 text-xs font-bold text-white hover:bg-violet-deep"
          >
            Connect Google Calendar
          </a>
        ) : (
          <span className="rounded-ctl bg-line px-3.5 py-2 text-xs font-bold text-ink-3">
            Connect Google Calendar
          </span>
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
