import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AVATAR_COLORS, isAvatarColor } from "@/lib/rules/avatar-color";
import { COURSE_TONE_CLASSES } from "@/lib/ui/course-tone";

/**
 * CODE-02 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — the last module in
 * lib/rules without a test.
 *
 * The risk here is not the function, which is three lines. It is that the
 * same six-tone palette is written down in three independent places:
 * this module, course-tone.ts, and migration 0018's check constraint. They
 * have to agree, and nothing was checking that they did. A colour added to
 * the TypeScript side but not the constraint would pass typecheck, pass
 * review, and fail at the database on save.
 */

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "0018_profile_extras.sql"),
  "utf-8",
);

/** Pulls the allowed values straight out of the constraint, so the test
 * tracks the schema rather than restating it. */
function constraintValues(): string[] {
  const match = MIGRATION.match(/check\s*\(\s*avatar_color\s+in\s*\(([^)]*)\)/i);
  if (!match) throw new Error("avatar_color check constraint not found in migration 0018");
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("AVATAR_COLORS", () => {
  it("matches the database check constraint exactly", () => {
    expect([...AVATAR_COLORS].sort()).toEqual(constraintValues().sort());
  });

  it("matches the course tone palette", () => {
    expect([...AVATAR_COLORS].sort()).toEqual(Object.keys(COURSE_TONE_CLASSES).sort());
  });

  it("includes the column's default, or a fresh profile would violate its own constraint", () => {
    const defaultMatch = MIGRATION.match(/avatar_color text not null default '([^']+)'/i);
    expect(defaultMatch).not.toBeNull();
    expect(AVATAR_COLORS).toContain(defaultMatch![1]);
  });
});

describe("isAvatarColor", () => {
  it("accepts every colour in the palette", () => {
    for (const colour of AVATAR_COLORS) expect(isAvatarColor(colour)).toBe(true);
  });

  it("rejects anything else, including values that only look close", () => {
    for (const value of ["purple", "Violet", "VIOLET", "", " violet", "violet "]) {
      expect(isAvatarColor(value)).toBe(false);
    }
  });

  it("rejects values that would otherwise reach the database and fail there", () => {
    // This guard is the only thing between a user-supplied string and the
    // check constraint — the server action trusts it.
    expect(isAvatarColor("'; drop table profiles; --")).toBe(false);
    expect(isAvatarColor("__proto__")).toBe(false);
  });
});
