import type { Transition, Variants } from "motion/react";
import { DISTANCE, DURATION, EASING } from "./tokens";

const enterTransition: Transition = {
  duration: DURATION.standard,
  ease: EASING.enter,
};
const exitTransition: Transition = {
  duration: DURATION.fast,
  ease: EASING.exit,
};

/** Opacity-only — the safest, cheapest variant. Use for anything where a
 * position shift isn't meaningful (skeleton→content swaps, inline status
 * text changes). */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: enterTransition },
  exit: { opacity: 0, transition: exitTransition },
};

/** Backdrop overlay behind modals/dialogs — fade only, never moves. */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: enterTransition },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASING.exit },
  },
};

/** Modal/dialog panel — small settle-up + fade, matches DISTANCE.medium.
 * No scale: a panel popping in at less than full size reads as a "screen
 * transition" cliché rather than a calm settle. */
export const modalPanelVariants: Variants = {
  initial: { opacity: 0, y: DISTANCE.medium },
  animate: { opacity: 1, y: 0, transition: enterTransition },
  exit: { opacity: 0, y: DISTANCE.small, transition: exitTransition },
};

/** Dropdowns/popovers anchored below a trigger (notification panel, menus)
 * — shorter travel than a modal since they're smaller and anchored, plus a
 * very light scale (never below SCALE bounds) so it reads as "unfurling
 * from the trigger" rather than sliding in from off-screen. */
export const popoverVariants: Variants = {
  initial: { opacity: 0, y: -DISTANCE.small, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: enterTransition },
  exit: {
    opacity: 0,
    y: -DISTANCE.small,
    scale: 0.99,
    transition: exitTransition,
  },
};

/** Toast/inline banner — rises in from just below its resting position.
 * UniPilot has no toast stack today; this is the variant a future one
 * should reuse rather than inventing a new travel distance. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: DISTANCE.medium },
  animate: { opacity: 1, y: 0, transition: enterTransition },
  exit: { opacity: 0, y: DISTANCE.small, transition: exitTransition },
};

/** Restrained list/grid stagger — small settle-up, short per-item delay.
 * Applied to the CONTAINER; children should use `staggerItemVariants`. Only
 * meant for a first, one-time reveal (e.g. Dashboard KPI row on initial
 * load) — see StaggerList.tsx for the mount-once guard that prevents this
 * from replaying on every re-render. */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0 },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: DISTANCE.small },
  animate: { opacity: 1, y: 0, transition: enterTransition },
};

/** A single restrained "settled" confirmation — used for the one moment a
 * state change deserves a beat of emphasis (push notifications turning on,
 * a Pomodoro cycle completing) without being a celebration. Scale never
 * leaves the SCALE token bounds. */
export const confirmVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: enterTransition },
  exit: { opacity: 0, transition: exitTransition },
};
