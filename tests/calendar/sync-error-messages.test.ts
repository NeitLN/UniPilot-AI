import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The bug this pins: Google's raw OAuth error JSON reached the Schedule
 * page verbatim —
 *
 *   Google token refresh failed: { "error": "invalid_grant",
 *   "error_description": "Token has been expired or revoked." }
 *
 * — because `syncCalendarForUser`'s catch block stored `err.message`
 * directly into `last_sync_error`, which the UI renders unfiltered. This
 * covers the boundary between "what actually happened" (sent to the server
 * log via reportError) and "what a student is allowed to see" (a fixed
 * sentence, or GoogleTokenRevokedError's own message for the one case where
 * the fix is "reconnect" rather than "wait and retry").
 */

vi.mock("server-only", () => ({}));
vi.mock("./tokenCrypto", () => ({ decryptToken: (t: string) => t }));
vi.mock("@/lib/calendar/tokenCrypto", () => ({ decryptToken: (t: string) => t }));

const refreshAccessToken = vi.fn();
vi.mock("@/lib/calendar/oauth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar/oauth")>();
  return {
    ...actual,
    refreshAccessToken: (...a: unknown[]) => refreshAccessToken(...a),
  };
});

const reportError = vi.fn();
vi.mock("@/lib/observability/report", () => ({
  reportError: (...a: unknown[]) => reportError(...a),
}));

const { syncCalendarForUser } = await import("@/lib/calendar/sync");
const { GoogleTokenRevokedError } = await import("@/lib/calendar/oauth");

function makeClient(connectionRow: Record<string, unknown> | null) {
  const updates: { table: string; payload: Record<string, unknown> }[] = [];
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: connectionRow, error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        updates.push({ table, payload });
        return { eq: async () => ({ error: null }) };
      },
      upsert: async () => ({ error: null }),
    }),
    updates,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const CONNECTION = {
  refresh_token: "encrypted-refresh-token",
  access_token: null,
  access_token_expires_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("syncCalendarForUser — error messages shown to the user", () => {
  it("never stores Google's raw error body in last_sync_error", async () => {
    refreshAccessToken.mockRejectedValue(
      new Error('Google token refresh failed: {"error":"server_error"}'),
    );
    const client = makeClient(CONNECTION);

    const result = await syncCalendarForUser(client, "u1");

    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "sync_error") {
      expect(result.message).not.toContain('"error"');
      expect(result.message).not.toContain("server_error");
    }
    const write = client.updates.find(
      (u: { table: string }) => u.table === "google_calendar_connections",
    );
    expect(write.payload.last_sync_error).not.toContain("server_error");
  });

  it("sends the real detail to reportError so it is still debuggable server-side", async () => {
    const original = new Error('Google token refresh failed: {"error":"server_error"}');
    refreshAccessToken.mockRejectedValue(original);
    const client = makeClient(CONNECTION);

    await syncCalendarForUser(client, "u1");

    expect(reportError).toHaveBeenCalledWith(
      original,
      expect.objectContaining({ source: "calendar.sync", userId: "u1" }),
    );
  });

  it("tells the student to reconnect on a revoked token, not a generic retry message", async () => {
    refreshAccessToken.mockRejectedValue(new GoogleTokenRevokedError());
    const client = makeClient(CONNECTION);

    const result = await syncCalendarForUser(client, "u1");

    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "sync_error") {
      expect(result.message).toBe(
        "Google Calendar access was disconnected. Reconnect to keep syncing.",
      );
    }
  });

  it("does not call reportError for a revoked token — it is expected, not a bug to investigate", async () => {
    refreshAccessToken.mockRejectedValue(new GoogleTokenRevokedError());
    const client = makeClient(CONNECTION);

    await syncCalendarForUser(client, "u1");

    expect(reportError).not.toHaveBeenCalled();
  });
});
