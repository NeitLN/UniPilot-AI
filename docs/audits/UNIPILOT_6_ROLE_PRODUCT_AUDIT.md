# UniPilot AI — 6-Role Complete Product Audit

**Audit date:** 2026-08-05
**Auditor:** Claude Opus 5, acting in six independent roles
**Scope:** functional, UX, visual, product, architecture
**Code changes made during the audit:** none — see §22 for what was fixed afterwards

---

## 1. Executive Summary

UniPilot AI is in materially better shape than a first-time audit usually finds. The
things that are hardest to retrofit — row-level authorization, route protection,
database-level data integrity, responsive layout — are all correct, and I verified
each of them by execution rather than by reading.

**One finding is serious.** The offline mutation queue is not bound to a user and is
never cleared on sign-out. On a shared browser, work queued by one student replays
into the next student's account. I reproduced the persistence half of this directly
(§8.12, evidence `offline-queue.log`); the replay half follows from code that has no
branch capable of preventing it.

Everything else found is medium or low: an unenforced formatter whose configuration
disagrees with the codebase, one non-reproducible hydration warning, and a README
pointing at a file that does not exist.

**What I could not verify** is listed in §20 and is genuinely substantial: live Google
Calendar OAuth, real push delivery, Gemini failure modes, multi-tab timer behaviour,
service-worker offline caching, and any browser other than Chromium. None of these
were skipped for convenience — each needs an external account, a second device, or a
failure I cannot induce safely against a shared database.

| | Count |
|---|---:|
| **P0 — Critical** | **0** |
| **P1 — High** | **1** |
| **P2 — Medium** | **4** |
| **P3 — Low** | **4** |
| Suggestions / intentional deviations | 6 |

**Verdict: `READY FOR CLOSED BETA`** — conditional on fixing OFF-001 first, since it
is a cross-user data problem and closed beta is exactly where students start sharing
lab machines.

---

## 2. Audited Version

| | |
|---|---|
| **Commit audited** | `a3c905da3a04665dc151f644cbe0d0500a4225da` |
| **Branch** | `feat/ui-redesign-and-audit` |
| **Working tree** | clean (0 modified files at audit start) |
| **`origin/main`** | `bf09fad6ad6b3c5767d319ecf57d2dda0b73cce4` |
| **Relationship** | HEAD is **39 commits ahead** of `origin/main`, 0 behind |

### Version mismatch — read this before using the report

The commit named in the audit brief, `bf09fad`, **is `origin/main`**. It is not the
newest code. The branch under audit carries 39 further commits, and the brief's own
description of the repository is already stale against it:

| Brief says | Actual at `a3c905d` |
|---|---|
| migrations `0001`–`0018` | `0001`–**`0021`** (adds FK indexes, rate limiting, plan nudges) |
| — | `lib/rate-limit.ts`, `lib/observability/*`, `lib/notifications/plan-nudge.ts` exist |
| — | `/api/health`, `/api/errors` route handlers exist |

**Findings in this report describe the branch, not production.** Production currently
serves `main`. Where a finding is branch-only I say so explicitly.

---

## 3. Environment

| | |
|---|---|
| OS | Windows 11 (10.0.26200) |
| Node | v24.12.0 |
| npm | 11.6.2 |
| Next.js | 16.2.12 |
| React | 19.2.4 |
| Tailwind | v4 |
| supabase-js | ^2.111.0 |
| Vitest | ^4.1.10 |
| Playwright | ^1.62.0 |
| Browser tested | Chromium only |
| Supabase project | one project; dev and production share it |

### Test-account safety

`E2E_EMAIL` resolves to `e2***@unipilot.local` — a dedicated, non-routable test domain,
matching user `ef923bf5`. Seeding and E2E were therefore safe to run.

**However**, the same database also holds a real Gmail account (`188fd15e`). There is no
separate test database. I touched no data belonging to that user, and every write I made
is accounted for in §20.1.

---

## 4. Commands and Results

Raw output: `docs/audits/evidence/baseline.log`

| Command | Exit | Duration | Result |
|---|---:|---:|---|
| `npm run format:check` | **1** | 4s | **FAIL — 302 of 599 tracked files** |
| `npx tsc --noEmit` | 0 | 3s | clean |
| `npm run lint` | 0 | 8s | clean |
| `npm test` | 0 | 11s | **451 passed**, 40 files |
| `npm run build` | 0 | 10s | compiled successfully |
| `npx playwright test` | 0 | 258s | **47 passed** |

`npm ci` was not re-run: `node_modules` was already installed from this exact
lockfile and reinstalling would have destroyed nothing but gained nothing.

There is no `typecheck` script; `npx tsc --noEmit` was used, as the brief anticipated.

---

## 5. Route Coverage

Every route was probed twice — once with no session, once with the E2E session —
recording status and redirect target. Raw: `evidence/route-auth.json`.

### Pages

| Route | anonymous | authenticated | Verdict |
|---|---|---|---|
| `/login` | 200 | 307 → `/` | correct |
| `/forgot-password` | 200 | 307 → `/` | correct |
| `/reset-password` | 200 | 200 | correct — a signed-in user may still reset |
| `/` | 307 → `/login` | 200 | protected |
| `/onboarding` | 307 → `/login` | 200 | protected |
| `/assignments` | 307 → `/login` | 200 | protected |
| `/planner` | 307 → `/login` | 200 | protected |
| `/schedule` | 307 → `/login` | 200 | protected |
| `/courses` | 307 → `/login` | 200 | protected |
| `/focus` | 307 → `/login` | 200 | protected |
| `/gpa` | 307 → `/login` | 200 | protected |
| `/risk` | 307 → `/login` | 200 | protected |
| `/reports` | 307 → `/login` | 200 | protected |
| `/notifications` | 307 → `/login` | 200 | protected |
| `/settings` | 307 → `/login` | 200 | protected |

**12 of 12 protected pages reject anonymous access.** No gaps.

### API routes

| Route | anonymous | authenticated | Notes |
|---|---|---|---|
| `GET /api/health` | 200 | 200 | intentionally public (liveness) |
| `GET /api/export` | 307 → `/login` | 200 | |
| `GET /api/calendar/sync` | 307 → `/login` | 405 | POST-only; correct |
| `GET /api/calendar/oauth/start` | 307 → `/login` | 307 → Google | |
| `GET /api/calendar/oauth/callback` | 307 → `/login` | 307 → `/schedule?error=state_mismatch` | **CSRF state validated** |
| `GET /api/cron/notifications` | **401** | **401** | `CRON_SECRET`, not a session |
| `GET /auth/confirm` | 307 → `/reset-password` | 307 → `/reset-password` | |
| `POST /api/plan/generate` | 307 → `/login` | 200 | ran a real Gemini call — see §20.1 |
| `POST /api/risk/compute` | 307 → `/login` | 200 | |
| `POST /api/push/subscribe` | 307 → `/login` | 400 | rejects an empty body |
| `POST /api/push/send` | 307 → `/login` | 200 | |
| `POST /api/errors` | 307 → `/login` | 204 | always 204 by design |

**No API route is reachable unauthenticated.** The OAuth callback rejecting a forged
request with `state_mismatch` is a real CSRF defence, confirmed by execution.

---

## 6. Existing Test Coverage

**Unit — 451 tests across 40 files.** `lib/rules/` coverage is complete: 15 of 15
modules have a matching spec.

| Area | Files |
|---|---|
| `tests/rules/` | 15 modules, 1:1 with `lib/rules/` |
| `tests/components/` | 6 — incl. two guard tests (semantic colour, hover token) |
| `tests/calendar/`, `push/`, `offline/`, `risk/`, `gemini/`, `audio/`, `notifications/`, `observability/`, `ui/` | infrastructure |

**E2E — 47 tests, Chromium only.**

| Spec | Tests |
|---|---:|
| settings | 7 |
| assignments | 6 |
| courses, focus, layout, reports | 3 each |
| dark-mode-contrast, gpa, health, planner, risk, schedule | 1 each |

---

## 7. Coverage Gaps

Not "untested code" — **flows a shipped regression could pass straight through**.

| Gap | Risk if broken | Priority |
|---|---|---|
| **Sign-up** | new users cannot join; nothing detects it | **P1** |
| **Forgot / reset password** | account lockout, unrecoverable | **P1** |
| **Onboarding** | first-run experience; every new account hits it | **P1** |
| **Offline queue replay** | see OFF-001 — the one finding with real user impact | **P1** |
| Account deletion | irreversible, and legally load-bearing | P2 |
| Export (JSON/CSV) | silent data corruption, CSV injection | P2 |
| Notifications page + deep links | dead-end navigation | P2 |
| Full Focus cycle incl. breaks | timer is a daily-use surface | P2 |
| Multi-tab Focus timer | double-counted sessions | P2 |
| Cross-user authorization at HTTP level | RLS verified at SQL level only | P2 |
| Calendar OAuth + sync failure | silent desync | P2 |
| Push permission denied path | broken settings toggle | P3 |
| Firefox / WebKit | Safari is dominant on student iPhones | P3 |
| Keyboard-only, screen reader, reduced motion | accessibility regressions | P3 |

The four P1 gaps share a shape: **they are the flows a user hits before the tested
ones**. The suite protects the app well *after* a working account exists.

---

## 8. Senior QA Engineer Review

### 8.1 Authentication — `CONFIRMED` correct

All 12 protected pages redirect anonymous users to `/login`; signed-in users are
bounced off `/login` and `/forgot-password`. `/reset-password` stays reachable while
signed in, which is right — a user who suspects compromise must be able to rotate a
password without signing out.

Sign-up, password reset delivery, email confirmation and session expiry were **not**
exercised (§20).

### 8.2 Data integrity — `CONFIRMED` strong

The database enforces its own invariants rather than trusting the application:

| Table | Constraint |
|---|---|
| `grades` | `grade_point` 0–4; `credit_hours > 0` |
| `assignments` | `weight` 0–100; `progress` 0–100; `score` null or 0–100 |
| `courses` | `credits > 0` |
| `focus_sessions` | `duration_seconds > 0` |
| `profiles` | `target_gpa` 0–4; `program_total_credits` null or > 0; `weekly_availability_hours ≥ 0`; `default_focus_minutes ∈ {25,45,60}`; `daily_focus_goal_cycles` 1–12; `avatar_color` enumerated |

**13 CHECK constraints.** Every boundary the brief asks about (grade point out of
range, zero/negative credits, weight above 100) is refused by Postgres itself, not
only by a form. Server Actions validate too — `createGrade` calls `validateGrade`
server-side *and* checks `courseBelongsToCaller`. That is two independent layers.

### 8.3 AI Planner — `CONFIRMED` well defended

The model is explicitly distrusted, which is the correct posture:

1. Rate limited per user *before* the paid call (`RATE_LIMITS.planGenerate`, 10/hour).
2. Output parsed by a total function that returns `null` rather than throwing.
3. **Sessions referencing an assignment the model was not given are dropped** —
   `assignmentIds.has(s.assignmentId)` in `route.ts`.
4. Survivors re-validated server-side: end-after-start, class overlap, past due date,
   daily availability cap.
5. Drafts cancelled before a new one is inserted, so only one draft exists.

Gemini timeout returns 504 with `retryable: true`; unreachable returns 502. Both are
classified rather than collapsed into a 500.

### 8.12 Offline / PWA — `CONFIRMED` defective → **OFF-001**

The README promises: *"edits made offline queue up and sync automatically once you're
back online."* The queue works. **What it does not do is remember whose edits they are.**

```
// lib/offline/idb.ts
const DB_NAME = "unipilot-offline";        // fixed per origin, not per user
export interface QueuedMutation {
  id: number; kind: MutationKind;
  payload: Record<string, unknown>;
  createdAt: string;                        // ← no userId, anywhere
}
```

`applyMutation` replays by calling the ordinary Server Actions, which act as
**whoever is signed in at flush time**. Nothing in `app/`, `components/` or `lib/`
calls `clearQueue` or `deleteDatabase`, and neither `signOut()` call site touches
IndexedDB.

I reproduced the observable half directly (`evidence/offline-queue.log`):

```
WRITE:            written
BEFORE SIGN-OUT:  [{kind: createAssignment, hasUserId: False}]
SIGNED OUT:       True
AFTER SIGN-OUT:   [{kind: createAssignment, hasUserId: False}]   ← survives
```

Full finding in §14.

### 8.13 Other QA observations

- **Idempotency done right.** `risk_scores` is unique on `(user_id, score_date)` and
  upserted, so the repeated computation triggered by Dashboard + RiskHud + `/risk` in
  one render cannot produce duplicate daily scores.
- **Concurrency handled.** `updateAssignment` carries `snapshotUpdatedAt` and the
  offline replay path returns `"conflict"` rather than overwriting — genuine
  optimistic concurrency, not last-write-wins.

---

## 9. UX Researcher Review

**This is a heuristic walkthrough of real screens, not user research.** No human used
this product. Nothing below should be quoted as a user finding.

| Flow | Goal | Steps | Friction | Drop-off risk | Recommendation |
|---|---|---:|---|---|---|
| New user → useful Dashboard | see value once | 3 onboarding steps + 1 | Collects availability, one course, one task before showing anything | **Medium** | Let the Dashboard render with one course; defer availability to first Planner use |
| Assignment → Planner → confirm → Schedule → Focus | turn a deadline into time | 6–8 | The draft/confirm split is the app's best idea but its least explained | Medium | Say what confirming *does* ("adds 6 blocks to your Schedule") before the click |
| Focus done → Dashboard → Weekly Report | feel progress | 2 | Report is weekly; a first session shows nothing | **High** | Acknowledge the first session immediately |
| Course → Grade → Forecast | answer "what do I need?" | 4 | Forecast needs target GPA **and** program credits, neither collected at onboarding | **High** | Partly addressed on this branch by `OnTrackSetupCard`, which now names the missing field instead of rendering nothing |
| High workload → recommendation → action | reduce load | 3 | `topSuggestion` names a factor, not a task | Medium | Link the suggestion to the specific assignment driving it |
| Calendar connect → sync → plan | avoid double-booking | 4 | Value invisible until a plan is generated | Medium | Show imported class count immediately |
| Notification → deep link → resolve | close a loop | 2 | Good | Low | — |

**Strongest UX answer in the product:** the Planner's draft state. It refuses to
pretend AI output is a commitment. Most student AI tools get this wrong.

**Weakest:** the three-way split between Assignments (what), Planner (when, proposed)
and Schedule (when, committed). It is coherent once learned and opaque before that,
and nothing in the UI teaches the distinction.

---

## 10. Senior Product Designer Review

Measured in a real browser at three viewports × two themes across 11 routes — 66 page
loads. 22 full-page screenshots were captured and reviewed; they are not committed
(4.0 MB against 69 KB of logs, and the visual pass came back clean, which
`evidence/ui-*.json` already records numerically). Regenerate with the probe in
§4 if a future run needs them.

### Automated results — `CONFIRMED` clean

| Check | mobile 375 | tablet 768 | desktop 1440 |
|---|---|---|---|
| Horizontal overflow | none | none | none |
| Touch targets < 24px | none | none | none |
| Console errors | none | none | none |
| `<h1>` per page | exactly 1 | exactly 1 | exactly 1 |
| Broken images | none¹ | none | none |

¹ One `<img>` reported zero natural size on `/focus` at 375px. **This was my probe
being wrong, not a defect**: the Pilo mascot carries `hidden … sm:block`, so below
640px it is `display:none` and the browser correctly never fetches it.

Zero horizontal overflow across every route and viewport is unusual and worth stating
plainly — it is the single most common responsive defect and this app does not have it.

### Mascot usage — `INTENTIONAL_DEVIATION`, correct

Route-to-mascot mapping matches `public/mascots/`. Mascots carry `alt=""`, which is
right: they are decorative, and announcing "Pilo waving" to a screen reader would add
noise, not information. They are hidden on small screens rather than shrunk — the
concepts show them large, and shrinking a character to 40px would have made it
illegible rather than charming.

### Pixel-match

Design concepts live in `docs/design-concepts/`. A prior review
(`DESIGN_PIXEL_MATCH_GAP_REVIEW.md`) already tracks per-screen deltas and I did not
re-derive it. One documented divergence is worth endorsing explicitly:

**`CompletedRows` shows one label ("Completed") where the concept shows two
("Submitted"/"Completed").** The schema has a single terminal state. Inventing the
second label would fabricate data. Marked `INTENTIONAL_DEVIATION` — the honest label
is the better product.

---

## 11. Gen Z Student Beta Tester Review

**Simulated personas. Not real testers.** These are structured predictions from the
built screens, and should be treated as hypotheses to test with humans.

### Persona A — new student, mobile-first

- **First impression:** looks like a product, not a school portal. Violet/lime and the
  mascot read as current rather than corporate.
- **Hardest to understand:** why Assignments, Planner and Schedule are three places.
- **Loses patience at:** onboarding asking for weekly availability before showing
  anything.
- **Trust in AI:** medium-high — the draft-before-commit step earns it.
- **Score: 7/10.** Would return, if the first session felt acknowledged.

### Persona B — deadline-heavy, procrastinates

- **Best moment:** generating a plan and seeing real blocks land on the Schedule.
- **Most valuable:** recurring assignments and Quick Wins.
- **Risk:** the mid-week "plan is slipping" nudge added on this branch is either the
  best or worst feature here depending entirely on tone. Its three guards (≥3 elapsed
  sessions, ≥2 days left, below 50%) are the right instincts.
- **Score: 8/10.**

### Persona C — GPA-focused

- **Best moment:** required-average forecast.
- **Blocker:** needs both target GPA and program credits, neither collected during
  onboarding. Previously the card rendered *nothing*; this branch now explains what is
  missing.
- **Score: 7/10.**

### Direct answers

- **Genuinely Gen Z?** Yes — and, more importantly, without being childish. The
  mascot supports content rather than replacing it.
- **Too many dashboards/charts?** Borderline. Dashboard runs KPI row → risk HUD →
  five more cards. A first-time user sees a lot before doing anything.
- **Wow moment:** AI Planner producing a real, editable week.
- **Weakest justification:** Workload Risk. It is the differentiator and it is a number
  most students will not act on without being told which task to drop.
- **Day-one quit risk:** onboarding asking for availability before demonstrating value.

---

## 12. Product Manager Review

| Feature | Verdict | Why |
|---|---|---|
| AI Planner | **KEEP** | The differentiator. Draft/confirm is the right shape. |
| Assignments + recurring | **KEEP** | Table stakes, well built. |
| Focus Timer | **KEEP** | Highest-frequency surface; drives every other metric. |
| Weekly Report | **IMPROVE** | Weekly cadence is too slow to build a habit alone. |
| Workload Risk | **IMPROVE** | Score without a named action. Now shows a delta on this branch — the right direction. |
| GPA On-track | **IMPROVE** | Depends on fields onboarding never asks for. |
| Google Calendar | **KEEP** | Import is what makes the Planner's output trustworthy. |
| Notifications | **SIMPLIFY** | Two of five categories were dead switches; removed on this branch. |
| Offline mode | **VALIDATE** | Real engineering cost, unproven demand, and currently the source of the one P1. |
| Pilo mascot | **KEEP** | Cheap identity, no maintenance burden. |
| Dashboard briefing | **MERGE** | Overlaps "Today" and "Due soon". |

**Three to improve now:** (1) onboarding → first value, (2) Workload Risk → one named
action, (3) Focus → immediate acknowledgement rather than waiting for a weekly report.

**Three to defer:** offline mode expansion, month view polish, additional AI surfaces.

**Three not to build:** social/leaderboard features, AI chat tutor, gamified streak
economy. Each adds a retention mechanic that competes with the one honest mechanic the
app already has.

- **North star:** weekly *planned-and-kept* study sessions.
- **Activation:** first confirmed plan **plus** one completed focus session inside it.
- **Retention:** proportion of students with ≥1 confirmed plan in 3 of any 4 weeks.

---

## 13. Senior Full-stack Technical Lead Review

### 13.1 Authorization — `CONFIRMED` correct, verified by execution

I did not read the policies and call them fine. I assumed the `authenticated` Postgres
role with a second user's JWT claims and attacked the first user's data, inside a
transaction that was rolled back (`evidence/rls-cross-user.log`).

| Attack | Result |
|---|---|
| Read 10 tables' rows belonging to another user | **0 rows visible, all 10** |
| `update assignments` / `delete grades` / `update profiles` on another user | **0 rows affected** |
| Insert a row *owned by* another user | **refused** — RLS violation |
| Attach a `study_session` to another user's `study_plan` | **refused** — RLS violation |

`RESULT: NO CROSS-USER ACCESS`. Post-rollback state verified empty.

All 15 public tables have RLS enabled with a policy. `rate_limits` deliberately has
**zero** policies — only its `security definer` function writes to it, which is the
correct pattern, and I confirmed `prosecdef = true`.

The child-table policy is the one most often got wrong, and here it is right:

```sql
-- study_sessions, both USING and WITH CHECK
EXISTS (SELECT 1 FROM study_plans p
        WHERE p.id = study_sessions.plan_id AND p.user_id = auth.uid())
```

`WITH CHECK` as well as `USING` is what stops an attacker *inserting* into someone
else's plan, and it is present.

### 13.2 Gemini — `CONFIRMED` sound

Key is server-only. Output is filtered by assignment ownership before validation, so
prompt injection cannot make the model schedule against another user's assignment —
the ID would not be in the offered set and the session is dropped. Rate limited before
the paid call.

`SUGGESTION (TL-003)`: `validateSessions` itself does not verify ownership. It is only
ever called with pre-filtered input, so this is not a live bug — but it is a function
that *looks* safe to reuse and is not. An unknown `assignmentId` yields
`assignmentDueAt[id] === undefined`, which skips the due-date check and returns
`valid: true`. Worth an ownership parameter or a comment.

### 13.3 Offline queue — `CONFIRMED` defective

See OFF-001. Ordering (`sort by id`), idempotency (delete-after-apply), conflict
detection (`snapshotUpdatedAt`) and permanent-failure handling (`break`, retry next
flush) are all implemented thoughtfully. **User isolation is the one property missing,
and it is the one that matters most.**

Second-order effect worth noting: a queued `updateAssignment` targeting user A's row
will be refused by RLS under user B's session. `applyMutation` throws, the loop
`break`s, and the queue **stalls permanently** — every later mutation is stuck behind
a poison entry with no dead-letter path.

### 13.4 Performance

Foreign-key indexes were added in `0021` (branch only); 11 of 11 present. Largest
table is 83 rows, so no query-plan conclusions can honestly be drawn at this scale —
performance is `UNVERIFIED` rather than good.

### 13.5 Tooling — `CONFIRMED` broken

`npm run format:check` fails on **302 of 599** tracked files, and CI never runs it
(`ci.yml` runs lint, tsc, test, build only). I first assumed CRLF line endings and
**that was wrong** — an LF-normalised copy still fails. The real cause is that
`.prettierrc.json` sets no `printWidth`, so Prettier uses 80 while the codebase is
written at ~100. Parts of the tree have since been formatted at each width, so it is
now genuinely mixed.

Consequence: running the documented `npm run format` would produce a 302-file diff and
bury any real change in review.

---

## 14. Consolidated Findings

### OFF-001 — Offline queue is not bound to a user and survives sign-out

| Field | Value |
|---|---|
| **ID** | OFF-001 |
| **Status** | **CONFIRMED** (persistence reproduced; replay path established from code) |
| **Roles** | Senior QA Engineer, Technical Lead |
| **Priority** | **P1** |
| **Route** | all authenticated pages; `lib/offline/*` |
| **Files** | `lib/offline/idb.ts`, `lib/offline/queue.ts`, `app/(app)/settings/actions.ts` |
| **Finding** | Queued offline mutations carry no user identity, live in a per-origin IndexedDB database, and are never cleared on sign-out. They replay as whoever is signed in at flush time. |
| **Preconditions** | Shared browser profile — a library PC, a shared laptop, a phone lent to a friend. |
| **Reproduction** | 1. Sign in as A. 2. Go offline. 3. Create or edit an assignment, or log a focus session. 4. Sign out without reconnecting. 5. Sign in as B. 6. Regain connectivity. |
| **Expected** | A's queued work is either discarded at sign-out or replayed only into A's account. |
| **Actual** | Queue persists across sign-out with no owner (`hasUserId: False`); `applyMutation` calls Server Actions that use the **current** session. |
| **Evidence** | `evidence/offline-queue.log`; `idb.ts:13-18` (no `userId`); no `clearQueue`/`deleteDatabase` call anywhere in `app/`, `components/`, `lib/`. |
| **User impact** | `createAssignment` puts A's coursework — title, notes, due date — into B's account. `logFocusSession` corrupts B's stats, streak and risk score. `updateAssignment` is refused by RLS, which throws and **stalls the queue permanently** behind a poison entry. |
| **Root cause** | The queue was designed around a single-user device; identity was never part of the record. |
| **Recommendation** | Store `userId` on every queued mutation; skip (and surface) entries whose owner is not the current user; clear the queue on sign-out; give repeatedly-failing entries a dead-letter path so one poison record cannot stall the rest. |
| **Acceptance** | An automated test signs in as A, queues offline, signs out, signs in as B, goes online, and asserts B's account is unchanged and A's queue is preserved or explicitly discarded. |
| **Effort** | **M** |
| **Confidence** | **High** |

### FMT-001 — `format:check` fails on half the repo and CI never runs it

| Field | Value |
|---|---|
| **Status** | **CONFIRMED** · **Roles** Technical Lead · **Priority** **P2** |
| **Files** | `.prettierrc.json`, `.github/workflows/ci.yml` |
| **Finding** | 302 of 599 tracked files fail `npm run format:check`; CI runs lint/tsc/test/build but not format. |
| **Evidence** | `evidence/baseline.log`; `.prettierrc.json` has no `printWidth`; codebase written at ~100, Prettier defaults to 80; an LF-normalised copy still fails, ruling out line endings. |
| **Impact** | The documented `npm run format` would emit a 302-file diff, hiding real changes. New contributors hit a failing script on a clean checkout. |
| **Recommendation** | Set `printWidth` to the width actually used, reformat once in a single isolated commit, then add `format:check` to CI so it cannot drift again. |
| **Effort** | S (config) + M (one-time reformat) · **Confidence** High |

### HYD-001 — React hydration mismatch on a form

| Field | Value |
|---|---|
| **Status** | **PROBABLE** · **Roles** QA, Technical Lead · **Priority** **P2** |
| **Evidence** | `evidence/e2e.log:2` — React hydration diff containing `- novalidate="true"` during the E2E run. |
| **Reproduction** | **Not reproducible on demand.** I loaded all 11 routes in dev and opened + submitted the Assignment, Course, Grade and Event dialogs, capturing every console message: no hydration diagnostic appeared. |
| **Impact** | React discards server HTML and re-renders the subtree on the client — a visible flash and lost input focus if it happens mid-interaction. Dev-only as a *warning*; the re-render happens in production silently. |
| **Recommendation** | Re-run the E2E suite with the dev server log captured per spec to identify which flow emits it. Do not guess at a fix while the trigger is unknown. |
| **Effort** | S to diagnose · **Confidence** Medium — the log is real, the trigger is not yet known |

### DOC-001 — README references a file that does not exist

| Field | Value |
|---|---|
| **Status** | **CONFIRMED** · **Roles** QA · **Priority** **P3** |
| **Evidence** | `README.md:116` points to `docs/TRACEABILITY.md`; the file is absent. |
| **Impact** | The stated map from functional requirement → covering test cannot be followed. |
| **Recommendation** | Restore the file or drop the reference. |
| **Effort** | XS · **Confidence** High |

### TL-003 — `validateSessions` does not verify assignment ownership

| Field | Value |
|---|---|
| **Status** | **SUGGESTION** · **Roles** Technical Lead · **Priority** **P3** |
| **Evidence** | `lib/rules/plan.ts:94-97` — an unknown `assignmentId` makes `dueAt` undefined, skipping the due-date check and returning `valid: true`. The only caller pre-filters, so no live bug. |
| **Recommendation** | Take the allowed ID set as a parameter, or document that the caller must filter first. |
| **Effort** | XS · **Confidence** High |

### VER-001 — Audited branch is 39 commits ahead of production

| Field | Value |
|---|---|
| **Status** | **CONFIRMED** · **Priority** **P3** (process) |
| **Evidence** | `git rev-list --count origin/main..HEAD` = 39; `/api/health` on the deployed site returns a redirect, i.e. production predates that route. |
| **Impact** | Findings here describe the branch. Production runs `main` and does not contain migrations `0019`–`0021`, rate limiting, or the fixes on this branch. |
| **Recommendation** | Merge before treating this audit as a production assessment. |

### Confirmed non-issues

| Checked | Result |
|---|---|
| Cross-user read/write on 15 tables | `CONFIRMED` blocked — see §13.1 |
| Anonymous access to any route | `CONFIRMED` blocked — 12/12 pages, 12/12 APIs |
| OAuth callback CSRF | `CONFIRMED` — rejects with `state_mismatch` |
| Boundary values (GPA, credits, weight, progress) | `CONFIRMED` — 13 DB CHECK constraints + server-side validation |
| Horizontal overflow, touch targets, console errors | `CONFIRMED` clean — 66 page loads |
| Duplicate daily risk score | `CONFIRMED` prevented — unique `(user_id, score_date)` + upsert |
| Gemini returning another user's assignment ID | `CONFIRMED` filtered at the route |
| `/focus` mascot "failing to load" on mobile | `INTENTIONAL_DEVIATION` — `hidden sm:block`; my probe was wrong |
| Single label on completed rows | `INTENTIONAL_DEVIATION` — schema has one terminal state |

---

## 15. P0–P3 Backlog

| # | ID | P | Finding | Effort |
|---|---|---|---|---|
| — | — | **P0** | *none* | — |
| 1 | OFF-001 | **P1** | Offline queue replays into the wrong account | M |
| 2 | GAP-001 | P2 | No E2E for sign-up / password reset / onboarding | M |
| 3 | FMT-001 | P2 | `format:check` fails on 302 files; unenforced in CI | S+M |
| 4 | HYD-001 | P2 | Hydration mismatch on a form (trigger unknown) | S |
| 5 | GAP-002 | P2 | No E2E for export or account deletion | S |
| 6 | DOC-001 | P3 | README → missing `docs/TRACEABILITY.md` | XS |
| 7 | TL-003 | P3 | `validateSessions` ownership assumption undocumented | XS |
| 8 | VER-001 | P3 | Branch 39 commits ahead of production | — |
| 9 | GAP-003 | P3 | Chromium-only E2E; no Firefox/WebKit | M |

---

## 16. Feature Recommendations

| Feature | User problem | Value | Freq | Effort | Risk | MVP? | Success metric |
|---|---|---|---|---|---|---|---|
| First-session acknowledgement | Focus effort invisible until the weekly report | High | Daily | S | Low | **Yes** | D1 → D2 return rate |
| Risk → one named task | Score without an action | High | Weekly | M | Low | **Yes** | % of warnings followed by an action within 24h |
| Deferred onboarding | Availability demanded before value shown | High | Once | M | Med | **Yes** | Onboarding completion rate |
| "Explain this plan" | AI trust | Med | Weekly | S | Low | No | Plan confirm rate |
| Shared course templates | Repetitive setup | Med | Termly | L | Med | No | Courses created per user |

---

## 17. Test Recommendations

**Before closed beta**

1. E2E for OFF-001 exactly as written in its acceptance criteria — this is the fix's proof.
2. E2E for sign-up, forgot/reset password, onboarding. These gate every new account.
3. HTTP-level cross-user authorization test. RLS is verified at SQL level; nothing yet
   proves the app layer never hands one user another's row.

**Before public beta**

4. Export (JSON/CSV incl. formula-injection escaping) and account deletion.
5. Full Focus cycle including breaks, plus the multi-tab case.
6. Add `format:check` to CI once FMT-001 is resolved.

**Later**

7. WebKit — Safari dominates on student iPhones.
8. Keyboard-only and reduced-motion passes.

---

## 18. Release Readiness Scorecard

| Category | Score | Basis |
|---|---:|---|
| Functional correctness | 8 | 451 unit + 47 E2E green; core flows sound; one real defect |
| Data consistency | 9 | 13 DB CHECK constraints, optimistic concurrency, idempotent risk scoring |
| UX flow | 6 | Three-way Assignments/Planner/Schedule split unexplained; onboarding front-loads input |
| Visual design | 9 | Coherent, distinctive, zero overflow across 66 page loads |
| Gen Z fit | 8 | Current without being childish; mascot supports rather than decorates |
| Responsive design | 9 | Clean at 375/768/1440 in both themes |
| Accessibility | 7 | Contrast + touch targets + heading structure verified; screen reader and keyboard unverified |
| Performance | 5 | **Unverified** — 83-row tables prove nothing |
| Security and privacy | 7 | Authorization excellent; **OFF-001 is a privacy defect** |
| Test quality | 7 | Excellent on pure logic, absent on entry flows |
| Maintainability | 7 | Comments explain *why*; FMT-001 undermines review |
| Product value | 8 | Planner + Risk are genuinely differentiated |
| **Release readiness** | **7** | One P1 between here and closed beta |

---

## 19. Final Verdict

### `READY FOR CLOSED BETA` — after OFF-001 is fixed

**Why not lower.** Nothing is broken in the core loop. Authorization is not merely
present but survived direct attack. Data integrity is enforced by the database.
Layout is clean at every viewport tested. This is not a prototype.

**Why not higher.** OFF-001 puts one student's coursework into another student's
account on a shared browser, and shared browsers are exactly what closed-beta students
use. Additionally, sign-up, password reset and onboarding — the flows every new tester
hits first — have no automated coverage at all, so a regression there would reach
testers unannounced.

**Explicitly not part of this verdict:** that 47 E2E tests pass. They pass while
OFF-001 is present, which is precisely the point — a green suite is evidence about what
was tested, not about what works.

---

## 20. Unverified Areas

### 20.1 Writes I made, and their disposal

Full disclosure, since this ran against a database shared with a real account:

| Write | Disposal |
|---|---|
| `POST /api/plan/generate` during route probing created a **real draft plan (7 sessions) via a live Gemini call** | Deleted by id; sessions cascaded. Verified `plans: 0`. |
| RLS attack transaction | `ROLLBACK`; post-state verified `{pwned: 0, forged: 0, plans: 0}` |
| IndexedDB queue entry | `deleteDatabase`; re-read returned `[]`; no `AUDIT-PROBE` assignment reached the database |
| E2E suite | Ran against the dedicated `@unipilot.local` account only |

Final residue check: `{probe: 0, plans: 0}`. **No data belonging to the real Gmail
account was read, modified, or deleted.**

### 20.2 Not verified — and why

| Area | Why not | Needed |
|---|---|---|
| Google Calendar OAuth, sync, token refresh, revocation | Requires a real Google account; the brief forbids using one without a safe test environment | Dedicated Google test account |
| Push notification delivery, permission denial, invalid-subscription cleanup | Needs real browser push infrastructure and a second device | Test device + VAPID sandbox |
| Gemini timeout / malformed JSON / injection at runtime | Inducing them needs either fault injection or repeated paid calls | Mock harness |
| Service-worker offline caching, hard reload offline, install | Not exercised; distinct from the queue, which *was* tested | Manual session |
| Multi-tab Focus timer, clock changes, tab closed mid-session | Needs orchestrated multi-context timing | Dedicated harness |
| Sign-up, email confirmation, password reset delivery | Sending real mail from a shared project | Mail sandbox |
| Account deletion | Destructive and irreversible on a shared database | Isolated database |
| Query performance, N+1, index effectiveness | Largest table is 83 rows — any measurement would mislead | Seeded dataset at realistic scale |
| Firefox, WebKit, real mobile hardware | Playwright configured for Chromium only | Cross-browser CI |
| Screen reader, keyboard-only navigation | Automated checks cover contrast and target size, not operability | Manual AT pass |
| Whether Vercel Production points at this Supabase project | All 12 environment variables are marked Sensitive; Vercel refuses to reveal them, dashboard included | Owner confirmation |

---

## 21. Compliance Statement

- **No source code was modified.** `git status` at completion shows only the untracked
  `docs/audits/` directory created for this report.
- **No commit, push, pull request or deploy was made.**
- **`npm run format` was not run.**
- **No production migration, no database deletion.**
- **No real user account was used for testing.** The one real account in the shared
  database was neither read nor written.
- **No secrets appear in this report or in `docs/audits/evidence/`.** Email addresses
  in logs are masked.

---

## 22. Post-audit remediation

Everything above describes commit `a3c905d` and was written before any code
changed. This section records what was fixed afterwards, on request, so the report
is not read as still-current.

| Finding | Commit | Status |
|---|---|---|
| **OFF-001** (P1) | `22f0226` | **Fixed** |
| **GAP-001** (P2) — sign-up / reset / onboarding untested | `d65a3d4` | **Fixed** |
| AUTH-001 — new, found by the sign-up spec | `d65a3d4` | **Fixed** |
| FMT-001, HYD-001, DOC-001, TL-003 | — | open |

### OFF-001

Every queued mutation now carries its author's user id; reads go through an owner
index; the banner's count and the flush loop are both scoped to the signed-in user.
v1 records are dropped on upgrade — they predate the field, so their ownership is
unknowable, and replaying one of unknown ownership is the defect itself.

**One recommendation in §14 was walked back.** That finding said to clear the queue
on sign-out. Building it showed that to be wrong: sign-out is routine, and a student
who edited offline and signed out before reconnecting would silently lose the work.
The owner field alone stops the next session replaying it, which is the actual
danger. Local remanence is a weaker concern and not worth destroying data over.

Two further defects surfaced while implementing it, neither previously known:

- A permanently-failing record broke the flush loop on every attempt, so everything
  queued behind it waited forever. Three failures now retire it, and the banner says
  so rather than letting a change vanish silently.
- Raising the store version hung indefinitely when another tab held the old one —
  `onblocked` was unhandled, so the promise never settled and the banner would have
  sat on "syncing" forever.

### AUTH-001 — sign-up could create no session and say nothing

Found by the new sign-up spec on its first run, which is the argument for writing it.

`supabase.auth.signUp` returns **no error and no session** in two cases: email
confirmation is pending, and — deliberately — the address already has an account,
which Supabase answers identically so the form cannot be used to enumerate users
(`identities: []`, verified against the live project). The action checked only
`error`, so both redirected to `/`, the proxy found no session, and the student
landed back on the login form with nothing said.

One message now covers both, because distinguishing them is precisely the leak
Supabase is avoiding.

### Verification after remediation

| | Before | After |
|---|---:|---:|
| Unit tests | 451 | **456** |
| E2E tests | 47 | **61** |
| `tsc`, `lint`, `build` | clean | clean |

Two of the four new E2E specs failed on first run and **both were the spec's fault**,
not the app's: `getByRole("alert")` also matches Next.js's own route announcer, and
the onboarding step labels in `STEPS` are used only as React keys and never rendered.
The second is a real UX gap — a new student sees three anonymous numbered dots — and
is left for the onboarding work rather than fixed by weakening the test.

### Still open, in the order agreed

1. FMT-001 — set `printWidth`, reformat once, add `format:check` to CI
2. Workload Risk → name the specific task to act on
3. Lighter onboarding + explain Assignments → Planner → Schedule → Focus
4. Merge to `main`
