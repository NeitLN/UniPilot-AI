import { test, expect, type Page } from "@playwright/test";

/**
 * OFF-001 regression.
 *
 * IndexedDB is scoped to the origin, not the session, so the offline queue
 * outlives a sign-out and is still sitting there when the next student signs
 * in on the same browser. Replay goes through ordinary Server Actions, which
 * act as whoever is signed in at the time — so before this fix, one
 * student's coursework was created inside another student's account.
 *
 * These drive the real IndexedDB store the app uses, not a mock, because the
 * defect lived in the gap between the store and the session.
 */

const DB = "unipilot-offline";
const STORE = "mutationQueue";

/** Writes a record straight into the app's own store, exactly as
 * `enqueueMutation` does, so the schema under test is the real one. */
async function seedMutation(page: Page, userId: string, title: string) {
  return page.evaluate(
    ({ db, store, userId, title }) =>
      new Promise<string>((resolve) => {
        const req = indexedDB.open(db);
        req.onsuccess = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(store)) {
            d.close();
            resolve("store-missing");
            return;
          }
          const tx = d.transaction(store, "readwrite");
          tx.objectStore(store).add({
            userId,
            kind: "createAssignment",
            payload: { title, dueAt: "2026-09-01T10:00" },
            createdAt: new Date().toISOString(),
            attempts: 0,
          });
          tx.oncomplete = () => { d.close(); resolve("seeded"); };
          tx.onerror = () => { d.close(); resolve("error"); };
        };
        req.onerror = () => resolve("open-error");
      }),
    { db: DB, store: STORE, userId, title },
  );
}

/** Every record in the store, regardless of owner. */
async function readAll(page: Page) {
  return page.evaluate(
    ({ db, store }) =>
      new Promise<{ userId: string; title: string }[]>((resolve) => {
        const req = indexedDB.open(db);
        req.onsuccess = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(store)) {
            d.close();
            resolve([]);
            return;
          }
          const tx = d.transaction(store, "readonly");
          const all = tx.objectStore(store).getAll();
          all.onsuccess = () => {
            d.close();
            resolve(
              (all.result as { userId: string; payload: { title: string } }[]).map((m) => ({
                userId: m.userId,
                title: m.payload.title,
              })),
            );
          };
          all.onerror = () => { d.close(); resolve([]); };
        };
        req.onerror = () => resolve([]);
      }),
    { db: DB, store: STORE },
  );
}

async function dropDb(page: Page) {
  await page.evaluate(
    (db) => new Promise((resolve) => {
      const r = indexedDB.deleteDatabase(db);
      r.onsuccess = () => resolve(null);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    }),
    DB,
  );
}

test.describe("Offline queue ownership (OFF-001)", () => {
  test.afterEach(async ({ page }) => {
    await page.goto("/assignments");
    await dropDb(page);
  });

  test("a queued mutation records who made it", async ({ page }) => {
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();

    // The store only exists once the app has opened it at least once.
    await page.waitForTimeout(1500);

    const seeded = await seedMutation(page, "someone-else", "FOREIGN-QUEUE-ITEM");
    expect(seeded).toBe("seeded");

    const all = await readAll(page);
    expect(all).toHaveLength(1);
    // The record carries an owner at all — the field whose absence was the bug.
    expect(all[0].userId).toBe("someone-else");
  });

  test("another account's queued work is never replayed into this session", async ({ page }) => {
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
    await page.waitForTimeout(1500);

    const title = `FOREIGN-DO-NOT-CREATE-${Date.now()}`;
    expect(await seedMutation(page, "a-different-user", title)).toBe("seeded");

    // Reloading online is exactly what triggers a flush.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
    await page.waitForTimeout(3000);

    // The foreign record is still queued: this session refused to touch it.
    const remaining = await readAll(page);
    expect(remaining.map((r) => r.title)).toContain(title);

    // And crucially, it did not become an assignment in *this* account.
    await page.goto("/assignments");
    await expect(page.getByRole("heading", { name: "Assignments" })).toBeVisible();
    await expect(page.getByText(title)).toHaveCount(0);

    // The banner counts only this user's queue, so it must not advertise it.
    await expect(page.getByText(/offline change/i)).toHaveCount(0);
  });
});
