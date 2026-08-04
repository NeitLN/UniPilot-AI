import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * A11Y-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — muted text tokens were
 * only ever validated against the white card surface.
 *
 * `--ink-3` measured a comfortable 5.06:1 on `--card`, so it looked fine.
 * But it is also used on `--canvas` (4.49:1), `--line` (4.40:1) and
 * `--violet-tint` (4.21:1), all below the 4.5 AA floor — 21 real instances
 * across /assignments, /courses, /focus, /risk and /settings. `--dusk-label`
 * had the same shape of problem against `--ink`, at a much worse 3.08:1.
 *
 * This reads the real values out of globals.css rather than restating them,
 * so it fails if any token drifts. It is a computation over token pairs, not
 * a grep over class names: the defect was never in how the classes were
 * written, it was in the values themselves.
 */

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8");

/** Reads a custom property. `occurrence` picks the light (0) or dark (1)
 * declaration — globals.css declares the dark theme as a second block. */
function token(name: string, occurrence: 0 | 1 = 0): string {
  const matches = [...CSS.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`, "g"))];
  const hit = matches[occurrence] ?? matches[0];
  if (!hit) throw new Error(`Token --${name} not found in globals.css`);
  return hit[1];
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const [l1, l2] = [relativeLuminance(rgb(fg)), relativeLuminance(rgb(bg))];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** WCAG 1.4.3 AA for normal-size text. Every muted token below is used at
 * 11-13px, so the 3:1 large-text allowance never applies. */
const AA_NORMAL = 4.5;

/** Surfaces each light-theme muted token is actually rendered on — taken
 * from the measured call sites, not from every surface that exists. */
const LIGHT_SURFACES = ["card", "canvas", "line", "violet-tint"] as const;
const DARK_SURFACES = ["card", "canvas", "line", "violet-tint"] as const;

describe("muted text tokens meet WCAG AA on every surface they land on", () => {
  it.each(LIGHT_SURFACES)("light: --ink-3 on --%s", (surface) => {
    const ratio = contrastRatio(token("ink-3", 0), token(surface, 0));
    expect(ratio, `--ink-3 on --${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it.each(DARK_SURFACES)("dark: --ink-3 on --%s", (surface) => {
    const ratio = contrastRatio(token("ink-3", 1), token(surface, 1));
    expect(ratio, `--ink-3 on --${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  // The dusk-* family only ever sits on the permanently-dark --ink panels
  // (sidebar, HUD cards), which do not flip with the theme.
  it.each(["dusk-text", "dusk-muted", "dusk-label", "dusk-hud", "dusk-btn"] as const)(
    "--%s on --ink",
    (name) => {
      const ratio = contrastRatio(token(name, 0), token("ink", 0));
      expect(ratio, `--${name} on --ink is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA_NORMAL);
    },
  );

  it("--ink-2, the stronger secondary token, stays clearly ahead of --ink-3", () => {
    // Guards the hierarchy: darkening ink-3 to pass AA must not collapse the
    // visual difference between secondary and muted text.
    const ink2 = contrastRatio(token("ink-2", 0), token("card", 0));
    const ink3 = contrastRatio(token("ink-3", 0), token("card", 0));
    expect(ink2).toBeGreaterThan(ink3 + 1.5);
  });
});
