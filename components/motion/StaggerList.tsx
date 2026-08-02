"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/motion/variants";

/** Module-level, not React state: Next.js App Router remounts a route's
 * `page.tsx` tree on every navigation to it (layouts persist, pages don't),
 * so a plain mount-triggered stagger would replay every time a user
 * revisits the same page. A plain in-memory Set survives across client-side
 * navigations within one session (the module isn't re-evaluated, only
 * components remount) and resets naturally on a full page reload — which is
 * fine, that's a genuine "first paint" again. */
const playedSessionKeys = new Set<string>();

/**
 * Restrained, one-time-per-session stagger reveal for a short row/grid of
 * items (e.g. the Dashboard's 4 KPI cards). Pass `sessionKey` to prevent it
 * from replaying every time the user navigates back to this page (see
 * docs/ANIMATION_SYSTEM.md — "do not animate every card every time the user
 * changes route"); omit it only for a component that's genuinely mounted
 * once per app session (e.g. inside a layout, not a page). Keep lists short
 * (4-8 items): with a 40ms per-item delay, an 8-item list finishes its
 * cascade in ~320ms — a longer list should use FadeIn on the container
 * instead of stretching the stagger out.
 */
export function StaggerList({
  children,
  className,
  sessionKey,
  as: Component = motion.div,
}: {
  children: React.ReactNode;
  className?: string;
  /** Unique key (e.g. "dashboard-kpis") — when this key has already played
   * once this session, renders directly in the end state with no transition. */
  sessionKey?: string;
  /** motion.ul/motion.ol for list semantics; defaults to motion.div. */
  as?: typeof motion.div | typeof motion.ul | typeof motion.ol;
}) {
  // Lazy initializer: read-only, safe under StrictMode's double-render in
  // dev (React keeps one call's result regardless of how many times the
  // initializer runs — it never mutates shared state, so calling it twice
  // is harmless). The actual mutation happens in the effect below, which
  // runs after commit; a Set's .add is idempotent, so StrictMode's
  // mount→cleanup→mount replay in dev can't double-count it either.
  const [alreadyPlayed] = useState(
    () => sessionKey !== undefined && playedSessionKeys.has(sessionKey),
  );

  useEffect(() => {
    if (sessionKey !== undefined) playedSessionKeys.add(sessionKey);
  }, [sessionKey]);

  return (
    <Component
      initial={alreadyPlayed ? "animate" : "initial"}
      animate="animate"
      variants={staggerContainerVariants}
      className={className}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as: Component = motion.div,
}: {
  children: React.ReactNode;
  className?: string;
  as?: typeof motion.div | typeof motion.li;
}) {
  return (
    <Component variants={staggerItemVariants} className={className}>
      {children}
    </Component>
  );
}
