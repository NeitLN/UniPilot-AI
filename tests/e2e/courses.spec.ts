import { test, expect } from "@playwright/test";

// FR-20 (docs/PRODUCT_REVIEW.md) — full course CRUD. Previously courses
// could only be created, never edited or deleted, despite assignments/
// grades/schedule all hanging off them.
test.describe("Manage courses", () => {
  const name = `E2E Course ${Date.now()}`;
  const semester = `E2E${Date.now() % 90000}`;

  test("create, edit, and delete a course with no linked data", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();

    // Create
    await page.getByRole("button", { name: "Add course", exact: true }).click();
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="credits"]').fill("3");
    await page.locator('input[name="semester"]').fill(semester);
    await page.getByRole("button", { name: "Add course", exact: true }).last().click();

    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });
    // Scoped to the heading, not getByText — the sidebar's SemesterLabel
    // shows whatever semester sorts as "current" and can coincidentally
    // pick up this same test semester once it exists as a course.
    await expect(page.getByRole("heading", { name: `Semester ${semester}` })).toBeVisible();

    // A freshly created course has no assignments/grades/classes yet.
    const row = page.locator("div.border-t").filter({ hasText: name });
    await expect(row.getByText("0 assignments · 0 grades · 0 classes")).toBeVisible();

    // Edit
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const newName = `${name} (renamed)`;
    await page.locator('input[name="name"]').fill(newName);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit course" })).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(newName, { exact: true })).toBeVisible();

    // Delete — no linked data, so this is a plain confirm, not a block.
    const renamedRow = page.locator("div.border-t").filter({ hasText: newName });
    await renamedRow.getByRole("button", { name: "Delete", exact: true }).click();
    // Heading uses curly quotes ("Delete "X"?"), not straight ones.
    await expect(page.getByRole("heading", { name: /^Delete / })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText(newName, { exact: true })).not.toBeVisible({ timeout: 10_000 });
  });

  test("deleting a course with linked data is blocked, not cascaded", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "Courses" })).toBeVisible();

    // The seeded "E2E Test Course" (E2E101) always has at least one
    // assignment linked to it (see scripts/seed-e2e.mjs) — exactly the
    // fixture this test needs, with no setup of its own.
    const row = page.locator("div.border-t").filter({ hasText: "E2E Test Course" });
    await row.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByRole("heading", { name: /^Can.t delete/ })).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/still has/)).toBeVisible();
    // The blocking dialog only offers "Close" — no delete-anyway escape hatch.
    await expect(page.getByRole("dialog").getByRole("button", { name: "Delete" })).toHaveCount(0);

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("E2E Test Course")).toBeVisible();
  });
});
