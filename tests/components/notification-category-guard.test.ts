import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Two of the five notification categories — `weekly_report` and
 * `focus_reminders` — were dead switches. Nothing anywhere read either
 * column, so flipping them saved a value and changed nothing at all. They
 * shipped that way and nobody noticed, because a control that silently
 * does nothing produces no error and no visible symptom.
 *
 * This is the check that would have caught it: every category the settings
 * card renders has to be read by something that actually gates delivery.
 * A switch that does nothing is worse than a missing one — it spends the
 * user's trust and gives them no way to find out it was misplaced.
 */
const CARD = "components/settings/NotificationPreferencesCard.tsx";

/** Where a preference has to be honoured. Deliberately excludes the
 * settings UI and its server actions, which read every column just to
 * render and persist the switches — counting those would make every dead
 * toggle look alive. */
const CONSUMER_ROOTS = ["lib", "app/api"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("notification category guard", () => {
  it("every category the settings card offers is honoured by delivery code", () => {
    const card = readFileSync(CARD, "utf-8");
    // Only the CATEGORIES table, so the commented-out record of the removed
    // ones does not count as a rendered switch.
    const table = card.slice(card.indexOf("const CATEGORIES"), card.indexOf("export function"));
    const rendered = [...table.matchAll(/key:\s*"([a-z_]+)"/g)].map((m) => m[1]);

    expect(rendered.length).toBeGreaterThan(0);

    const consumers = CONSUMER_ROOTS.flatMap((r) => walk(r))
      // The generated database types name every column by definition, so
      // counting them would make any dead toggle look alive.
      .filter((f) => !f.replace(/\\/g, "/").endsWith("lib/supabase/types.ts"))
      .map((f) => readFileSync(f, "utf-8"))
      .join("\n");

    const dead = rendered.filter((key) => !consumers.includes(key));

    expect(
      dead,
      `These notification categories are rendered as switches but nothing in ${CONSUMER_ROOTS.join(
        " or ",
      )} ever reads them, so toggling them does nothing: ${dead.join(", ")}`,
    ).toEqual([]);
  });
});
