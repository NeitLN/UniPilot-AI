import { describe, expect, it } from "vitest";
import { courseTone, COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";

describe("courseTone", () => {
  it("is deterministic for the same id", () => {
    const id = "3f6a1c2e-8b1a-4b8a-9b1a-2e3f6a1c2e8b";
    const first = courseTone(id);
    for (let i = 0; i < 20; i++) {
      expect(courseTone(id)).toBe(first);
    }
  });

  it("distributes across the tone set for different ids", () => {
    const ids = Array.from({ length: 30 }, (_, i) => `course-${i}`);
    const tones = new Set(ids.map((id) => courseTone(id)));
    // Not asserting perfect uniformity — just that it isn't collapsing
    // every id onto a single tone.
    expect(tones.size).toBeGreaterThan(1);
  });

  it("only ever returns a tone with a registered class set", () => {
    const id = "some-course-id";
    const tone = courseTone(id);
    expect(COURSE_TONE_CLASSES[tone]).toBeDefined();
  });
});
