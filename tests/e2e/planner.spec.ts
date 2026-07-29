import { test, expect } from "@playwright/test";

// UA-2 — AI Study Planning (FR-04, FR-05, FR-06, BR-02). Cancels the draft at
// the end so repeated runs never leave a confirmed plan behind.
test.describe("AI study planning", () => {
  test("generate a draft, see it rendered, then cancel it", async ({ page }) => {
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: "AI planner" })).toBeVisible();

    const generateButton = page.getByRole("button", { name: /Generate|Regenerate/ });
    await expect(generateButton).toBeEnabled({ timeout: 10_000 });
    await generateButton.click();

    // Gemini can take a few seconds — TC-03/NFR-02 allow up to 15s before Retry.
    await expect(page.getByText(/Scheduled \d+ session/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("Draft", { exact: true })).not.toBeVisible({ timeout: 10_000 });
  });
});
