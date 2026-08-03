import { test, expect } from "@playwright/test";

// UA-6 — Review Workload-Risk Warning (FR-15, FR-16, BR-06). The E2E account
// is seeded with availability, a pending assignment, and 7+ days of
// completed focus history, so the score should actually compute here rather
// than showing the "not enough data" gate.
test.describe("Review workload-risk warning", () => {
  test("shows a computed score with its three weighted factors", async ({ page }) => {
    await page.goto("/risk");
    await expect(page.getByRole("heading", { name: "Workload risk" })).toBeVisible();
    await expect(page.getByText(/not a medical or psychological/)).toBeVisible();

    const insufficientData = page.getByText("Not enough data yet");
    if (await insufficientData.isVisible().catch(() => false)) {
      test.skip(true, "Seed data was reset — rerun scripts/_seed_e2e (see tests/e2e/README).");
    }

    // Redesign (UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 6): the
    // score's range now shows as a pill ("Above threshold"/"Within a
    // healthy range") on RiskBalanceHero, not a "Warning threshold: 60" line.
    await expect(page.getByText(/Above threshold|Within a healthy range/)).toBeVisible();
    await expect(page.getByText("Workload ×0.40")).toBeVisible();
    await expect(page.getByText("Overdue ×0.35")).toBeVisible();
    await expect(page.getByText("Focus ×0.25")).toBeVisible();
  });
});
