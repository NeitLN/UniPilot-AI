"use client";

// Raw IndexedDB (no dependency) queue for mutations made while offline —
// create/update assignment, log a focus session. Flushed by lib/offline/queue.ts
// once the browser reports `online` again.
//
// OFF-001: every record carries the id of the user who made it. IndexedDB is
// scoped to the *origin*, not to the session, so on a shared browser this
// store outlives a sign-out and is still there when the next student signs
// in. Replay goes through ordinary Server Actions, which act as whoever is
// signed in at the time — so without an owner on the record, one student's
// coursework was created inside another student's account. The owner is what
// makes that impossible; nothing else in the flush path can tell the
// difference.

const DB_NAME = "unipilot-offline";
/** v2 added `userId` and `attempts`. */
const DB_VERSION = 2;
const STORE = "mutationQueue";
const OWNER_INDEX = "byUserId";

export type MutationKind = "createAssignment" | "updateAssignment" | "logFocusSession";

export interface QueuedMutation {
  id: number;
  /** auth user id of whoever queued this. Replay is refused for anyone else. */
  userId: string;
  kind: MutationKind;
  payload: Record<string, unknown>;
  createdAt: string;
  /** Failed replay attempts. Used to retire a record that can never succeed
   * instead of letting it block everything queued behind it. */
  attempts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // v1 records predate `userId`, so there is no way to tell whose they
      // are — and replaying one of unknown ownership is exactly the bug this
      // version exists to fix. Dropping them is the only safe migration.
      // The cost is bounded: only mutations made offline and never synced.
      if (oldVersion > 0 && db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      store.createIndex(OWNER_INDEX, "userId", { unique: false });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // A second tab still holding the old version blocks the upgrade, and
    // without this the promise never settles — the banner would sit on
    // "syncing" forever with no error anywhere. Rejecting lets the caller
    // fail and retry on the next flush, by which time the other tab has
    // usually navigated or closed.
    req.onblocked = () =>
      reject(new Error("Offline queue upgrade blocked by another open tab."));
  });
}

export async function enqueueMutation(
  kind: MutationKind,
  payload: Record<string, unknown>,
  userId: string,
): Promise<void> {
  // A mutation with no owner could only ever be replayed into the wrong
  // account, so refuse to record one rather than store an ambiguous entry.
  if (!userId) throw new Error("Cannot queue an offline change without a signed-in user.");

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({
      userId,
      kind,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event("unipilot:queue-changed"));
}

/**
 * This user's queued mutations, oldest first.
 *
 * Reads through the owner index rather than filtering `getAll()`, so another
 * account's records are never even loaded into memory — the banner's count
 * and the flush loop both get a list that cannot contain someone else's work.
 */
export async function getQueuedMutations(userId: string): Promise<QueuedMutation[]> {
  if (!userId) return [];
  const db = await openDb();
  const result = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).index(OWNER_INDEX).getAll(userId);
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

/** Records one failed replay so `flushQueue` can eventually retire an entry
 * that will never succeed. */
export async function recordAttempt(id: number): Promise<number> {
  const db = await openDb();
  const attempts = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    let next = 0;
    req.onsuccess = () => {
      const row = req.result as QueuedMutation | undefined;
      if (!row) return;
      next = (row.attempts ?? 0) + 1;
      store.put({ ...row, attempts: next });
    };
    tx.oncomplete = () => resolve(next);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return attempts;
}

/**
 * Drops everything this user has queued. Used when the account itself is
 * being deleted, where leaving unsent mutations behind would mean writing
 * into an account that no longer exists.
 *
 * Deliberately NOT called on ordinary sign-out. Signing out is routine —
 * closing a laptop lid at the library — and a student who edited offline and
 * signed out before reconnecting would silently lose that work. The owner
 * field already makes the next user's session unable to replay it, which is
 * the actual danger; remanence in local storage is a much weaker concern and
 * not worth destroying data to avoid.
 */
export async function clearQueueForUser(userId: string): Promise<number> {
  if (!userId) return 0;
  const mine = await getQueuedMutations(userId);
  for (const m of mine) await deleteMutation(m.id);
  return mine.length;
}
