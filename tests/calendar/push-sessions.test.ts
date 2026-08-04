import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * PERF-02 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — pushConfirmedSessionsToCalendar
 * waited for a database round trip between every Google Calendar insert.
 *
 * It cannot be batched into a single UPDATE the way the notification sweep
 * was: every session gets a *different* gcal_event_id back from Google, so
 * there is no shared value to write with one `in(ids)` statement.
 *
 * Deferring every write until after the loop would batch it, but that trades
 * away crash safety. Today a crash mid-loop orphans at most one Google event;
 * with the writes deferred it would orphan all of them, and the retry would
 * duplicate every event instead of one. So each write is still dispatched
 * immediately after its own insert — it just is not awaited before the next
 * insert starts, and all of them are awaited together at the end.
 *
 * These tests pin both halves of that: the pairing must stay correct, and the
 * inserts must not serialise behind the writes again.
 */

const getFreshAccessToken = vi.fn();
vi.mock("@/lib/calendar/sync", () => ({
  getFreshAccessToken: (...a: unknown[]) => getFreshAccessToken(...a),
}));
vi.mock("server-only", () => ({}));

const { pushConfirmedSessionsToCalendar } = await import("@/lib/calendar/push");

interface Written {
  id: string;
  gcalEventId: string;
}

function makeClient(sessions: { id: string; start_at: string; end_at: string; assignment_id: string | null }[]) {
  const written: Written[] = [];
  /** Resolves the pending update promises on demand, so a test can hold them
   * open and observe whether the inserts kept going. */
  const gates: (() => void)[] = [];

  function builder(table: string) {
    let staged: { gcal_event_id?: string } | null = null;
    const chain: Record<string, unknown> = {
      select: () => chain,
      is: () => chain,
      in: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: () =>
        Promise.resolve({
          data: { refresh_token: "r", access_token: "a", access_token_expires_at: null },
          error: null,
        }),
      update: (payload: { gcal_event_id?: string }) => {
        staged = payload;
        return chain;
      },
      eq: (_col: string, value: string) => {
        if (staged) {
          const gcalEventId = staged.gcal_event_id!;
          return new Promise((resolve) => {
            gates.push(() => {
              written.push({ id: value, gcalEventId });
              resolve({ data: null, error: null });
            });
          });
        }
        return chain;
      },
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: table === "study_sessions" ? sessions : [], error: null }),
    };
    return chain;
  }

  return { from: (t: string) => builder(t), written, gates };
}

const SESSIONS = [
  { id: "s1", start_at: "2026-08-10T09:00:00.000Z", end_at: "2026-08-10T10:00:00.000Z", assignment_id: null },
  { id: "s2", start_at: "2026-08-11T09:00:00.000Z", end_at: "2026-08-11T10:00:00.000Z", assignment_id: null },
  { id: "s3", start_at: "2026-08-12T09:00:00.000Z", end_at: "2026-08-12T10:00:00.000Z", assignment_id: null },
];

let insertCount = 0;

beforeEach(() => {
  vi.clearAllMocks();
  insertCount = 0;
  getFreshAccessToken.mockResolvedValue("token-123");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      insertCount += 1;
      return {
        ok: true,
        json: async () => ({ id: `gcal-${insertCount}` }),
        text: async () => "",
      };
    }),
  );
});

describe("pushConfirmedSessionsToCalendar", () => {
  it("writes each session its own event id", async () => {
    const client = makeClient(SESSIONS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promise = pushConfirmedSessionsToCalendar(client as any, "u1", "p1");

    // Let the loop run, then release the writes.
    await vi.waitFor(() => expect(client.gates).toHaveLength(3));
    client.gates.forEach((release) => release());

    expect(await promise).toEqual({ ok: true, pushed: 3 });
    expect(client.written).toEqual([
      { id: "s1", gcalEventId: "gcal-1" },
      { id: "s2", gcalEventId: "gcal-2" },
      { id: "s3", gcalEventId: "gcal-3" },
    ]);
  });

  it("does not wait for a write before starting the next insert", async () => {
    // The regression this guards: awaiting each update inside the loop made
    // every Google call wait out a database round trip first.
    const client = makeClient(SESSIONS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promise = pushConfirmedSessionsToCalendar(client as any, "u1", "p1");

    // With the writes still held open, all three inserts must already have
    // happened. If the loop awaited each write, only the first would have.
    await vi.waitFor(() => expect(insertCount).toBe(3));
    expect(client.written).toHaveLength(0);

    client.gates.forEach((release) => release());
    expect(await promise).toEqual({ ok: true, pushed: 3 });
  });

  it("reports a Google failure instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}), text: async () => "quota exceeded" })),
    );
    const client = makeClient(SESSIONS);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await pushConfirmedSessionsToCalendar(client as any, "u1", "p1");

    expect(out.ok).toBe(false);
    if (!out.ok && out.reason === "push_error") expect(out.message).toContain("quota exceeded");
  });
});
