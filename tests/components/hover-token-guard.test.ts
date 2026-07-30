import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// QA4-02 (docs/PRODUCT_REVIEW_4.md) — hover:bg-[#E6E2F2] was hardcoded at
// 44 sites across app/ and components/, bypassing the design token system
// entirely: hovering in dark mode dropped text contrast from 6.22:1 to
// 1.67:1, effectively erasing the label. Fixed with a --line-hover token
// (Phase 10.2). This test is the actual regression guard the review asked
// for — a hardcoded hex hover color reappearing anywhere should fail CI,
// not wait for the next round of manual review to notice it again.
const ROOTS = ["app", "components"];
const HEX_HOVER_BG = /hover:bg-\[#/;

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

describe("hover token guard", () => {
  it("no component uses a hardcoded hex hover:bg-[#...] — must go through a token", () => {
    const offenders: { file: string; line: number }[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        const lines = readFileSync(file, "utf-8").split("\n");
        lines.forEach((line, i) => {
          if (HEX_HOVER_BG.test(line)) offenders.push({ file, line: i + 1 });
        });
      }
    }
    expect(
      offenders,
      offenders.map((o) => `${o.file}:${o.line}`).join("\n"),
    ).toHaveLength(0);
  });
});
