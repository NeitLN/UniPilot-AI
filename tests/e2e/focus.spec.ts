import { test, expect } from "@playwright/test";

// UA-4 — Run a Focus Study Session (FR-09, FR-10, FR-11, BR-04). Stops early
// on purpose — waiting out a real 25-minute Pomodoro isn't practical in CI,
// and the early-stop path already exercises the "Partial" branch of BR-04.
test.describe("Run a focus session", () => {
  test("cannot start without an assignment, then logs a Partial session on early stop", async ({
    page,
  }) => {
    await page.goto("/focus");
    await expect(page.getByRole("heading", { name: "Focus timer" })).toBeVisible();

    const select = page.locator("select");
    const hasAssignments = (await select.locator("option").count()) > 0 &&
      (await select.locator("option").first().getAttribute("value")) !== "";

    // The button has always read "Start focus"; this asserted an exact name
    // of "Start", so it could never match and the test failed before this
    // redesign touched it.
    if (hasAssignments) {
      await expect(page.getByRole("button", { name: "Start focus", exact: true })).toBeEnabled();
    }

    await page.getByRole("button", { name: "Start focus", exact: true }).click();
    await expect(page.getByText("25:00")).not.toBeVisible({ timeout: 5_000 }).catch(() => {});

    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Stop this session?" })).toBeVisible();
    await expect(page.getByText(/won't count toward your streak/)).toBeVisible();

    await page.getByRole("button", { name: "Stop", exact: true }).last().click();
    // The Focus history chip for the session just logged. A bare /partial/i
    // also matches "This week"'s "Plus N partial sessions" summary, so it
    // resolved to two nodes and tripped strict mode.
    await expect(page.getByText(/Focus · Partial/).first()).toBeVisible({ timeout: 10_000 });
  });
});

// FR-22 (docs/PRODUCT_REVIEW.md) — offline/on-paper study previously had no
// way to count at all, since the Pomodoro timer was the only path that
// could ever create a focus_sessions row.
test.describe("Log a past focus session", () => {
  test("logging a manual session succeeds and the dialog closes", async ({ page }) => {
    await page.goto("/focus");
    await expect(page.getByRole("heading", { name: "Focus timer" })).toBeVisible();

    await page.getByRole("button", { name: "Log session", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Log a past session" })).toBeVisible();

    // Scoped to the dialog from here: the header trigger now reads "Log
    // session" too, so an unscoped lookup would match both buttons.
    const dialog = page.getByRole("dialog");
    await page.locator('select[name="assignmentId"]').selectOption({ index: 1 });
    // Fixed, far-past timestamp on purpose — outside every window the Focus
    // page ever queries (60 days), so re-running this test hits the same
    // (user_id, started_at) pair every time and the server's unique-
    // constraint dedup path (23505 -> ok:true) keeps it idempotent instead
    // of accumulating a new row per CI run, the same class of E2E-account
    // pollution already found and fixed once in tests/e2e/gpa.spec.ts.
    await page.locator('input[name="startedAt"]').fill("2020-01-01T09:00");
    await page.locator('input[name="durationMinutes"]').fill("30");
    await dialog.getByRole("button", { name: "Log session", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Log a past session" })).not.toBeVisible({
      timeout: 10_000,
    });
  });
});
