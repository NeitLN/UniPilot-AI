import { test, expect, type Page } from "@playwright/test";

// Assignments redesign (UNIPILOT_ASSIGNMENTS_GENZ_DESIGN_BRIEF.md): every
// row's Edit/Archive/Restore/Delete now lives behind a single "⋯" menu
// (aria-label "Actions for {title}") at every breakpoint, not just mobile —
// these helpers keep every test below scoped to one row/dialog instead of
// relying on brittle DOM-order assumptions across the page's several
// "Add assignment" entry points (header + Quick actions).
function rowFor(page: Page, title: string) {
  return page.getByTestId("assignment-card").filter({ hasText: title });
}

async function createAssignment(
  page: Page,
  overrides: {
    title: string;
    priority?: "low" | "medium" | "high";
    repeat?: string;
    repeatUntil?: string;
  },
) {
  await page
    .getByRole("dialog", { name: "New assignment" })
    .waitFor({ state: "hidden" })
    .catch(() => {});
  await page.getByRole("button", { name: "Add assignment", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "New assignment" });
  await expect(dialog).toBeVisible();
  await dialog.locator('input[name="title"]').fill(overrides.title);
  await dialog.locator('select[name="courseId"]').selectOption({ index: 1 });
  await dialog.locator('input[name="dueAt"]').fill("2026-09-01T23:59");
  await dialog.locator('input[name="weight"]').fill("15");
  await dialog.locator('select[name="priority"]').selectOption(overrides.priority ?? "medium");
  if (overrides.repeat) {
    await dialog.locator('select[name="repeat"]').selectOption(overrides.repeat);
    await dialog.locator('input[name="repeatUntil"]').fill(overrides.repeatUntil ?? "2026-09-15");
  }
  await dialog.getByRole("button", { name: "Add assignment", exact: true }).click();
  // Not a plain page.getByText(title, {exact:true}): a recurring row's title
  // <p> also contains the "↻ Recurring assignment" marker as a child span,
  // so its full text content is "{title} ↻" — an exact match on the bare
  // title alone would never match that paragraph. rowFor's hasText is a
  // substring filter, so it works for both recurring and one-off titles.
  await expect(rowFor(page, overrides.title).first()).toBeVisible({ timeout: 20_000 });
}

async function openActions(page: Page, title: string) {
  // .first(): a recurring series creates several rows sharing the exact
  // same title (brief FR-24) — the earliest occurrence is the one whose
  // "Archive this and following" covers the rest of the series.
  await rowFor(page, title)
    .first()
    .getByRole("button", { name: `Actions for ${title}` })
    .click();
  const menu = page.getByRole("dialog").filter({ hasText: title });
  await expect(menu).toBeVisible();
  return menu;
}

// UA-1 — Manage Assignments & Deadlines (FR-01, FR-02, FR-17, FR-18, FR-19).
test.describe("Manage assignments", () => {
  const title = `E2E Assignment ${Date.now()}`;

  test("create, edit, and archive an assignment", async ({ page }) => {
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

    await createAssignment(page, { title });

    // Edit — bump priority to High and expect the single status/priority
    // badge to switch to "High priority".
    let menu = await openActions(page, title);
    await menu.getByRole("button", { name: "Edit", exact: true }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit assignment" });
    await editDialog.locator('select[name="priority"]').selectOption("high");
    await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(editDialog).not.toBeVisible({ timeout: 10_000 });
    await expect(rowFor(page, title).getByText("High priority")).toBeVisible();

    // Archive requires confirmation (BR-01)
    menu = await openActions(page, title);
    await menu.getByRole("button", { name: "Archive", exact: true }).click();
    const archiveDialog = page.getByRole("dialog", { name: "Archive assignment" });
    await expect(archiveDialog.getByRole("heading", { name: "Archive assignment?" })).toBeVisible();
    await archiveDialog.getByRole("button", { name: "Archive", exact: true }).click();

    // Scoped to the card itself, not a page-wide text search: an active
    // assignment's title can legitimately also appear in Pilo's pick card
    // (brief §6.4) while it's still active, so a bare page-wide
    // getByText(title) is ambiguous by design once that card exists.
    await expect(rowFor(page, title)).toHaveCount(0, { timeout: 10_000 });
  });
});

// FR-25 (docs/PRODUCT_REVIEW.md) — the last stop before an assignment is
// gone for good, only ever reachable from the Archived filter.
test.describe("Permanently delete an archived assignment", () => {
  const title = `E2E Archived ${Date.now()}`;

  test("archive then delete permanently — no 'Delete permanently' option while still active", async ({
    page,
  }) => {
    await page.goto("/assignments");
    await createAssignment(page, { title });

    // Never offered while still active — only archived rows can be
    // permanently deleted (enforced server-side too, see actions.ts).
    let menu = await openActions(page, title);
    await expect(menu.getByRole("button", { name: "Delete permanently" })).toHaveCount(0);
    await menu.getByRole("button", { name: "Archive", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Archive assignment" })
      .getByRole("button", { name: "Archive", exact: true })
      .click();
    // Scoped to the card (not a page-wide text search) — an active
    // assignment's title can legitimately also appear in Pilo's pick card
    // (brief §6.4), so a bare page-wide getByText(title) is ambiguous by
    // design once that card exists.
    await expect(rowFor(page, title)).toHaveCount(0, { timeout: 10_000 });

    // Searched, not just filtered. The archived list is paginated, and every
    // run of this suite leaves more archived rows behind — so "it is on page
    // one" quietly stops being true and the test starts failing for a reason
    // that has nothing to do with what it is checking.
    await page.goto(`/assignments?status=archived&q=${encodeURIComponent(title)}`);
    await expect(rowFor(page, title)).toBeVisible();

    menu = await openActions(page, title);
    await menu.getByRole("button", { name: "Delete permanently", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete permanently" });
    await expect(
      deleteDialog.getByRole("heading", { name: /^Delete /, exact: false }),
    ).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Delete permanently", exact: true }).click();

    // Scoped to the card (not a page-wide text search) — an active
    // assignment's title can legitimately also appear in Pilo's pick card
    // (brief §6.4), so a bare page-wide getByText(title) is ambiguous by
    // design once that card exists.
    await expect(rowFor(page, title)).toHaveCount(0, { timeout: 10_000 });
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
    await page.getByRole("button", { name: "Add assignment", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "New assignment" });
    await expect(dialog).toBeVisible();

    // Every required field left blank — a native `required` block would
    // just silently refuse to submit, leaving no error text on screen at all.
    await dialog.getByRole("button", { name: "Add assignment", exact: true }).click();

    await expect(dialog.getByRole("alert").first()).toBeVisible({ timeout: 10_000 });
    // Still on the form — nothing was saved, unlike a successful submit
    // which closes this dialog.
    await expect(dialog).toBeVisible();
  });
});

// FR-24 (docs/PRODUCT_REVIEW.md) — recurrence_group_id existed in the schema
// since migration 0010 but the UI never surfaced it: no badge, and
// archiving one occurrence of a series only ever touched that single row.
test.describe("FR-24: recurring assignments", () => {
  const title = `E2E Recurring ${Date.now()}`;

  test("every occurrence gets a Recurring marker, and 'Archive this and following' clears the whole remaining series", async ({
    page,
  }) => {
    await page.goto("/assignments");
    await createAssignment(page, {
      title,
      priority: "low",
      repeat: "weekly",
      repeatUntil: "2026-09-15",
    });

    const rows = page.getByTestId("assignment-card").filter({ hasText: title });
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('[aria-label="Recurring assignment"]')).toBeVisible();
    }

    // The earliest occurrence's "and following" covers the entire series.
    const menu = await openActions(page, title);
    await menu.getByRole("button", { name: "Archive", exact: true }).click();
    const archiveDialog = page.getByRole("dialog", { name: "Archive assignment" });
    await expect(archiveDialog.getByRole("heading", { name: "Archive assignment?" })).toBeVisible();
    await archiveDialog
      .getByRole("button", { name: "Archive this and following", exact: true })
      .click();

    await expect(page.getByTestId("assignment-card").filter({ hasText: title })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});

// Completion control (brief §6.3 anatomy) — the circular 44x44 toggle on
// each active card, distinct from the full Edit form's status <select>.
test.describe("Quick-complete toggle", () => {
  const title = `E2E Quick Complete ${Date.now()}`;

  test("checking the completion control marks the assignment Done and drops it from the active view", async ({
    page,
  }) => {
    await page.goto("/assignments");
    await createAssignment(page, { title });

    // The default "All tasks" view is active-only (not done, not archived —
    // must agree with the Dashboard's definition), so checking the
    // completion control correctly removes the card from view immediately,
    // not just re-labels it in place.
    const row = rowFor(page, title);
    await row.getByRole("button", { name: `Mark "${title}" as done` }).click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });

    // It reappears under the Completed segment, showing the Done badge and
    // an unchecking control.
    await page.getByRole("tab", { name: "Completed" }).click();
    const completedRow = rowFor(page, title);
    await expect(completedRow).toBeVisible({ timeout: 10_000 });
    await expect(completedRow.getByText("Done", { exact: true })).toBeVisible();
    await expect(
      completedRow.getByRole("button", { name: `Mark "${title}" as not done` }),
    ).toBeVisible();
  });
});

// UX-05 (docs/PRODUCT_REVIEW.md), updated for the redesign: the "⋯" Actions
// menu is now the only way to reach Edit at every breakpoint, not just a
// narrow one — this exercises it at the mobile width it was written for.
test.describe("UX-05: actions menu on a narrow viewport", () => {
  test("the Actions menu reaches Edit on a 390px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

    const title = `E2E Mobile Actions ${Date.now()}`;
    await createAssignment(page, { title });

    const menu = await openActions(page, title);
    await menu.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Edit assignment" })).toBeVisible();
  });
});
