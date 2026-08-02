"use client";

import { motion } from "motion/react";
import { DURATION, EASING } from "@/lib/motion/tokens";

/** Same rationale as FieldError (components/ui/FieldError.tsx, D-03 in
 * docs/UIUX_REVIEW.md): `text-mint` standalone measured 1.76:1 on bg-card in
 * light mode — the worst contrast found anywhere in the app — because
 * `--mint` is a mid-brightness accent, not designed to stand alone as text.
 * `--mint-tint`/`--mint-text` are theme-invariant (always light bg + always
 * dark text), so pairing them sidesteps the light/dark flip instead of
 * chasing a single shade that survives both themes.
 *
 * Fades + settles in on mount, same as FieldError — see that file's
 * comment for why only enter (not exit) is animated here. */
export function FieldSuccess({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.fast, ease: EASING.enter }}
      className={`inline-block rounded-pill bg-mint-tint px-2 py-0.5 font-semibold text-mint-text ${className ?? "text-xs"}`}
    >
      {children}
    </motion.p>
  );
}
