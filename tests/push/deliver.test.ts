import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * TEST-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — lib/push had no tests at
 * all. It is the notification delivery path: it runs unattended on a cron,
 * it is the hardest thing in the product to check by hand, and it has
 * already shipped one silent bug (SR-01, where the cron route was redirected
 * to /login before its CRON_SECRET check ever ran, so scheduled reminders
 * had likely never been delivered).
 *
 * These tests pin the three behaviours that are easy to break without
 * noticing:
 *   - a notification is stamped delivered even when the push itself fails,
 *   - endpoints the push service reports as gone get pruned rather than
 *     retried forever on every tick,
 *   - the cross-user sweep issues a constant number of UPDATEs, not one per
 *     notification.
 */

const sendPushNotification = vi.fn();
vi.mock("@/lib/push/send", () => ({
  sendPushNotification: (...args: unknown[]) => sendPushNotification(...args),
}));
vi.mock("server-only", () => ({}));

const { deliverAllDueNotifications, deliverDueNotifications } = await import("@/lib/push/deliver");

interface Recorded {
  table: string;
  op: "update" | "delete";
  payload?: Record<string, unknown>;
  ids?: string[];
}

/**
 * Minimal stand-in for the Supabase query builder — just enough of the
 * chainable surface that deliver.ts uses. Records every write so a test can
 * assert on the *number* of statements, which is the property that matters
 * for the batching guarantee.
 */
function makeClient(rows: { notifications: unknown[]; push_subscriptions: unknown[] }) {
  const writes: Recorded[] = [];

  function builder(table: string) {
    const state: { op?: "update" | "delete"; payload?: Record<string, unknown>; ids?: string[] } = {};
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      lte: () => {
        // Terminal for the read path: deliver.ts awaits the builder itself.
        return Promise.resolve({ data: rows[table as keyof typeof rows], error: null });
      },
      // `.in()` terminates both a read (`select().in("user_id", ids)`) and a
      // write (`update().in("id", ids)`), so it has to look at whether an
      // operation was staged before deciding which one this is.
      in: (_col: string, ids: string[]) => {
        if (!state.op) {
          return Promise.resolve({ data: rows[table as keyof typeof rows], error: null });
        }
        state.ids = ids;
        writes.push({ table, op: state.op, payload: state.payload, ids });
        return Promise.resolve({ data: null, error: null });
      },
      update: (payload: Record<string, unknown>) => {
        state.op = "update";
        state.payload = payload;
        return chain;
      },
      delete: () => {
        state.op = "delete";
        return chain;
      },
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: rows[table as keyof typeof rows], error: null }),
    };
    // `.eq()` terminates the single-user update path.
    chain.eq = (_col: string, id: string) => {
      if (state.op) {
        writes.push({ table, op: state.op, payload: state.payload, ids: [id] });
        return Promise.resolve({ data: null, error: null });
      }
      return chain;
    };
    return chain;
  }

  return {
    from: (table: string) => builder(table),
    writes,
  };
}

const SUB = { id: "sub-1", user_id: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a" };

beforeEach(() => {
  sendPushNotification.mockReset();
});

describe("deliverAllDueNotifications", () => {
  it("does nothing when no notification is due", async () => {
    const client = makeClient({ notifications: [], push_subscriptions: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deliverAllDueNotifications(client as any);
    expect(result).toEqual({ deliveredCount: 0 });
    expect(client.writes).toEqual([]);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it("issues one UPDATE per status, not one per notification", async () => {
    // Six notifications for one user, all landing on the same "sent" status.
    const notifications = Array.from({ length: 6 }, (_, i) => ({
      id: `n${i}`,
      user_id: "u1",
      kind: "assignment_due",
      title: `Due ${i}`,
      body: null,
    }));
    sendPushNotification.mockResolvedValue(undefined);
    const client = makeClient({ notifications, push_subscriptions: [SUB] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deliverAllDueNotifications(client as any);

    expect(result).toEqual({ deliveredCount: 6 });
    const updates = client.writes.filter((w) => w.op === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].ids).toHaveLength(6);
    expect(updates[0].payload).toMatchObject({ push_status: "sent" });
    // The pushes themselves are external HTTP calls, one per notification —
    // batching cannot reduce those, and should not try to.
    expect(sendPushNotification).toHaveBeenCalledTimes(6);
  });

  it("still marks a notification delivered when the push fails", async () => {
    // The in-app list must never depend on push working (TC-05).
    sendPushNotification.mockRejectedValue(new Error("push service down"));
    const client = makeClient({
      notifications: [{ id: "n1", user_id: "u1", kind: "assignment_due", title: "T", body: null }],
      push_subscriptions: [SUB],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deliverAllDueNotifications(client as any);

    expect(result).toEqual({ deliveredCount: 1 });
    const update = client.writes.find((w) => w.op === "update");
    expect(update?.payload).toMatchObject({ push_status: "failed" });
    expect(update?.payload?.delivered_at).toBeTruthy();
  });

  it("records no_subscription rather than failing when the user has no device", async () => {
    const client = makeClient({
      notifications: [{ id: "n1", user_id: "u1", kind: "assignment_due", title: "T", body: null }],
      push_subscriptions: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deliverAllDueNotifications(client as any);

    const update = client.writes.find((w) => w.op === "update");
    expect(update?.payload).toMatchObject({ push_status: "no_subscription" });
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it("prunes endpoints the push service reports as gone", async () => {
    // 404/410 is the push service confirming the endpoint is dead. Without
    // pruning, that subscription is retried on every cron tick forever.
    const gone = Object.assign(new Error("gone"), { statusCode: 410 });
    sendPushNotification.mockRejectedValue(gone);
    const client = makeClient({
      notifications: [{ id: "n1", user_id: "u1", kind: "assignment_due", title: "T", body: null }],
      push_subscriptions: [SUB],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deliverAllDueNotifications(client as any);

    const del = client.writes.find((w) => w.op === "delete");
    expect(del?.table).toBe("push_subscriptions");
    expect(del?.ids).toEqual(["sub-1"]);
  });

  it("leaves a subscription alone when the failure is transient", async () => {
    // A 500 is the push service having a bad day, not the endpoint being
    // dead — deleting on that would silently unsubscribe working devices.
    sendPushNotification.mockRejectedValue(Object.assign(new Error("boom"), { statusCode: 500 }));
    const client = makeClient({
      notifications: [{ id: "n1", user_id: "u1", kind: "assignment_due", title: "T", body: null }],
      push_subscriptions: [SUB],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deliverAllDueNotifications(client as any);

    expect(client.writes.some((w) => w.op === "delete")).toBe(false);
  });
});

describe("deliverDueNotifications (single user)", () => {
  it("updates per notification, which is the documented trade-off here", async () => {
    // This path is called opportunistically while one user has the app open,
    // so it is bounded by that user's own backlog. The cron sweep is the one
    // that spans every user, and it batches. Pinning the difference so a
    // future change does not quietly make this the cross-user path too.
    sendPushNotification.mockResolvedValue(undefined);
    const notifications = Array.from({ length: 3 }, (_, i) => ({
      id: `n${i}`,
      kind: "assignment_due",
      title: `Due ${i}`,
      body: null,
    }));
    const client = makeClient({ notifications, push_subscriptions: [SUB] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deliverDueNotifications(client as any, "u1");

    expect(result).toEqual({ deliveredCount: 3 });
    expect(client.writes.filter((w) => w.op === "update")).toHaveLength(3);
  });
});
