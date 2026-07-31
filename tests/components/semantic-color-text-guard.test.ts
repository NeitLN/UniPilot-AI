import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// D-03 (docs/UIUX_REVIEW.md) — text-mint/text-coral/text-tangerine used
// standalone as text color measured as low as 1.76:1 (mint on bg-card,
// light mode) against a 4.5:1 AA requirement, because those tokens are
// mid-brightness accents designed for large fills, not text on the page's
// own background. The working pattern (already correct for Tag/KpiCard, now
// FieldError/FieldSuccess too) pairs the *-tint background with the
// *-text color instead — both stay theme-invariant, sidestepping the
// light/dark flip that broke every bare usage. This guards against a new
// bare usage reappearing anywhere the same way hover-token-guard.test.ts
// guards hover:bg-[#...].
const ROOTS = ["app", "components"];
const BARE_SEMANTIC_TEXT = /text-(mint|coral|tangerine)(?![-a-zA-Z])/;

// AssignmentItem's "Delete permanently"/"Archive" and DeleteAccountSection's
// "Delete account" buttons still use bare text-coral on bg-line — a
// deliberate, tracked exception. Their contrast fix intersects the Phase
// 16.2 "de-emphasize destructive actions" visual-hierarchy decision (they
// may not even keep this bg-line + colored-text treatment), so fixing the
// color in isolation now risked being redone. Not a silent gap: flagged in
// the Phase 14 commit and left for that phase.
const KNOWN_EXCEPTIONS = new Set([
  "components/assignments/AssignmentItem.tsx",
  "components/settings/DeleteAccountSection.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("semantic color text guard", () => {
  it("no component uses bare text-mint/coral/tangerine outside the tracked exceptions", () => {
    const offenders: { file: string; line: number }[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const relative = file.replace(/\\/g, "/");
        if ([...KNOWN_EXCEPTIONS].some((ex) => relative.endsWith(ex))) continue;

        const lines = readFileSync(file, "utf-8").split("\n");
        lines.forEach((line, i) => {
          const trimmed = line.trim();
          // Skip comment lines — this file and FieldError.tsx both discuss
          // the old bare-color bug in prose, e.g. "`text-coral` standalone".
          if (trimmed.startsWith("*") || trimmed.startsWith("//")) return;
          if (BARE_SEMANTIC_TEXT.test(line)) offenders.push({ file: relative, line: i + 1 });
        });
      }
    }
    expect(
      offenders,
      offenders.map((o) => `${o.file}:${o.line}`).join("\n"),
    ).toHaveLength(0);
  });
});
