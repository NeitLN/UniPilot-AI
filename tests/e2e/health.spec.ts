import { test, expect } from "@playwright/test";

/**
 * DEVOPS-02 — the probe has to work for a caller with no session, which is
 * the whole point and also the easy thing to get wrong: SR-01 was exactly
 * this bug on the cron route, where the auth redirect fired before the
 * handler ever ran. A monitor hitting a 307 to /login gets a 200 back and
 * reports the app healthy through a complete outage.
 */
test.describe("Health endpoint", () => {
  // storageState is cleared so this runs as an anonymous monitor would.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("answers unauthenticated, without redirecting to login", async ({ request }) => {
    const res = await request.get("/api/health");

    expect(res.status()).toBe(200);
    expect(new URL(res.url()).pathname).toBe("/api/health");
    expect(res.headers()["cache-control"]).toContain("no-store");

    const body = await res.json();
    expect(body.status).toBe("ok");
    // A real round trip, not a static 200 — a hardcoded response would stay
    // green through a database outage.
    expect(body.checks.database.ok).toBe(true);
    expect(typeof body.checks.database.latencyMs).toBe("number");
    expect(body).toHaveProperty("revision");
  });
});
