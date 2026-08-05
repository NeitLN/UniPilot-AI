// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.4 — stable, deterministic
// color assignment per course so a course's color never changes when lists
// are sorted/filtered/paginated differently. No color is persisted: this is
// purely a presentation-layer hash of the course's own (already stable)
// UUID, not a user preference — if course color pickers are ever added,
// that's a real schema/preference feature, not this.

export type CourseTone = "violet" | "mint" | "tangerine" | "coral" | "sky" | "lime";

const TONES: CourseTone[] = ["violet", "mint", "tangerine", "coral", "sky", "lime"];

// Static so Tailwind's class scanner can see every literal string at build
// time — building a class name like `bg-${tone}-tint` dynamically would be
// invisible to the compiler and get purged.
/**
 * `onSolid` is the text colour to pair with `solid` as a *fill* (the week
 * grid's class blocks). It is not the same as `text`, which is tuned for
 * the pale `tint` background — dropping `text-sky-text` onto solid `bg-sky`
 * measures about 3.9:1, under the 4.5:1 AA floor for the 10px type used in
 * those blocks. Only violet is dark enough to carry white; every other tone
 * here is a bright fill and takes ink instead (coral included: white on
 * coral is ~3.1:1, which is why KpiCard has a separate coral-deep).
 */
export const COURSE_TONE_CLASSES: Record<
  CourseTone,
  { bg: string; tint: string; text: string; border: string; solid: string; onSolid: string }
> = {
  violet: {
    bg: "bg-violet",
    tint: "bg-violet-tint",
    text: "text-violet-text",
    border: "border-violet",
    solid: "bg-violet",
    onSolid: "text-white",
  },
  mint: {
    bg: "bg-mint",
    tint: "bg-mint-tint",
    text: "text-mint-text",
    border: "border-mint",
    solid: "bg-mint",
    onSolid: "text-ink",
  },
  tangerine: {
    bg: "bg-tangerine",
    tint: "bg-tangerine-tint",
    text: "text-tangerine-text",
    border: "border-tangerine",
    solid: "bg-tangerine",
    onSolid: "text-ink",
  },
  coral: {
    bg: "bg-coral",
    tint: "bg-coral-tint",
    text: "text-coral-text",
    border: "border-coral",
    solid: "bg-coral",
    onSolid: "text-ink",
  },
  sky: {
    bg: "bg-sky",
    tint: "bg-sky-tint",
    text: "text-sky-text",
    border: "border-sky",
    solid: "bg-sky",
    onSolid: "text-ink",
  },
  lime: {
    bg: "bg-lime",
    tint: "bg-lime-tint",
    text: "text-ink",
    border: "border-lime",
    solid: "bg-lime",
    onSolid: "text-ink",
  },
};

/** FNV-1a — small, dependency-free, stable across platforms (unlike
 * String.prototype hashing tricks that can differ by JS engine). */
function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Same `courseId` always returns the same tone — verified by a unit test
 * (tests/ui/course-tone.test.ts) rather than assumed. */
export function courseTone(courseId: string): CourseTone {
  const index = stableHash(courseId) % TONES.length;
  return TONES[index];
}
