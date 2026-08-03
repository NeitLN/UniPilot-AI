# UniPilot AI — Roadmap build 8 giao diện Gen Z

> Tài liệu triển khai dành cho Claude Code. Hãy dùng source hiện tại của repository làm nguồn sự thật, dùng 8 concept image làm visual target, rồi triển khai tuần tự theo từng step trong tài liệu này. Không chỉ phân tích hoặc tạo mockup mới.

## 1. Mục tiêu

Redesign và triển khai 8 màn hình sau để đồng bộ với Dashboard hiện tại và concept đã duyệt:

1. AI Planner
2. Schedule
3. Courses
4. Focus Timer
5. GPA Tracker
6. Workload Risk
7. Weekly Report
8. Settings

Phong cách mục tiêu là **Gen Z productivity**: trẻ, rõ, giàu cá tính, thông tin dễ quét nhanh, gamification nhẹ nhưng không biến sản phẩm học tập thành game hoặc casino.

## 2. Repository và nguồn sự thật

- Repository: `https://github.com/NeitLN/UniPilot-AI`
- Commit đã dùng khi viết roadmap: `abdb100`
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase, Motion, Vitest và Playwright.
- Dashboard đang chạy mới nhất là chuẩn nhận diện chính.
- `docs/screenshots/*.png` có thể là ảnh cũ; không dùng chúng để phủ định source hiện tại.
- Đọc `AGENTS.md` trước khi code. Repository yêu cầu đọc tài liệu Next.js cục bộ trong `node_modules/next/dist/docs/` vì đây là Next.js 16 có breaking changes.
- Đọc `app/globals.css` và `docs/ANIMATION_SYSTEM.md` trước khi thêm token hoặc animation.

## 3. Visual references

Đặt các ảnh concept vào `docs/design-concepts/` trước khi bắt đầu, dùng đúng tên:

| Màn hình | File concept |
| --- | --- |
| AI Planner | `01-ai-planner.png` |
| Schedule | `02-schedule.png` |
| Courses | `03-courses.png` |
| Focus Timer | `04-focus-timer.png` |
| GPA Tracker | `05-gpa-tracker.png` |
| Workload Risk | `06-workload-risk.png` |
| Weekly Report | `07-weekly-report.png` |
| Settings | `08-settings.png` |

Concept là mục tiêu về bố cục, phân cấp và cảm xúc; các con số trong ảnh chỉ mang tính minh họa. Khi triển khai, toàn bộ số liệu phải lấy hoặc suy ra từ dữ liệu thật.

## 4. Vai trò Claude phải đảm nhiệm

Hãy làm việc đồng thời với tư duy của:

- Senior Product Designer cho sản phẩm Gen Z.
- Senior UI/UX Designer chuyên dashboard productivity.
- Senior Next.js/React Engineer.
- Supabase/Postgres Engineer hiểu RLS và migration.
- QA Engineer kiểm tra logic, responsive, accessibility và regression.

## 5. Nguyên tắc bắt buộc

### 5.1 Không làm giả chức năng

- Không hard-code KPI, assignment, course, lịch học, lời khuyên hoặc báo cáo.
- Không render CTA nếu CTA không làm gì.
- Không tạo toggle giả; trạng thái toggle phải được lưu thật và được logic backend tôn trọng.
- Không báo PASS khi test chưa chạy.
- Nếu concept yêu cầu dữ liệu mà schema chưa có, phải bổ sung migration, RLS, type, server action và test; hoặc ghi rõ deferred rồi bỏ control đó khỏi UI.

### 5.2 Giữ nguyên chức năng hiện có

- Auth, RLS và ownership checks.
- Google Calendar OAuth/sync.
- Gemini plan generation.
- Add/Edit/Delete/Archive/Restore assignment.
- Add/Edit/Delete course, grade và class block.
- Focus timer, offline queue và history preservation.
- Risk computation và warning lifecycle.
- Push notification permission/subscription.
- Export và delete account.

### 5.3 Design system

- Dùng token hiện có: `bg-canvas`, `bg-card`, `bg-violet`, `bg-lime`, `bg-coral-tint`, `bg-mint-tint`, `text-foreground`, `text-ink-2`, `text-ink-3`, `rounded-card`, `rounded-ctl`.
- Không hard-code màu hex trong component.
- Không thêm gradient hoặc glassmorphism.
- Không thêm animation library mới.
- Không thêm icon dependency mới chỉ để phục vụ redesign. Tạo một bộ inline SVG nhỏ, nhất quán và dùng lại nếu cần.
- Pilo chỉ xuất hiện tại điểm hướng dẫn, khuyến khích hoặc phản hồi; không đặt mascot ở mọi card.

### 5.4 Accessibility

- WCAG AA cho text và control.
- Touch target tối thiểu 44×44px.
- Focus ring rõ.
- Không dùng màu làm tín hiệu duy nhất.
- Chart có text summary hoặc accessible table tương đương.
- `prefers-reduced-motion` phải hoạt động.
- Không giảm opacity chữ đến mức mất contrast trong dark mode.

## 6. Thứ tự triển khai tổng thể

- [ ] Phase 0 — Baseline, shared primitives và data contract.
- [ ] Phase 1 — AI Planner.
- [ ] Phase 2 — Schedule.
- [ ] Phase 3 — Courses.
- [ ] Phase 4 — Focus Timer.
- [ ] Phase 5 — GPA Tracker.
- [ ] Phase 6 — Workload Risk.
- [ ] Phase 7 — Weekly Report.
- [ ] Phase 8 — Settings.
- [ ] Phase 9 — Cross-page regression và final visual QA.

Không commit hoặc push nếu người dùng chưa yêu cầu.

---

# PHASE 0 — Foundation dùng chung

## Step 0.1 — Chụp baseline trước khi sửa

- [ ] Kiểm tra `git status`; bảo toàn mọi thay đổi có sẵn của người dùng.
- [ ] Chạy baseline:

```bash
npm run lint
npm run test
npm run build
```

- [ ] Nếu có test credentials, chạy `npm run test:e2e`.
- [ ] Chụp các route hiện tại ở 1440×900 và 390×844, light/dark.
- [ ] Ghi rõ failure nào đã tồn tại trước redesign.

## Step 0.2 — Audit shell và token

Đọc:

- `app/(app)/layout.tsx`
- `components/dashboard/SidebarNav.tsx`
- `components/dashboard/MobileBottomNav.tsx`
- `components/dashboard/KpiCard.tsx`
- `components/brand/Pilo.tsx`
- `app/globals.css`
- `lib/motion/tokens.ts`
- `lib/motion/variants.ts`
- `docs/ANIMATION_SYSTEM.md`

Không redesign sidebar/top bar. Các màn hình mới phải nằm trong shell hiện tại.

## Step 0.3 — Shared UI primitives

Chỉ tạo primitive khi có ít nhất hai màn hình sử dụng. Đề xuất:

- `components/ui/PageHeader.tsx`
  - Title, subtitle, primary action, secondary action.
  - Responsive wrap có chủ đích.
- `components/ui/SegmentedControl.tsx`
  - URL-driven hoặc controlled.
  - Keyboard accessible.
- `components/ui/ProgressRing.tsx`
  - SVG, clamp 0–100, text fallback và `aria-label`.
- `components/ui/StatTile.tsx`
  - Label, value, hint, tone.
- `components/ui/IconButton.tsx`
  - 44×44px, tooltip/aria-label.
- `components/ui/EmptyState.tsx`
  - Pilo optional, heading, copy, CTA thật.
- `components/ui/SkeletonCard.tsx`
  - Tôn trọng reduced motion.

Không biến primitive thành hệ thống abstraction quá lớn. Nếu props bắt đầu chứa logic domain, chuyển về feature component.

## Step 0.4 — Course color mapping

Tạo `lib/ui/course-tone.ts`:

- Input: stable `courseId`.
- Output: một tone trong violet, mint, tangerine, coral, sky, lime.
- Dùng stable hash của UUID để màu không đổi khi sorting/filtering.
- Không lưu màu giả vào DB nếu người dùng chưa có chức năng chọn màu.
- Trả về class map tĩnh để Tailwind phát hiện class lúc build; không tạo class bằng string động khó scan.

Thêm unit test bảo đảm cùng ID luôn ra cùng tone.

## Step 0.5 — Migration cho preferences thật

Concept Focus và Settings cần preference hiện chưa có. Tạo migration mới sau `0014`:

`supabase/migrations/0015_profile_ui_preferences.sql`

Đề xuất thêm vào `profiles`:

- `default_focus_minutes int not null default 25`, chỉ nhận 25, 45 hoặc 60.
- `daily_focus_goal_cycles int not null default 4`, giới hạn 1–12.
- `preferred_study_days smallint[] not null default '{1,2,3,4,5}'`, validate ở server action; 1=Monday, 7=Sunday.

Sau migration:

- [ ] Cập nhật `lib/supabase/types.ts`.
- [ ] Cập nhật profile trigger/backfill nếu cần.
- [ ] Thêm validation pure function.
- [ ] Thêm tests cho giới hạn và dữ liệu cũ.

Không thêm avatar upload trong phase này. Pilo ở Profile là decorative avatar; không render nút `Change avatar` nếu chưa có Supabase Storage flow thật.

## Step 0.6 — Notification preferences thật

Để Settings có các toggle riêng, tạo:

`supabase/migrations/0016_notification_preferences.sql`

Table đề xuất:

- `user_id uuid primary key references auth.users on delete cascade`
- `assignment_reminders boolean not null default true`
- `workload_warnings boolean not null default true`
- `weekly_report boolean not null default true`
- `focus_reminders boolean not null default false`
- `updated_at timestamptz not null default now()`

Bắt buộc:

- Enable RLS.
- Policy self-only.
- Tạo row mặc định khi user mới được tạo hoặc upsert khi Settings mở lần đầu.
- Cập nhật `lib/supabase/types.ts`.
- Server action update preference.
- Logic tạo/deliver notification phải kiểm tra preference; toggle không được chỉ đổi UI.
- Global browser push permission vẫn do `PushNotificationSettings` quản lý.

## Step 0.7 — Completed timestamp chính xác

Weekly Report cần biết assignment hoàn thành lúc nào. `updated_at` hiện chỉ là proxy và có thể sai.

Tạo `supabase/migrations/0017_assignment_completed_at.sql`:

- Thêm `completed_at timestamptz null` vào `assignments`.
- Backfill thận trọng cho row `status='done'` bằng `updated_at`, nhưng ghi rõ đây là historical approximation.
- Khi status chuyển sang `done`, set `completed_at=now()`.
- Khi chuyển từ `done` về trạng thái khác, set `completed_at=null`.
- Cập nhật create/update actions, types, export và tests.

## Step 0.8 — Quality gates dùng chung

Sau Phase 0:

- [ ] Lint pass.
- [ ] Unit tests pass.
- [ ] Build pass.
- [ ] Dark/light tokens không regression.
- [ ] Không có hard-coded hover color.
- [ ] Không có horizontal overflow ở shell.

---

# PHASE 1 — AI Planner

## 1.1 Visual target

Route: `/planner`

Concept: `01-ai-planner.png`

Mục tiêu:

- Hero `Pilo’s plan` thể hiện Draft/Active/Ended rõ ràng.
- Timeline theo ngày thay cho một card danh sách phẳng.
- Card Plan health hiển thị session, tổng thời gian và deadline coverage thật.
- Availability hiển thị free/busy bands từ class blocks và plan sessions.
- Pilo note được suy ra từ dữ liệu, không gọi AI thêm và không hard-code.

## 1.2 Current files cần giữ chức năng

- `app/(app)/planner/page.tsx`
- `app/(app)/planner/actions.ts`
- `app/api/plan/generate/route.ts`
- `components/planner/GenerateButton.tsx`
- `components/planner/PlanEditor.tsx`
- `components/planner/ActivePlanSummary.tsx`
- `lib/rules/plan.ts`
- `lib/gemini/*`
- `tests/e2e/planner.spec.ts`
- `tests/rules/plan.test.ts`

## Step 1.1 — Chuẩn hóa presentation data

Tạo pure presentation layer, ví dụ `lib/rules/plan-presentation.ts`:

- `groupSessionsByViewerDay(sessions, timeZone)`.
- `totalPlannedMinutes(sessions)`.
- `coveredAssignmentCount(sessions)`.
- `planCoverage(dueAssignments, sessions)`.
- `planHealthLabel(...)`.
- `derivePiloPlanNote(...)`.

Rules cho Pilo note phải deterministic, ví dụ:

- Nếu một ngày có quá nhiều session: nhắc ngày nặng nhất.
- Nếu Friday nhẹ hơn weekday khác: `I kept Friday light...` chỉ khi dữ liệu thực sự chứng minh.
- Nếu có khoảng nghỉ hợp lý: nói về recovery block.
- Nếu không có insight đáng tin: dùng copy trung tính `Your sessions are spread across the week.`

Thêm unit test cho timezone, empty plan, single-day plan và session qua midnight.

## Step 1.2 — Mở rộng query an toàn

Trong `planner/page.tsx`, query song song:

- Profile preferences.
- Pending assignments có `id`, `title`, `due_at`, `priority`, `course_id`.
- Draft plan và active plan.
- Study sessions của plan được chọn.
- Class blocks trong plan week để tạo availability.
- Course names cần thiết.

Không N+1 query theo session hoặc assignment. Lấy ID set rồi query một lần.

## Step 1.3 — Tách component

Đề xuất:

- `components/planner/PlannerHero.tsx`
- `components/planner/PlanHealthCard.tsx`
- `components/planner/PlannerWeekTabs.tsx`
- `components/planner/PlanTimeline.tsx`
- `components/planner/PlanSessionCard.tsx`
- `components/planner/AvailabilityBands.tsx`
- `components/planner/PiloPlanNote.tsx`

Giữ server component cho data composition; chỉ phần edit, day selection, drag/menu hoặc confirm là client component.

## Step 1.4 — Build hero Draft/Active/Ended

- [ ] Draft: violet hero, badge Draft, CTA `Review & confirm`.
- [ ] Active: badge Active, CTA context phù hợp.
- [ ] Ended: giảm nhấn, CTA `Generate new plan`.
- [ ] Empty: Pilo + CTA Generate, không hiển thị health giả.
- [ ] Confirm success/sync failed/sync skipped vẫn hiển thị như logic hiện tại.

Không được có hai CTA confirm ở vị trí cạnh tranh nhau. Desktop có thể có CTA hero và sticky action strip nhưng chỉ một primary hierarchy.

## Step 1.5 — Build timeline và editor

- Day tabs Mon–Sun lấy từ plan week.
- Chọn ngày không làm mất unsaved edit.
- Session card hiển thị:
  - Start–end time.
  - Assignment.
  - Duration.
  - Course tone.
  - `reason` từ Gemini nếu có.
  - Edit/remove menu.
- Dùng modal/inline editor hiện có cho start/end.
- Reuse `updateStudySession` và `deleteStudySession`.
- Validate collision và start < end như logic hiện tại.

Drag-and-drop chỉ triển khai nếu có keyboard alternative và không phá server-action flow. Nếu chưa đủ thời gian, dùng edit modal; không tạo drag handle giả.

## Step 1.6 — Plan health và availability

Plan health:

- Session count thật.
- Tổng duration thật.
- Coverage = unique assignment có session / assignment đến hạn trong plan window.
- Nếu denominator bằng 0, hiển thị `No deadlines this week`, không hiển thị 0% gây hiểu nhầm.

Availability bands:

- Viewer timezone.
- Window hiển thị mặc định 08:00–20:00.
- Busy = class blocks + plan sessions.
- Free = phần còn lại trong preferred study days.
- Legend phải có text, không chỉ màu.

## Step 1.7 — Responsive và motion

- Desktop: timeline 65–70%, insights 30–35%.
- Tablet: insight đặt sau hero, timeline full width.
- Mobile: day tabs scroll ngang; timeline một cột; reason collapse; CTA không bị bottom nav che.
- Dùng motion variants hiện có cho day switch và confirm state.
- Không animate lại toàn bộ timeline mỗi lần user quay về page.

## Step 1.8 — Test và Definition of Done

Unit:

- Grouping/timezone.
- Total minutes.
- Coverage.
- Pilo note.

E2E:

- Generate draft.
- Switch day.
- Edit session.
- Delete session.
- Confirm plan.
- Calendar push success/skipped/failed.
- Ended lifecycle.

Done khi:

- [ ] Không có hard-coded plan data.
- [ ] Draft/Active/Ended chính xác.
- [ ] Timeline dùng dữ liệu thật.
- [ ] Mobile/dark mode pass.
- [ ] Existing planner tests pass.

---

# PHASE 2 — Schedule

## 2.1 Visual target

Route: `/schedule`

Concept: `02-schedule.png`

Mục tiêu:

- Week view trở thành time grid thực, không chỉ là 7 cột danh sách.
- Có Next class, classes today và free blocks.
- Có current-time line và event card theo course tone.
- Today agenda và Google Calendar status rõ.
- Day/Week/Month hiện có vẫn hoạt động.

## 2.2 Current files

- `app/(app)/schedule/page.tsx`
- `app/(app)/schedule/actions.ts`
- `components/schedule/ScheduleContent.tsx`
- `components/schedule/ScheduleGrid.tsx`
- `components/schedule/ViewSwitcher.tsx`
- `components/schedule/SyncStatusBar.tsx`
- `components/schedule/ClassDetailPanel.tsx`
- `lib/calendar/view.ts`
- `tests/calendar/view.test.ts`
- `tests/e2e/schedule.spec.ts`

## Step 2.1 — Presentation rules

Tạo `lib/rules/schedule-presentation.ts`:

- `nextClass(blocks, now)`.
- `todayBlocks(blocks, now, timeZone)`.
- `freeStudyWindows(blocks, date, dayStart, dayEnd)`.
- `positionEvent(start, end, gridStart, gridEnd)`.
- `layoutOverlappingEvents(events)`.
- `isCurrentDisplayedWeek(range, now)`.

Test DST/timezone, overlapping event, all-day event, event ngoài 08:00–20:00 và empty day.

## Step 2.2 — Header summary

Tạo:

- `ScheduleSummaryStrip`
- `NextClassCard`
- `ScheduleMetricCard`

Rules:

- Next class chỉ lấy event tương lai gần nhất.
- Nếu class đang diễn ra: badge `Happening now`.
- Nếu không có class: `No more classes today` hoặc ngày class tiếp theo.
- Free blocks phải có window definition rõ; không cộng qua thời gian ngủ.

## Step 2.3 — WeekTimeGrid

Tạo `components/schedule/WeekTimeGrid.tsx`:

- Grid 7 ngày, time axis 08:00–20:00.
- Event top/height tính theo phút.
- Event ngoài window được clamp và có indicator.
- Overlap layout side-by-side, không đè text.
- All-day strip riêng.
- Current-time line chỉ hiện trên ngày hiện tại khi đang xem đúng tuần.
- Deadline marker dùng assignment due date thật.
- Click event mở `ClassDetailPanel` hiện có.

Không dùng CSS pixel hard-code gắn với một viewport duy nhất. Tách constants cho hour height và range.

## Step 2.4 — Today panel

Tạo `TodayAgendaCard`:

- Ordered by time.
- Course tone dot.
- Start/end/location.
- CTA `Start focus` chỉ xuất hiện nếu có active assignment phù hợp; nếu không, link tới Focus page không preselect giả.
- Agenda empty có copy rõ.

## Step 2.5 — Google sync

- Giữ OAuth flow và `SyncStatusBar`.
- Compact status card ở sidebar desktop.
- Error sync vẫn phải nổi bật đủ mức.
- `Sync Google Calendar` CTA không duplicate nếu đã connected; thay bằng `Sync now` hoặc `Manage` theo trạng thái thật.

## Step 2.6 — Day và Month view

- Day view dùng agenda lớn, không ép dùng time grid 7 cột.
- Month view giữ 42-cell grid hiện tại nhưng áp course tone và overflow menu dễ đọc.
- URL params `view` và `date` vẫn là source of truth.
- Back/forward browser hoạt động.

## Step 2.7 — Responsive

- Desktop: week grid + right agenda.
- Tablet: agenda xuống dưới grid.
- Mobile: tự chuyển presentation sang day agenda hoặc horizontal day selector; không thu nhỏ 7 cột thành chữ không đọc được.
- Bottom nav không che last event.
- View switcher không overflow.

## Step 2.8 — Tests và Done

E2E:

- Day/Week/Month switching.
- Previous/next/today.
- Add/edit/delete event.
- Open detail panel.
- OAuth status/error.
- Overlapping events screenshot.
- Mobile empty weekend.

Done khi:

- [ ] Time grid phản ánh đúng duration.
- [ ] Overlap không đè nhau.
- [ ] Timezone đúng.
- [ ] Existing calendar functions không regression.

---

# PHASE 3 — Courses

## 3.1 Visual target

Route: `/courses`

Concept: `03-courses.png`

Mục tiêu:

- Chuyển CRUD list thành course card grid.
- Mỗi course có tone ổn định, progress, assignment count và next deadline.
- Edit/Delete nằm trong menu `…`.
- Search và semester filter.
- Course load summary dùng số liệu thật.

## 3.2 Current files

- `app/(app)/courses/page.tsx`
- `app/(app)/courses/actions.ts`
- `components/courses/CourseListItem.tsx`
- `components/courses/CourseForm.tsx`
- `components/courses/DeleteCourseDialog.tsx`
- `tests/e2e/courses.spec.ts`
- `tests/rules/course.test.ts`

## Step 3.1 — Loại bỏ N+1 usage query

Hiện page gọi `getCourseUsage()` cho từng course. Refactor thành các query song song:

- Courses.
- Assignments thuộc user.
- Grades.
- Class blocks nếu card cần class count.

Group bằng Map ở server:

- `assignmentCount`.
- `gradeCount`.
- `classBlockCount`.
- `averageProgress` từ assignment active.
- `nextDueAssignment`.
- `overdueCount`.

Không query từng course.

## Step 3.2 — Presentation model

Tạo `lib/rules/course-presentation.ts`:

- `courseProgress(assignments)`.
- `nextCourseDeadline(assignments, now)`.
- `courseLoadSummary(courses, assignments, weekRange)`.
- `filterCourses(courses, q, semester)` nếu filter server-side không cần.

Test empty course, all completed, no assignments, overdue và mixed progress.

## Step 3.3 — Search và filter

- Search input `q` debounce 300–350ms.
- Semester select từ dữ liệu thật.
- Optional status filter `All courses`, `Needs attention`, `All caught up`.
- Lưu state trong URL params.
- Filter không có kết quả phải khác empty toàn bộ.

## Step 3.4 — CourseCard

Tạo `components/courses/CourseCard.tsx`:

- Code badge.
- Course name.
- Credits.
- Assignment count.
- Progress label + bar.
- Next deadline hoặc `All caught up`.
- Overdue semantic state.
- Menu `…` mở Edit/Delete.
- `aria-label` chứa course name.

Không render progress 0% như lỗi nếu course chưa có assignment; hiển thị `No assignments yet`.

## Step 3.5 — Course load summary

Tạo `CourseLoadSummary`:

- Total assignments.
- Due this week.
- Distribution by course.
- Bar segments có text legend hoặc accessible summary.
- Nếu chỉ một course, không giả vờ “balanced”.

## Step 3.6 — Responsive

- Desktop: 3-column grid.
- Tablet: 2 columns.
- Mobile: 1 column.
- Search full width trên mobile.
- Menu và button 44×44.
- Long Vietnamese course names wrap tối đa 2 dòng, không làm vỡ card.

## Step 3.7 — Tests và Done

- Search, semester filter và browser history.
- Add/edit/delete vẫn hoạt động.
- Delete dependency warning vẫn chính xác.
- Progress và next deadline đúng.
- Không N+1.
- Empty/filter-empty/dark/mobile screenshots.

---

# PHASE 4 — Focus Timer

## 4.1 Visual target

Route: `/focus`

Concept: `04-focus-timer.png`

Mục tiêu:

- Lime immersive focus card.
- Timer, assignment picker và start/pause/stop rõ.
- This week metrics, activity strip và daily goal.
- Focus history và learning rhythm.
- Pilo đồng hành có tiết chế.

## 4.2 Current files

- `app/(app)/focus/page.tsx`
- `app/(app)/focus/actions.ts`
- `components/focus/FocusTimer.tsx`
- `components/focus/FocusStats.tsx`
- `components/focus/LearningStats.tsx`
- `components/focus/LogSessionDialog.tsx`
- `lib/rules/focus.ts`
- `lib/offline/idb.ts`
- `tests/rules/focus.test.ts`
- `tests/e2e/focus.spec.ts`

## Step 4.1 — Duration preference thật

Đọc `profiles.default_focus_minutes` từ migration Phase 0.

Refactor timer:

- Idle cho chọn 25/45/60 hoặc dùng default.
- Khi start, lưu `durationSeconds` vào `StoredSession`.
- Backward-compatible với localStorage session cũ không có duration: fallback 25 phút.
- Pause/resume vẫn timestamp-based.
- Break 5/15 phút vẫn dùng rule hiện có.
- Completed session ghi duration thật.

Không đổi offline queue contract mà không có migration/test tương ứng.

## Step 4.2 — Timer visual

- Large SVG ring có accessible label.
- Lime work mode, mint break mode.
- Assignment picker chỉ active assignment.
- Pilo dùng mood theo state: idle/running/completed/break nếu component hỗ trợ.
- Primary action duy nhất theo state: Start, Pause, Resume hoặc Finish.
- Stop early phải giữ confirmation hiện có.

## Step 4.3 — Daily goal

Từ `profiles.daily_focus_goal_cycles`:

- Count completed work cycles trong viewer day.
- Hiển thị `completed / goal`.
- Clamp progress visual nhưng vẫn hiển thị số thật nếu vượt goal.
- Không count partial/manual session như full cycle trừ khi rule sản phẩm định nghĩa rõ.

Tạo pure function và unit tests.

## Step 4.4 — Weekly activity strip

Từ focus sessions 7 ngày:

- Mỗi ngày: completed cycles + minutes.
- Tone theo intensity với legend text.
- Empty day = Rest, không coi là failure.
- Viewer timezone.
- Screen reader summary theo ngày.

## Step 4.5 — Focus history

Mở rộng query đủ field:

- Assignment title.
- Course.
- Start time.
- Duration.
- Result/source.

Hiển thị 3–5 session gần nhất; `View all history` chỉ render nếu có destination hoặc expandable list thật. Không tạo link giả.

## Step 4.6 — Learning rhythm

Reuse `weeklyMinutesSeries` và `LearningStats`:

- Restyle bar chart theo concept.
- Exact value label.
- Week/day label không overflow.
- Table by course giữ accessible fallback.

## Step 4.7 — Ambient sound scope

Concept có `Lo-fi · Off`, nhưng không được tạo audio giả.

- P2 optional: chỉ implement nếu có audio asset được cấp phép và lưu trong project.
- Nếu chưa có asset, bỏ control khỏi production UI.
- Không stream asset ngoài hoặc nhúng URL không rõ license.

## Step 4.8 — Tests và Done

Test:

- 25/45/60.
- Reload resume.
- Pause/resume.
- Auto-complete.
- Short/long break.
- Stop early.
- Offline completion queue.
- Daily goal boundary.
- Timezone around midnight.
- Empty assignment state.

Done khi timer vẫn chính xác theo timestamp, không phụ thuộc animation duration.

---

# PHASE 5 — GPA Tracker

## 5.1 Visual target

Route: `/gpa`

Concept: `05-gpa-tracker.png`

Mục tiêu:

- Hero Cumulative GPA + Target.
- On-track card dựa trên required average thật.
- Course breakdown thân thiện hơn table admin.
- GPA trend rõ.
- Predicted grade có disclaimer.
- What-if simulator giữ chức năng hiện tại.

## 5.2 Current files

- `app/(app)/gpa/page.tsx`
- `app/(app)/gpa/actions.ts`
- `components/gpa/GpaContent.tsx`
- `components/gpa/CourseBreakdown.tsx`
- `components/gpa/GpaTrendChart.tsx`
- `components/gpa/PredictedGrades.tsx`
- `components/gpa/ForecastCard.tsx`
- `lib/rules/gpa.ts`
- `tests/rules/gpa.test.ts`
- `tests/e2e/gpa.spec.ts`

## Step 5.1 — Hero model

Tạo `GpaHero`:

- Overall GPA.
- Done credits.
- Target GPA.
- Ring progress = GPA/4, nhưng target marker hiển thị riêng.
- No-grade state không hiển thị 0.00 như một kết quả thật.
- `On track` chỉ khi required average ≤4 và có grade data.
- Nếu target đã đạt: copy `Target currently met`.
- Nếu impossible: coral tint + copy trung tính, không phán xét.

## Step 5.2 — Course breakdown redesign

Giữ edit/delete logic:

- Course tone icon.
- Course name.
- Credits.
- Grade badge.
- Grade point.
- Contribution bar.
- Menu `…` cho Edit/Delete.

Contribution phải có định nghĩa rõ: quality points của course / total quality points hoặc credit share; label/tooltip phải nói đúng công thức.

## Step 5.3 — Trend chart

- Dùng `gpaBySemester` hiện có.
- Y-axis domain co hợp lý, không luôn 0–4 nếu làm biến động khó đọc; nhưng ghi rõ axis range.
- Target line.
- Exact labels.
- Empty/single-semester state.
- Accessible table fallback.

## Step 5.4 — Predicted scenarios

Không dùng số ngẫu nhiên. Nếu muốn khớp ba card concept, tạo pure function `projectGpaScenarios`:

- Official grades là fixed.
- Với course chưa có official grade:
  - Worst case: unscored weight dùng assumption bảo thủ được document.
  - Likely: giữ current scored average hoặc neutral fallback có document.
  - Best case: unscored weight tối đa 100%.
- Convert bằng `estimateGradePoint` hiện có.
- Weight theo course credits.
- Luôn hiển thị disclaimer `Directional estimate, not an official grade.`

Nếu dữ liệu không đủ, giữ per-course prediction hiện tại và không render ba scenario giả.

## Step 5.5 — Pilo insight

Không dùng từ `momentum` nếu không có time series theo course.

Rule an toàn:

- Highest official grade: `Your strongest current course is …`.
- Nếu chưa có official grade, dùng highest sufficiently-scored predicted course và nói rõ `Based on graded assignments`.
- Nếu không đủ data, ẩn card.

## Step 5.6 — What-if simulator

- Reuse `requiredAverage`.
- Target blur/save vẫn hoạt động.
- Remaining credits là simulation input, không tự lưu trừ khi có requirement.
- Handle 0 grade, 0 remaining, target outside range, impossible result.
- Maintain dark-mode semantic colors.

## Step 5.7 — Responsive và tests

- Desktop: breakdown 62–65%, charts 35–38%.
- Mobile: hero stack; table rows thành cards hoặc horizontal safe layout.
- Test add/edit/delete grade; target save; prediction; forecast; empty data.

Done khi mọi số trong hero, chart và simulator khớp cùng một source/rule.

---

# PHASE 6 — Workload Risk

## 6.1 Visual target

Route: `/risk`

Concept: `06-workload-risk.png`

Mục tiêu:

- Dark hero `Your weekly balance` với score và 3 factors.
- Giải thích evidence tạo score.
- 7-day trend từ lịch sử thật.
- Pilo suggestion dẫn tới một action thật.
- Disclaimer giữ nguyên.

## 6.2 Current files

- `app/(app)/risk/page.tsx`
- `app/(app)/risk/actions.ts`
- `lib/risk/compute.ts`
- `lib/rules/risk.ts`
- `components/risk/WarningActions.tsx`
- `tests/rules/risk.test.ts`
- `tests/e2e/risk.spec.ts`

## Step 6.1 — Refactor computation result

`computeAndStoreRisk` hiện trả factor/score nhưng UI concept cần evidence.

Mở rộng result an toàn:

- `availableHours`.
- `plannedHours`.
- `pendingCount`.
- `overdueCount`.
- `completedCycles7d`.
- `completedFocusMinutes7d`.

Không thay đổi công thức risk nếu không có yêu cầu sản phẩm. Evidence chỉ giải thích input của công thức hiện tại.

Thêm test để score cũ không đổi sau refactor.

## Step 6.2 — Risk hero

Tạo:

- `RiskBalanceHero`
- `RiskFactorMeter`
- `RiskRangeGauge`

Rules:

- Score 0–100.
- Threshold vẫn 60.
- Factor labels đúng weight hiện tại: workload ×0.40, overdue ×0.35, focus ×0.25.
- `Within a healthy range` hoặc `Above threshold` theo rule hiện có.
- Không dùng coral page-wide khi score dưới threshold.

## Step 6.3 — Evidence card

`What’s shaping your score` phải dựa trên evidence:

- Overdue assignment count.
- Tasks due this week hoặc pending count, nhưng label phải đúng query.
- Focus cycles/minutes.
- Planned vs available hours.

Impact badge được suy ra từ factor values, không hard-code.

## Step 6.4 — 7-day trend

Query `risk_scores` 7 ngày gần nhất:

- Order by `score_date`.
- Không tạo điểm cho ngày thiếu dữ liệu.
- Nếu chỉ có 1–2 điểm, hiển thị sparse state thay vì nối trend giả.
- Threshold line 60.
- Viewer locale cho date label.
- Accessible summary/list.

## Step 6.5 — Pilo suggestion và task target

Reuse `topSuggestion(result)` nhưng thêm optional actionable target:

- Chọn overdue high-priority gần nhất.
- Sau đó overdue gần nhất.
- Sau đó high-priority sắp đến hạn.
- Sau đó earliest active assignment.

CTA:

- Nếu target tồn tại: link/preselect Focus bằng cơ chế thật.
- Nếu chưa có deep link, thêm `?assignment=<id>` và cập nhật Focus picker validate ownership.
- Nếu không có target: dùng CTA phù hợp như `Review this week`.

## Step 6.6 — A lighter week

Không dùng checkbox giả. Mỗi row là link/action:

- Clear overdue task → assignment target.
- Protect focus blocks → AI Planner hoặc Focus.
- Adjust availability → Settings.

Nếu warning đang open, giữ Mark handled/Dismissed flow hiện có ở vị trí phụ.

## Step 6.7 — Insufficient data

Giữ gate logic:

- Missing weekly availability → Settings.
- Missing assignment → Assignments.
- Missing focus history → Focus.

Redesign thành checklist có progress nhưng không giả score.

## Step 6.8 — Tests và Done

Test:

- Score unchanged.
- Evidence counts.
- Trend with missing days.
- Suggestion target order.
- Above/below threshold.
- Warning handled/dismissed.
- Insufficient data links.

---

# PHASE 7 — Weekly Report

## 7.1 Visual target

Route: `/reports`

Concept: `07-weekly-report.png`

Mục tiêu:

- Personalized weekly recap.
- Hero với Pilo và summary thật.
- 4 metric cards.
- Study rhythm chart so với tuần trước.
- Course-time breakdown.
- Plan adherence, weekly win và worth-a-look insight.
- Previous week navigation.

## 7.2 Current files

- `app/(app)/reports/page.tsx`
- `lib/rules/insights.ts`
- `lib/rules/focus.ts`
- `lib/rules/gpa.ts`
- `tests/rules/insights.test.ts`
- `tests/e2e/reports.spec.ts`

## Step 7.1 — Week parameter và date range

Thêm URL param `week=YYYY-MM-DD` đại diện Monday của tuần:

- Validate và normalize.
- Default current viewer week.
- Previous/next navigation.
- Không cho next vượt tương lai nếu không có requirement.
- Tất cả query dùng cùng anchor và viewer timezone.

Tạo helpers trong `lib/rules/report-range.ts` và tests DST/year boundary.

## Step 7.2 — Query và aggregation

Query bounded:

- Focus sessions của selected week + previous week.
- Assignments completed/due relevant.
- Grades cần cho cumulative comparison.
- Active/selected study plan sessions.
- Courses liên quan.

Dùng `completed_at` mới thay `updated_at` cho completed count/list.

Không tải toàn bộ assignment history nếu report chỉ cần 14 ngày, trừ row được focus session tham chiếu; dùng ID batch như pattern hiện tại.

## Step 7.3 — Hero recap

Tạo `WeeklyRecapHero`:

- Completed focus minutes.
- Completed assignment count.
- Streak.
- Pilo mood dựa trên activity, không đánh giá con người.
- Copy templates deterministic.
- Progress arc chỉ dùng khi denominator thật tồn tại.

Nếu dùng weekly availability làm capacity:

- Goal minutes = `weekly_availability_hours × 60`.
- Label rõ `of your available study time`, không gọi là user-set goal nếu họ chưa đặt goal.
- Nếu availability = 0, ẩn arc.

## Step 7.4 — Metrics

Reuse `weekOverWeek`:

- Completed.
- Study time.
- Streak.
- GPA.

Decrease không luôn là negative:

- Study time giảm có thể neutral nếu assignment load cũng giảm.
- Không dùng coral chỉ vì số giảm nếu không có ý nghĩa xấu chắc chắn.
- Text và icon phải giải thích direction.

## Step 7.5 — Study rhythm chart

- Bars = selected week minutes/day.
- Comparison line = previous week.
- Exact values.
- Day labels viewer timezone.
- Empty days là 0 thật.
- Accessible table/list.
- Course-time breakdown dùng top courses + Other.

## Step 7.6 — Plan adherence

Reuse `planAdherence`:

- `completed planned sessions / sessions already due`.
- Không tính future session là missed.
- Nếu chưa có due session: neutral state.
- Copy `4 of 5 planned sessions completed` chỉ khi numerator/denominator thật.

## Step 7.7 — Weekly win và insight

Weekly win priority:

1. Assignment hoàn thành trước deadline.
2. Longest focus streak.
3. Highest focus day.
4. Plan adherence milestone.

Nếu không có evidence, ẩn win card hoặc dùng neutral recap; không bịa.

`Worth a look` reuse `deriveStudyInsight` nhưng đảm bảo course/deadline/minutes thật.

## Step 7.8 — Completed rows

- Hiển thị tối đa 3 recent completed assignments.
- Dùng `completed_at`.
- Course tone.
- Completion time.
- Link tới assignment nếu route hỗ trợ; không tạo chevron giả.

## Step 7.9 — Tests và Done

Test:

- Current/previous week.
- Year boundary.
- No activity.
- Completed timestamp.
- Plan future session exclusion.
- Course-time insight.
- Mobile chart and dark mode.

---

# PHASE 8 — Settings

## 8.1 Visual target

Route: `/settings`

Concept: `08-settings.png`

Mục tiêu:

- Settings hub có internal navigation.
- Profile, Study preferences, Appearance, Notifications, Connections, Data & privacy.
- Tất cả control lưu thật.
- Delete account không chiếm ưu thế thị giác.

## 8.2 Current files

- `app/(app)/settings/page.tsx`
- `app/(app)/settings/actions.ts`
- `components/settings/SettingsForm.tsx`
- `components/settings/ThemeToggle.tsx`
- `components/settings/PushNotificationSettings.tsx`
- `components/settings/ExportData.tsx`
- `components/settings/DeleteAccountSection.tsx`
- `components/settings/DeleteAccountDialog.tsx`
- `app/api/export/route.ts`

## Step 8.1 — Page layout và internal nav

Tạo:

- `SettingsNav`
- `SettingsSection`
- `ProfileSettingsCard`
- `StudyPreferencesCard`
- `AppearanceCard`
- `NotificationPreferencesCard`
- `ConnectionsCard`
- `DataPrivacyCard`

Desktop: nav 25%, content 75%.

Mobile: nav thành horizontal tabs hoặc select; anchor scroll có focus management.

Nav item phải dẫn đến section thật bằng anchor/active observer; không chỉ trang trí.

## Step 8.2 — Profile

- Full name editable bằng server action hiện có.
- Email hiển thị read-only từ Supabase Auth.
- Không cho edit email nếu chưa implement auth confirmation flow.
- Pilo avatar decorative.
- Không render `Change avatar` giả.
- Saved/error state dùng `FieldSuccess`/`FieldError`.

## Step 8.3 — Study preferences

Fields thật:

- Weekly availability hours.
- Target GPA.
- Preferred study days.
- Default focus duration 25/45/60.
- Daily focus goal cycles.

Update `SettingsFormState`, validation và server action atomically.

Update downstream:

- AI Planner đọc preferred days/default availability behavior.
- Focus đọc default duration và daily goal.
- Risk vẫn dùng weekly availability.
- Report dùng availability capacity nếu hiển thị arc.

## Step 8.4 — Appearance

Restyle `ThemeToggle` thành 3 visual choices:

- Light.
- Dark.
- System.

Giữ `lib/theme` và localStorage behavior. Không gây flash sai theme.

Mỗi option keyboard accessible và có `aria-pressed`.

## Step 8.5 — Notifications

Tách hai tầng rõ:

1. Browser/device push permission:
   - Reuse `PushNotificationSettings`.
   - States loading/default/enabled/denied/unsupported.
2. Notification category preferences:
   - Assignment reminders.
   - Workload warnings.
   - Weekly report.
   - Focus reminders.

Toggle category chỉ enabled khi row được lưu thành công. Có optimistic UI thì phải rollback khi action fail.

Backend tạo/deliver notification phải tôn trọng table preference từ Phase 0.

## Step 8.6 — Connections

Google Calendar:

- Query connection state.
- Connected: show last sync, `Manage` link tới Schedule hoặc thật sự có disconnect action.
- Disconnected: `Connect Google Calendar` dùng OAuth start route hiện có.
- Error state rõ.

Không tạo connection giả cho service khác.

## Step 8.7 — Data & privacy

- Reuse ExportData.
- Export action hiển thị progress/error.
- Delete account tách coral tint nhẹ ở cuối.
- Confirmation hiện có giữ email typed confirmation.
- Không đặt Delete cạnh Save profile.

## Step 8.8 — Responsive và tests

Test:

- Update profile.
- Invalid availability/GPA/preferences.
- Theme persistence/reload.
- Push all states.
- Category preference persistence và backend respect.
- Google connection states.
- Export.
- Delete confirmation.
- Mobile tab navigation.

Done khi Settings không còn một cột hẹp `max-w-md`, nhưng vẫn dễ đọc và không quá nhiều màu.

---

# PHASE 9 — Cross-page integration và final QA

## Step 9.1 — Data consistency matrix

Kiểm tra cùng một dữ liệu ở nhiều nơi:

| Dữ liệu | Nơi phải khớp |
| --- | --- |
| Active assignments | Dashboard, Assignments, Courses, Risk |
| Focus minutes/cycles | Dashboard, Focus, Risk, Weekly Report |
| GPA | Dashboard, GPA Tracker, Weekly Report |
| Plan status | Dashboard, AI Planner, Schedule |
| Weekly availability | Settings, AI Planner, Risk, Weekly Report |
| Completed assignment | Assignments, Courses, Weekly Report |

Không được có nhiều định nghĩa `active`, `week`, `completed` hoặc timezone khác nhau.

## Step 9.2 — Performance

- Không N+1 query.
- Query lịch sử phải bounded.
- Dùng Promise.all cho query độc lập.
- Không chuyển server component lớn sang client chỉ để animation.
- Chart không import thư viện nặng nếu SVG/CSS hiện tại đủ.
- Kiểm tra bundle diff.

## Step 9.3 — Responsive matrix

Kiểm tra từng route ở:

- 1440×900 light.
- 1440×900 dark.
- 1024×768.
- 768×1024.
- 390×844 light.
- 390×844 dark.

Checklist:

- Không horizontal overflow.
- Sidebar và bottom nav active đúng.
- Bottom nav không che CTA/content.
- Long Vietnamese text không vỡ layout.
- Modal vừa viewport.
- Chart label đọc được.
- Touch target 44×44.

## Step 9.4 — Accessibility

- Keyboard-only walkthrough.
- Visible focus.
- Modal focus trap và return focus.
- `aria-live` cho save/generate/confirm.
- Chart summary.
- Contrast light/dark.
- Reduced motion.
- Không dựa vào color-only state.

## Step 9.5 — Full verification

Chạy:

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

Nếu E2E cần credentials không có, ghi rõ blocker và chạy phần còn lại; không tự tuyên bố E2E pass.

## Step 9.6 — Visual deliverables

Chụp screenshot thật, không dùng concept làm ảnh kết quả:

- Mỗi route desktop light.
- Mỗi route mobile light.
- Ít nhất một dark screenshot cho mỗi layout pattern.
- Empty/error/loading state quan trọng.

So sánh với concept theo:

- Hierarchy.
- Layout ratio.
- Color roles.
- Information density.
- CTA priority.
- Pilo placement.

Không pixel-copy các con số minh họa.

---

# 10. Definition of Done toàn dự án

Chỉ xem là hoàn thành khi:

- [ ] Cả 8 màn hình có cùng design language với Dashboard.
- [ ] Mỗi màn có hero/primary information riêng, không sao chép Dashboard.
- [ ] Không còn cảm giác CRUD/admin table ở Courses, Planner, GPA và Settings.
- [ ] Không có dữ liệu, toggle, CTA hoặc insight giả.
- [ ] Schema mới có migration, RLS, type và test đầy đủ.
- [ ] Chức năng cũ không regression.
- [ ] Light/dark/mobile/tablet/desktop đạt yêu cầu.
- [ ] Accessibility và reduced motion đạt yêu cầu.
- [ ] Lint, tests và build pass.
- [ ] Có screenshot triển khai thật cho từng màn.
- [ ] Mọi giới hạn còn lại được ghi trung thực.

# 11. Format báo cáo sau mỗi Phase

Sau mỗi phase, Claude phải trả về:

1. Mục tiêu phase đã hoàn thành.
2. File đã tạo/sửa.
3. Data/query/rule đã thêm hoặc thay đổi.
4. Migration đã áp dụng, nếu có.
5. Tests đã chạy và kết quả chính xác.
6. Screenshot desktop/mobile.
7. Regression hoặc giới hạn còn lại.
8. Step tiếp theo.

Không dùng câu `all tests passed` nếu không ghi command và số test thực tế.

# 12. Lệnh bắt đầu dành cho Claude Code

```text
Read AGENTS.md, this roadmap, the current source, app/globals.css, and docs/ANIMATION_SYSTEM.md completely before editing. Treat the running source as the product truth and the eight concept images as visual targets only. Start with Phase 0 baseline and audit. Then implement one phase at a time, using real data and preserving existing behavior. Do not hard-code concept numbers, do not create fake controls, do not commit or push unless I ask. After each phase, run the relevant tests, capture real desktop/mobile screenshots, and report exact results before continuing.
```

