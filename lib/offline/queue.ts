"use client";

import {
  createAssignment,
  updateAssignment,
  getAssignmentUpdatedAt,
} from "@/app/(app)/assignments/actions";
import { logFocusSession, type LogFocusSessionInput } from "@/app/(app)/focus/actions";
import { deleteMutation, getQueuedMutations, recordAttempt, type QueuedMutation } from "./idb";

export interface FlushResult {
  synced: number;
  /** Left in the queue because the server row changed after the offline
   * edit was made — never overwritten silently, surfaced to the user instead. */
  conflicts: number;
  /** Retired after repeated failure. Counted separately from conflicts:
   * a conflict is recoverable and stays, a dropped record never was. */
  dropped: number;
}

/**
 * OFF-001: how many times one record may fail before it is retired.
 *
 * The loop stops at the first failure because the usual cause is "still
 * offline", and there is no point marching through the rest. But that turns
 * any permanently-failing record into a plug: it fails, the loop breaks, and
 * every later mutation waits behind it forever. Three attempts is enough to
 * ride out a flaky connection and short enough that a genuinely broken
 * record cannot hold the queue hostage.
 */
export const MAX_ATTEMPTS = 3;

function toFormData(payload: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    fd.set(key, String(value ?? ""));
  }
  return fd;
}

// Guards against the `online` event and a manual retry racing each other.
let flushing = false;

/**
 * Replays `userId`'s queued mutations against the server.
 *
 * The user id is required, not optional: replay runs through Server Actions
 * that act as the *current* session, so a queue read without an owner filter
 * would write one student's work into whichever account happens to be signed
 * in (OFF-001). `getQueuedMutations` filters by owner at the index, so this
 * loop can only ever see records it is allowed to apply.
 */
export async function flushQueue(userId: string): Promise<FlushResult> {
  const empty: FlushResult = { synced: 0, conflicts: 0, dropped: 0 };
  if (flushing || !userId) return empty;
  flushing = true;
  try {
    const queue = await getQueuedMutations(userId);
    let synced = 0;
    let conflicts = 0;
    let dropped = 0;

    for (const mutation of queue) {
      let outcome: "ok" | "conflict";
      try {
        outcome = await applyMutation(mutation);
      } catch {
        // Usually "still offline". Record the attempt, and retire the record
        // if it has now failed enough times to look permanent — otherwise
        // stop and let the next flush try again from here.
        const attempts = await recordAttempt(mutation.id);
        if (attempts >= MAX_ATTEMPTS) {
          await deleteMutation(mutation.id);
          dropped++;
          continue;
        }
        break;
      }
      if (outcome === "conflict") {
        conflicts++;
        continue;
      }
      await deleteMutation(mutation.id);
      synced++;
    }

    return { synced, conflicts, dropped };
  } finally {
    flushing = false;
  }
}

async function applyMutation(mutation: QueuedMutation): Promise<"ok" | "conflict"> {
  switch (mutation.kind) {
    case "createAssignment": {
      await createAssignment({ errors: {} }, toFormData(mutation.payload));
      return "ok";
    }
    case "updateAssignment": {
      const { id, snapshotUpdatedAt, ...fields } = mutation.payload as {
        id: string;
        snapshotUpdatedAt: string | null;
        [key: string]: unknown;
      };
      if (snapshotUpdatedAt) {
        const current = await getAssignmentUpdatedAt(id);
        if (current && current !== snapshotUpdatedAt) return "conflict";
      }
      await updateAssignment(id, { errors: {} }, toFormData(fields));
      return "ok";
    }
    case "logFocusSession": {
      await logFocusSession(mutation.payload as unknown as LogFocusSessionInput);
      return "ok";
    }
  }
}
