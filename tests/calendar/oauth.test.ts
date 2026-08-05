import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Production surfaced Google's raw OAuth error JSON directly on the
 * Schedule page — twice, once from SyncStatusBar and once from
 * SyncCalendarButton, both reading the same unclassified `err.message`:
 *
 *   Google token refresh failed: { "error": "invalid_grant",
 *   "error_description": "Token has been expired or revoked." }
 *
 * `refreshAccessToken` is where that string first gets created, so this is
 * where the classification has to happen — everything downstream (sync.ts,
 * push.ts) just decides what to do with the result.
 */

vi.mock("server-only", () => ({}));
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("GOOGLE_REDIRECT_URI", "https://example.com/callback");

const { refreshAccessToken, GoogleTokenRevokedError } = await import("@/lib/calendar/oauth");

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshAccessToken", () => {
  it("throws GoogleTokenRevokedError on invalid_grant, not a generic error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () =>
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Token has been expired or revoked.",
          }),
      })),
    );

    await expect(refreshAccessToken("stale-token")).rejects.toBeInstanceOf(GoogleTokenRevokedError);
  });

  it("gives GoogleTokenRevokedError a message written for a person, not Google's JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => JSON.stringify({ error: "invalid_grant" }),
      })),
    );

    await expect(refreshAccessToken("stale-token")).rejects.toThrow(
      "Google Calendar access was disconnected. Reconnect to keep syncing.",
    );
  });

  it("does not misclassify a different error as a revocation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => JSON.stringify({ error: "invalid_client" }),
      })),
    );

    const err = await refreshAccessToken("stale-token").catch((e) => e);
    expect(err).not.toBeInstanceOf(GoogleTokenRevokedError);
  });

  it("still surfaces detail for every other failure — nobody can debug an empty message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => JSON.stringify({ error: "server_error" }),
      })),
    );

    await expect(refreshAccessToken("stale-token")).rejects.toThrow(/server_error/);
  });

  it("does not crash on a non-JSON error body", async () => {
    // Google's endpoints are documented to return JSON errors, but a proxy,
    // a 502 page, or an outage can hand back plain text instead.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => "<html>502 Bad Gateway</html>",
      })),
    );

    await expect(refreshAccessToken("stale-token")).rejects.toThrow(/502 Bad Gateway/);
  });

  it("resolves normally when Google accepts the refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 3600,
          scope: "calendar.events",
          token_type: "Bearer",
        }),
      })),
    );

    await expect(refreshAccessToken("valid-token")).resolves.toMatchObject({
      access_token: "new-token",
    });
  });
});
