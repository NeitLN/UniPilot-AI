import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * TEST-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — lib/risk had no tests.
 *
 * The scoring formula itself already has thorough coverage in
 * tests/rules/risk.test.ts, so this file deliberately does not re-test it.
 * What was untested is the orchestration around it, where two things can go
 * wrong quietly:
 *
 *   - the gate. When there is not enough history to score honestly,
 *     computeAndStoreRisk must bail out *before* writing anything. A
 *     regression that writes a score anyway would put a fabricated number in
 *     front of the student and persist it.
 *   - the evidence. RiskEvidence exists so the "What's shaping your score"
 *     card can cite the inputs. If it ever drifts from the numbers actually
 *     fed to computeRisk, the card explains a score the app did not compute.
 */

vi.mock("server-only", () => ({}));
// react.cache memoises per-request; in a test it just needs to pass through,
// otherwise the second call in a file would replay the first one's result.
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const { computeAndStoreRisk } = await import("@/lib/risk/compute");

type Rows = Record<string, unknown>;

/**
 * Stands in for the Supabase builder. Each `.from(table)` call consumes the
 * next queued response for that table, because compute.ts queries
 * `assignments` and `focus_sessions` twice each with different filters.
 */
function makeClient(queues: Record<string, unknown[]>, upserts: Rows[] = []) {
  const remaining: Record<string, unknown[]> = JSON.parse(JSON.stringify(queues));

  function builder(table: string) {
    let staged: Rows | null = null;
    const next = () => (remaining[table] ?? []).shift() ?? null;
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      is: () => chain,
      lt: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: next(), error: null }),
      single: () => Promise.resolve({ data: staged ? { id: "score-1" } : next(), error: null }),
      upsert: (payload: Rows) => {
        staged = payload;
        upserts.push(payload);
        return chain;
      },
      insert: (payload: Rows) => {
        upserts.push(payload);
        return Promise.resolve({ data: null, error: null });
      },
      // The write path is `.upsert(...).select("id").single()` for the score
      // and `.upsert(...).select("id")` (awaited directly) for the warning,
      // so both the terminal `single()` and the thenable have to hand back
      // the staged row rather than the read queue.
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: staged ? [{ id: "score-1" }] : next(), error: null }),
    };
    return chain;
  }

  return { from: (t: string) => builder(t), upserts };
}

/** Seven distinct days of focus history — the minimum the gate accepts. */
const SEVEN_DAYS = Array.from({ length: 7 }, (_, i) => ({
  started_at: `2026-07-${String(20 + i).padStart(2, "0")}T09:00:00.000Z`,
}));

beforeEach(() => vi.clearAllMocks());

describe("computeAndStoreRisk gate", () => {
  it("refuses to score, and writes nothing, without enough focus history", async () => {
    const upserts: Rows[] = [];
    const client = makeClient(
      {
        profiles: [{ weekly_availability_hours: 20 }],
        assignments: [[{ id: "a1" }], []],
        // Only two distinct days — under the gate's threshold.
        focus_sessions: [
          [{ started_at: "2026-07-20T09:00:00.000Z" }, { started_at: "2026-07-21T09:00:00.000Z" }],
          [],
        ],
        study_plans: [null],
      },
      upserts,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await computeAndStoreRisk(client as any, "u1");

    expect(out.status).toBe("insufficient_data");
    expect(upserts).toEqual([]);
  });

  it("refuses to score with no availability set", async () => {
    const upserts: Rows[] = [];
    const client = makeClient(
      {
        profiles: [{ weekly_availability_hours: 0 }],
        assignments: [[{ id: "a1" }], []],
        focus_sessions: [SEVEN_DAYS, []],
        study_plans: [null],
      },
      upserts,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await computeAndStoreRisk(client as any, "u1");

    expect(out.status).toBe("insufficient_data");
    if (out.status === "insufficient_data") expect(out.gate.availableHours).toBe(0);
    expect(upserts).toEqual([]);
  });
});

describe("computeAndStoreRisk evidence", () => {
  it("reports the same inputs it scored from", async () => {
    const upserts: Rows[] = [];
    const client = makeClient(
      {
        profiles: [{ weekly_availability_hours: 20 }],
        // 3 pending, 1 of them overdue.
        assignments: [[{ id: "a1" }, { id: "a2" }, { id: "a3" }], [{ id: "a1" }]],
        focus_sessions: [
          SEVEN_DAYS,
          [
            { result: "completed", duration_seconds: 1500 },
            { result: "completed", duration_seconds: 1500 },
            { result: "partial", duration_seconds: 600 },
          ],
        ],
        study_plans: [null],
      },
      upserts,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = await computeAndStoreRisk(client as any, "u1");

    expect(out.status).toBe("ok");
    if (out.status !== "ok") return;
    expect(out.evidence).toMatchObject({
      availableHours: 20,
      pendingCount: 3,
      overdueCount: 1,
      // Only "completed" sessions count as cycles; the partial one does not.
      completedCycles7d: 2,
      completedFocusMinutes7d: 50,
      // No active plan, so nothing is planned yet.
      plannedHours: 0,
    });
  });
});
