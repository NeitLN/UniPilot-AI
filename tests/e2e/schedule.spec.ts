import { test, expect } from "@playwright/test";

// UA-3 — View Class Schedule (FR-07, FR-08, BR-03).
test.describe("View class schedule", () => {
  test("switches between Day, Week, and Month views", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();

    for (const label of ["Day", "Month", "Week"] as const) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`view=${label.toLowerCase()}`));
    }

    // Last-sync status is always shown, connected or not (BR-03) — match
    // whichever state applies rather than the ambiguous "Google Calendar"
    // substring, which now appears both as the status card's own title and
    // in the header's "Sync Google Calendar" action.
    await expect(
      page.getByText(/Not connected yet|Last synced|Last sync failed|not synced yet/).first(),
    ).toBeVisible();
  });
});
