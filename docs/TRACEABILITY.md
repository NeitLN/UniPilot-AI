# Traceability — FR → File → Test

Maps each functional requirement from the SRS to where it's implemented and how it's verified. "Manual" means covered by a real Playwright browser test run during that phase's development (not automated in CI) rather than a Vitest spec — this applies to anything that's mostly I/O orchestration (Server Actions, Route Handlers, external API calls) rather than pure business logic.

| FR | Description | Phase | Main file(s) | Verified by |
|---|---|---|---|---|
| FR-01 | Create assignment | 2 | `components/assignments/AssignmentForm.tsx`, `app/(app)/assignments/actions.ts` | `tests/rules/assignment.test.ts` (validation) + manual |
| FR-02 | List sorted by due date | 2 | `lib/rules/assignment.ts` (`sortByDueDate`) | `tests/rules/assignment.test.ts` |
| FR-03 | Push deadline reminder | 9 | `lib/push/send.ts`, `lib/push/deliver.ts`, `app/api/push/send/route.ts` | Manual (grant/deny permission paths, real push delivery) |
| FR-04 | Generate weekly study plan | 7 | `app/api/plan/generate/route.ts`, `lib/gemini/client.ts` | Manual (live Gemini calls, 20-run latency sample in Phase 11) |
| FR-05 | Edit / regenerate plan | 7 | `components/planner/PlanEditor.tsx`, `app/(app)/planner/actions.ts` | `tests/rules/plan.test.ts` (session re-validation) + manual |
| FR-06 | Save plan + reminders | 7 | `lib/rules/plan.ts` (`buildSessionReminders`), `app/(app)/planner/actions.ts` (`confirmPlan`) | `tests/rules/plan.test.ts` + manual |
| FR-07 | Google Calendar sync | 4 | `app/api/calendar/sync/route.ts`, `lib/calendar/sync.ts` | `tests/calendar/map.test.ts`, `tests/calendar/view.test.ts` + manual OAuth flow |
| FR-08 | Link class block ↔ assignment | 4 | `components/schedule/ClassDetailPanel.tsx`, `app/(app)/schedule/actions.ts` | Manual |
| FR-09 | 25-minute Pomodoro session | 5 | `components/focus/FocusTimer.tsx`, `lib/rules/focus.ts` (`POMODORO_SECONDS`) | `tests/rules/focus.test.ts` + manual |
| FR-10 | Log completed / partial session | 5 | `lib/rules/focus.ts` (`classify`), `app/(app)/focus/actions.ts` | `tests/rules/focus.test.ts` |
| FR-11 | Focus statistics | 5 | `components/focus/FocusStats.tsx`, `lib/rules/focus.ts` (`streakDays`, `weeklyStats`) | `tests/rules/focus.test.ts` |
| FR-12 | Compute GPA | 6 | `lib/rules/gpa.ts` (`gpa`, `qualityPoints`) | `tests/rules/gpa.test.ts` |
| FR-13 | Forecast required average | 6 | `lib/rules/gpa.ts` (`requiredAverage`) | `tests/rules/gpa.test.ts` |
| FR-14 | Per-course breakdown | 6 | `components/gpa/CourseBreakdown.tsx`, `lib/rules/gpa.ts` (`gpaContribution`, `dragsGpaDown`) | `tests/rules/gpa.test.ts` |
| FR-15 | Compute workload risk score | 8 | `lib/rules/risk.ts` (`computeRisk`) | `tests/rules/risk.test.ts` (incl. the roadmap's worked example: 18h/14h/3 overdue/6 cycles → score 76) |
| FR-16 | Create risk warning | 8 | `app/api/risk/compute/route.ts`, `lib/risk/compute.ts` | Manual (incl. the race-condition fix — concurrent Server Components racing the same day's warning) |
| FR-17 | Edit assignment | 2 | `components/assignments/AssignmentForm.tsx`, `app/(app)/assignments/actions.ts` (`updateAssignment`) | `tests/rules/assignment.test.ts` + manual |
| FR-18 | Status + progress tracking | 2 | `lib/rules/assignment.ts` (`statusLabel`, `statusTone`, `progressTone`) | `tests/rules/assignment.test.ts` |
| FR-19 | Archive (cancels pending reminder) | 2, 9 | `components/assignments/ArchiveDialog.tsx`, `lib/notifications/sync.ts` (`cancelAssignmentReminder`) | Manual |

## Non-functional requirements

| NFR | Description | Verified by |
|---|---|---|
| NFR-01 | Dashboard load performance | Lighthouse — 91 performance / 100 accessibility / 100 best-practices (Phase 11) |
| NFR-02 | AI plan generation latency | 20/20 successful generations, 6.3–8.9s range, production build (Phase 11) |
| NFR-03 | Mobile viewport (375×667) | Playwright — no horizontal overflow on any core page (Phase 11) |
| NFR-04 | Unguided usability (5 classmates) | Not automatable — pending manual user study |
| NFR-05, NFR-06 | Offline read + queued writes | Phase 10 — `lib/offline/idb.ts`, `lib/offline/queue.ts`, `public/sw.js`; manual airplane-mode Playwright test (warm cache → offline edit → reconnect → verify sync, no data loss) |
| NFR-09 | Business logic confined to `lib/rules/` | Manual code audit (Phase 11) — two drift cases found and fixed (`gpa/page.tsx` duplicating `qualityPoints`, `AssignmentItem.tsx` inlining status-tone classification) |
| NFR-10 | Cross-browser (Chrome, Firefox, Safari) | Playwright — Chromium, Firefox, WebKit all smoke-tested clean on a production build (Phase 11); one WebKit-specific service-worker/RSC-prefetch interaction found and fixed |
| A11y | Focus rings, aria-labels, contrast ≥4.5:1, `prefers-reduced-motion` | Phase 11 — Lighthouse a11y 100/100 after fixing KPI card contrast (`--color-ink-3`, `--color-tangerine-text`, new `--color-coral-deep`) |
| Bundle hygiene | No stray `console.log`, no secrets in client bundle | Phase 11 — grep of `.next/static` output, confirmed clean |

## Security

| Concern | Mitigation | File(s) |
|---|---|---|
| Row-level access | RLS policy on every table, `user_id = auth.uid()` | `supabase/migrations/0001_init.sql` and subsequent migrations |
| Cross-table IDOR (RLS doesn't cover foreign keys) | Explicit server-side ownership re-validation | `lib/supabase/ownership.ts` (`courseBelongsToCaller`, `assignmentBelongsToCaller`) |
| Google refresh token at rest | AES-256-GCM encryption before storage | `lib/calendar/tokenCrypto.ts` |
| API keys (Gemini, Google, VAPID private key) | Never imported into a client bundle — `"server-only"` guard or Route-Handler-only usage | `lib/gemini/client.ts`, `lib/calendar/oauth.ts`, `lib/push/send.ts` |
| OAuth CSRF | State cookie validated on callback | `app/api/calendar/oauth/callback/route.ts` |
