import { test, expect } from "@playwright/test";

/**
 * GAP-001 — sign-up had no coverage at all. It is the first thing every new
 * student touches, it sits before every tested flow, and a break in it is
 * invisible to a suite that starts from an account that already exists.
 *
 * Deliberately creates no accounts. Two reasons, both learned by running it:
 * the Supabase project rejects throwaway domains outright ("Email address is
 * invalid"), and it rate-limits sign-up mail per project, so a spec that
 * registers a user is flaky and leaves rows behind in a database shared with
 * a real account. What is worth pinning is the contract — validation, and
 * that a sign-up which creates no session says so instead of bouncing the
 * user silently back to this form.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/** Next.js renders its own `role="alert"` route announcer on every page, so
 * asking for the role alone matches two elements. The form's own messages
 * are the ones with text in them. */
const formAlert = (page: import("@playwright/test").Page) =>
  page.locator('[role="alert"]:not(#__next-route-announcer__)');

test.describe("Sign up", () => {
  test("switching to Sign up changes the submit action", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("rejects a password below the minimum, server-side", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.getByLabel("Email").fill(`nobody-${Date.now()}@unipilot.local`);
    // 7 characters. `minLength` also guards this in the browser, so the
    // native check is removed to reach the server action — client-side
    // validation is not what protects the database.
    await page.getByLabel("Password").fill("short12");
    await page
      .getByLabel("Password")
      .evaluate((el: HTMLInputElement) => el.removeAttribute("minlength"));
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(formAlert(page)).toContainText("at least 8 characters");
    // Still on the form — a rejected sign-up must not navigate anywhere.
    await expect(page).toHaveURL(/\/login/);
  });

  test("requires both fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    for (const field of ["Email", "Password"]) {
      await page
        .getByLabel(field, { exact: true })
        .evaluate((el: HTMLInputElement) => el.removeAttribute("required"));
    }
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(formAlert(page)).toContainText("Enter both email and password");
  });

  test("explains itself when sign-up creates no session, instead of bouncing silently", async ({
    page,
  }) => {
    // Signing up with an address that already has an account returns *no
    // error*, no session, and `identities: []` — Supabase answering
    // identically for registered and unregistered addresses so the form
    // cannot be used to discover who has an account.
    //
    // The action used to check only `error`, so this redirected to "/", the
    // proxy found no session, and the student landed back on the login form
    // with nothing said. Verified against the live project.
    const existing = process.env.E2E_EMAIL;
    test.skip(!existing, "E2E_EMAIL not configured");

    await page.goto("/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.getByLabel("Email").fill(existing!);
    await page.getByLabel("Password").fill("definitely-not-the-real-password-9");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("status")).toContainText(/Check your email/i, {
      timeout: 15_000,
    });
    // Never a session for an account this password does not open.
    await expect(page).toHaveURL(/\/login/);
    // And the wording must not reveal that this address is registered.
    await expect(page.getByText(/already registered|account exists|taken/i)).toHaveCount(0);
  });
});
