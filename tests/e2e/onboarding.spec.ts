import { test, expect } from "@playwright/test";

/**
 * GAP-001 — onboarding had no coverage. Every new account passes through it
 * before reaching any tested screen, and the whole suite starts from an
 * account that finished it long ago, so a break here would never surface.
 *
 * These deliberately stop short of completing the wizard: finishing it
 * creates a course and an assignment inside the shared E2E account on every
 * run. What is worth pinning anyway is the gating — that a step refuses to
 * advance on bad input — which is where a silent regression would strand a
 * new student on step one.
 */
test.describe("Onboarding", () => {
  test("opens on step 1 of 3 and explains why the number is being asked for", async ({ page }) => {
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: /How much time can you study each week/i }),
    ).toBeVisible();

    // Three step markers, so the length of the flow is knowable up front
    // rather than discovered one screen at a time.
    //
    // Only the *numbers* are rendered. `STEPS` in OnboardingWizard.tsx holds
    // "Availability" / "Course" / "First task" but uses them solely as React
    // keys, so a new student sees three anonymous dots and cannot tell what
    // is coming. Asserted as-is here rather than to the intent, so this test
    // describes the product that exists.
    await expect(page.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByText("2", { exact: true })).toBeVisible();
    await expect(page.getByText("3", { exact: true })).toBeVisible();

    // Says what the field unlocks. Asking for a number with no reason given
    // is the single biggest drop-off risk identified in the UX pass.
    await expect(page.getByText(/AI Planner|Workload Risk/i).first()).toBeVisible();
  });

  test("refuses a negative availability instead of advancing", async ({ page }) => {
    await page.goto("/onboarding");

    const hours = page.getByLabel(/Weekly availability/i);
    await hours.fill("-5");
    // `min={0}` stops the browser first; the server action is what actually
    // has to hold, so bypass the native guard to reach it.
    await hours.evaluate((el: HTMLInputElement) => el.removeAttribute("min"));
    await page.getByRole("button", { name: "Continue" }).click();

    // Still on step 1 — an invalid value must not carry the user forward.
    await expect(
      page.getByRole("heading", { name: /How much time can you study each week/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /course/i })).toHaveCount(0);
  });

  test("keeps the step 1 form usable after a rejected submit", async ({ page }) => {
    await page.goto("/onboarding");

    const hours = page.getByLabel(/Weekly availability/i);
    await hours.evaluate((el: HTMLInputElement) => el.removeAttribute("min"));
    await hours.fill("-1");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(1200);

    // The field is still editable and the button still live: a rejected
    // submit must not leave the wizard in a stuck pending state.
    await expect(hours).toBeEditable();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});
