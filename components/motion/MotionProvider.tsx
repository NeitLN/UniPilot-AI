"use client";

import { MotionConfig } from "motion/react";

/**
 * Wraps the app once (see app/layout.tsx) so every Motion-driven animation
 * anywhere in the tree automatically respects the user's OS-level
 * `prefers-reduced-motion` setting — `reducedMotion="user"` makes Motion
 * skip transform/layout animation and fall back to instant or opacity-only
 * transitions site-wide, with zero per-component logic required.
 *
 * This does NOT cover plain-CSS transitions (Tailwind's `transition-*`
 * classes, the existing `motion-safe:`/`motion-reduce:` variants already
 * used in FocusTimer's progress ring) — those already respect reduced
 * motion on their own via the CSS media query, independent of this.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
