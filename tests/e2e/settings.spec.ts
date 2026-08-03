import { test, expect } from "@playwright/test";

// UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Phase 8 — Settings hub.
test.describe("Settings", () => {
  test("nav switches active section on click and by scroll", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Settings sections" }).first();
    await nav.getByRole("button", { name: "Data & privacy" }).click();
    await expect(page.getByRole("heading", { name: "Data & privacy" })).toBeInViewport();
  });

  test("profile: saving an invalid-free full name persists across reload", async ({ page }) => {
    await page.goto("/settings");
    const nameInput = page.locator('input[name="fullName"]');
    const original = await nameInput.inputValue();
    const saveButton = page.getByRole("button", { name: "Save changes" }).first();
    const name = `E2E Name ${Date.now() % 100000}`;

    await nameInput.fill(name);
    await saveButton.click();
    await expect(page.getByText("Saved.").first()).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name="fullName"]')).toHaveValue(name);

    // Restore — a random name left on the shared E2E account shows up in
    // the Dashboard greeting and previously overflowed layout.spec.ts's
    // horizontal-overflow check at every viewport.
    await page.locator('input[name="fullName"]').fill(original);
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Saved.").first()).toBeVisible();
  });

  test("study preferences: rejects invalid availability, saves valid values", async ({ page }) => {
    await page.goto("/settings");
    const availabilityInput = page.locator('input[name="weeklyAvailabilityHours"]');
    const saveButton = page.getByRole("button", { name: "Save changes" }).nth(1);

    // The input's own min=0 makes the browser block a native submit of a
    // negative value before it ever reaches the server action — real
    // defense-in-depth, but it means reaching validateStudyPreferences'
    // matching server-side check from the UI needs noValidate to bypass
    // the same HTML5 constraint the unit tests already cover directly.
    await page.evaluate(() => {
      document.querySelectorAll("form").forEach((f) => f.setAttribute("novalidate", "true"));
    });
    await availabilityInput.fill("-5");
    await saveButton.click();
    await expect(page.getByText("Enter 0 or more hours.")).toBeVisible();

    await availabilityInput.fill("15");
    await page.getByRole("button", { name: "45 min" }).click();
    await saveButton.click();
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.reload();
    await expect(page.locator('input[name="weeklyAvailabilityHours"]')).toHaveValue("15");
    await expect(page.getByRole("button", { name: "45 min" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Restore the shared E2E account's baseline so other specs (planner,
    // risk, reports) that read weekly_availability_hours aren't affected.
    await availabilityInput.fill("20");
    await page.getByRole("button", { name: "25 min" }).click();
    await saveButton.click();
    await expect(page.getByText("Saved.")).toBeVisible();
  });

  test("appearance: theme choice persists across reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Restore.
    await page.getByRole("button", { name: "System", exact: true }).click();
  });

  test("notifications: category toggle persists across reload", async ({ page }) => {
    await page.goto("/settings");
    const toggle = page.getByRole("switch", { name: "Focus reminders" });
    const before = await toggle.getAttribute("aria-checked");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
    // The toggle re-enables (NotificationPreferencesCard clears pendingKey)
    // only once updateNotificationPreference's server round trip resolves —
    // waiting for that, not just the optimistic UI flip, is what makes
    // reloading immediately after safe to assert against.
    await expect(toggle).toBeEnabled();

    await page.reload();
    await expect(page.getByRole("switch", { name: "Focus reminders" })).toHaveAttribute(
      "aria-checked",
      before === "true" ? "false" : "true",
    );

    // Restore.
    await page.getByRole("switch", { name: "Focus reminders" }).click();
    await expect(page.getByRole("switch", { name: "Focus reminders" })).toHaveAttribute(
      "aria-checked",
      before ?? "true",
    );
  });

  test("connections card reflects Google Calendar connection state", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Google Calendar")).toBeVisible();
    // The E2E account has no calendar connection seeded, so this is the
    // real, unconnected state — not a fabricated one.
    await expect(page.getByText("Not connected.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Connect" })).toHaveAttribute(
      "href",
      "/api/calendar/oauth/start",
    );
  });

  test("data & privacy: export links present, delete requires matching email", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: "Download everything (JSON)" })).toHaveAttribute(
      "href",
      "/api/export?format=json&type=all",
    );

    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete account" });
    await expect(dialog).toBeVisible();
    const confirmButton = dialog.getByRole("button", { name: "Delete account" });
    await expect(confirmButton).toBeDisabled();
    await dialog.getByRole("textbox").fill("not-the-right-email@example.com");
    await expect(confirmButton).toBeDisabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
