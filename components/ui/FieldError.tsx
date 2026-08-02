"use client";

import { motion } from "motion/react";
import { DURATION, EASING } from "@/lib/motion/tokens";

/**
 * SR-03 (docs/PRODUCT_REVIEW_3.md): every error/status message across the
 * app used to reach for `text-coral-text` / `text-mint-text` /
 * `text-tangerine-text` standalone — those are fixed dark shades designed
 * to pair with their own light `-tint` background (Tag, KpiCard's solid
 * fills), not to stand alone on `bg-card`/`bg-line`/the page background,
 * which flips dark. Measured ~2.6:1 contrast in dark mode against a 4.5:1
 * AA requirement.
 *
 * D-03 (docs/UIUX_REVIEW.md): the follow-up fix here, `text-coral` standalone,
 * turned out to only clear AA in dark mode (~5.3:1 on bg-card) — light mode
 * measured 3.11:1, still below 4.5:1. Neither `--coral` nor `--coral-text`
 * passes both themes standalone (the former is dark-safe/light-unsafe, the
 * latter is the reverse), so this now uses the same tint+text pairing that
 * already works correctly for badges/tags — `--coral-tint`/`--coral-text`
 * are deliberately theme-invariant (always light bg + always dark text),
 * which sidesteps the flip entirely instead of chasing a single shade that
 * survives both themes. One component instead of ~30 copies of this pattern
 * so the fix can't silently drift back to a bare color in new code.
 *
 * Fades + settles in on mount (docs/ANIMATION_SYSTEM.md — "success and
 * error states transition correctly," P0) since this is used ~40 places
 * app-wide; fixing the entrance here covers all of them without touching
 * a single call site. Exit isn't animated — most callers unmount this via
 * a plain `{error && <FieldError>}` with no AnimatePresence wrapper, so an
 * exit transition would need one added at every call site for a much
 * smaller payoff (a message disappearing is far less important to notice
 * than one appearing).
 */
export function FieldError({
  children,
  className,
  as = "p",
}: {
  children: React.ReactNode;
  className?: string;
  /** "span" for inline use inside a <label>; "p" (default) for a standalone line. */
  as?: "p" | "span";
}) {
  const Component = as === "span" ? motion.span : motion.p;
  return (
    <Component
      role="alert"
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.fast, ease: EASING.enter }}
      className={`inline-block rounded-pill bg-coral-tint px-2 py-0.5 font-semibold text-coral-text ${className ?? "text-xs"}`}
    >
      {children}
    </Component>
  );
}
