"use client";

import { useEffect } from "react";

/** Registers the service worker so push has somewhere to land. Failing
 * silently here is intentional — in-app notifications work either way (TC-05). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration can fail (unsupported browser, blocked by policy) —
        // the in-app notification list still works without it (TC-05).
      });
    }
  }, []);

  return null;
}
