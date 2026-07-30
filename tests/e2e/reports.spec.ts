import { test, expect } from "@playwright/test";

// FR-26 (docs/PRODUCT_REVIEW.md) — weekly summary report.
test.describe("Weekly report", () => {
  test("renders the report page with headline stats or its empty state", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Weekly report", exact: true })).toBeVisible();

    // Whichever branch the E2E account's current data lands in, one of
    // these two must be true — never a blank/broken page.
    const hasStats = await page.getByText("Completed", { exact: true }).isVisible().catch(() => false);
    const isEmpty = await page
      .getByText("Nothing to report yet", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasStats || isEmpty).toBe(true);
  });

  test("is reachable from the Dashboard teaser link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See your weekly report" }).click();
    await expect(page.getByRole("heading", { name: "Weekly report", exact: true })).toBeVisible();
  });
});
