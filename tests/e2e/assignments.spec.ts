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

// FR-25 (docs/PRODUCT_REVIEW.md) — the last stop before an assignment is
// gone for good, only ever reachable from the Archived filter.
test.describe("Permanently delete an archived assignment", () => {
  const title = `E2E Archived ${Date.now()}`;

  test("archive then delete permanently — no 'Delete permanently' button while still active", async ({
    page,
  }) => {
    await page.goto("/assignments");
    await page.getByRole("button", { name: "Add assignment", exact: true }).click();
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="courseId"]').selectOption({ index: 1 });
    await page.locator('input[name="dueAt"]').fill("2026-09-01T23:59");
    await page.locator('input[name="weight"]').fill("15");
    await page.locator('select[name="priority"]').selectOption("medium");
    await page.getByRole("button", { name: "Add assignment", exact: true }).last().click();
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Never offered while still active — only archived rows can be
    // permanently deleted (enforced server-side too, see actions.ts).
    const activeRow = page.locator("div.border-t").filter({ hasText: title });
    await expect(activeRow.getByRole("button", { name: "Delete permanently" })).toHaveCount(0);

    await activeRow.getByRole("button", { name: "Archive", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText(title, { exact: true })).not.toBeVisible({ timeout: 10_000 });

    await page.goto("/assignments?status=archived");
    const archivedRow = page.locator("div.border-t").filter({ hasText: title });
    await expect(archivedRow).toBeVisible();

    await archivedRow.getByRole("button", { name: "Delete permanently", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^Delete /, exact: false })).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete permanently", exact: true })
      .click();

    await expect(page.getByText(title, { exact: true })).not.toBeVisible({ timeout: 10_000 });
  });
});

// QA-03 (docs/PRODUCT_REVIEW.md) — validateAssignment's errors used to never
// run at all when a required field was left blank, because the browser's
// own `required` attribute blocked the form from submitting before the
// server action (which is where validateAssignment actually lives) ever
// saw the request.
test.describe("QA-03: app-level validation, not a silent native block", () => {
  test("submitting an empty assignment form surfaces the app's own error", async ({ page }) => {
    await page.goto("/assignments");
    await page.getByRole("button", { name: "Add assignment", exact: true }).click();
    await expect(page.getByRole("heading", { name: "New assignment" })).toBeVisible();

    // Every required field left blank — a native `required` block would
    // just silently refuse to submit, leaving no error text on screen at all.
    await page.getByRole("button", { name: "Add assignment", exact: true }).last().click();

    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 10_000 });
    // Still on the form — nothing was saved, unlike a successful submit
    // which closes this dialog.
    await expect(page.getByRole("heading", { name: "New assignment" })).toBeVisible();
  });
});

// FR-24 (docs/PRODUCT_REVIEW.md) — recurrence_group_id existed in the schema
// since migration 0010 but the UI never surfaced it: no badge, and
// archiving one occurrence of a series only ever touched that single row.
test.describe("FR-24: recurring assignments", () => {
  const title = `E2E Recurring ${Date.now()}`;

  test("every occurrence gets a Recurring badge, and 'Archive this and following' clears the whole remaining series", async ({
    page,
  }) => {
    await page.goto("/assignments");
    await page.getByRole("button", { name: "Add assignment", exact: true }).click();
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="courseId"]').selectOption({ index: 1 });
    await page.locator('input[name="dueAt"]').fill("2026-09-01T23:59");
    await page.locator('input[name="weight"]').fill("10");
    await page.locator('select[name="priority"]').selectOption("low");
    await page.locator('select[name="repeat"]').selectOption("weekly");
    await page.locator('input[name="repeatUntil"]').fill("2026-09-15");
    await page.getByRole("button", { name: "Add assignment", exact: true }).last().click();

    const rows = page.locator("div.border-t").filter({ hasText: title });
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).getByText("Recurring", { exact: true })).toBeVisible();
    }

    // The earliest occurrence's "and following" covers the entire series.
    await rows.first().getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Archive assignment?" })).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Archive this and following", exact: true })
      .click();

    await expect(page.locator("div.border-t").filter({ hasText: title })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

// UX-05 (docs/PRODUCT_REVIEW.md) — the always-visible 2-button row is
// desktop-only below sm; a single 44x44 "Actions" trigger opens the same
// actions from a compact list on a narrow viewport instead.
test.describe("UX-05: mobile actions menu", () => {
  test("the collapsed Actions menu reaches Edit on a 390px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

    // Scoped through #main-content — a plain "div.border-t" also matches
    // the sidebar's user footer, which is hidden below md and would
    // otherwise win .first() by DOM order.
    const anyRow = page.locator("#main-content div.border-t").first();
    await expect(anyRow).toBeVisible();

    await anyRow.getByRole("button", { name: "Actions", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Actions" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit assignment" })).toBeVisible();
  });
});
