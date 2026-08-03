"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** computeAndStoreRisk() already recomputes on every real page load
 * (React's per-request cache() only dedupes within one render pass) — this
 * just gives the viewer a visible, real way to trigger that recompute
 * instead of a decorative button that does nothing. */
export function RefreshScoreButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="flex min-h-11 items-center rounded-ctl bg-white/10 px-3.5 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-60"
    >
      {pending ? "Refreshing…" : "↻ Refresh score"}
    </button>
  );
}
