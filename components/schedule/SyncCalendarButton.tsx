"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { syncNow } from "@/app/(app)/schedule/actions";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { GoogleCalendarMark } from "./GoogleCalendarMark";

/**
 * The header's single Google Calendar action (concept §8): "Sync Google
 * Calendar" whether or not a connection exists yet — it starts the OAuth
 * flow when there isn't one and runs a real sync when there is.
 *
 * SyncStatusBar in the right rail used to carry its own "Sync now"/"Connect"
 * button. Having both would be two controls for one action, so that card is
 * now status-only and this is the one place the sync is triggered from.
 */
export function SyncCalendarButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const className =
    "flex min-h-11 items-center gap-2 rounded-ctl border border-border-cb bg-card px-4 py-2.5 text-sm font-bold text-ink-2 hover:bg-line disabled:opacity-60";

  if (!connected) {
    // Offline can't complete an OAuth round-trip, so the control is present
    // but visibly inert rather than a link that silently fails.
    return isOnline ? (
      <a href="/api/calendar/oauth/start" className={className}>
        <GoogleCalendarMark />
        Sync Google Calendar
      </a>
    ) : (
      <span className={`${className} opacity-60`} aria-disabled="true">
        <GoogleCalendarMark />
        Sync Google Calendar
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || !isOnline}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await syncNow();
            if (result.status === "error") setError(result.message ?? "Sync failed.");
            router.refresh();
          });
        }}
        className={className}
      >
        {pending ? (
          <RotateCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <GoogleCalendarMark />
        )}
        {pending ? "Syncing…" : "Sync Google Calendar"}
      </button>
      {error && (
        <p role="alert" className="text-[11.5px] font-semibold text-coral-text">
          {error}
        </p>
      )}
    </div>
  );
}
