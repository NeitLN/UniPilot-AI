import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * TEST-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — lib/offline had no tests.
 * This is the queue that replays writes made while the browser was offline,
 * so a silent regression here is silent data loss: an assignment the student
 * created on the bus simply never arrives.
 *
 * The properties worth pinning are all about *not* losing, corrupting, or
 * misdelivering a queued write:
 *   - a failed replay stops the run and leaves the rest queued,
 *   - a conflicting edit is kept, never overwritten,
 *   - only successfully applied mutations are deleted,
 *   - two concurrent flushes cannot double-apply the same mutation,
 *   - a replay only ever reads the signed-in user's own queue (OFF-001),
 *   - a record that can never succeed is retired instead of blocking the
 *     queue behind it forever (OFF-001).
 */

const createAssignment = vi.fn();
const updateAssignment = vi.fn();
const getAssignmentUpdatedAt = vi.fn();
const logFocusSession = vi.fn();
const getQueuedMutations = vi.fn();
const deleteMutation = vi.fn();
const recordAttempt = vi.fn();

vi.mock("@/app/(app)/assignments/actions", () => ({
  createAssignment: (...a: unknown[]) => createAssignment(...a),
  updateAssignment: (...a: unknown[]) => updateAssignment(...a),
  getAssignmentUpdatedAt: (...a: unknown[]) => getAssignmentUpdatedAt(...a),
}));
vi.mock("@/app/(app)/focus/actions", () => ({
  logFocusSession: (...a: unknown[]) => logFocusSession(...a),
}));
vi.mock("@/lib/offline/idb", () => ({
  getQueuedMutations: (userId: string) => getQueuedMutations(userId),
  deleteMutation: (id: number) => deleteMutation(id),
  recordAttempt: (id: number) => recordAttempt(id),
}));

const { flushQueue, MAX_ATTEMPTS } = await import("@/lib/offline/queue");

const USER = "user-a";

const created = (id: number, attempts = 0) => ({
  id,
  userId: USER,
  kind: "createAssignment" as const,
  payload: { title: `Task ${id}` },
  createdAt: "2026-08-01T00:00:00.000Z",
  attempts,
});

beforeEach(() => {
  vi.clearAllMocks();
  getQueuedMutations.mockResolvedValue([]);
  deleteMutation.mockResolvedValue(undefined);
  recordAttempt.mockResolvedValue(1);
  createAssignment.mockResolvedValue(undefined);
  updateAssignment.mockResolvedValue(undefined);
  logFocusSession.mockResolvedValue(undefined);
});

describe("flushQueue", () => {
  it("reports nothing to do on an empty queue", async () => {
    expect(await flushQueue(USER)).toEqual({ synced: 0, conflicts: 0, dropped: 0 });
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it("replays every queued mutation and clears each one", async () => {
    getQueuedMutations.mockResolvedValue([created(1), created(2), created(3)]);

    expect(await flushQueue(USER)).toEqual({ synced: 3, conflicts: 0, dropped: 0 });
    expect(createAssignment).toHaveBeenCalledTimes(3);
    expect(deleteMutation.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it("stops at the first failure and leaves the rest queued", async () => {
    // Still offline, or the server rejected it. Continuing would apply
    // later mutations out of order on top of a write that never landed.
    getQueuedMutations.mockResolvedValue([created(1), created(2), created(3)]);
    createAssignment.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));

    expect(await flushQueue(USER)).toEqual({ synced: 1, conflicts: 0, dropped: 0 });
    // Only the one that actually succeeded is removed; 2 and 3 survive.
    expect(deleteMutation).toHaveBeenCalledTimes(1);
    expect(deleteMutation).toHaveBeenCalledWith(1);
  });

  it("keeps a conflicting edit in the queue instead of overwriting the server", async () => {
    getQueuedMutations.mockResolvedValue([
      {
        id: 7,
        userId: USER,
        kind: "updateAssignment" as const,
        payload: { id: "a1", snapshotUpdatedAt: "2026-08-01T10:00:00.000Z", title: "Edited offline" },
        createdAt: "2026-08-01T00:00:00.000Z",
        attempts: 0,
      },
    ]);
    // The row moved on the server after the offline edit was made.
    getAssignmentUpdatedAt.mockResolvedValue("2026-08-02T09:00:00.000Z");

    expect(await flushQueue(USER)).toEqual({ synced: 0, conflicts: 1, dropped: 0 });
    expect(updateAssignment).not.toHaveBeenCalled();
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it("applies an offline edit when the server row has not moved", async () => {
    getQueuedMutations.mockResolvedValue([
      {
        id: 8,
        userId: USER,
        kind: "updateAssignment" as const,
        payload: { id: "a1", snapshotUpdatedAt: "2026-08-01T10:00:00.000Z", title: "Edited offline" },
        createdAt: "2026-08-01T00:00:00.000Z",
        attempts: 0,
      },
    ]);
    getAssignmentUpdatedAt.mockResolvedValue("2026-08-01T10:00:00.000Z");

    expect(await flushQueue(USER)).toEqual({ synced: 1, conflicts: 0, dropped: 0 });
    expect(updateAssignment).toHaveBeenCalledTimes(1);
    expect(deleteMutation).toHaveBeenCalledWith(8);
  });

  it("does not double-apply when two flushes race", async () => {
    // The `online` event and a manual retry can fire together; without the
    // guard both would read the same queue and replay it twice.
    getQueuedMutations.mockResolvedValue([created(1)]);
    let release!: () => void;
    createAssignment.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );

    const first = flushQueue(USER);
    const second = await flushQueue(USER); // starts while the first is in flight
    expect(second).toEqual({ synced: 0, conflicts: 0, dropped: 0 });

    release();
    expect(await first).toEqual({ synced: 1, conflicts: 0, dropped: 0 });
    expect(createAssignment).toHaveBeenCalledTimes(1);
  });
});

/**
 * OFF-001 — the queue outlives a sign-out (IndexedDB is scoped to the origin,
 * not the session) and replay runs through Server Actions that act as
 * whoever is signed in *now*. Without an owner filter, one student's
 * coursework was created inside the next student's account.
 */
describe("flushQueue — ownership", () => {
  it("only ever reads the signed-in user's own queue", async () => {
    await flushQueue("user-b");
    expect(getQueuedMutations).toHaveBeenCalledWith("user-b");
  });

  it("does nothing at all without a user, rather than replaying unowned work", async () => {
    getQueuedMutations.mockResolvedValue([created(1)]);

    expect(await flushQueue("")).toEqual({ synced: 0, conflicts: 0, dropped: 0 });
    expect(getQueuedMutations).not.toHaveBeenCalled();
    expect(createAssignment).not.toHaveBeenCalled();
  });
});

describe("flushQueue — retiring a record that can never succeed", () => {
  it("retires every mutation that has failed MAX_ATTEMPTS times", async () => {
    // A queued updateAssignment pointing at a row this account cannot touch
    // fails on every single flush. Before this, the loop broke on it every
    // time and everything queued behind it waited forever — so the run must
    // not stop at the first retirement either.
    getQueuedMutations.mockResolvedValue([created(1), created(2)]);
    createAssignment.mockRejectedValue(new Error("refused"));
    recordAttempt.mockResolvedValue(MAX_ATTEMPTS);

    const result = await flushQueue(USER);

    expect(result).toMatchObject({ synced: 0, conflicts: 0, dropped: 2 });
    expect(deleteMutation.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });

  it("keeps retrying while it is still under the limit", async () => {
    getQueuedMutations.mockResolvedValue([created(1), created(2)]);
    createAssignment.mockRejectedValue(new Error("offline"));
    recordAttempt.mockResolvedValue(1);

    expect(await flushQueue(USER)).toEqual({ synced: 0, conflicts: 0, dropped: 0 });
    // Not deleted — a flaky connection must not cost the student their work.
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it("gets past a retired record and syncs what was stuck behind it", async () => {
    getQueuedMutations.mockResolvedValue([created(1), created(2)]);
    createAssignment
      .mockRejectedValueOnce(new Error("permanently broken"))
      .mockResolvedValueOnce(undefined);
    recordAttempt.mockResolvedValue(MAX_ATTEMPTS);

    expect(await flushQueue(USER)).toEqual({ synced: 1, conflicts: 0, dropped: 1 });
    expect(deleteMutation.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });
});
