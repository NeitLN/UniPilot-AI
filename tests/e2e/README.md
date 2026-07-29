# E2E tests

Covers the six core user activities from the SRS (UA-1..UA-6): assignments,
AI study planning, schedule, focus sessions, GPA, and workload-risk.

## First-time setup

1. `E2E_EMAIL` / `E2E_PASSWORD` in `.env.local` point at a **dedicated**
   Supabase account — never your real one, since these tests create and
   delete data on every run.
2. Seed that account once (safe to re-run any time):
   ```
   npm run seed:e2e
   ```

## Running

```
npm run test:e2e       # headless, once
npm run test:e2e:ui    # interactive Playwright UI mode
```

The config auto-starts `npm run dev` if nothing is already listening on
`:3000`, and reuses your existing dev server if one is.

## How auth works

`auth.setup.ts` runs first, logs in once with `E2E_EMAIL` / `E2E_PASSWORD`,
and saves the session to `tests/e2e/.auth/user.json` (gitignored). Every
other spec reuses that file instead of logging in again.

## Notes

- `risk.spec.ts` needs 7+ days of focus history to see a real score instead
  of the "not enough data" gate — `seed:e2e` provides that. If it's ever
  missing (e.g. against a fresh Supabase project), the test skips itself
  with a message pointing back here instead of failing.
- `planner.spec.ts` always cancels the draft it generates, so re-running the
  suite never leaves a confirmed plan behind.
- `assignments.spec.ts` creates and archives its own uniquely-named
  assignment per run — it never touches the seeded baseline one.
