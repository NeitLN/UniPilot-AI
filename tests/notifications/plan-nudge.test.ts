import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { sweepPlanNudges } = await import("@/lib/notifications/plan-nudge");

/**
 * PROD-02 — the sweep runs unattended from a cron every 15 minutes, which
 * makes it the same shape of code as lib/push/deliver: nobody is watching
 * when it goes wrong, and the two ways it can go wrong are both expensive.
 * It can spam (writing the same nudge every quarter of an hour), and it can
 * degrade quietly (one round trip per user, on a set that grows with the
 * whole user base).
 */

interface Fixture {
  study_plans: unknown[];
  study_sessions: unknown[];
  focus_sessions: unknown[];
  notification_preferences: unknown[];
}

/** Records every query so a test can assert on the *count* of round trips,
 * which is the batching property, and on what was written. */
function makeClient(rows: Fixture, opts: { conflicts?: boolean } = {}) {
  const reads: string[] = [];
  const inserted: Record<string, unknown>[] = [];

  function builder(table: string) {
    let staged: Record<string, unknown>[] | null = null;
    const chain: Record<string, unknown> = {
      // Filters all return the builder; the builder itself is thenable, so
      // awaiting it is what runs the read. That mirrors the real client,
      // where `.in()` is followed by `.gte()` on one of these queries.
      select: () => (staged ? Promise.resolve({ data: staged, error: null }) : chain),
      eq: () => chain,
      gte: () => chain,
      in: () => chain,
      upsert: (payload: Record<string, unknown>[]) => {
        inserted.push(...payload);
        // The unique index is what enforces "once per plan week"; with
        // ignoreDuplicates a refused row comes back as simply absent.
        staged = opts.conflicts ? [] : payload.map((_, i) => ({ id: `n${i}` }));
        return chain;
      },
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: rows[table as keyof Fixture], error: null }),
    };
    return chain;
  }

  return {
    client: {
      from: (table: string) => {
        reads.push(table);
        return builder(table);
      },
    } as never,
    reads,
    inserted,
  };
}

const NOW = new Date("2026-08-06T12:00:00Z"); // Thursday; week_start 2026-08-03 has 4 days left

/** Six planned sessions, five already elapsed by NOW. */
function planned(planId: string) {
  return [
    { plan_id: planId, start_at: "2026-08-03T09:00:00Z" },
    { plan_id: planId, start_at: "2026-08-04T09:00:00Z" },
    { plan_id: planId, start_at: "2026-08-04T14:00:00Z" },
    { plan_id: planId, start_at: "2026-08-05T09:00:00Z" },
    { plan_id: planId, start_at: "2026-08-06T09:00:00Z" },
    { plan_id: planId, start_at: "2026-08-08T09:00:00Z" }, // still ahead
  ];
}

const ACTIVE_PLAN = [{ id: "p1", user_id: "u1", week_start: "2026-08-03" }];

describe("sweepPlanNudges", () => {
  it("creates one nudge for a user who is behind", async () => {
    const { client, inserted } = makeClient({
      study_plans: ACTIVE_PLAN,
      study_sessions: planned("p1"),
      // One completed focus day out of five elapsed sessions.
      focus_sessions: [{ user_id: "u1", started_at: "2026-08-03T10:00:00Z" }],
      notification_preferences: [{ user_id: "u1", plan_nudges: true }],
    });

    const result = await sweepPlanNudges(client, NOW);

    expect(result).toMatchObject({ considered: 1, created: 1, optedOut: 0 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ user_id: "u1", kind: "plan_nudge" });
    // Keyed on the plan week, which is what makes a second run a no-op.
    expect(inserted[0].dedupe_key).toBe("2026-08-03");
    expect(String(inserted[0].body)).toContain("of 5");
  });

  it("writes nothing for a user who is keeping up", async () => {
    const { client, inserted } = makeClient({
      study_plans: ACTIVE_PLAN,
      study_sessions: planned("p1"),
      focus_sessions: [
        { user_id: "u1", started_at: "2026-08-03T10:00:00Z" },
        { user_id: "u1", started_at: "2026-08-04T10:00:00Z" },
        { user_id: "u1", started_at: "2026-08-05T10:00:00Z" },
      ],
      notification_preferences: [{ user_id: "u1", plan_nudges: true }],
    });

    const result = await sweepPlanNudges(client, NOW);
    expect(inserted).toHaveLength(0);
    expect(result).toMatchObject({ created: 0 });
  });

  it("respects the category being switched off", async () => {
    const { client, inserted } = makeClient({
      study_plans: ACTIVE_PLAN,
      study_sessions: planned("p1"),
      focus_sessions: [],
      notification_preferences: [{ user_id: "u1", plan_nudges: false }],
    });

    const result = await sweepPlanNudges(client, NOW);
    expect(inserted).toHaveLength(0);
    expect(result.optedOut).toBe(1);
  });

  it("still nudges when no preference row exists, matching the rest of the app", async () => {
    // An absent row means "not configured", which every other category
    // reads as on (lib/risk/compute.ts uses the same `!== false` test).
    const { client, inserted } = makeClient({
      study_plans: ACTIVE_PLAN,
      study_sessions: planned("p1"),
      focus_sessions: [],
      notification_preferences: [],
    });

    await sweepPlanNudges(client, NOW);
    expect(inserted).toHaveLength(1);
  });

  it("reports nothing created when the dedupe index refuses the row", async () => {
    // The second cron tick of the same week. The write is still attempted —
    // that is what makes it a race-free check — but nothing new lands.
    const { client } = makeClient(
      {
        study_plans: ACTIVE_PLAN,
        study_sessions: planned("p1"),
        focus_sessions: [],
        notification_preferences: [],
      },
      { conflicts: true },
    );

    const result = await sweepPlanNudges(client, NOW);
    expect(result).toMatchObject({ considered: 1, created: 0 });
  });

  it("skips a plan whose week has run out, without querying anything else", async () => {
    const { client, reads } = makeClient({
      study_plans: [{ id: "p1", user_id: "u1", week_start: "2026-07-27" }],
      study_sessions: planned("p1"),
      focus_sessions: [],
      notification_preferences: [],
    });

    const result = await sweepPlanNudges(client, NOW);
    expect(result).toEqual({ considered: 0, created: 0, optedOut: 0 });
    // The one plans query and nothing more — no point paying for sessions
    // and preferences when no plan can qualify.
    expect(reads).toEqual(["study_plans"]);
  });

  it("issues a constant number of round trips regardless of how many users qualify", async () => {
    const plans = Array.from({ length: 25 }, (_, i) => ({
      id: `p${i}`,
      user_id: `u${i}`,
      week_start: "2026-08-03",
    }));
    const { client, reads, inserted } = makeClient({
      study_plans: plans,
      study_sessions: plans.flatMap((p) => planned(p.id)),
      focus_sessions: [],
      notification_preferences: [],
    });

    await sweepPlanNudges(client, NOW);

    // plans + sessions + focus + prefs + one batched insert. A per-user
    // loop here would be 25x that, on a path nobody is watching.
    expect(reads).toEqual([
      "study_plans",
      "study_sessions",
      "focus_sessions",
      "notification_preferences",
      "notifications",
    ]);
    expect(inserted).toHaveLength(25);
  });
});
