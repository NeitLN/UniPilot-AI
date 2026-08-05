# UniPilot AI — Claude Pixel-Match Build Specification

## 0. Instruction to Claude

You are implementing the approved UniPilot AI Gen Z interface inside the existing UniPilot repository.

This is a **pixel-match implementation task**, not a redesign task. The PNG files in `docs/design-concepts/` are the approved visual targets. Reproduce their layout, hierarchy, spacing, colors, typography, rounded geometry, component density, and mascot placement as closely as browser rendering allows.

Before editing code, read:

1. `AGENTS.md` and all repository instructions.
2. This entire file.
3. `app/globals.css`.
4. `docs/ANIMATION_SYSTEM.md`, if present.
5. Every image in `docs/design-concepts/` at full resolution.
6. The current page, its child components, server actions, queries, migrations, and tests.

Do not commit, push, deploy, reset, delete user work, or change unrelated features unless explicitly requested.

## 1. Non-negotiable outcome

- Keep the current Dashboard behavior and use `00-dashboard-reference.png` as the global design baseline.
- Rebuild Assignments, AI Planner, Schedule, Courses, Focus Timer, GPA Tracker, Workload Risk, Weekly Report, and Settings to match their approved concept images.
- Use the supplied Pilo PNG asset assigned to each screen. Never substitute an emoji, Lucide owl, generic bird, CSS drawing, or another mascot.
- Preserve every working feature, query, mutation, validation rule, loading state, error state, authorization check, and real database connection.
- Do not present fake controls. Every visible interactive control must work or be intentionally disabled with an explanation.
- Do not hard-code screenshot values as production data. The screenshot specifies presentation; real application data supplies values.
- Do not rewrite the whole application when the existing component can be styled or refactored safely.
- Do not modify Dashboard merely to make implementation easier.

## 2. Source-of-truth priority

When requirements conflict, use this order:

1. Security, authorization, and database integrity.
2. Existing functional behavior and real data contracts.
3. Approved concept PNG for visual appearance.
4. This implementation specification.
5. Existing styling on non-Dashboard pages.

The concept images control appearance. The live source controls behavior and data.

## 3. Package map

### Visual references

| Route                            | Screen             | Reference                                         |
| -------------------------------- | ------------------ | ------------------------------------------------- |
| `/dashboard` or current app home | Dashboard baseline | `docs/design-concepts/00-dashboard-reference.png` |
| `/assignments`                   | Assignments        | `docs/design-concepts/01-assignments.png`         |
| `/planner`                       | AI Planner         | `docs/design-concepts/02-ai-planner.png`          |
| `/schedule`                      | Schedule           | `docs/design-concepts/03-schedule.png`            |
| `/courses`                       | Courses            | `docs/design-concepts/04-courses.png`             |
| `/focus`                         | Focus Timer        | `docs/design-concepts/05-focus-timer.png`         |
| `/gpa`                           | GPA Tracker        | `docs/design-concepts/06-gpa-tracker.png`         |
| `/risk`                          | Workload Risk      | `docs/design-concepts/07-workload-risk.png`       |
| `/reports`                       | Weekly Report      | `docs/design-concepts/08-weekly-report.png`       |
| `/settings`                      | Settings           | `docs/design-concepts/09-settings.png`            |

### Mascot assets

| Screen                  | Required asset                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| Assignments             | `public/mascots/pilo-assignments.png`                                       |
| AI Planner              | `public/mascots/pilo-ai-planner.png`                                        |
| Schedule                | No large mascot; use `public/mascots/pilo-logo.png` in shared branding only |
| Courses                 | No large mascot; use `public/mascots/pilo-logo.png` in shared branding only |
| Focus Timer             | `public/mascots/pilo-focus-timer.png`                                       |
| GPA Tracker             | `public/mascots/pilo-gpa-tracker.png`                                       |
| Workload Risk           | `public/mascots/pilo-workload-risk.png`                                     |
| Weekly Report           | `public/mascots/pilo-weekly-report.png`                                     |
| Settings                | `public/mascots/pilo-settings-avatar.png`                                   |
| Shared application logo | `public/mascots/pilo-logo.png`                                              |

The optional mapping file `lib/pilo-mascots.ts` exports all paths. Merge it with the repository's existing conventions if a different assets module already exists.

## 4. Global visual system

### 4.1 Desktop frame

The concepts were approved at approximately 1701 × 925. Use this viewport for visual comparison.

- Fixed left sidebar: approximately 215–250 px depending on the existing app shell.
- Top utility bar: approximately 56–64 px high.
- Main canvas fills remaining width.
- Page content starts 24–32 px inside the canvas.
- Standard gaps: 12, 16, 20, 24, and 32 px.
- Major cards: 24–30 px corner radius.
- Controls and pills: 14–18 px corner radius; fully rounded only for compact badges.
- Cards should feel spacious but not empty.
- Avoid dense admin-table styling, sharp corners, heavy gray borders, or generic SaaS blue.

### 4.2 Brand palette

Reuse existing CSS variables wherever available. The approved visual family is:

```css
--pilo-ink: #1d1338;
--pilo-violet: #6c3cf5;
--pilo-lime: #d8ff4a;
--pilo-canvas: #f7f5ff;
--pilo-surface: #ffffff;
--pilo-mint: #75d7ad;
--pilo-coral: #ef5f6c;
--pilo-amber: #f2b53f;
--pilo-blue: #5aa5ee;
```

If the repository already defines close brand tokens, use the repository tokens. Do not create multiple competing violet or lime token systems.

### 4.3 Typography

- Keep the existing Dashboard display font and body font.
- Page titles are heavy, friendly, rounded, and visually compact.
- Card titles use strong weight and high contrast.
- Supporting labels are smaller and quieter but remain readable.
- Do not replace the rounded display style with a corporate geometric sans.
- Do not use text smaller than 12 px on desktop or 14 px for important mobile content.

### 4.4 Surfaces and borders

- White cards sit on a pale lavender canvas.
- Borders are subtle and tinted, usually 1 px.
- Dark eggplant cards use white text and brand-color metrics.
- Violet and lime cards are intentionally vivid.
- Shadows are soft and secondary; do not create floating glassmorphism panels.
- Keep the concept's large rounded rectangles and bento-grid rhythm.

### 4.5 Icons

- Use the repository's existing icon library consistently.
- Icon stroke width should appear consistent across pages.
- Use icon containers with tinted backgrounds where shown.
- Do not use emoji as UI icons.

### 4.6 Mascot rules

Use `next/image` and preserve aspect ratio:

```tsx
import Image from "next/image";

<Image
  src="/mascots/pilo-ai-planner.png"
  alt="Pilo presenting the weekly study plan"
  width={1254}
  height={1254}
  className="h-auto w-full object-contain"
/>;
```

- Hero mascot rendered width: normally 220–320 px on desktop.
- Supporting-card mascot: normally 110–180 px.
- Insight/avatar mascot: normally 64–96 px.
- Shared logo: 32–44 px.
- Never stretch, crop, recolor, blur, mask into a different silhouette, or place a white rectangle behind the transparent PNG.
- Use `alt=""` if the image is purely decorative and adjacent text conveys the same content.
- Use descriptive alt text if Pilo communicates unique meaning.
- Use `priority` only for above-the-fold hero mascots.

### 4.7 Motion

- Motion should be calm and quick: approximately 150–250 ms for controls and 250–400 ms for card entry.
- Respect `prefers-reduced-motion`.
- Use subtle opacity/translate transitions; avoid bouncing every card.
- Timer, progress, and charts may animate once without delaying interaction.
- Do not add mascot motion until the static pixel match is approved.

## 5. Shared implementation foundation

### Step 1 — Audit before edits

- Map each route to its page and child components.
- List the current query/action used by every visible block.
- Record loading, empty, success, permission, and error states.
- Identify reusable Dashboard components and tokens.
- Run baseline type-check, lint, and relevant tests.

### Step 2 — Create or normalize shared primitives

Prefer existing primitives. Add only what is missing:

- `AppPageHeader`
- `MetricCard`
- `SectionCard`
- `StatusPill`
- `PiloCard`
- `ProgressBar`
- `EmptyState`
- `SkeletonCard`
- `ResponsivePageGrid`

Do not force every page into the same card layout. Shared primitives must still allow the exact concept compositions.

### Step 3 — Normalize shell

- Sidebar ordering and labels must match Dashboard.
- Active item uses the lime capsule shown in the references.
- Keep dark eggplant sidebar and white top utility bar.
- Preserve notification and profile behavior.
- Ensure the main canvas has the same pale lavender background on all pages.

### Step 4 — Install assets

- Copy `public/mascots/` into the project `public/mascots/` directory.
- Copy or merge `lib/pilo-mascots.ts`.
- Verify all asset paths return HTTP 200 in development.
- Confirm transparent backgrounds on both white and violet cards.

### Step 5 — Data-state contract

Every redesigned block must render these states where relevant:

- Loading: skeleton matching final card dimensions.
- Empty: clear message and real action.
- Error: concise error plus retry when safe.
- Partial data: render available information without breaking the grid.
- Success: live data; no concept-only dummy values.

## 6. Screen 1 — Assignments

Reference: `docs/design-concepts/01-assignments.png`  
Mascot: `public/mascots/pilo-assignments.png`

### Approved desktop composition

1. Page header with “Assignments”, active/attention summary, and violet `Add assignment` button.
2. Full-width white toolbar containing search, All tasks, Today, This week, Completed, and Filter.
3. Two-column content grid.
4. Left main column: coral-tinted “Needs attention” group, then white “Due this week” group.
5. Right column: violet “Pilo’s pick” card, lime weekly progress card, and white Quick wins card.
6. Pilo sits on the left side of the violet recommendation card without overlapping its title, copy, or CTA.

### Step 1 — Preserve assignment behavior

- Keep creation, editing, completion, deletion/archive, filtering, search, priority, due date, and progress behavior.
- Keep authorization scoped to the signed-in user.
- Use existing assignment/course relations.

### Step 2 — Header and toolbar

- Match title scale and top spacing to the reference.
- Keep the violet add button in the upper-right.
- Toolbar is one rounded white surface on desktop.
- Selected filter uses violet border/text and a light-violet fill.
- Search expands to consume remaining width.

### Step 3 — Needs-attention block

- Include only overdue or genuinely urgent records according to current business rules.
- Use coral tint and coral status/progress accents.
- Row structure: completion control, title/course/due metadata, status badge, progress percentage/bar, overflow menu.
- Preserve keyboard access for completion and menu controls.

### Step 4 — Due-this-week block

- Use a white surface with violet section icon.
- Show priority/status pills exactly in the right-side area.
- Maintain consistent row height and separators.
- Empty state explains that no work is due this week.

### Step 5 — Pilo’s pick

- Derive the recommendation from actual due date, priority, overdue state, and progress.
- Use the supplied Assignments mascot.
- Violet card, white heading/copy, lime full-width CTA.
- CTA navigates to or starts the recommended assignment workflow.

### Step 6 — Weekly progress and quick wins

- Calculate tasks and completed values from real assignments.
- Circular progress reflects the actual completion ratio.
- Quick wins must be real suggestions or actions, not permanently hard-coded rows.

### Step 7 — Responsive

- At tablet widths, stack the right rail below the assignment groups.
- At mobile widths, toolbar filters may horizontally scroll or open in a filter sheet.
- Do not compress every row into unreadable columns; convert metadata into two lines.

### Acceptance checklist

- [ ] Desktop screenshot matches reference hierarchy and proportions.
- [ ] Assignments mascot is correct and transparent.
- [ ] Search and all filters work.
- [ ] Add/edit/complete actions still work.
- [ ] No screenshot-only values are hard-coded.
- [ ] Empty/loading/error states preserve layout.

## 7. Screen 2 — AI Planner

Reference: `docs/design-concepts/02-ai-planner.png`  
Mascot: `public/mascots/pilo-ai-planner.png`

### Approved desktop composition

1. Header with title/subtitle and `Generate new plan` button.
2. Large violet hero at upper-left containing Pilo, “Pilo’s plan”, draft status, summary, and lime review CTA.
3. Lime Plan health card at upper-right with session/time/deadline metrics and 80%-style coverage ring driven by real data.
4. Main weekly-plan card with weekday tabs and vertical session timeline.
5. Right rail with Pilo note and Availability chart.
6. Bottom warning strip explaining that a draft is not scheduled until confirmation.

### Step 1 — Preserve planner lifecycle

- Keep draft generation, review/edit, confirmation, active plan replacement, and session persistence.
- Keep the distinction between draft and active plans visible.
- Do not silently schedule a draft.

### Step 2 — Build hero

- Use the AI Planner mascot at the left edge, sized like the reference.
- Keep Pilo entirely inside the hero.
- Title and CTA align in the central content area.
- Draft badge sits beside the plan title.

### Step 3 — Calculate plan health

- Sessions = planned study sessions in the selected plan.
- Total focus time = sum of planned duration.
- Deadlines covered = unique assignments with planned coverage.
- Coverage percentage uses a documented real formula and handles zero deadlines.

### Step 4 — Weekly timeline

- Weekday tabs match reference width and selected violet state.
- Selected day shows chronological sessions.
- Each row shows time, assignment, course, duration, type, AI reason, and overflow actions.
- Maintain editing/reordering functions already supported.

### Step 5 — Availability

- Render availability from user preferences and real calendar constraints.
- Use mint for preferred/morning, amber for later blocks, coral for low-energy/unavailable where the data model supports it.
- Do not imply hourly precision if the backend stores only weekly hours.

### Step 6 — Confirmation strip

- Draft warning remains visually prominent.
- `Review & confirm plan` opens the real review/confirmation workflow.
- After confirmation, update copy/status rather than leaving a draft warning.

### Step 7 — Responsive

- Stack Plan health below hero on smaller screens.
- Timeline becomes a single-day list; weekday tabs horizontally scroll.
- Availability may become day rows without truncating time labels.

### Acceptance checklist

- [ ] Hero proportions and Pilo pose match the concept.
- [ ] Draft/active states are accurate.
- [ ] Generate, review, edit, and confirm work.
- [ ] Plan metrics are calculated from real data.
- [ ] Timeline does not overflow on mobile.

## 8. Screen 3 — Schedule

Reference: `docs/design-concepts/03-schedule.png`  
Mascot: shared `public/mascots/pilo-logo.png` only

### Approved desktop composition

1. Header with Add event and Sync Google Calendar actions.
2. Top summary row: wide Next class card, Classes today metric, Free blocks metric.
3. Main left area: large calendar surface with Day/Week/Month switcher, navigation, date label, time grid, current-time line, and colored course blocks.
4. Right rail: dark Today agenda, Free time card, Google Calendar sync status.

### Step 1 — Preserve calendar behavior

- Keep day/week/month switching, date navigation, course events, study sessions, assignment deadlines, and Google sync.
- Keep connection status truthful.

### Step 2 — Summary row

- Next class uses the closest future class and includes time, room, and relative time.
- Classes today and Free blocks are derived from the selected/current day.
- Handle no-class and fully-booked cases explicitly.

### Step 3 — Time-grid week view

- Build an actual vertical time grid for Week view.
- Position blocks from start/end times, not arbitrary fixed rows.
- Use stable per-course colors across Schedule, Courses, GPA, and Reports.
- Include current-time line only when today is visible.
- Assignment deadline markers must remain distinguishable from classes.

### Step 4 — Right agenda

- Dark eggplant surface with colored timeline dots.
- Sort events chronologically.
- Start focus CTA should launch the real focus workflow with relevant context if available.

### Step 5 — Google sync

- Connected, syncing, disconnected, and error states must be visible.
- Sync button uses the current OAuth/integration action.
- Never show `Connected` without a verified connection record.

### Step 6 — Responsive

- On mobile default to Day or compact agenda view.
- Week grid may horizontally scroll with sticky time labels.
- Right rail stacks below the calendar.

### Acceptance checklist

- [ ] Week grid matches the concept.
- [ ] Events are positioned from real times.
- [ ] Add event and Google sync work.
- [ ] No large mascot is added to this screen.
- [ ] Course colors remain consistent.

## 9. Screen 4 — Courses

Reference: `docs/design-concepts/04-courses.png`  
Mascot: shared `public/mascots/pilo-logo.png` only

### Approved desktop composition

1. Header with course count/semester and Add course.
2. Search bar plus semester and course filters.
3. Six-card, three-column course grid on wide desktop.
4. Each card has course code, overflow menu, title, credits, assignment count/status, progress, and next deadline.
5. Bottom full-width Course load summary.

### Step 1 — Preserve course CRUD

- Keep create, edit, archive/delete rules, course detail navigation, and assignment relationships.
- Avoid per-card N+1 queries; aggregate usage in one query/RPC where practical.

### Step 2 — Course card system

- Use stable accent colors: violet, mint, amber, coral, lime, and blue.
- Apply the accent to border, code badge, progress bar, and relevant icon tint.
- Do not flood the entire card with saturated color.
- Progress uses the application's documented completion rule.

### Step 3 — Search and filters

- Search by course name/code.
- Semester filter reflects real available semesters.
- Course filter options must correspond to implemented states.

### Step 4 — Course load summary

- Show total assignments, due-this-week count, and load distribution.
- Distribution segment colors match course cards.
- Summary uses live aggregated data.

### Step 5 — Responsive

- Three columns on wide desktop, two on tablet, one on mobile.
- Filter controls stack without reducing tap targets.

### Acceptance checklist

- [ ] Card grid and bottom summary match the reference.
- [ ] Course accent colors are stable across routes.
- [ ] CRUD and navigation work.
- [ ] No large mascot is added to this screen.
- [ ] Data loading avoids obvious N+1 behavior.

## 10. Screen 5 — Focus Timer

Reference: `docs/design-concepts/05-focus-timer.png`  
Mascot: `public/mascots/pilo-focus-timer.png`

### Approved desktop composition

1. Header with title/subtitle and Log session.
2. Large lime timer workspace at upper-left.
3. Timer circle centered with task selector above, mascot/laptop to its right, Start focus button below, and break/audio controls at bottom.
4. Dark weekly metrics card at upper-right.
5. Violet Today's goal card beneath metrics.
6. Bottom Focus history cards and Learning rhythm chart.

### Step 1 — Preserve timer engine

- Keep countdown, pause/resume, reset, session completion, break transitions, local persistence, offline queue, and notification behavior.
- Never reset active state merely because the component rerenders.

### Step 2 — Timer workspace

- Keep bright lime surface and large outlined timer circle.
- Task selector uses real assignments/courses.
- Use Focus Timer Pilo with headphones and laptop.
- Start/pause control must remain the primary dark button.

### Step 3 — Session controls

- Default focus duration comes from settings if implemented.
- Short/long break controls reflect actual durations.
- Audio control only exposes supported audio behavior.
- Explain notification availability/permission accurately.

### Step 4 — Weekly metrics and goal

- Cycles, total minutes, and streak come from focus-session history.
- Day rhythm markers reflect actual activity/effort classification.
- Today's goal uses saved goal settings and real completed cycles.

### Step 5 — History and learning rhythm

- History cards show real session task, time, duration, and type.
- Chart uses actual daily focused minutes.
- View all history opens the existing history surface or a real new one.

### Step 6 — Responsive

- Timer workspace becomes one column.
- Mascot scales down beside or below timer without hiding controls.
- Charts receive horizontal space or a compact mobile representation.

### Acceptance checklist

- [ ] Timer survives rerender/navigation according to current requirements.
- [ ] Mascot is the headphones/laptop asset.
- [ ] Weekly metrics and history are real.
- [ ] Notifications and offline behavior remain intact.
- [ ] No controls overlap at mobile widths.

## 11. Screen 6 — GPA Tracker

Reference: `docs/design-concepts/06-gpa-tracker.png`  
Mascot: `public/mascots/pilo-gpa-tracker.png`

### Approved desktop composition

1. Header with Add grade.
2. Violet cumulative GPA hero and mint target-status card.
3. Large Course breakdown table on the left.
4. Right rail with GPA trend chart, Predicted grades cards, and lime What-if simulator.
5. Pilo insight strip below course breakdown.

### Step 1 — Preserve GPA rules

- Keep the correct GPA scale, credits, grades, target, forecast, and predicted-grade logic.
- Do not mix 4.0 and 10-point scales silently.
- Handle courses without grades.

### Step 2 — GPA hero and target

- Violet card shows cumulative GPA and completed credits.
- Target appears in the circular ring.
- Mint status card calculates required remaining average and completion ratio.
- Status copy changes for on-track, at-risk, reached, and impossible-target scenarios.

### Step 3 — Course breakdown

- Maintain course icon/accent consistency.
- Columns: course, credits, current grade, contribution, actions.
- Table becomes cards/rows on mobile rather than horizontal text compression.

### Step 4 — Trend and predictions

- Trend chart uses actual semester history.
- Target line uses saved target GPA.
- Worst/most-likely/best cards use the existing forecast model and label assumptions.

### Step 5 — Pilo insight

- Use the GPA Pilo head/bust.
- Insight must be derived from strongest momentum, contribution, or another documented GPA signal.
- Do not permanently hard-code Web Programming as strongest.

### Step 6 — What-if simulator

- Inputs update calculated required average without mutating saved data until the user explicitly saves.
- Validate target and remaining credits.

### Acceptance checklist

- [ ] GPA calculations match existing tests/rules.
- [ ] Pilo insight uses the correct mascot.
- [ ] Chart and predictions use real data.
- [ ] Simulator does not silently save.
- [ ] Desktop bento proportions match the concept.

## 12. Screen 7 — Workload Risk

Reference: `docs/design-concepts/07-workload-risk.png`  
Mascot: `public/mascots/pilo-workload-risk.png`

### Approved desktop composition

1. Header with disclaimer and Refresh score action.
2. Full-width dark balance hero showing total score and three contributing dimensions.
3. Lower two-column grid.
4. Left: factors shaping score and seven-day trend.
5. Right: violet Pilo suggestion and lime lighter-week actions.

### Step 1 — Preserve risk model

- Use the existing risk computation and persisted daily scores.
- Never market the score as medical or psychological diagnosis.
- Refresh must call the real recomputation path with safe rate/permission handling.

### Step 2 — Balance hero

- Keep 54/100-style layout but populate actual score.
- Overall range label uses real thresholds.
- Workload, Overdue, and Focus values display their component contributions.
- Segmented bars and labels match reference colors.

### Step 3 — Evidence factors

- Render only factors present in the calculation.
- Each row includes icon, statement, explanation, impact badge, and strength dots.
- Wording must be understandable to students.

### Step 4 — Seven-day trend

- Query seven real daily scores.
- Show threshold line and daily points.
- Handle missing days without inventing values.

### Step 5 — Pilo suggestion

- Use astronaut Pilo.
- Generate recommendation deterministically from the strongest actionable risk factor.
- CTA must navigate to a real task, planner action, or focus action.

### Step 6 — Lighter-week actions

- Actions are derived from overdue work, focus blocks, and availability.
- Completed actions should reflect state rather than remain static.

### Acceptance checklist

- [ ] Score equals the existing risk engine output.
- [ ] Disclaimer remains visible.
- [ ] Seven-day chart uses persisted data.
- [ ] Astronaut Pilo is used.
- [ ] Recommendation CTA works.

## 13. Screen 8 — Weekly Report

Reference: `docs/design-concepts/08-weekly-report.png`  
Mascot: `public/mascots/pilo-weekly-report.png`

### Approved desktop composition

1. Header with week range, comparison copy, Previous week, and This week controls.
2. Violet hero with celebrating/winking Pilo, headline, weekly focus/completion summary, streak pill, and goal arc.
3. Four metric cards: completed, study time, streak, GPA.
4. Main Study rhythm chart on the left.
5. Right rail: lime Plan adherence, white This week's win with Pilo, and amber Worth a look.
6. Bottom activity list.

### Step 1 — Define week boundaries

- Use one timezone-aware week boundary across assignments, focus, plans, and report queries.
- Previous/This week controls update all report sections.
- Display the selected range accurately.

### Step 2 — Hero

- Use Weekly Report Pilo.
- Headline varies from actual performance while retaining the positive Pilo voice.
- Focus minutes, completed assignments, streak, and goal progress are real.

### Step 3 — Metric cards

- Show week-over-week delta where prior data exists.
- Use neutral copy when comparison is unavailable.
- Do not use `updated_at` as completion time if a proper completion timestamp exists or is added.

### Step 4 — Study rhythm

- Bar series = selected week focused minutes by day.
- Comparison line = previous week.
- Course distribution uses real focus/session relationships.
- Legend and colors remain readable.

### Step 5 — Plan adherence

- Completed planned sessions divided by eligible planned sessions.
- Explain zero-plan weeks without displaying misleading 0% failure.

### Step 6 — Win and attention cards

- This week's win selects a completed milestone using documented priority.
- Worth a look selects an actionable weak area or upcoming risk.
- Do not display the same assignment in both cards unless clearly justified.

### Step 7 — Activity list

- Use real completion/submission events.
- Show event type, item, course, timestamp, and navigation action.

### Acceptance checklist

- [ ] Week navigation updates the full report.
- [ ] Celebrating Pilo is used.
- [ ] Metrics and deltas are real.
- [ ] Study rhythm compares equivalent week boundaries.
- [ ] Empty weeks have a useful state.

## 14. Screen 9 — Settings

Reference: `docs/design-concepts/09-settings.png`  
Mascot: `public/mascots/pilo-settings-avatar.png`

### Approved desktop composition

1. Header with title/subtitle and saved-state indicator.
2. Internal left settings navigation.
3. Profile card across the top-right area.
4. Two-column card grid below: Study preferences/Notifications and Appearance/Connections/Data & privacy.
5. Pilo avatar appears in Profile.

### Step 1 — Preserve settings behavior

- Keep profile, theme, notifications, calendar connection, export, and account-deletion behavior.
- Never show a setting as saved until persistence succeeds.
- Surface validation and save errors near the relevant card.

### Step 2 — Internal navigation

- Items: Profile, Study preferences, Appearance, Notifications, Connections, Data & privacy.
- Active state uses subtle violet tint and left indicator.
- Desktop navigation may scroll to sections; mobile may become tabs or a select menu.

### Step 3 — Profile

- Use Settings avatar Pilo.
- Full name is editable; email follows current auth rules.
- `Change avatar` must either open a real supported workflow or be omitted/disabled with explanation.
- Save button reflects idle, saving, success, and error states.

### Step 4 — Study preferences

- Weekly availability, preferred days, target GPA, and default focus duration use real stored preferences.
- If fields require migrations, implement safe migrations, types, server validation, and RLS-aware actions.

### Step 5 — Appearance and notifications

- Light, Dark, and System choices must update and persist correctly.
- Notification toggles must correspond to actual implemented channels/logic.
- Do not imply background push works without permission and subscription.

### Step 6 — Connections

- Google Calendar state must reflect the real connection.
- Manage action opens the actual connection management flow.

### Step 7 — Data and privacy

- Export invokes a real secure export.
- Delete account requires confirmation and existing secure deletion behavior.
- Keep destructive styling and do not make deletion one-click.

### Acceptance checklist

- [ ] Settings grid matches the reference.
- [ ] Pilo avatar is correct.
- [ ] Saved indicator reflects server success.
- [ ] Theme and notification controls work.
- [ ] Export/delete remain secure.

## 15. Responsive specification

### Large desktop: 1440 px and above

- Match the approved desktop composition closely.
- Maintain sidebar, right rails, and multi-column grids.
- Avoid excessive max-width that makes content much narrower than the concept.

### Laptop/tablet: 768–1439 px

- Reduce outer padding and gaps gradually.
- Convert three-column course grid to two columns.
- Stack right rails under primary content when width becomes cramped.
- Keep data order identical to desktop hierarchy.

### Mobile: below 768 px

- Use one content column.
- Sidebar becomes the existing mobile navigation pattern.
- Preserve minimum 44 × 44 px touch targets.
- Convert tables into structured rows/cards.
- Allow calendar/tabs to scroll horizontally only where necessary.
- Keep primary CTA visible without using fixed overlays that cover content.
- Scale mascots; never remove every mascot solely because the viewport is small.

## 16. Accessibility requirements

- Keyboard access for all interactive controls.
- Visible focus state using brand-compatible high contrast.
- Semantic headings in logical order.
- Labels for form fields and toggles.
- `aria-live` for timer state, save result, plan generation result, and asynchronous errors where appropriate.
- Do not communicate status only by color.
- Charts require textual summaries or accessible labels.
- Meet WCAG AA contrast for body text and controls.
- Respect reduced motion.

## 17. Implementation sequence

Complete one phase at a time. Do not redesign all pages in one uncontrolled change.

### Phase 0 — Foundation

1. Read repository instructions and relevant framework docs.
2. Run baseline checks.
3. Install mascot assets.
4. Normalize shared tokens/primitives.
5. Confirm Dashboard is unchanged.

### Phase 1 — Assignments

1. Implement layout.
2. Connect real data/actions.
3. Add Pilo.
4. Add responsive states.
5. Test and screenshot compare.

### Phase 2 — AI Planner

Repeat the same five-step loop, including draft/active lifecycle tests.

### Phase 3 — Schedule

Repeat the loop, including time-grid positioning and Google sync tests.

### Phase 4 — Courses

Repeat the loop, including aggregate query/performance checks.

### Phase 5 — Focus Timer

Repeat the loop, including timer persistence/offline/notification tests.

### Phase 6 — GPA Tracker

Repeat the loop, including deterministic calculation tests.

### Phase 7 — Workload Risk

Repeat the loop, including risk formula and seven-day persistence tests.

### Phase 8 — Weekly Report

Repeat the loop, including timezone/week-boundary tests.

### Phase 9 — Settings

Repeat the loop, including persistence, theme, connection, export, and deletion tests.

### Phase 10 — Integration QA

1. Test navigation across every route.
2. Confirm consistent course colors and terminology.
3. Confirm all mascot requests return 200.
4. Run full type-check, lint, unit, integration, and end-to-end suites available in the repo.
5. Compare every desktop route at 1701 × 925.
6. Test representative tablet and mobile widths.
7. Verify Dashboard has no unintended visual/function regressions.

## 18. Visual comparison workflow

For every screen:

1. Start the application with the repository's documented command.
2. Seed or use a safe test account with enough real-looking data to exercise the layout.
3. Capture a screenshot at 1701 × 925.
4. Place it beside the matching file in `docs/design-concepts/`.
5. Compare in this order:
   - page frame and sidebar;
   - major card sizes and positions;
   - internal alignment and spacing;
   - typography scale and weight;
   - color and border radius;
   - mascot size and placement;
   - icons, pills, progress, and charts.
6. Correct the largest structural mismatch first.
7. Repeat until no obvious mismatch remains.

Do not claim pixel-match completion from code inspection alone. A rendered screenshot comparison is required.

## 19. Definition of done

A screen is complete only when all are true:

- It visually matches the approved concept at the target desktop viewport.
- It is usable on tablet and mobile.
- It uses the assigned Pilo asset correctly.
- All previous real functionality still works.
- Every new visible control has real behavior.
- Loading, empty, partial, error, and success states are handled.
- Type-check and relevant tests pass.
- Accessibility basics pass.
- A new screenshot has been compared with the reference.
- No unrelated page was changed accidentally.

## 20. Final instruction for Claude

Start with Phase 0, then implement one screen at a time in the stated order. After each phase, report:

1. Files changed.
2. Functional behavior preserved or added.
3. Data/migration changes.
4. Tests run and results.
5. Screenshot path and remaining visual differences.
6. Any blocker that prevents exact matching.

Do not proceed past a broken test, unresolved migration, or major visual mismatch without documenting and fixing it. The goal is a production-functional UniPilot interface that looks like the approved images, not a static screenshot recreation.
