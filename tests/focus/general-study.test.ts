import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * A tester couldn't start a Pomodoro at all on a fresh account: "Start
 * focus" was hard-disabled until an assignment existed, with "Add an
 * assignment first — Pomodoro needs one to log against."
 *
 * That requirement was only ever a UI rule. `focus_sessions.assignment_id`
 * has allowed null since 0012_focus_session_preserve_history.sql (it goes
 * null, rather than cascade-deleting the row, when the assignment it was
 * logged against is deleted — so orphaned sessions were always a supported
 * state). These pin the server side of letting a session be started
 * deliberately unassigned: ownership is still enforced when an assignment
 * *is* named, and skipped — not failed — when one isn't.
 */

const auth = { getUser: vi.fn() };
const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth, from }),
}));

const assignmentBelongsToCaller = vi.fn();
vi.mock("@/lib/supabase/ownership", () => ({
  assignmentBelongsToCaller: (...a: unknown[]) => assignmentBelongsToCaller(...a),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { logFocusSession, logManualFocusSession } = await import("@/app/(app)/focus/actions");

beforeEach(() => {
  vi.clearAllMocks();
  auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  insert.mockResolvedValue({ error: null });
  assignmentBelongsToCaller.mockResolvedValue(true);
});

const TIMER_INPUT = {
  startedAt: "2026-08-06T09:00:00.000Z",
  endedAt: "2026-08-06T09:25:00.000Z",
  targetDurationSeconds: 1500,
};

describe("logFocusSession — general study (no assignment)", () => {
  it("accepts a session with no assignment", async () => {
    const result = await logFocusSession({ ...TIMER_INPUT, assignmentId: null });

    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({ user_id: "u1", assignment_id: null });
  });

  it("does not run an ownership check there is nothing to check", async () => {
    // Calling it with null would ask "does assignment `null` belong to
    // you", which can only ever answer no — that is exactly how this
    // used to be impossible.
    await logFocusSession({ ...TIMER_INPUT, assignmentId: null });
    expect(assignmentBelongsToCaller).not.toHaveBeenCalled();
  });

  it("still classifies the session normally — a full cycle counts", async () => {
    await logFocusSession({ ...TIMER_INPUT, assignmentId: null });
    // 25 minutes against a 25-minute target.
    expect(insert.mock.calls[0][0]).toMatchObject({ result: "completed", source: "timer" });
  });

  it("still refuses an assignment that belongs to someone else", async () => {
    assignmentBelongsToCaller.mockResolvedValue(false);

    const result = await logFocusSession({ ...TIMER_INPUT, assignmentId: "someone-elses" });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/isn't yours/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it("still records the assignment when one is given", async () => {
    await logFocusSession({ ...TIMER_INPUT, assignmentId: "a1" });
    expect(assignmentBelongsToCaller).toHaveBeenCalledWith(expect.anything(), "a1");
    expect(insert.mock.calls[0][0]).toMatchObject({ assignment_id: "a1" });
  });
});

describe("logManualFocusSession — general study (no assignment)", () => {
  // Relative to now, not a fixed date: validateManualSession rejects a
  // start in the future, so a hardcoded timestamp silently becomes invalid
  // the moment the clock passes it.
  const MANUAL_INPUT = {
    startedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    durationMinutes: 45,
  };

  it("accepts a past session with no assignment", async () => {
    const result = await logManualFocusSession({ ...MANUAL_INPUT, assignmentId: null });

    expect(result.ok).toBe(true);
    expect(insert.mock.calls[0][0]).toMatchObject({ assignment_id: null, source: "manual" });
  });

  it("skips the ownership check when no assignment is named", async () => {
    await logManualFocusSession({ ...MANUAL_INPUT, assignmentId: null });
    expect(assignmentBelongsToCaller).not.toHaveBeenCalled();
  });

  it("still refuses someone else's assignment", async () => {
    assignmentBelongsToCaller.mockResolvedValue(false);

    const result = await logManualFocusSession({ ...MANUAL_INPUT, assignmentId: "theirs" });

    expect(result.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("still validates the entry itself — a future start is refused either way", async () => {
    const result = await logManualFocusSession({
      assignmentId: null,
      startedAt: new Date(Date.now() + 86_400_000).toISOString(),
      durationMinutes: 30,
    });

    expect(result.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
});
