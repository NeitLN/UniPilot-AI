import { test, expect, type Page } from "@playwright/test";

// FR-20 (docs/PRODUCT_REVIEW.md) — full course CRUD. Previously courses
// could only be created, never edited or deleted, despite assignments/
// grades/schedule all hanging off them.
//
// Courses redesign (UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 3):
// Edit/Delete now live behind a single "⋯" menu (aria-label "Actions for
// {name}") on each card, same pattern as AssignmentCard — these helpers
// keep every test below scoped to one card/dialog.
function cardFor(page: Page, name: string) {
  return page.getByTestId("course-card").filter({ hasText: name });
}

async function openActions(page: Page, name: string) {
  await cardFor(page, name).getByRole("button", { name: `Actions for ${name}` }).click();
  const menu = page.getByRole("dialog").filter({ hasText: name });
  await expect(menu).toBeVisible();
  return menu;
}

test.describe("Manage courses", () => {
  const name = `E2E Course ${Date.now()}`;
  const semester = `E2E${Date.now() % 90000}`;

  test("create, edit, and delete a course with no linked data", async ({
    page,
  }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();

    // Create
    await page.getByRole("button", { name: "Add course", exact: true }).click();
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="credits"]').fill("3");
    await page.locator('input[name="semester"]').fill(semester);
    await page
      .getByRole("button", { name: "Add course", exact: true })
      .last()
      .click();

    await expect(page.getByText(name, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // A freshly created course has no assignments yet and nothing pending.
    const card = cardFor(page, name);
    await expect(card.getByText("0 assignments", { exact: true })).toBeVisible();
    await expect(card.getByText("No assignments yet", { exact: true })).toBeVisible();
    await expect(card.getByText("All caught up", { exact: true })).toBeVisible();

    // Edit
    let menu = await openActions(page, name);
    await menu.getByRole("button", { name: "Edit", exact: true }).click();
    const newName = `${name} (renamed)`;
    await page.locator('input[name="name"]').fill(newName);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit course" })).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(newName, { exact: true })).toBeVisible();

    // Delete — no linked data, so this is a plain confirm, not a block.
    menu = await openActions(page, newName);
    await menu.getByRole("button", { name: "Delete", exact: true }).click();
    // Heading uses curly quotes ("Delete "X"?"), not straight ones.
    await expect(page.getByRole("heading", { name: /^Delete / })).toBeVisible();
    // Scoped to the "Delete course" dialog specifically — the Actions menu
    // dialog can still be mid-exit-animation in the DOM (docs/ANIMATION_SYSTEM.md),
    // and it also has a "Delete" button.
    await page
      .getByRole("dialog", { name: "Delete course" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(cardFor(page, newName)).toHaveCount(0, { timeout: 10_000 });
  });

  // A11y: the course card's title was an <h3> under the page's <h1>, with
  // no <h2> between them, so navigating by heading level reported a missing
  // level and made it look like content had been skipped.
  test("has a gap-free heading outline", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses", exact: true })).toBeVisible();

    const jumps = await page.evaluate(() => {
      const bad: string[] = [];
      let prev = 0;
      document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
        const level = Number(h.tagName[1]);
        if (prev && level > prev + 1) bad.push(`h${prev} -> h${level}: ${h.textContent?.trim()}`);
        prev = level;
      });
      return bad;
    });
    expect(jumps).toEqual([]);
    expect(await page.locator("h1").count()).toBe(1);
  });

  test("deleting a course with linked data is blocked, not cascaded", async ({
    page,
  }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();

    // The seeded "E2E Test Course" (E2E101) always has at least one
    // assignment linked to it (see scripts/seed-e2e.mjs) — exactly the
    // fixture this test needs, with no setup of its own.
    const menu = await openActions(page, "E2E Test Course");
    await menu.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: /^Can.t delete/ }),
    ).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/still has/)).toBeVisible();
    // The blocking dialog only offers "Close" — no delete-anyway escape hatch.
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Close", exact: true }).click();
    // The dialog now animates closed instead of unmounting on the same
    // tick (docs/ANIMATION_SYSTEM.md) — without waiting for it, the
    // still-fading dialog's own "Can't delete "E2E Test Course"" heading
    // still matches this substring locator alongside the real page text.
    await expect(page.getByRole("dialog")).not.toBeVisible();
    // .first(): "E2E Test Course" can legitimately also appear in the
    // Course load summary's distribution caption, not just the card heading.
    await expect(page.getByText("E2E Test Course").first()).toBeVisible();
  });
});
