"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getQueuedMutations } from "@/lib/offline/idb";
import { flushQueue } from "@/lib/offline/queue";
import { useQueueOwner } from "@/components/offline/QueueOwnerProvider";

// How often to re-check `navigator.onLine` while a mutation is queued. The
// `online` window event is the primary trigger, but it can race a listener
// that just attached (e.g. right after this component mounts on a fresh
// navigation) — this poll is the deterministic fallback so a queued change
// never sits stuck past a few seconds after connectivity actually returns.
const RETRY_POLL_MS = 3000;

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [syncedMessage, setSyncedMessage] = useState<string | null>(null);
  const queueCountRef = useRef(0);
  // OFF-001: every read and every replay is scoped to this account, so a
  // queue left behind by whoever used the browser before is neither counted
  // here nor sent to the server under this session.
  const queueOwner = useQueueOwner();

  const refreshQueueCount = useCallback(async () => {
    const queue = await getQueuedMutations(queueOwner);
    queueCountRef.current = queue.length;
    setQueueCount(queue.length);
  }, [queueOwner]);

  const attemptFlush = useCallback(async () => {
    if (!navigator.onLine) return;
    const { synced, conflicts, dropped } = await flushQueue(queueOwner);
    await refreshQueueCount();
    setConflictCount(conflicts);
    if (synced > 0 || dropped > 0) {
      const parts = [];
      if (synced > 0) parts.push(`Synced ${synced} offline change${synced === 1 ? "" : "s"}.`);
      // Saying so matters: the alternative is a change quietly disappearing
      // after the banner spent days claiming it was waiting to sync.
      if (dropped > 0) {
        parts.push(`${dropped} couldn't be saved and ${dropped === 1 ? "was" : "were"} discarded.`);
      }
      setSyncedMessage(parts.join(" "));
      setTimeout(() => setSyncedMessage(null), 5000);
    }
  }, [refreshQueueCount, queueOwner]);

  useEffect(() => {
    // Syncing from browser-only state (navigator.onLine, IndexedDB) on mount —
    // SSR always renders the "online, nothing queued" state first.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from external stores (navigator.onLine, IndexedDB) on mount
    setOnline(navigator.onLine);
    void refreshQueueCount().then(() => void attemptFlush());

    function handleOnline() {
      setOnline(true);
      void attemptFlush();
    }
    function handleOffline() {
      setOnline(false);
    }

    const pollId = window.setInterval(() => {
      if (queueCountRef.current > 0) void attemptFlush();
    }, RETRY_POLL_MS);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("unipilot:queue-changed", refreshQueueCount);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("unipilot:queue-changed", refreshQueueCount);
    };
  }, [refreshQueueCount, attemptFlush]);

  if (online && queueCount === 0 && !syncedMessage) return null;

  const message = !online
    ? "You're offline — changes will sync once you're back online."
    : conflictCount > 0
      ? `${conflictCount} change${conflictCount === 1 ? "" : "s"} couldn't sync automatically — a newer version exists on the server. Re-check and save again.`
      : (syncedMessage ??
        (queueCount > 0
          ? `${queueCount} change${queueCount === 1 ? "" : "s"} waiting to sync…`
          : null));

  if (!message) return null;

  return (
    <div
      role="status"
      className="border-b border-border-subtle-2 bg-tangerine-tint px-4 py-2 text-center text-[12.5px] font-bold text-tangerine-text"
    >
      {message}
    </div>
  );
}
