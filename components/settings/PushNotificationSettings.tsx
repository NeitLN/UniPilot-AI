"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FieldError } from "@/components/ui/FieldError";
import { confirmVariants, fadeVariants } from "@/lib/motion/variants";
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
  // Set only inside handleEnable's success path below — never by the
  // mount-time status check — so a returning user who is already
  // subscribed sees the plain "enabled" state, not a fresh celebration
  // replaying every time they open Settings. Also the literal enforcement
  // of "must not claim enabled until the backend confirms it": this can
  // only become true after ensurePushSubscription() has already resolved
  // with a stored subscription (see lib/push/subscribe.ts — it POSTs to
  // /api/push/subscribe before returning "granted").
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    getPushSubscriptionState()
      .then(setState)
      .catch(() => setState("unsupported"));
  }, []);

  // Auto-dismiss the "Enabled" confirmation — it's a one-time acknowledgment
  // that the action just succeeded, not a permanent status readout (the
  // button already reading "Turn off" is the permanent signal for that).
  useEffect(() => {
    if (!justEnabled) return;
    const id = setTimeout(() => setJustEnabled(false), 2500);
    return () => clearTimeout(id);
  }, [justEnabled]);

  async function handleEnable() {
    setError(null);
    setPending(true);
    try {
      const result = await ensurePushSubscription();
      setState(result === "granted" ? "enabled" : result);
      if (result === "granted") setJustEnabled(true);
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
    setJustEnabled(false);
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
        Get deadline and schedule reminders on this device, even when UniPilot isn&apos;t open.
      </p>
      {/* Cross-fades between states (checking / unsupported / denied /
          default / enabled) instead of the old hard swap — each is a
          distinct outcome of the same permission flow, not independent
          content, so a fade reads as "the answer changed" rather than
          unrelated things popping in and out. mode="wait" avoids two
          state messages being visible at once mid-transition. */}
      <AnimatePresence mode="wait">
        {state === "loading" && (
          <motion.p
            key="loading"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={fadeVariants}
            className="text-[11.5px] font-semibold text-ink-3"
          >
            Checking status…
          </motion.p>
        )}

        {state === "unsupported" && (
          <motion.p
            key="unsupported"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={fadeVariants}
            role="status"
            className="text-[11.5px] font-semibold text-ink-3"
          >
            This browser doesn&apos;t support push notifications. On iPhone/iPad, add UniPilot to
            your Home Screen first, then try again from there.
          </motion.p>
        )}

        {state === "denied" && (
          <motion.p
            key="denied"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={fadeVariants}
            role="status"
            className="text-[11.5px] font-semibold text-ink-3"
          >
            Notifications are blocked for UniPilot in this browser. Allow them from your browser or
            device settings to turn this back on.
          </motion.p>
        )}

        {(state === "default" || state === "enabled") && (
          <motion.div
            key="toggle"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={fadeVariants}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={state === "enabled" ? handleDisable : handleEnable}
              disabled={pending}
              className="flex min-h-11 w-fit items-center justify-center rounded-ctl bg-line px-3.5 text-sm font-bold text-foreground hover:bg-line-hover disabled:opacity-60"
            >
              {pending ? "Working…" : state === "enabled" ? "Turn off" : "Turn on"}
            </button>

            {/* The one moment here that earns emphasis beyond a plain
                state label — successfully enabling. Auto-dismisses after
                2.5s (effect above) since it's a one-time acknowledgment,
                not a permanent status; disabling clears it immediately via
                setJustEnabled(false) too. */}
            <AnimatePresence>
              {state === "enabled" && justEnabled && (
                <motion.span
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={confirmVariants}
                  role="status"
                  aria-live="polite"
                  className="inline-flex items-center gap-1 text-[11.5px] font-bold text-mint-text"
                >
                  <CheckIcon /> Enabled
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <FieldError className="text-[11px]">{error}</FieldError>}
      <p aria-live="polite" className="sr-only">
        {state === "enabled" ? "Push notifications are on for this device." : ""}
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M4 10.5 8 14l8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
