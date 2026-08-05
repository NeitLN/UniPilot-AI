import { test, expect } from "@playwright/test";

/**
 * GAP-001 — password reset had no coverage. Getting locked out is the one
 * failure a student cannot work around, and the flow's security property is
 * subtle enough to regress quietly: the response must be identical whether
 * or not the address has an account, or the form becomes an account
 * enumeration oracle (FR-21 AC-3).
 *
 * No mail is sent by these: Supabase sends nothing for an address with no
 * account, and the one registered address is never submitted here.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/** Next.js renders its own `role="alert"` route announcer on every page, so
 * asking for the role alone matches two elements. */
const formAlert = (page: import("@playwright/test").Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)');

test.describe("Forgot password", () => {
  test("is reachable from the sign-in form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  });

  test("requires an email", async ({ page }) => {
    await page.goto("/forgot-password");
    // The field is `required`, so reach the server action the way a
    // scripted client would rather than trusting the browser to stop it.
    await page
      .getByLabel("Email")
      .evaluate((el: HTMLInputElement) => el.removeAttribute("required"));
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(formAlert(page)).toContainText("Enter your email");
  });

  test("gives the same answer for an address with no account", async ({ page }) => {
    // The anti-enumeration guarantee. If this ever starts saying "no such
    // user", the form tells an attacker which addresses are registered.
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@unipilot.local`);
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByText(/If that email has an account/i)).toBeVisible({ timeout: 15_000 });
    // No hint either way about whether the address exists.
    await expect(page.getByText(/not found|no account|doesn't exist/i)).toHaveCount(0);
  });

  test("offers a way back to sign in", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Reset password page", () => {
  test("is reachable directly and asks for a new password", async ({ page }) => {
    // Reached from the emailed link via /auth/confirm. Without a recovery
    // session it must still render rather than erroring — the user arriving
    // here with an expired link needs to be told, not shown a stack trace.
    await page.goto("/reset-password");
    await expect(page.locator("h1")).toBeVisible();
  });
});
