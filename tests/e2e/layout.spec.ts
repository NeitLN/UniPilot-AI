import { test, expect } from "@playwright/test";

// Regression coverage for two P0 layout defects found during the
// docs/PRODUCT_REVIEW.md audit (QA-01, QA-02). Neither was caught by the
// existing unit tests (which only cover lib/rules/*, not rendered DOM
// geometry) or the E2E suite (which asserted on visible text, not
// measured element sizes) — these tests assert on actual
// getBoundingClientRect() output specifically so a future regression in
// either bug's class (flex silently shrinking content, a <select> forcing
// a sibling input to collapse) fails a test instead of shipping unnoticed.

const ROUTES = ["/", "/assignments", "/planner", "/schedule", "/focus", "/gpa", "/risk", "/settings"];

test.describe("Layout regressions (docs/PRODUCT_REVIEW.md)", () => {
  // QA-01 — GPA trend bars used to all render at the same height regardless
  // of GPA, because the per-bar column's fixed height didn't reserve room
  // for the value label above the bar, so flexbox silently clamped every
  // bar to the same leftover space.
  test("QA-01: GPA trend bars render at different heights for different GPAs", async ({ page }) => {
    await page.goto("/gpa");
    await expect(page.getByRole("heading", { name: "GPA tracker" })).toBeVisible();

    const semesterLow = `E2E${Date.now() % 90000}A`;
    const semesterHigh = `E2E${Date.now() % 90000}B`;

    for (const [semester, gradePoint] of [
      [semesterLow, "2.0"],
      [semesterHigh, "4.0"],
    ] as const) {
      await page.getByRole("button", { name: "Add grade", exact: true }).click();
      await page.locator('select[name="courseId"]').selectOption({ index: 1 });
      await page.locator('input[name="semester"]').fill(semester);
      await page.locator('input[name="gradePoint"]').fill(gradePoint);
      await page.locator('input[name="creditHours"]').fill("3");
      await page.getByRole("button", { name: "Add grade", exact: true }).last().click();
      await expect(page.getByRole("cell", { name: semester })).toBeVisible({ timeout: 10_000 });
    }

    // Bars are the violet, rounded-top fill divs inside the trend chart —
    // read their *rendered* height, not the inline style value, since the
    // whole point of the bug was those two disagreeing.
    const heights = await page.locator('div.bg-violet[class*="rounded-t"]').evaluateAll(
      (els) => els.map((el) => el.getBoundingClientRect().height),
    );
    expect(heights.length).toBeGreaterThanOrEqual(2);

    const distinctHeights = new Set(heights.map((h) => Math.round(h)));
    expect(
      distinctHeights.size,
      `expected bars for different GPAs to render at different heights, got: ${heights.join(", ")}`,
    ).toBeGreaterThan(1);

    // Clean up both grades — left in place, they're exactly the kind of
    // accumulating test-only semester row that previously overflowed the
    // trend chart at mobile widths (9 stray rows found and removed while
    // writing this test).
    for (const semester of [semesterLow, semesterHigh]) {
      const row = page.locator("tr").filter({ hasText: semester });
      await row.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.getByRole("cell", { name: semester })).not.toBeVisible({ timeout: 10_000 });
    }
  });

  // QA-02 — the course/status <select> elements take their intrinsic width
  // from their longest option and refuse to shrink, so a plain flex-1
  // search input got squeezed to ~36-49px below desktop widths.
  for (const width of [390, 768, 1280]) {
    test(`QA-02: assignment search stays usable at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/assignments");
      await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

      const box = await page.getByLabel("Search assignments").boundingBox();
      expect(box).not.toBeNull();
      expect(
        box!.width,
        `search input is only ${box!.width}px wide at ${width}px viewport`,
      ).toBeGreaterThanOrEqual(200);
    });
  }

  test("no route overflows horizontally at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflowing = await page.evaluate(() => {
        const de = document.documentElement;
        return de.scrollWidth > de.clientWidth + 1;
      });
      expect(overflowing, `${route} overflows horizontally at 390px`).toBe(false);
    }
  });
});
