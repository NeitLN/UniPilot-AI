"use client";

import { createContext, useContext } from "react";

/**
 * OFF-001 — carries the signed-in user's id to the three client components
 * that touch the offline queue (AssignmentForm, FocusTimer, OfflineBanner).
 *
 * A context rather than props: the id is needed by leaves several levels
 * apart, and threading it through every intermediate component is how a new
 * call site eventually gets added without one and silently queues an
 * unowned mutation. Here, `useQueueOwner()` throws if the provider is
 * missing, so that mistake fails immediately instead of at replay time in
 * someone else's account.
 *
 * The value is only an opaque user id — the same one already present in
 * every row the client can read — so putting it in the client bundle
 * exposes nothing that RLS does not already gate.
 */
const QueueOwnerContext = createContext<string | null>(null);

export function QueueOwnerProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return <QueueOwnerContext.Provider value={userId}>{children}</QueueOwnerContext.Provider>;
}

/**
 * The signed-in user's id.
 *
 * Two different absences, deliberately handled differently. A *missing
 * provider* is a wiring mistake — a new call site that would queue unowned
 * mutations — so it throws immediately. An *empty id* is a legitimate
 * transient: the layout renders defensively when `getUser()` returns null,
 * and crashing the whole tree over a state the layout already tolerates
 * would turn a fix into an outage. The empty string is passed through, and
 * the queue functions refuse it individually: `enqueueMutation` throws
 * rather than storing an unowned record, and reads and flushes no-op.
 */
export function useQueueOwner(): string {
  const userId = useContext(QueueOwnerContext);
  if (userId === null) {
    throw new Error(
      "useQueueOwner must be used inside QueueOwnerProvider — an offline mutation cannot be queued without knowing whose it is.",
    );
  }
  return userId;
}
