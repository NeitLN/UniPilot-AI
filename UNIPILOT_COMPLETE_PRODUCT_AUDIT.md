# UniPilot AI — Complete Product Audit

**Audit date:** 2026-08-05
**Audited revision:** working tree at `main` (`bf09fad`) **plus 70 uncommitted files** from the in-progress UI redesign work. This matters: the audit describes the code as it stands on disk right now, not as it stands in git history.
**Method:** static review, live database inspection, production build, and instrumented browser runs. Every claim below is labelled either **VERIFIED** (I measured or reproduced it) or **UNVERIFIED** (I could not test it in this environment and say so explicitly).

---

## 0. Corrections made while implementing this audit

Three findings below turned out to be wrong once the fixes were actually
attempted, and one thing the audit could not verify turned out to be a real
defect. Recorded here rather than silently edited, because the reasoning
errors are more useful to a future reader than a clean-looking report.

**A11Y-01 — the diagnosis was wrong, the finding was real.** The audit blamed
opacity modifiers (`/70`, `/80`) layered on muted tokens. Measuring the actual
call sites disproved that: alpha was 1.0 on every single failure, and the whole
codebase contains exactly one opacity-modified muted class. The real cause was
narrower — `--ink-3` had only ever been checked against the white `--card`
(5.06:1, passing) while also being used on `--canvas` (4.49), `--line` (4.40)
and `--violet-tint` (4.21). The token was fine on the one surface anyone had
tested it on. Fixed by retuning the token, not by removing modifiers.

**PERF-02 — half of it did not exist.** The audit named `lib/push/deliver.ts:91`
as an N+1. That line is inside `deliverDueNotifications`, the *single-user*
path, where the per-notification update is bounded and documented as a
deliberate trade-off. The path that actually scales,
`deliverAllDueNotifications`, was already batched under SR-05 and had been for
some time. The audit's grep found `await supabase` inside a loop and stopped
reading. Only `lib/calendar/push.ts` had a real problem, and even there the fix
is not batching — every session gets a different `gcal_event_id` back from
Google, and deferring the writes would turn one orphaned event on a crash into
N.

**UX-01 — two of the three cards already had empty states.** `GpaTrendChart`
and `PlanAdherenceCard` both branch on having no data. Only `LearningStats`
was missing one.

**Dark mode — listed as unverified, and it was broken.** The appendix
correctly said a dark-mode sweep had not been done. Doing it found 49 real
contrast failures across all ten routes, of a single shape: `.dark` redeclares
only 12 tokens, and the tint surfaces that deliberately stay light were being
paired with text tokens that flip (and vice versa). This was the largest real
defect in the product and the audit missed it entirely by not looking.

**Method note.** The first automated contrast sweep reported 34 failures; on
verification, 11 were measurement artifacts (an active nav pill painted by an
absolutely-positioned sibling the walker could not see). A later dark-mode
test reported all ten routes failing for a completely different reason —
`page.evaluate()` treats a string argument as an expression, so the measurement
function came back as `undefined` and the assertion failed on `undefined !== []`.
Both looked exactly like real findings. Any number in this report that was not
independently re-derived should be treated with that in mind.

---

## 1. Executive summary

UniPilot AI is in **substantially better shape than a typical product at this stage**. The security model is genuinely well-built, the pure business logic is well-factored and well-tested, and the whole application renders across every route and viewport with **zero console errors and zero horizontal overflow**.

The honest headline is that **I found no open P0 and no open P1**. That is a real result, not a soft one — I actively looked for authorization holes, data-loss paths and broken core workflows and did not find them. I am not going to manufacture severity to make the report look busier.

What I did find clusters into four themes:

| Theme | Severity | Why it matters |
|---|---|---|
| **No CI pipeline** | P2 | 346 unit + 33 e2e tests exist and nothing runs them. This is the *root cause* of the five stale e2e tests found and fixed earlier today — they had been broken for a while with nobody notified. |
| **11 foreign keys with no index** | P2 | Verified against the live database. Every RLS policy filters on `user_id`; several of those columns are unindexed. Fine at 41 rows, a cliff at 41,000. |
| **Opacity modifiers break WCAG AA** | P2 | The base colour tokens all pass AA. The failures come from `/70`, `/80` modifiers layered on top of tokens that were already tuned to the floor. |
| **No rate limiting anywhere** | P2 | `/api/plan/generate` calls a paid Gemini API behind nothing but an auth check. |

Two smaller but notable gaps: **no health check, no error monitoring, no deployment config in the repo**, and **`lib/push`, `lib/offline` and `lib/risk` have zero tests** — `lib/push` being the notification-delivery path that is hardest to verify by hand and has already shipped one silent bug (SR-01).

**Recommendation:** Stage 1 is small — it is mostly CI, indexes and rate limiting. None of it is a rewrite. The product does not need rescuing; it needs the operational scaffolding that stops it from quietly regressing.

---

## 2. What is already working well

I want to be specific here, because several of these are things teams usually get wrong.

**Security architecture — VERIFIED, and genuinely good.**

- All **14 tables** have RLS enabled, each with a policy scoped to `auth.uid()` carrying **both** `USING` and `WITH CHECK`.
- `study_sessions` has no `user_id` of its own and is correctly scoped through its parent plan:
  ```sql
  create policy "study_sessions_via_plan" on study_sessions
    for all using (exists (select 1 from study_plans p
      where p.id = study_sessions.plan_id and p.user_id = auth.uid()))
  ```
- The auth gate uses `supabase.auth.getUser()` (re-validates the JWT against the Auth server), **not** `getSession()` (which only reads a possibly-stale cookie). This is the single most commonly botched detail in Supabase SSR apps.
- The **service-role key is used in exactly two places** and both are properly authorized: account deletion (requires the user to type their own email, matched exactly server-side) and the cron route (Bearer `CRON_SECRET`).
- `lib/supabase/ownership.ts` closes a genuinely subtle hole most teams miss: RLS protects a row's own `user_id`, but it does **not** stop a user pointing `course_id` at a course they do not own. There is an explicit helper for exactly that, with a comment explaining why "not found" and "not yours" are deliberately indistinguishable.
- Google refresh tokens are **encrypted at rest** with AES-256-GCM and a random IV per token.
- No `.env` file is tracked by git; only `.env.local.example` with placeholder values.
- No endpoint anywhere accepts a client-supplied `user_id`.

**Runtime health — VERIFIED across 12 routes × 3 viewports (36 page loads).**

- Zero console errors.
- Zero horizontal overflow at 390px, 820px and 1440px.
- Zero failed network requests (the only aborted request was a page-teardown artifact on an audio file that correctly carries `preload="none"`).
- Zero pages failed to load.

**Accessibility fundamentals — VERIFIED.**

- **0** images missing `alt`, **0** buttons without an accessible name, **0** form controls without a label, across all 36 page loads.
- All 12 keyboard tab stops on the dashboard have a visible focus indicator; the skip link is the first stop and works.
- `prefers-reduced-motion` is handled in `globals.css` with 17 `motion-safe:` utilities backing it up.
- Every base design token passes AA: `ink-3` on `card` = **5.06:1** (light) / **5.61:1** (dark); `dusk-muted` on `ink` = **5.99:1**.

**Engineering discipline.**

- `lib/rules/` — 13 of 14 modules have dedicated unit tests. 346 tests pass.
- Business logic is genuinely pure and injectable (`now` is a parameter, not `new Date()` inside), which is why it is testable.
- Defense in depth on validation: `updateTargetGpa` validates in the client, again in the server action, **and** the column carries `check (target_gpa between 0 and 4)`.
- Comments explain *why*, not *what*, and repeatedly cite the measurement or review that motivated a decision.

---

## 3. Confirmed bugs

**This section is short, and that is the finding.** The e2e suite is fully green (33/33), the unit suite is green (346/346), and the instrumented sweep found no runtime errors. The defects below are real but are all presentational or structural rather than broken workflows.

Five functional e2e failures were found and fixed earlier today (duplicated DOM in `AssignmentCard`, accumulated test-data pollution, and three stale test assertions). They are **already fixed in the working tree** and are not re-listed as open.

---

### BUG-01 — `/reports` renders two `<h1>` elements

| Field | Value |
|---|---|
| **Screen** | Weekly report |
| **Specialist** | Accessibility Specialist |
| **Severity** | **P3** |
| **Category** | Accessibility / semantic HTML |
| **Effort** | **S** |
| **Regression risk** | Very low |

**Evidence (VERIFIED).** Automated sweep reported `h1Count != 1` for `/reports` only. Confirmed in source:
- `app/(app)/reports/page.tsx:218` → `<h1>Weekly report</h1>`
- `components/reports/WeeklyRecapHero.tsx:89` → `<h1>{headline(...)}</h1>`

**Reproduction.** Open `/reports`, run `document.querySelectorAll('h1').length` → returns `2`.

**Expected.** Exactly one `<h1>` per page — the page title.
**Actual.** Two: the page title and the hero's motivational headline ("You kept showing up.").

**Root cause (confirmed).** `WeeklyRecapHero` was written as a standalone hero that owned the page title, then a separate page-level header was added above it. Neither was demoted.

**Recommended solution.** Change the hero's headline to `<h2>` (or a `<p>` with display styling — it is a slogan, not a section heading). Keep the page's `<h1>`.

**Files.** `components/reports/WeeklyRecapHero.tsx`

**Acceptance criteria.** `/reports` reports exactly one `<h1>`; heading order runs h1 → h2 with no jumps; visual rendering unchanged.

---

### BUG-02 — `/courses` skips a heading level (h1 → h3)

| Field | Value |
|---|---|
| **Screen** | Courses |
| **Specialist** | Accessibility Specialist |
| **Severity** | **P3** |
| **Category** | Accessibility / WCAG 1.3.1 Info and Relationships |
| **Effort** | **S** |
| **Regression risk** | Very low |

**Evidence (VERIFIED).** Sweep reported one heading jump, on `/courses` only: `h1->h3: E2E Test Course`. Confirmed in source: `app/(app)/courses/page.tsx:124` is `<h1>Courses</h1>`; `components/courses/CourseCard.tsx:59` is `<h3>{course.name}</h3>`. No `<h2>` sits between them.

**Reproduction.** Open `/courses` with at least one course and inspect the heading outline.

**Expected.** Heading levels descend without gaps.
**Actual.** A screen-reader user navigating by heading level hears a missing level and may assume content was skipped.

**Root cause (confirmed).** `CourseCard` uses `<h3>` twice — once for the card title (line 59) and once inside its modal (line 110, where `<h2>` *is* correct because the modal is its own context). The card-level one was never reconciled with the page.

**Recommended solution.** Change the card title to `<h2>`. The modal's `<h2>` is correct as-is since a dialog starts a new heading context.

**Files.** `components/courses/CourseCard.tsx`

**Acceptance criteria.** `/courses` heading outline is h1 → h2 with no jumps; card typography unchanged.

---

### BUG-03 — Two controls on `/focus` are under the 24×24px minimum target size

| Field | Value |
|---|---|
| **Screen** | Focus timer |
| **Specialist** | Accessibility Specialist |
| **Severity** | **P3** |
| **Category** | Accessibility / WCAG 2.5.8 Target Size (Minimum), AA in WCAG 2.2 |
| **Effort** | **S** |
| **Regression risk** | Very low |

**Evidence (VERIFIED).** Measured bounding boxes at 1440px:
- "View all history" — **110 × 23 px**
- "This week" — **71 × 23 px**

Both are 1px under the 24px floor. (The skip link measures 1×1px, which is the standard visually-hidden pattern and expands on focus — **not** a defect; verified it is the first tab stop with a visible outline.)

**Reproduction.** Open `/focus` with more than 8 logged sessions so both controls render; measure `getBoundingClientRect()`.

**Expected.** Interactive targets are at least 24×24 CSS px.
**Actual.** 23px tall.

**Root cause (confirmed).** Both are bare text buttons styled only with `text-[12.5px] font-bold` and no padding or min-height.

**Recommended solution.** Add `min-h-6 px-1 -mx-1` (or `py-0.5`) so the hit area clears 24px without changing the visual weight.

**Files.** `components/focus/FocusHistoryCard.tsx`, `components/focus/LearningStats.tsx`

**Acceptance criteria.** Every interactive element on `/focus` measures ≥24px in both axes; layout visually unchanged.

---

## 4. UX/UI problems

### UX-01 — Empty and low-data states make several redesigned cards look broken rather than empty

| Field | Value |
|---|---|
| **Screen** | Focus timer, Weekly report, GPA tracker |
| **Specialist** | UX/UI Designer + Gen Z Student |
| **Severity** | **P2** |
| **Category** | UX / empty states |
| **Effort** | **M** |
| **Regression risk** | Low |

**Evidence (VERIFIED during this session's redesign work).** With a clean account, the Learning rhythm chart renders seven bars of 2px against a labelled axis, and Plan adherence renders a title with a single line of prose and no figure. Both read as "something failed to load" rather than "you have not done this yet."

**Expected.** An empty state should say what to do next.
**Actual.** The card renders its full chrome (title, axis, gridlines) around no data.

**Recommended solution.** For each data card, add an explicit zero-state branch with one sentence and, where sensible, a CTA — the pattern `FocusHistoryCard` already uses (`if (entries.length === 0) return null`) is better than rendering empty chrome, but returning `null` leaves a hole in the grid. Prefer a small illustrated state.

**Files.** `components/focus/LearningStats.tsx`, `components/reports/PlanAdherenceCard.tsx`, `components/gpa/GpaTrendChart.tsx`

**Acceptance criteria.** With a brand-new account, every card on `/focus`, `/reports` and `/gpa` shows either real data or a sentence explaining how to produce data. No card renders an axis with no series.

---

### UX-02 — "Below average" tag fires on the majority of rows, which destroys its signal

| Field | Value |
|---|---|
| **Screen** | GPA tracker → Course breakdown |
| **Specialist** | UX/UI Designer + Gen Z Student |
| **Severity** | **P3** |
| **Category** | UX / information design |
| **Effort** | **S** |
| **Regression risk** | Low |

**Evidence (VERIFIED).** `dragsGpaDown()` is `row.gradePoint < overallGpa`. With a realistic nine-course spread seeded during this session, **6 of 9 rows** carried the tag. A label that applies to two thirds of rows is decoration, not information.

**Root cause (confirmed).** The predicate is mathematically correct but has no materiality threshold — by definition roughly half of all courses sit below the mean.

**Recommended solution.** Either raise the bar to a meaningful gap (e.g. more than 0.3 below the cumulative GPA) or show the tag only on the single worst course. This is a product decision, not a bug fix; the current behaviour is defensible, just not useful.

**Files.** `lib/rules/gpa.ts` (`dragsGpaDown`), `components/gpa/CourseBreakdown.tsx`, plus its unit test.

**Acceptance criteria.** On a realistic dataset the tag appears on a minority of rows; the rule is unit-tested at the new threshold.

---

### UX-03 — Two different cards were both titled "Predicted grades"

| Field | Value |
|---|---|
| **Screen** | GPA tracker |
| **Specialist** | UX/UI Designer |
| **Severity** | **P3** — *already fixed in the working tree* |
| **Category** | UX / naming |

**Evidence (VERIFIED).** `PredictedScenarios` (the worst/likely/best trio) and `PredictedGrades` (the per-course list) both rendered an `<h2>Predicted grades</h2>`. A reader had no way to tell which card a number came from. Renamed to "Course predictions" during this session. Recorded here for completeness.

---

## 5. Security findings

### SEC-01 — No rate limiting on any endpoint, including the paid AI route

| Field | Value |
|---|---|
| **Screen** | `/api/plan/generate` (also `/api/export`, `/api/calendar/sync`, `/api/push/send`, `/api/risk/compute`) |
| **Specialist** | Application Security Engineer |
| **Severity** | **P2** |
| **Category** | Security / abuse and cost control (OWASP API4:2023 Unrestricted Resource Consumption) |
| **Effort** | **M** |
| **Regression risk** | Low |

**Evidence (VERIFIED).** `grep -rn "ratelimit\|rateLimit\|Retry-After\|429"` across `app/` and `lib/` returns **no matches**. `app/api/plan/generate/route.ts` checks `getUser()` and a business gate (`canGeneratePlan`), then calls Gemini. There is no per-user throttle and no 429 path anywhere in the codebase.

**Reproduction.** Sign in as any user and POST `/api/plan/generate` repeatedly. Each call reaches the Gemini API. *(I did not actually run this — doing so would incur real cost against your API key. The absence of any throttle is confirmed statically.)*

**Expected.** A signed-in user cannot drive unbounded spend or load.
**Actual.** Any authenticated user can call the paid AI endpoint as fast as the network allows. `/api/export` has the same property and is I/O-heavy.

**Root cause (confirmed).** Rate limiting was never implemented; auth was treated as sufficient.

**Recommended solution.** Add a per-user, per-route limiter. Given the stack, the lowest-friction option is a `rate_limits` table (`user_id`, `route`, `window_start`, `count`) with an atomic upsert, or Upstash Redis if you want it off the primary database. Prioritise `/api/plan/generate` (cost) and `/api/export` (I/O). Return `429` with `Retry-After`.

**Files.** New `lib/rate-limit.ts`; wire into `app/api/plan/generate/route.ts`, `app/api/export/route.ts`, `app/api/calendar/sync/route.ts`.

**Acceptance criteria.** The 11th plan-generation request within an hour returns `429` with `Retry-After`; the limit is enforced server-side and covered by a test.

---

### SEC-02 — Supabase environment variables use non-null assertions instead of validated reads

| Field | Value |
|---|---|
| **Screen** | App-wide bootstrap |
| **Specialist** | Application Security Engineer + DevOps |
| **Severity** | **P3** |
| **Category** | Configuration robustness |
| **Effort** | **S** |
| **Regression risk** | Very low |

**Evidence (VERIFIED).** Eight occurrences of `process.env.X!`: `NEXT_PUBLIC_SUPABASE_URL!` (×4), `NEXT_PUBLIC_SUPABASE_ANON_KEY!` (×3), `SUPABASE_SERVICE_ROLE_KEY!` (×1). By contrast `lib/calendar/oauth.ts`, `lib/calendar/tokenCrypto.ts` and `lib/gemini/client.ts` all validate properly and throw `Missing required env var: X`.

**Expected.** A misconfigured deploy fails immediately with a clear message.
**Actual.** A missing Supabase key produces an opaque downstream failure inside the Supabase client rather than a named error.

**Recommended solution.** Reuse the existing `requireEnv(name)` pattern already present in `lib/calendar/oauth.ts` for the three Supabase variables.

**Files.** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`, `lib/supabase/middleware.ts`

**Acceptance criteria.** Booting without `NEXT_PUBLIC_SUPABASE_URL` fails with `Missing required env var: NEXT_PUBLIC_SUPABASE_URL`.

---

### SEC-03 — Fixed salt in the calendar-token key derivation

| Field | Value |
|---|---|
| **Screen** | Google Calendar token storage |
| **Specialist** | Application Security Engineer |
| **Severity** | **P3** — informational, not a live vulnerability |
| **Category** | Cryptography |
| **Effort** | **S** |
| **Regression risk** | **High** — changing the KDF invalidates every stored token |

**Evidence (VERIFIED).** `lib/calendar/tokenCrypto.ts:14` — `const KEY_SALT = "unipilot-calendar-token-v1";` then `scryptSync(secret, KEY_SALT, 32)`.

**Assessment.** This is **acceptable** as written. A fixed salt weakens a KDF when the input is a low-entropy password; here the input is a high-entropy server secret, and the salt's job (defeating precomputed rainbow tables across installations) is largely moot for a single-tenant secret. The per-token random IV and GCM auth tag are the parts that matter, and both are correct.

**Recommendation.** No action required. Documented so a future reviewer does not "fix" it and silently break decryption of every existing token. If it is ever changed, it needs a migration that re-encrypts, not a swap. The `v1` suffix in the salt already anticipates this.

---

## 6. Performance findings

### PERF-01 — Eleven foreign keys have no index

| Field | Value |
|---|---|
| **Screen** | Database-wide |
| **Specialist** | Database Engineer |
| **Severity** | **P2** |
| **Category** | Performance / scalability |
| **Effort** | **S** |
| **Regression risk** | Very low (additive) |

**Evidence (VERIFIED against the live database),** by querying `pg_constraint` for FK columns with no leading index:

```
assignments.course_id        focus_sessions.assignment_id    risk_warnings.user_id
class_blocks.course_id       grades.course_id                study_sessions.assignment_id
courses.user_id              notifications.assignment_id     study_sessions.plan_id
notifications.class_block_id notifications.user_id
```

Postgres does **not** auto-index foreign keys — only primary keys and unique constraints. The existing indexes cover `assignments(user_id, due_at)`, `class_blocks(user_id, start_at)`, `focus_sessions(user_id, started_at)` and the notification/recurrence cases, but not the above.

**Why each matters:**
- `courses.user_id`, `notifications.user_id`, `risk_warnings.user_id` — the RLS policy on every one of these tables filters `user_id = auth.uid()`. Unindexed, that is a sequential scan on **every single query**, for every user.
- `study_sessions.plan_id` — the RLS policy is a correlated subquery joining on `plan_id`. Unindexed, this is the worst of the set.
- `*.course_id` — deleting a course must scan children to enforce the FK. `deleteCourse` already checks for linked data, so this path runs in production.

**Expected.** Ownership filters and FK enforcement use an index.
**Actual.** Sequential scans. Current row counts are small (41 assignments, 55 focus sessions) so this is **not user-visible today** — it is a cliff, not a current outage.

**Recommended solution.** One additive migration:
```sql
create index if not exists courses_user_id_idx on courses (user_id);
create index if not exists notifications_user_id_idx on notifications (user_id);
create index if not exists risk_warnings_user_id_idx on risk_warnings (user_id);
create index if not exists study_sessions_plan_id_idx on study_sessions (plan_id);
create index if not exists study_sessions_assignment_id_idx on study_sessions (assignment_id);
create index if not exists assignments_course_id_idx on assignments (course_id);
create index if not exists class_blocks_course_id_idx on class_blocks (course_id);
create index if not exists grades_course_id_idx on grades (course_id);
create index if not exists focus_sessions_assignment_id_idx on focus_sessions (assignment_id);
create index if not exists notifications_assignment_id_idx on notifications (assignment_id);
create index if not exists notifications_class_block_id_idx on notifications (class_block_id);
```
Use `create index concurrently` if applying to a live production database with meaningful traffic.

**Files.** New `supabase/migrations/0019_missing_fk_indexes.sql`

**Acceptance criteria.** The `pg_constraint` audit query returns zero rows; `explain analyze` on a `courses` fetch shows an index scan.

---

### PERF-02 — N+1 writes in notification delivery and calendar push

| Field | Value |
|---|---|
| **Screen** | `lib/push/deliver.ts`, `lib/calendar/push.ts` |
| **Specialist** | Database Engineer + Performance Engineer |
| **Severity** | **P3** |
| **Category** | Performance |
| **Effort** | **M** |
| **Regression risk** | Medium — touches the delivery path, which has no tests (see TEST-01) |

**Evidence (VERIFIED).** `lib/push/deliver.ts:91` issues one `UPDATE notifications SET delivered_at, push_status WHERE id = ?` **per notification inside the loop**. `lib/calendar/push.ts:74` issues one `UPDATE study_sessions SET gcal_event_id WHERE id = ?` **per session inside the loop**.

**Assessment.** Bounded per user by the number of due notifications, so it is not pathological. But `deliverAllDueNotifications` runs across *every* user every 15 minutes, so total round-trips scale with (users × due notifications).

**Recommended solution.** Group by resulting status and issue one `UPDATE ... WHERE id = ANY($1)` per status bucket. For the calendar case, batch into a single upsert after the loop.

**Files.** `lib/push/deliver.ts`, `lib/calendar/push.ts`

**Acceptance criteria.** Delivering N notifications issues a constant number of UPDATE statements rather than N; behaviour covered by a new test.

---

### PERF-03 — Heavy static assets in `public/`

| Field | Value |
|---|---|
| **Screen** | Focus timer (audio), all mascot surfaces |
| **Specialist** | Performance Engineer |
| **Severity** | **P3** |
| **Category** | Performance / asset weight |
| **Effort** | **S** |
| **Regression risk** | Low |

**Evidence (VERIFIED).**
- Audio: **17 MB** total — `satie-gymnopedie-1.ogg` 6.3 MB, `satie-gymnopedie-3.ogg` 5.5 MB, `debussy-reverie.ogg` 3.9 MB, `omfgdude-lofi-loop.ogg` 1.4 MB.
- Mascot PNGs: **~3.6 MB** total — largest `pilo-ai-planner.png` at 655 KB.

**Mitigations already in place (verified, and they matter).** The `<audio>` element carries `preload="none"`, so nothing downloads until the user turns Lo-fi on. Every mascot is rendered through `next/image` with no `unoptimized` flag and there are **zero raw `<img>` tags**, so PNGs are served as resized WebP/AVIF, not at source weight.

**Residual risk.** A student on mobile data who enables Lo-fi pulls a 6.3 MB file with no warning and no indication of size.

**Recommended solution.** Re-encode the audio at a lower bitrate (a 128kbps loop is ample for background music and would cut these by ~70%), or trim to a shorter seamless loop. Optionally surface "streams ~2 MB" next to the Lo-fi toggle. Compress the source PNGs with `oxipng`/`pngquant` to reduce repo and build weight.

**Files.** `public/audio/*`, `public/mascots/*`, `components/focus/FocusTimer.tsx`

**Acceptance criteria.** Largest audio file under 2 MB; total `public/` under 6 MB; no audible quality regression at normal listening volume.

---

### PERF-04 — Measured page performance (baseline, no action required)

**Evidence (VERIFIED)** — production build, desktop 1440×900, localhost:

| Route | Transfer | DOMContentLoaded |
|---|---|---|
| `/` | 320 KB | 637 ms |
| `/risk` | 18 KB | **825 ms** |
| `/assignments` | 18 KB | 589 ms |
| `/schedule` | 18 KB | 520 ms |
| `/focus` | 17 KB | 530 ms |
| `/gpa` | 16 KB | 420 ms |
| everything else | 16–17 KB | 409–474 ms |

Total client JS is **1.0 MB across 35 chunks**, largest chunk 226 KB.

`/` transfers more because it is the first load and pulls the shared chunks; subsequent navigations are 16–18 KB, which is healthy. `/risk` is the slowest server render at 825 ms and is the one worth profiling if any becomes a complaint.

**Not measured (UNVERIFIED):** real Core Web Vitals (LCP/INP/CLS) under network throttling, on real devices, or against production hosting. Localhost numbers exclude network latency and CDN behaviour entirely. **Do not treat these as field data.**

---

## 7. Accessibility findings

### A11Y-01 — Opacity modifiers push text below WCAG AA

| Field | Value |
|---|---|
| **Screen** | App-wide; confirmed on `/risk`, `/settings`, `/courses`, `/assignments`, `/focus` |
| **Specialist** | Accessibility Specialist |
| **Severity** | **P2** |
| **Category** | Accessibility / WCAG 1.4.3 Contrast (Minimum) |
| **Effort** | **M** |
| **Regression risk** | Low |

**Evidence (VERIFIED).** This is the most interesting accessibility finding, because the naive reading is wrong.

**Every base token passes AA:**

| Pair | Ratio | Result |
|---|---|---|
| `ink-3` on `card` (light) | 5.06:1 | PASS |
| `ink-3` on `card` (dark) | 5.61:1 | PASS |
| `dusk-muted` on `ink` | 5.99:1 | PASS |
| `dusk-text` on `ink` | 8.24:1 | PASS |

**The failures come from opacity modifiers layered on top of them:**

| Composite | Ratio | Result |
|---|---|---|
| `text-ink-3/90` on `bg-card` | 4.12:1 | **FAIL** |
| `text-ink-3/80` on `bg-card` | 3.38:1 | **FAIL** |
| `text-ink-3/70` on `bg-card` | 2.83:1 | **FAIL** |
| `dusk-muted/80` on `bg-ink` | 4.30:1 | **FAIL** |

A live measurement on `/risk` confirmed a real instance: the factor-weight chips (`×0.40`, `×0.35`, `×0.25`) render at `rgb(108,95,148)` on `rgb(29,19,56)` = **3.08:1** at 11px, against a 4.5:1 requirement.

There are **47 opacity-modified text classes** across `components/` and `app/`. Most are `text-ink/70` on lime or mint fills, where `--ink` is so dark that even at 70% the contrast stays high — those are fine. The dangerous ones are modifiers applied to tokens that were *already tuned to sit near the 4.5 floor* (`ink-3`, `dusk-muted`), which is precisely where the failures show up.

**Measurement caveat — reported honestly.** My automated sweep initially flagged 34 nodes. On verification, the `1:1` hits (one per page, always the active sidebar item) and the `1.13:1` hit on the Planner hero are **measurement artifacts**, not real failures: the active nav item's background is an absolutely-positioned sibling pill and the hero's violet fill sits on an ancestor my walker could not resolve. I am excluding them. The genuine failures are the composited-opacity cases above.

**Recommended solution.** Introduce dedicated muted tokens (`--ink-4`, `--dusk-faint`) that are *pre-checked* at their final rendered value, and ban opacity modifiers on `ink-3` / `dusk-*` text. This is exactly the shape of the existing `semantic-color-text-guard.test.ts`, which already blocks bare `text-mint`/`text-coral`/`text-tangerine` — extend that guard to catch `text-{ink-3,dusk-*}/<number>`.

**Files.** `app/globals.css` (new tokens), `tests/components/semantic-color-text-guard.test.ts` (extend), then the ~10 real call sites.

**Acceptance criteria.** No text node measures below 4.5:1 (or 3:1 for large text) on any route in either theme; the guard test fails if an opacity modifier is applied to a muted text token.

---

*(BUG-01, BUG-02 and BUG-03 above are also accessibility findings — listed under Confirmed bugs because they are concrete defects rather than systemic issues.)*

---

## 8. Code and database findings

### CODE-01 — Working tree carries 70 uncommitted files

| Field | Value |
|---|---|
| **Specialist** | Full-stack Engineer + DevOps |
| **Severity** | **P2** |
| **Category** | Source control / risk |
| **Effort** | **S** |

**Evidence (VERIFIED).** `git status --short | wc -l` → **70**. These span nine logically distinct pieces of work (120% zoom, Modal fix, AI Planner hero, two Schedule passes, Focus timer, GPA tracker, Weekly report, and today's bug fixes).

**Risk.** A single loss of the working directory loses all of it. Nothing is bisectable, nothing is reviewable, and there is no rollback point between the nine changes.

**Recommended solution.** Commit in nine coherent commits along the boundaries above, on a branch, before any further work.

**Acceptance criteria.** `git status` clean; each commit builds and passes `npm test`.

---

### CODE-02 — `lib/rules/avatar-color.ts` has no unit test

| Field | Value |
|---|---|
| **Specialist** | QA Engineer |
| **Severity** | **P3** |
| **Category** | Test coverage |
| **Effort** | **S** |

**Evidence (VERIFIED).** 13 of 14 `lib/rules/` modules have a matching `tests/rules/*.test.ts`. `avatar-color` is the only gap. It encodes the same six-tone palette as `course-tone.ts` and migration 0018's check constraint — three places that must agree, with nothing asserting they do.

**Recommended solution.** A test asserting the exported palette matches the DB check constraint's allowed values exactly.

---

## 9. Product improvement opportunities

*(Product Manager and Gen Z Student perspectives. These are opinions grounded in the code, clearly separated from defects.)*

**PROD-01 — Workload Risk is the most differentiated feature and the least surfaced.** Every student app has assignments and a timer. Very few compute a weighted risk score. It currently sits behind a sidebar link with no proactive surface. Consider surfacing a risk delta on the dashboard when it crosses a threshold.

**PROD-02 — The AI Planner produces a plan but nothing closes the loop.** `planAdherence` is computed and shown in the Weekly report, but a student who falls behind is never told during the week — only afterwards, in a report they may not open. The data to nudge already exists.

**PROD-03 — There is no cross-module "today" view that combines a class, a deadline and a planned session.** Each module answers its own question well; the daily question "what do I actually do in the next three hours" is answered only partially by the dashboard.

**PROD-04 — Onboarding exists as a route but sets very little up.** `weekly_availability_hours`, `target_gpa` and `program_total_credits` all gate real features (the AI Planner refuses to run without availability; the GPA "On track" card does not render without total credits). A student who skips onboarding meets several dead cards with no explanation of why.

**PROD-05 — "Submitted" vs "Completed" cannot be distinguished.** The Weekly report concept shows both labels, but the schema only records `completed_at`. If that distinction matters to students, it needs a column; if not, the concept should drop it. Right now the UI says "Completed" for everything, which is honest but loses the nuance the design intended.

---

## 10. Recommended roadmap

### Stage 1 — Critical (P0/P1)

**There are none.** I did not find a security breach, a data-loss path, an authorization hole, or a broken core workflow. Rather than pad this stage, I am promoting the two items whose *absence* creates the most ongoing risk:

| Item | Why it belongs first |
|---|---|
| **DEVOPS-01 — Add CI** (below) | Without it, everything else regresses silently. This is the highest-leverage change in the report. |
| **PERF-01 — FK indexes** | Additive, near-zero risk, and removes a scaling cliff before it is a production incident. |

### Stage 2 — Reliability and usability (P2)

1. **SEC-01** — Rate limiting, `/api/plan/generate` first.
2. **A11Y-01** — Muted-text tokens + extend the contrast guard test.
3. **TEST-01** — Tests for `lib/push`, `lib/offline`, `lib/risk`.
4. **CODE-01** — Commit the working tree in nine coherent commits.
5. **UX-01** — Real empty states for data cards.
6. **DEVOPS-02** — Health check endpoint and error monitoring.

### Stage 3 — Polish and opportunity (P3)

BUG-01, BUG-02, BUG-03 (all Small), PERF-02 (N+1 batching), PERF-03 (asset weight), SEC-02 (env validation), UX-02, CODE-02, and the PROD-01…05 product bets.

---

## 11. Quick wins

Ranked by value ÷ effort. Every one is Small.

| # | Change | File | Impact |
|---|---|---|---|
| 1 | Add the 11 FK indexes | one new migration | Removes a scaling cliff |
| 2 | Add a CI workflow | `.github/workflows/ci.yml` | Stops silent regressions permanently |
| 3 | Demote the Weekly report hero `<h1>` to `<h2>` | `WeeklyRecapHero.tsx` | Fixes BUG-01 |
| 4 | Promote the course card `<h3>` to `<h2>` | `CourseCard.tsx` | Fixes BUG-02 |
| 5 | Add `min-h-6` to two `/focus` text buttons | 2 files | Fixes BUG-03 |
| 6 | Replace three `process.env.X!` with `requireEnv` | 4 Supabase files | Clear boot failures |
| 7 | Add `avatar-color` unit test | 1 new test | Closes the last `lib/rules` gap |

---

## 12. Testing gaps

### TEST-01 — Three library modules have zero tests

| Field | Value |
|---|---|
| **Specialist** | QA Engineer |
| **Severity** | **P2** |
| **Effort** | **M** |

**Evidence (VERIFIED).**

| Module | Files | Tests |
|---|---|---|
| `lib/push` | 3 | **0** |
| `lib/offline` | 3 | **0** |
| `lib/risk` | 1 | **0** |
| `lib/gemini` | 3 | 1 |
| `lib/calendar` | 6 | 4 |

`lib/push` is the notable one: it is the notification-delivery path, it is the hardest thing in the product to verify by hand, it runs unattended on a cron, and it has already shipped one silent bug (SR-01 — the cron endpoint was being redirected to `/login` before its `CRON_SECRET` check ever ran, meaning scheduled notifications had likely *never* been delivered). Exactly the code that most needs a test has none.

`lib/offline` is the mutation queue that replays writes after a connection returns — silent data loss if it regresses.

**Acceptance criteria.** `deliverAllDueNotifications` has tests covering: no due notifications, a dead subscription being pruned, and a partial-failure status. The offline queue has tests for enqueue, replay and replay-after-failure.

---

### DEVOPS-01 — No CI pipeline

| Field | Value |
|---|---|
| **Specialist** | DevOps/SRE |
| **Severity** | **P2** |
| **Effort** | **S** |
| **Regression risk** | None (additive) |

**Evidence (VERIFIED).** `.github/workflows/` contains exactly one file: `notifications-cron.yml`. There is **no workflow that runs `npm run lint`, `npx tsc --noEmit`, `npm test` or `npx playwright test`** on push or pull request.

**Why this is the report's most important finding.** The repository has 346 unit tests and 33 e2e tests — real, well-written ones. Nothing runs them. Earlier today, five e2e tests were found broken: two `AssignmentCard` failures from duplicated DOM, one dead Dashboard teaser link, and two stale Settings assertions. Some had been broken since a merged redesign. **A CI job would have caught every one of them at the PR that broke them.** The tests are not the gap; the trigger is.

**Recommended solution.** A single workflow on `push` and `pull_request`: install → `lint` → `tsc --noEmit` → `test` → `build`. Add Playwright as a separate job with the e2e secrets, or gate it to `main` if secret exposure on forks is a concern.

**Acceptance criteria.** A PR with a failing unit test cannot be merged green.

---

### DEVOPS-02 — No health check, no error monitoring, no deployment config in the repo

| Field | Value |
|---|---|
| **Specialist** | DevOps/SRE |
| **Severity** | **P2** |
| **Effort** | **M** |

**Evidence (VERIFIED).** No `/api/health` route. No Sentry/Datadog/Logtail in `package.json`. No `vercel.json`, `Dockerfile` or `docker-compose.yml`. `app/error.tsx` and `app/global-error.tsx` **do** exist (good — errors are caught and rendered), but nothing reports them anywhere.

**Consequence.** A production error is visible to the affected student and to nobody else. There is no signal that the notification cron has stopped, that Gemini is rejecting calls, or that calendar sync is failing.

**Recommended solution.** Add `GET /api/health` returning build SHA plus a trivial database round-trip. Wire an error reporter into both error boundaries and the API routes. Document the deploy target and environment separation (the repo does not currently record where or how this is deployed).

**Acceptance criteria.** `/api/health` returns 200 with DB connectivity confirmed; a thrown error in a server component appears in the monitoring dashboard within a minute.

---

## Appendix — What I could NOT verify

Listed explicitly so nothing here is mistaken for a pass.

| Area | Why not verified |
|---|---|
| **Sign up** | Requires a fresh, deliverable email address. Sign in / sign out are covered by the e2e auth setup and do work. |
| **Google Calendar OAuth + sync** | Requires real Google credentials and a consenting account. Code review shows correct CSRF state handling and encrypted token storage; **the round trip itself is untested by me**. |
| **Gemini plan generation** | Requires a live API key and incurs real cost. The route's auth, business gate and schema validation were reviewed statically; `tests/gemini/schema.test.ts` covers response parsing. |
| **Push notification delivery** | Requires VAPID keys and a real browser subscription. See TEST-01 — this path has no automated coverage either. |
| **Account deletion** | Destructive and irreversible; I did not execute it. The confirmation gate and `on delete cascade` chain were verified by reading the migrations. |
| **Real Core Web Vitals** | Localhost production build only. No throttling, no real devices, no CDN. Numbers in PERF-04 are a relative baseline, not field data. |
| **Deployment, backups, recovery** | No deployment configuration exists in the repository, so there was nothing to audit. |
| **Dark mode visual sweep** | Contrast was computed for both themes from tokens, but I did not visually inspect every screen in dark mode. |

---

*No code was changed in the course of this audit.*
