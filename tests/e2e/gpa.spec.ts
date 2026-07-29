import { test, expect } from "@playwright/test";

// UA-5 — Track GPA & Academic Progress (FR-12, FR-13, FR-14, BR-05).
test.describe("Track GPA", () => {
  test("adding a grade recalculates GPA, and the forecast updates live", async ({ page }) => {
    await page.goto("/gpa");
    await expect(page.getByRole("heading", { name: "GPA tracker" })).toBeVisible();

    const semester = `E2E${Date.now() % 100000}`;
    await page.getByRole("button", { name: "Add grade", exact: true }).click();
    await page.locator('select[name="courseId"]').selectOption({ index: 1 });
    await page.locator('input[name="semester"]').fill(semester);
    await page.locator('input[name="gradePoint"]').fill("3.7");
    await page.locator('input[name="creditHours"]').fill("3");
    await page.getByRole("button", { name: "Add grade", exact: true }).last().click();

    await expect(page.getByText("Cumulative GPA: 3.70")).toBeVisible({ timeout: 10_000 });
    // Scoped to the breakdown table — the same semester text also appears
    // as a trend-chart axis label, which would otherwise be a second match.
    await expect(page.getByRole("cell", { name: semester })).toBeVisible();

    // Forecast (BR-05): required average recalculates from the new inputs.
    const targetInput = page.locator('input[type="number"]').first();
    await targetInput.fill("4");
    await targetInput.blur();
    // "Required average" is also a substring of the unreachable-forecast
    // message, so this can match twice — either is proof the card rendered.
    await expect(page.getByText("Required average").first()).toBeVisible();
  });
});
