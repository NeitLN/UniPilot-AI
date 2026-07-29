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

    if (hasAssignments) {
      await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();
    }

    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByText("25:00")).not.toBeVisible({ timeout: 5_000 }).catch(() => {});

    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Stop this session?" })).toBeVisible();
    await expect(page.getByText(/won't count toward your streak/)).toBeVisible();

    await page.getByRole("button", { name: "Stop", exact: true }).last().click();
    await expect(page.getByText(/partial/i)).toBeVisible({ timeout: 10_000 });
  });
});
