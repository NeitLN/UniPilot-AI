"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

/** computeAndStoreRisk() already recomputes on every real page load
 * (React's per-request cache() only dedupes within one render pass) — this
 * just gives the viewer a visible, real way to trigger that recompute
 * instead of a decorative button that does nothing. */
export function RefreshScoreButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className={`flex min-h-11 items-center gap-1.5 rounded-ctl px-3.5 text-xs font-bold disabled:opacity-60 ${
        tone === "dark"
          ? "bg-white/10 text-white hover:bg-white/15"
          : "border border-border-cb bg-card text-ink-2 hover:bg-line"
      }`}
    >
      <RotateCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} aria-hidden="true" />
      {pending ? "Refreshing…" : "Refresh score"}
    </button>
  );
}
