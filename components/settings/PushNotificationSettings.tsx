"use client";

import { useEffect, useState } from "react";
import {
  disablePushSubscription,
  ensurePushSubscription,
  getPushSubscriptionState,
  type PushSubscriptionState,
} from "@/lib/push/subscribe";

export function PushNotificationSettings() {
  const [state, setState] = useState<PushSubscriptionState | "loading">("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushSubscriptionState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  async function handleEnable() {
    setError(null);
    setPending(true);
    try {
      const result = await ensurePushSubscription();
      setState(result === "granted" ? "enabled" : result);
      if (result === "unsupported") {
        setError("Couldn't enable notifications on this device.");
      }
    } catch {
      setError("Couldn't enable notifications. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setPending(true);
    try {
      await disablePushSubscription();
      setState("default");
    } catch {
      setError("Couldn't disable notifications. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 text-xs font-bold text-ink-2">
      Push notifications
      <p className="text-[11.5px] font-semibold text-ink-3">
        Get deadline and schedule reminders on this device, even when UniPilot isn&apos;t
        open.
      </p>

      {state === "loading" && (
        <p className="text-[11.5px] font-semibold text-ink-3">Checking status…</p>
      )}

      {state === "unsupported" && (
        <p className="text-[11.5px] font-semibold text-ink-3">
          This browser doesn&apos;t support push notifications. On iPhone/iPad, add
          UniPilot to your Home Screen first, then try again from there.
        </p>
      )}

      {state === "denied" && (
        <p className="text-[11.5px] font-semibold text-ink-3">
          Notifications are blocked for UniPilot in this browser. Allow them from your
          browser or device settings to turn this back on.
        </p>
      )}

      {(state === "default" || state === "enabled") && (
        <button
          type="button"
          onClick={state === "enabled" ? handleDisable : handleEnable}
          disabled={pending}
          className="flex min-h-11 w-fit items-center justify-center rounded-ctl bg-line px-3.5 text-sm font-bold text-foreground hover:bg-line-hover disabled:opacity-60"
        >
          {pending ? "Working…" : state === "enabled" ? "Turn off" : "Turn on"}
        </button>
      )}

      {error && (
        <p role="alert" className="text-[11px] font-semibold text-coral">
          {error}
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {state === "enabled" ? "Push notifications are on for this device." : ""}
      </p>
    </div>
  );
}
