import { test, expect } from "@playwright/test";

// FR-26 (docs/PRODUCT_REVIEW.md) — weekly summary report.
test.describe("Weekly report", () => {
  test("renders the report page with headline stats or its empty state", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Weekly report", exact: true })).toBeVisible();

    // Whichever branch the E2E account's current data lands in, one of
    // these two must be true — never a blank/broken page.
    // "Study time", not "Completed": the latter is also the per-row label on
    // each completed-assignment row, so it resolves to several nodes and the
    // strict-mode error was being swallowed by the catch below into a false.
    const hasStats = await page
      .getByText("Study time", { exact: true })
      .isVisible()
      .catch(() => false);
    const isEmpty = await page
      .getByText("Nothing to report yet", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasStats || isEmpty).toBe(true);
  });

  // A11y: the hero's motivational headline used to be an <h1> of its own,
  // so the page shipped two. A screen-reader user navigating by heading
  // hears two competing page titles and no section under either.
  test("has exactly one h1 and a gap-free heading outline", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "Weekly report", exact: true })).toBeVisible();

    expect(await page.locator("h1").count()).toBe(1);

    const jumps = await page.evaluate(() => {
      const bad: string[] = [];
      let prev = 0;
      document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
        const level = Number(h.tagName[1]);
        if (prev && level > prev + 1) bad.push(`h${prev} -> h${level}: ${h.textContent?.trim()}`);
        prev = level;
      });
      return bad;
    });
    expect(jumps).toEqual([]);
  });

  test("is reachable from the Dashboard", async ({ page }) => {
    await page.goto("/");
    // The Dashboard's "See your weekly report" teaser card was removed in the
    // dashboard redesign; the sidebar entry is now the route's only
    // navigation affordance, so that's what reachability means here.
    await page.getByRole("link", { name: "Weekly report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Weekly report", exact: true })).toBeVisible();
  });
});
