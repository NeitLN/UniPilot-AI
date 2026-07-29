"use client";

// Raw IndexedDB (no dependency) queue for mutations made while offline —
// create/update assignment, log a focus session. Flushed by lib/offline/queue.ts
// once the browser reports `online` again.

const DB_NAME = "unipilot-offline";
const DB_VERSION = 1;
const STORE = "mutationQueue";

export type MutationKind = "createAssignment" | "updateAssignment" | "logFocusSession";

export interface QueuedMutation {
  id: number;
  kind: MutationKind;
  payload: Record<string, unknown>;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueMutation(
  kind: MutationKind,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ kind, payload, createdAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event("unipilot:queue-changed"));
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  const result = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => a.id - b.id);
}

export async function deleteMutation(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event("unipilot:queue-changed"));
}
