"use client";

import {
  createAssignment,
  updateAssignment,
  getAssignmentUpdatedAt,
} from "@/app/(app)/assignments/actions";
import { logFocusSession, type LogFocusSessionInput } from "@/app/(app)/focus/actions";
import { deleteMutation, getQueuedMutations, type QueuedMutation } from "./idb";

export interface FlushResult {
  synced: number;
  /** Left in the queue because the server row changed after the offline
   * edit was made — never overwritten silently, surfaced to the user instead. */
  conflicts: number;
}

function toFormData(payload: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    fd.set(key, String(value ?? ""));
  }
  return fd;
}

// Guards against the `online` event and a manual retry racing each other.
let flushing = false;

export async function flushQueue(): Promise<FlushResult> {
  if (flushing) return { synced: 0, conflicts: 0 };
  flushing = true;
  try {
    const queue = await getQueuedMutations();
    let synced = 0;
    let conflicts = 0;

    for (const mutation of queue) {
      let outcome: "ok" | "conflict";
      try {
        outcome = await applyMutation(mutation);
      } catch {
        // Still offline, or the server rejected it — stop here and leave the
        // rest of the queue for the next flush attempt.
        break;
      }
      if (outcome === "conflict") {
        conflicts++;
        continue;
      }
      await deleteMutation(mutation.id);
      synced++;
    }

    return { synced, conflicts };
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
