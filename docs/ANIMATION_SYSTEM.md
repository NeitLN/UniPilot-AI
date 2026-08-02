# UniPilot AI — Animation System

**Date:** 2026-07-31
**Base:** `main` @ `83ebf2d`
**Library:** [`motion`](https://motion.dev) (the maintained successor to Framer Motion) — the only animation dependency in this repo. Everything else is plain CSS (`transition-*`, `@media (prefers-reduced-motion: ...)`).

This document is the reference for anyone adding or changing motion in UniPilot. Read §6 ("Rules for future contributors") before adding a new animated component.

---

## 1. Motion principles

UniPilot is a *calm, academic* product, not a game. Every animation here exists to answer one of two questions for the user: **"did that work?"** or **"where did that go/come from?"** — never to decorate.

1. **Motion explains state, it doesn't perform.** A transition exists because something changed (opened, closed, succeeded, failed, arrived) — not because a static element "could use some life."
2. **Small and quiet.** Movement stays within a few pixels (§2). No overshoot, no spring wobble, no bounce — every curve decelerates into place and never past it.
3. **Fast enough to never be waited for.** Nothing blocks input. The longest routine transition (a modal closing) is 160ms; nothing in the system exceeds 400ms.
4. **Numbers stay numbers.** GPA, streaks, percentages never count up from zero or animate for the sake of looking alive — see §"GPA and progress" below. This is explicitly not a gamified product.
5. **Reduced motion is not a degraded mode, it's a correct mode.** Every animated component still communicates the same state change with `prefers-reduced-motion: reduce` on — just without the movement.
6. **One dependency, centralized values.** `motion` is the only animation library. Every duration/easing/distance value lives in `lib/motion/tokens.ts` — nothing hardcodes `duration: 0.3` inline.

---

## 2. Motion tokens (`lib/motion/tokens.ts`)

```ts
DURATION = { instant: 0.1, fast: 0.16, standard: 0.22, emphasized: 0.32 }   // seconds
DURATION_MS = { instant: 100, fast: 160, standard: 220, emphasized: 320 }   // ms, for plain CSS
EASING = {
  standard: [0.4, 0, 0.2, 1],   // color/opacity-only changes, no direction
  enter:    [0, 0, 0.2, 1],     // decelerate into place
  exit:     [0.4, 0, 1, 1],     // accelerate away, doesn't linger
}
EASING_CSS = { standard: "cubic-bezier(...)", enter: "...", exit: "..." }   // same curves, CSS strings
DISTANCE = { small: 4, medium: 8, large: 20 }   // px
SCALE = { press: 0.98, hoverMax: 1.01 }
STAGGER_DELAY = 0.04   // seconds between siblings in a restrained list reveal
```

| Tier | Duration | Used for |
|---|---|---|
| `instant` | 100ms | Button press (`:active` scale) |
| `fast` | 160ms | Exit transitions (modal/popover closing), FieldError/FieldSuccess enter |
| `standard` | 220ms | Modal/popover enter, Tag color change, nav active-indicator slide, dashboard stagger items |
| `emphasized` | 320ms | ProgressBar fill, GPA bar height — the two places this project intentionally animates a layout property (see §5) |

No animation in this system exceeds 400ms, matching the brief's ceiling.

---

## 3. Reusable variants (`lib/motion/variants.ts`)

| Variant | Shape | Used for |
|---|---|---|
| `fadeVariants` | opacity only | Skeleton→content-adjacent fades, PushNotificationSettings state text |
| `backdropVariants` | opacity only | Modal's dark backdrop |
| `modalPanelVariants` | opacity + `y: DISTANCE.medium → 0` | Modal panel |
| `popoverVariants` | opacity + small `y`/`scale` | Notification bell dropdown |
| `toastVariants` | opacity + `y: DISTANCE.medium → 0` | Reserved for a future toast/snackbar system (none exists today — see §7) |
| `staggerContainerVariants` / `staggerItemVariants` | opacity + small `y` | `<StaggerList>`/`<StaggerItem>` |
| `confirmVariants` | opacity + scale within `SCALE` bounds | The one-time "this just succeeded" beat (Pomodoro cycle complete, push notifications enabled) |

---

## 4. Reusable components (`components/motion/`)

- **`MotionProvider`** — wraps the whole app (`app/layout.tsx`) in `<MotionConfig reducedMotion="user">`. Every Motion-driven animation anywhere in the tree automatically respects OS-level `prefers-reduced-motion` with zero per-component logic.
- **`FadeIn`** — one-shot fade+settle for content that just became available (empty states, resolved sections). Plays on mount only.
- **`StaggerList` / `StaggerItem`** — restrained, **once-per-session** stagger reveal for a short row/grid (Dashboard's 4 KPI cards). Pass `sessionKey="unique-name"` to prevent replay when the user navigates back to the same page — Next.js App Router remounts a route's `page.tsx` tree on every visit (only layouts persist), so without this guard the animation would replay every single time. See the in-file comment for the Strict-Mode-safe implementation (module-level `Set`, read via `useState`'s lazy initializer, written in `useEffect` — reading+writing a module variable directly during render breaks under React's dev-mode double-render).

```tsx
// Usage
<StaggerList sessionKey="dashboard-kpis" className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
  <StaggerItem><Card /></StaggerItem>
  <StaggerItem><Card /></StaggerItem>
</StaggerList>
```

```tsx
// One-shot empty state
<FadeIn className="flex flex-col items-center gap-2 py-6 text-center">
  <Pilo mood="sleepy" />
  <p>No deadlines today.</p>
</FadeIn>
```

Components that needed **coordinated enter/exit** were upgraded in place (see §5) rather than wrapped in a new primitive, so every existing call site kept working unchanged:

- `components/ui/Modal.tsx` — `AnimatePresence` + `backdropVariants`/`modalPanelVariants` internally. All ~15+ existing `<Modal open={...} onClose={...} title={...}>` call sites across the app needed zero changes.
- `components/notifications/NotificationBellClient.tsx` — same pattern, `popoverVariants`.

---

## 5. What's animated, and why

### P0 — required for usability/state understanding

| Feature | What changed | Why P0 |
|---|---|---|
| **Buttons** | Global CSS: `button:not(:disabled):active { transform: scale(0.98) }`, `transition: transform 100ms`. One rule in `globals.css`, not per-component — this repo has no shared `<Button>` (every button is ad-hoc `className="..."`), so a base-layer rule was the only way to cover all of them without a large migration. Scoped to `<button>` only, not `<a>`/`<Link>` — links navigate away almost immediately, where a press animation risks reading as stutter right before the page changes. | Immediate press feedback confirms the click registered. |
| **Modals/dialogs** | `Modal.tsx` now animates backdrop fade + panel fade/settle-up on enter, and reverses on exit via `AnimatePresence`, in place — no call-site changes. Covers every dialog in the app (Assignment/Course/Grade/Event forms, Archive/Delete confirmations, Stop-session confirmation, etc.). | Enter/exit state must be obvious; a hard pop-in/pop-out doesn't communicate "this is a layer on top of the page." |
| **Notification dropdown** | Same `AnimatePresence` treatment for the bell's popover panel. | It's the app's only real popover; deserved the same enter/exit clarity as Modal. |
| **Sidebar/mobile nav active state** | Both `SidebarNav` and `MobileBottomNav` now render a single shared `layoutId` highlight that **slides** between the previous and new active item (tween, not spring — see tokens) instead of each row independently popping its own background color in/out. | "Where am I" should read as continuous, not as two unrelated highlights blinking. |
| **Pomodoro completion** | The "Cycle logged — break started" / "Break's over" banner now fades+settles in via `AnimatePresence` + `confirmVariants`, with `role="status" aria-live="polite"`. Deliberately restrained (opacity + tiny scale, no bounce) — a completed cycle is routine, not a milestone. | Completion must be "clearly communicated" per spec, without becoming a celebration. |
| **Pomodoro ring** | **Already correct before this work** — `stroke-dashoffset` already used `motion-safe:transition-[stroke-dashoffset] duration-200 ease-linear`, and timing was already timestamp-based (`Date.now() - startedAt`), not animation-duration-based. No changes needed; documented here so it isn't mistaken for an oversight. |
| **Push notification settings** | Full rewrite of the state machine's presentation: `AnimatePresence mode="wait"` cross-fades between checking/unsupported/denied/toggle states (`fadeVariants`); a `justEnabled` flag (set only inside the success branch of the actual enable action — never by the passive mount-time status check) shows a `confirmVariants` "✓ Enabled" cue that auto-dismisses after 2.5s. | Spec explicitly calls out every one of these states, and explicitly requires the UI to "never claim enabled until the backend confirms it" — `justEnabled` can only become true after `ensurePushSubscription()` has already resolved successfully, which itself only resolves after the subscription POST to `/api/push/subscribe` succeeds (`lib/push/subscribe.ts`, unchanged). |
| **FieldError / FieldSuccess** | Both now fade+settle in on mount (`motion.p`/`motion.span`, `DURATION.fast`). These are the app's shared error/success primitives — used at **~40 call sites** (every form error, restore-error, notification-panel error, "Saved." confirmations). One fix, zero call-site changes. | "Success, error... states transition correctly" is explicit P0 scope; fixing the shared primitive was the only way to cover this many surfaces safely. |
| **Reduced motion** | `MotionProvider` (`<MotionConfig reducedMotion="user">`) covers every Motion-driven animation app-wide. Plain-CSS transitions use `motion-safe:`/`@media (prefers-reduced-motion: no-preference)` individually (button press, ProgressBar, Tag, GPA bars). | Explicit hard requirement. |

### P1 — product polish

| Feature | What changed |
|---|---|
| **Dashboard KPI stagger** | The 4 KPI cards (`app/(app)/page.tsx`) now reveal via `StaggerList`/`StaggerItem`, `sessionKey="dashboard-kpis"` guarding against replay on repeat visits. |
| **ProgressBar** | `motion-safe:transition-[width] duration-300 ease-out` — used by `AssignmentItem` (assignment completion progress) and anywhere else `<ProgressBar>` renders. |
| **Tag** | `motion-safe:transition-colors duration-200` — status/priority badges crossfade color instead of snapping, wherever `<Tag>` renders. |
| **GPA trend chart** | Bars (`GpaTrendChart.tsx`) get `motion-safe:transition-[height] duration-300 ease-out`. Only visibly animates when the underlying data changes (a grade added/edited triggers `router.refresh()`, which patches the existing DOM node's height) — first paint has no prior state to transition from, so it never "grows from zero" on load. |
| **Empty states** | `AssignmentSummaryCard` (Dashboard's "Due soon"/"Today") and `ScheduleGrid`'s day-view empty state now use `FadeIn`. |

### Explicitly rejected / deferred (with reasoning)

| Item from the brief | Status | Why |
|---|---|---|
| **Team task movement / Team project management** | N/A — feature doesn't exist | Inspected the repo end-to-end; there is no team/project-collaboration module anywhere in `app/` or `components/`. UniPilot is a personal Student Life OS (Dashboard, Assignments, AI Planner, Schedule, Courses, Focus Timer, GPA, Workload Risk, Weekly Report, Settings). Fabricating animation for a feature that doesn't exist was rejected as out of scope — the brief's own instruction is to inspect reality, not assume structure. |
| **Toast notifications** | N/A — no toast/snackbar system exists | The app uses inline `role="alert"`/`role="status"` messages (`FieldError`/`FieldSuccess`) instead. `toastVariants` is defined and documented in `lib/motion/variants.ts` for whenever a toast system is actually built, so it doesn't get invented with different values later. |
| **Sidebar collapsing** | N/A — sidebar doesn't collapse | The desktop sidebar (`app/(app)/layout.tsx`) is a fixed `hidden md:flex w-[246px]` panel with no collapse/expand control anywhere in the codebase. The active-item indicator got the sliding treatment instead (see P0 table) — the actual nav-transition surface that exists. |
| **Mobile drawer nav** | N/A — doesn't exist | Mobile navigation is the bottom tab bar (`MobileBottomNav`) plus a settings icon + notification bell in the header; there is no slide-out drawer to animate. |
| **Numeric count-up (GPA, streaks, scores)** | Rejected | The brief itself says "do not make academic performance feel like a casino." All value displays render their final number directly; only the *visual representation* (bar height/fill) transitions, never the digits. |
| **Assignment row exit animation on archive/delete** | Deferred | The assignments list is server-rendered and reconciled via `router.refresh()`; animating a row's removal would require restructuring the list into a client-managed array (to use `AnimatePresence`'s `popLayout` mode), which risks destabilizing a working, well-tested feature for a P2-tier polish item. Documented here rather than attempted under time pressure — a reasonable target for a dedicated follow-up. |
| **Skeleton→content crossfade** | Deferred | Next.js App Router's streaming `Suspense` resolves each boundary independently server-side; there's no clean hook to animate "fallback swapped for real content" without either converting many Server Components to client wrappers (large, invasive) or an experimental View Transitions integration. The skeletons themselves already correctly respect `prefers-reduced-motion` (pre-existing `.animate-pulse` rule, untouched). The *entrance* of each section is covered by `StaggerList`/`FadeIn` where applied; the swap itself is intentionally instant, which is also the accessibility-safer choice ("must never... hide important information" mid-transition). |
| **Onboarding step transitions** | Deferred (P2) | `OnboardingWizard`'s step is derived from form-submission success (`step = assignmentState.ok ? 4 : ...`), not from independent client state — adding a transition here means animating a value that already depends on a server round-trip, which risks the "animation delays perceived response" anti-pattern the brief warns against. Left as a documented candidate rather than rushed. |
| **Assignment completion "milestone" celebration** | Rejected as implemented, scoped correctly | There is no "mark complete" checkbox in this codebase — status changes happen through the same Edit form used for every other field, via a `<select>`. Completion feedback is the Tag/ProgressBar transitions (P1, above), which apply automatically whenever status changes. No confetti/celebration was added, and none should be — the brief explicitly limits celebration to "meaningful milestones," and there's no existing signal in the codebase for what counts as one (e.g. "all assignments in a course done") to hang a milestone detector on without inventing new business logic, which was out of scope. |

---

## 6. Rules for future contributors

1. **Never hardcode a duration, easing curve, or distance.** Import from `lib/motion/tokens.ts`. If the value you need doesn't exist there, add it to the token file first — not inline.
2. **Reuse a variant from `lib/motion/variants.ts` before writing a new one.** Most new UI fits `fadeVariants`, `popoverVariants`, or `confirmVariants`.
3. **Enhance existing shared components in place rather than building parallel "Animated" versions.** `Modal.tsx`, `FieldError.tsx`, `ProgressBar.tsx`, `Tag.tsx` are all the *same* components as before, just internally upgraded — every call site kept working. Don't create `AnimatedModal.tsx` next to `Modal.tsx`.
4. **`AnimatePresence` is required for any exit animation.** Without it, an unmounting element just disappears — Motion (like CSS) cannot animate something leaving the DOM unless the parent keeps it mounted during the exit.
5. **A one-time reveal that lives inside a route's `page.tsx` needs a `sessionKey`** (see `StaggerList`) or it will replay every time the user navigates back to that page. A one-time reveal inside a `layout.tsx` (mounted once per app session) does not.
6. **Movement stays inside the `DISTANCE` bounds and `SCALE` bounds.** If a design calls for something bigger, that's a sign it should be a different kind of transition (e.g. a full page change), not a bigger version of a micro-interaction.
7. **No spring, no bounce, no overshoot.** Every easing curve in this system decelerates into its end state and stops — this is what keeps the product feeling calm rather than playful. Don't reach for Motion's default spring transition; always pass an explicit `duration`/`ease`.
8. **`prefers-reduced-motion` is not optional.** Motion-driven animation gets this for free from `MotionProvider`. Plain CSS transitions need their own `motion-safe:` (Tailwind) or `@media (prefers-reduced-motion: no-preference)` guard — copy the pattern already in `ProgressBar.tsx`/`Tag.tsx`/`globals.css`.
9. **`aria-live` for anything communicating success/failure.** `FieldError`/`FieldSuccess` already carry `role="alert"`/`role="status"`; if you're building a new confirmation cue outside those two components, add the ARIA role yourself (see the Pomodoro completion banner and PushNotificationSettings for examples).
10. **Prefer `transform`/`opacity`.** The two documented exceptions are `ProgressBar`'s `width` and `GpaTrendChart`'s bar `height` — there is no equivalent way to represent "percent filled" or "value scaled to a domain" without animating a layout property for a simple bar/column. Both are cheap (small elements, `motion-safe`-guarded) and don't run continuously.
11. **Don't add a second animation library.** `motion` covers coordinated enter/exit, layout (`layoutId`), and gesture needs. Plain CSS covers hover/focus/press. There's no gap that needs a third tool.

---

## 7. Accessibility guidance (recap)

- `prefers-reduced-motion: reduce` → Motion-driven animation is disabled app-wide via `MotionConfig`; plain-CSS transitions are individually guarded. Nothing relies on movement alone to communicate a state (color/text/icon always change too — e.g. `Tag`'s own existing comment: "color is a secondary cue, never the only signal").
- Focus outlines are never animated or delayed.
- `Modal`'s existing focus-move-into-dialog and Escape-to-close behavior is untouched; `AnimatePresence` only adds a further ~160ms during which the closing panel is still fading out (Escape is already unbound by then since `open` has already flipped false) — a documented, low-risk residual limitation, not a regression (see §8).
- Success/error feedback (`FieldError`, `FieldSuccess`, Pomodoro completion, push-notification "Enabled") all carry `role="alert"`/`role="status"`/`aria-live="polite"`.

## 8. Known limitations

- **Modal exit + keyboard focus**: during a closing Modal's ~160ms exit fade, the Escape-key listener is already removed (tied to the `open` boolean, which flips before the exit animation finishes) and the panel could theoretically still be tabbed into for that brief window. In practice the user's focus has almost always already moved (they just clicked something to trigger the close). Not fixed in this pass — flagged rather than silently accepted.
- **Skeleton→content and assignment-row-removal animations** are deferred, see §5's rejection table, with reasoning.
- **12 pre-existing high-severity `npm audit` findings** exist in this repo's dependency tree (confirmed via `npm audit --json`, none reference the newly-added `motion` package — see the verification report). Pre-existing, unrelated to this work; not addressed here per "document separately, don't disguise as animation-related."
