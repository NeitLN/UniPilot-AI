import { test, expect } from "@playwright/test";

/**
 * Dark mode was the one area the product audit could not verify. Measuring
 * it turned up 49 real contrast failures, all of one shape: the theme has
 * two families of surface and the pairing rules got crossed between them.
 *
 * `.dark` redeclares only 12 tokens. `--mint-tint`/`--coral-tint`/
 * `--lime-tint`/`--tangerine-tint` deliberately stay light in both themes,
 * because their paired `*-text` tokens are dark shades chosen for contrast
 * against a light tint (see the comment in globals.css). So:
 *
 *   - a token that flips (`foreground`, `ink-2`, `ink-3`) on a tint that
 *     does not flip renders light-on-light, and
 *   - a `*-text` token that does not flip on a surface that does
 *     (`card`, `line`) renders dark-on-dark.
 *
 * A class-name guard cannot catch either, because the background and the
 * colour are set on different elements. This measures what actually
 * renders instead.
 */

const ROUTES = [
  "/",
  "/assignments",
  "/courses",
  "/focus",
  "/gpa",
  "/planner",
  "/reports",
  "/risk",
  "/schedule",
  "/settings",
];

const MEASURE = `() => {
  const lum = (c) => {
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const parse = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(',').map(parseFloat);
    return (p.length > 3 && p[3] === 0) ? null : p.slice(0, 3);
  };
  const alphaOf = (s) => {
    const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return 1;
    const p = m[1].split(',').map(parseFloat); return p.length > 3 ? p[3] : 1;
  };
  // Both nav bars paint their active state with an absolutely-positioned
  // sibling behind the label (a shared layoutId pill), so the label's own
  // ancestor chain reports the panel underneath rather than the pill that
  // is actually behind it. Walking the chain alone reads ink-on-ink and
  // invents a failure. Look for a positioned, filled overlay covering the
  // text first, and prefer it.
  const overlayBehind = (el) => {
    const r = el.getBoundingClientRect();
    let host = el.parentElement;
    for (let depth = 0; host && depth < 3; depth++, host = host.parentElement) {
      for (const sib of host.children) {
        if (sib === el || sib.contains(el)) continue;
        const cs = getComputedStyle(sib);
        if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
        const c = parse(cs.backgroundColor); if (!c) continue;
        const b = sib.getBoundingClientRect();
        if (b.left <= r.left && b.right >= r.right && b.top <= r.top && b.bottom >= r.bottom) return c;
      }
    }
    return null;
  };
  // Otherwise start at the element itself, so a button's own fill counts as
  // its background rather than its parent's.
  const bgOf = (el) => {
    const o = overlayBehind(el); if (o) return o;
    let n = el; while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c) return c; n = n.parentElement; }
    return [255,255,255];
  };

  const out = [];
  document.querySelectorAll('p,span,a,button,h1,h2,h3,h4,label,td,th,li,div').forEach((el) => {
    if (!el.firstChild || el.firstChild.nodeType !== 3) return;
    const text = el.textContent.trim(); if (!text) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (cs.clipPath === 'inset(50%)') return;
    const fg = parse(cs.color); if (!fg) return;
    const bg = bgOf(el);
    // fg === bg exactly means the visible background is an absolutely
    // positioned sibling this walker cannot see (the active nav pill).
    if (fg[0] === bg[0] && fg[1] === bg[1] && fg[2] === bg[2]) return;

    const a = alphaOf(cs.color) * parseFloat(cs.opacity || '1');
    const eff = [0,1,2].map((i) => fg[i] * a + bg[i] * (1 - a));
    const l1 = lum(eff), l2 = lum(bg);
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight) || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3.0 : 4.5;
    if (ratio < need) out.push({ text: text.slice(0, 34), ratio: Math.round(ratio * 100) / 100, need });
  });
  return out;
}`;

test.describe("Dark mode contrast", () => {
  for (const route of ROUTES) {
    test(`${route} meets WCAG AA in dark mode`, async ({ page }) => {
      await page.goto(route);
      await page.waitForSelector("h1");
      // ThemeToggle applies dark by putting the class on <html>; do the same
      // rather than relying on the OS colour-scheme of the CI runner.
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.waitForTimeout(400);

      // Wrapped as an IIFE on purpose. page.evaluate() treats a string as an
      // *expression*, so passing the bare "() => {...}" source evaluated to a
      // function object, which is not serialisable and came back as
      // `undefined` — the test then failed on `undefined !== []` and looked
      // like a contrast failure on every route.
      const failures = (await page.evaluate(`(${MEASURE})()`)) as {
        text: string;
        ratio: number;
        need: number;
      }[];
      expect(failures, `${route} in dark mode`).toEqual([]);
    });
  }
});
