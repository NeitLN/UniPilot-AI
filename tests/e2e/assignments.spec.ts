import { test, expect } from "@playwright/test";

// UA-1 — Manage Assignments & Deadlines (FR-01, FR-02, FR-17, FR-18, FR-19).
test.describe("Manage assignments", () => {
  const title = `E2E Assignment ${Date.now()}`;

  test("create, edit, and archive an assignment", async ({ page }) => {
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

    // Create
    await page.getByRole("button", { name: "Add assignment", exact: true }).click();
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="courseId"]').selectOption({ index: 1 });
    await page.locator('input[name="dueAt"]').fill("2026-09-01T23:59");
    await page.locator('input[name="weight"]').fill("15");
    await page.locator('select[name="priority"]').selectOption("medium");
    await page
      .getByRole("button", { name: "Add assignment", exact: true })
      .last()
      .click();

    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Edit — bump priority to High and expect the "High priority" tag to appear.
    // Scoped to the row's own wrapper class (not just "div") since a plain
    // "div" filter matches every ancestor container too.
    const row = page.locator("div.border-t").filter({ hasText: title });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await page.locator('select[name="priority"]').selectOption("high");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    // Wait for the dialog to actually close before asserting on the list
    // behind it — clicking Save doesn't mean the server action has
    // resolved yet.
    await expect(page.getByRole("heading", { name: "Edit assignment" })).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(row.getByText("High priority")).toBeVisible();

    // Archive requires confirmation (BR-01)
    await row.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Archive assignment?" })).toBeVisible();
    await page.getByRole("button", { name: "Archive", exact: true }).last().click();

    await expect(page.getByText(title, { exact: true })).not.toBeVisible({ timeout: 10_000 });
  });
});
