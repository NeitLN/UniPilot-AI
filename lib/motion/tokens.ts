/**
 * UniPilot motion tokens — the single source of truth for every duration,
 * easing curve, and movement distance used anywhere in the app. Nothing
 * outside this file should hardcode a duration/easing value; import from
 * here instead so the whole system can be re-tuned in one place.
 *
 * See docs/ANIMATION_SYSTEM.md for the full rationale, usage examples, and
 * rules for contributors adding new animated components.
 */

/** Seconds, matching Motion's own unit (not ms) — Tailwind arbitrary
 * durations below are the ms equivalents for plain-CSS usage. */
export const DURATION = {
  /** Instant feedback: button press, toggle flip. 80-120ms. */
  instant: 0.1,
  /** Micro-interactions: hover, focus ring, small color/opacity shifts. 140-180ms. */
  fast: 0.16,
  /** The default for most enter/exit: modals, dropdowns, toasts, tag/badge changes. 200-260ms. */
  standard: 0.22,
  /** Complex or larger-surface state changes: drawer/sheet, page section reveal. 300-400ms. */
  emphasized: 0.32,
} as const;

/** Millisecond mirrors of DURATION, for plain CSS (`transition-duration`,
 * inline styles) where a library isn't involved. Keep these two objects in
 * sync — DURATION_MS[k] === DURATION[k] * 1000. */
export const DURATION_MS = {
  instant: 100,
  fast: 160,
  standard: 220,
  emphasized: 320,
} as const;

/** Motion's cubic-bezier easing curves. "Standard" is for state changes with
 * no clear direction (color, opacity-only). "Enter"/"exit" curves are the
 * classic Material-style asymmetry: entering content decelerates into place
 * (feels responsive), exiting content accelerates away (feels quick, doesn't
 * linger). None of these overshoot — no bounce, no spring wobble; UniPilot's
 * motion is calm and academic, not playful. */
export const EASING = {
  standard: [0.4, 0, 0.2, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const;

/** CSS `cubic-bezier(...)` strings for the same curves, for plain
 * `transition-timing-function` usage outside Motion. */
export const EASING_CSS = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  enter: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
} as const;

/** Movement distances (px) for translate-based enter/exit — deliberately
 * small. UniPilot never uses parallax-scale travel; everything reads as a
 * settle into place, not a fly-in. */
export const DISTANCE = {
  /** Small UI elements: tags, inline badges, list-row content swaps. */
  small: 4,
  /** Cards, panels, dropdowns, modals. */
  medium: 8,
  /** Large sheets/drawers — UniPilot doesn't currently have one, but this
   * is the ceiling if a future component needs it. */
  large: 20,
} as const;

/** Scale bounds for press/hover feedback. Never used for layout sizing —
 * only as a `transform: scale()` overlay on top of the element's real box. */
export const SCALE = {
  press: 0.98,
  hoverMax: 1.01,
} as const;

/** Stagger delay (seconds) between siblings in a restrained list/grid
 * reveal (e.g. the four Dashboard KPI cards on first load). Kept short
 * enough that a 4-8 item list finishes well under DURATION.emphasized
 * total, so it reads as "arrived together," not a slow cascade. */
export const STAGGER_DELAY = 0.04;
