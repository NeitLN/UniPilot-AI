// Browser-only helpers — never imported from a Server Component.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionResult = "granted" | "denied" | "unsupported";

/**
 * Requests Notification permission (only actually prompts if it's still
 * "default" — safe to call repeatedly) and, once granted, subscribes to
 * push and registers the subscription with the server. Call this at the
 * moment the user has just given a reason to want reminders (e.g. saved an
 * assignment with a reminder time), not on first app load.
 */
export async function ensurePushSubscription(): Promise<PushPermissionResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";

  let permission: NotificationPermission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return "denied";

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return "unsupported";

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  return "granted";
}

export type PushSubscriptionState = "unsupported" | "default" | "enabled" | "denied";

/** Read-only status check for UI (e.g. Settings) — never prompts. */
export async function getPushSubscriptionState(): Promise<PushSubscriptionState> {
  if (typeof window === "undefined") return "unsupported";
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return "default";
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "default";
}

/** Unsubscribes this device and removes its server-side record. Browser
 * permission itself can't be revoked from script — if the user wants to
 * re-enable later they'll just get prompted again (permission is still
 * "granted", so ensurePushSubscription won't even need to re-ask). */
export async function disablePushSubscription(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
