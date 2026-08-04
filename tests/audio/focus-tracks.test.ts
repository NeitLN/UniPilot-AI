import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import { join } from "node:path";
import { FOCUS_TRACKS } from "@/lib/audio/focus-tracks";

/**
 * PERF-03 — the two Satie tracks were encoded at 254 and 287 kbps, which is
 * studio quality for something played quietly under a study timer. Together
 * with the rest that put 16.8 MB in public/, all of it fetched over whatever
 * connection the student happens to be on.
 *
 * The declared sizeMb is what the Lo-fi toggle shows before spending their
 * data, so it has to match the file it describes. It is hand-maintained
 * (there is no build step generating it), which is exactly why it needs a
 * test — a re-encode that forgets to update the number would quietly lie.
 */

const PUBLIC_DIR = join(process.cwd(), "public");

function actualMb(src: string): number {
  return statSync(join(PUBLIC_DIR, src)).size / 1_048_576;
}

describe("FOCUS_TRACKS", () => {
  it.each(FOCUS_TRACKS)("$label exists on disk", (track) => {
    expect(() => statSync(join(PUBLIC_DIR, track.src))).not.toThrow();
  });

  it.each(FOCUS_TRACKS)("$label declares its real size", (track) => {
    // 0.15 MB of slack: sizeMb is rounded to one decimal, and a re-encode
    // that shifts a file by a few kilobytes should not fail the build.
    expect(Math.abs(actualMb(track.src) - track.sizeMb)).toBeLessThan(0.15);
  });

  it("keeps every track small enough to stream on mobile data", () => {
    // The ceiling that made this worth fixing: 6.2 MB for one background
    // loop is not something to pull down without warning.
    for (const track of FOCUS_TRACKS) {
      expect(actualMb(track.src), `${track.label} is too large`).toBeLessThan(4);
    }
  });

  it("keeps the whole set under 10 MB", () => {
    const total = FOCUS_TRACKS.reduce((sum, t) => sum + actualMb(t.src), 0);
    expect(total).toBeLessThan(10);
  });

  it("has unique ids and sources", () => {
    expect(new Set(FOCUS_TRACKS.map((t) => t.id)).size).toBe(FOCUS_TRACKS.length);
    expect(new Set(FOCUS_TRACKS.map((t) => t.src)).size).toBe(FOCUS_TRACKS.length);
  });
});
