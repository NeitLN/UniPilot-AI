"use client";

import { motion } from "motion/react";
import { DISTANCE, DURATION, EASING } from "@/lib/motion/tokens";

/**
 * One-shot fade+settle reveal for content that just became available
 * (resolved Suspense boundary, first paint of a section). Plays once on
 * mount only — it does not replay on prop updates, and it is not meant to
 * wrap content that re-renders on every keystroke/poll (wrap the section
 * once, not each item — see StaggerList for lists that want a per-item
 * cascade instead of moving as one block).
 *
 * Note: builds its `animate` transition inline (instead of importing the
 * shared `fadeVariants` object) so `delay` merges correctly — Motion lets a
 * variant's own `transition` field override a component-level `transition`
 * prop entirely, which would otherwise silently drop `delay`.
 */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Seconds — only meaningful when a few FadeIns are hand-sequenced;
   * prefer StaggerList for anything with more than 2-3 siblings. */
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: DISTANCE.small }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: DURATION.standard, ease: EASING.enter, delay },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
