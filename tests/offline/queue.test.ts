import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * TEST-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — lib/offline had no tests.
 * This is the queue that replays writes made while the browser was offline,
 * so a silent regression here is silent data loss: an assignment the student
 * created on the bus simply never arrives.
 *
 * The four properties worth pinning are all about *not* losing or corrupting
 * a queued write:
 *   - a failed replay stops the run and leaves the rest queued,
 *   - a conflicting edit is kept, never overwritten,
 *   - only successfully applied mutations are deleted,
 *   - two concurrent flushes (the `online` event racing a manual retry)
 *     cannot double-apply the same mutation.
 */

const createAssignment = vi.fn();
const updateAssignment = vi.fn();
const getAssignmentUpdatedAt = vi.fn();
const logFocusSession = vi.fn();
const getQueuedMutations = vi.fn();
const deleteMutation = vi.fn();

vi.mock("@/app/(app)/assignments/actions", () => ({
  createAssignment: (...a: unknown[]) => createAssignment(...a),
  updateAssignment: (...a: unknown[]) => updateAssignment(...a),
  getAssignmentUpdatedAt: (...a: unknown[]) => getAssignmentUpdatedAt(...a),
}));
vi.mock("@/app/(app)/focus/actions", () => ({
  logFocusSession: (...a: unknown[]) => logFocusSession(...a),
}));
vi.mock("@/lib/offline/idb", () => ({
  getQueuedMutations: () => getQueuedMutations(),
  deleteMutation: (id: number) => deleteMutation(id),
}));

const { flushQueue } = await import("@/lib/offline/queue");

const created = (id: number) => ({
  id,
  kind: "createAssignment" as const,
  payload: { title: `Task ${id}` },
  createdAt: "2026-08-01T00:00:00.000Z",
});

beforeEach(() => {
  vi.clearAllMocks();
  getQueuedMutations.mockResolvedValue([]);
  deleteMutation.mockResolvedValue(undefined);
  createAssignment.mockResolvedValue(undefined);
  updateAssignment.mockResolvedValue(undefined);
  logFocusSession.mockResolvedValue(undefined);
});

describe("flushQueue", () => {
  it("reports nothing to do on an empty queue", async () => {
    expect(await flushQueue()).toEqual({ synced: 0, conflicts: 0 });
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it("replays every queued mutation and clears each one", async () => {
    getQueuedMutations.mockResolvedValue([created(1), created(2), created(3)]);

    expect(await flushQueue()).toEqual({ synced: 3, conflicts: 0 });
    expect(createAssignment).toHaveBeenCalledTimes(3);
    expect(deleteMutation.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it("stops at the first failure and leaves the rest queued", async () => {
    // Still offline, or the server rejected it. Continuing would apply
    // later mutations out of order on top of a write that never landed.
    getQueuedMutations.mockResolvedValue([created(1), created(2), created(3)]);
    createAssignment.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("offline"));

    expect(await flushQueue()).toEqual({ synced: 1, conflicts: 0 });
    // Only the one that actually succeeded is removed; 2 and 3 survive.
    expect(deleteMutation).toHaveBeenCalledTimes(1);
    expect(deleteMutation).toHaveBeenCalledWith(1);
  });

  it("keeps a conflicting edit in the queue instead of overwriting the server", async () => {
    getQueuedMutations.mockResolvedValue([
      {
        id: 7,
        kind: "updateAssignment" as const,
        payload: { id: "a1", snapshotUpdatedAt: "2026-08-01T10:00:00.000Z", title: "Edited offline" },
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    // The row moved on the server after the offline edit was made.
    getAssignmentUpdatedAt.mockResolvedValue("2026-08-02T09:00:00.000Z");

    expect(await flushQueue()).toEqual({ synced: 0, conflicts: 1 });
    expect(updateAssignment).not.toHaveBeenCalled();
    expect(deleteMutation).not.toHaveBeenCalled();
  });

  it("applies an offline edit when the server row has not moved", async () => {
    getQueuedMutations.mockResolvedValue([
      {
        id: 8,
        kind: "updateAssignment" as const,
        payload: { id: "a1", snapshotUpdatedAt: "2026-08-01T10:00:00.000Z", title: "Edited offline" },
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
    getAssignmentUpdatedAt.mockResolvedValue("2026-08-01T10:00:00.000Z");

    expect(await flushQueue()).toEqual({ synced: 1, conflicts: 0 });
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

    const first = flushQueue();
    const second = await flushQueue(); // starts while the first is in flight
    expect(second).toEqual({ synced: 0, conflicts: 0 });

    release();
    expect(await first).toEqual({ synced: 1, conflicts: 0 });
    expect(createAssignment).toHaveBeenCalledTimes(1);
  });
});
