# Kế hoạch triển khai — từ PRODUCT_REVIEW.md

**Nguồn:** [`docs/PRODUCT_REVIEW.md`](./PRODUCT_REVIEW.md) (30/07/2026)
**Trạng thái nền:** `main` @ `52fd5e4` — typecheck sạch, lint sạch, 149 unit test + 14 E2E test xanh
**Tổng:** 5 phase, ~22 giờ · **Phase 1 + 2 + 3: ✅ Hoàn thành** (xem §Phase tương ứng để biết chi tiết + phát hiện phát sinh)

---

## Hai điều chỉnh so với ước tính ban đầu trong review

Sau khi đọc kỹ code để lập kế hoạch, có 2 con số trong `PRODUCT_REVIEW.md` cần chỉnh lại:

| Hạng mục | Review ước tính | Thực tế | Lý do |
|---|---|---|---|
| **QA-01** (biểu đồ GPA) | "2 component" | **1 component** | `GpaTrendCard` (Dashboard) chỉ là wrapper gọi lại đúng `GpaTrendChart`. Sửa 1 file là hết cả 2 chỗ hiển thị. **Dễ hơn dự kiến.** |
| **Đổi `ON DELETE SET NULL`** | 30 phút | **~2 giờ** | Cột đang là `assignment_id uuid **not null**`. Không thể `SET NULL` khi còn `NOT NULL` → phải bỏ ràng buộc, kéo theo đổi kiểu `string` → `string \| null` ở `types.ts`, `FocusSessionLike`, và **6 nơi tiêu thụ** (`focus/page.tsx`, `FocusWeekKpi`, `LearningStats`, `focus/actions.ts`, `lib/rules/focus.ts`, tests). **Khó hơn dự kiến.** |

---

## Nguyên tắc chung cho mọi phase

1. **Thứ tự bắt buộc:** Phase 4 phải làm migration FK **trước** khi mở tính năng xoá vĩnh viễn — không được đảo.
2. **Quy trình verify mỗi phase:** `npx tsc --noEmit` → `npx eslint app components lib tests` → `npx vitest run` → khởi động lại dev server → kiểm tra thật bằng Playwright ở **cả 3 viewport** (390/768/1280) và **cả 2 theme**.
3. **Dữ liệu kiểm thử:** dùng tài khoản `e2e-tests@unipilot.local`, **không** dùng `tien.vo539@gmail.com` (bài học từ QA-05).
4. **Commit:** mỗi hạng mục 1 commit, message ghi rõ mã (QA-01, FR-20…) và *lý do* chứ không chỉ *cái gì*.
5. **Dark mode:** mọi UI mới phải dùng token (`bg-card`, `text-foreground`, `border-border-subtle`), tuyệt đối không `bg-white`/`text-ink` cho chữ chính — xem bẫy đã gặp ở `future_update.md` §9.

---

# Phase 1 — Hotfix 2 lỗi P0

> **Mục tiêu:** hai tính năng đã hoàn thiện nhưng đang hỏng — sửa trước mọi thứ khác.
> **Thời lượng:** ~1 giờ · **Rủi ro:** rất thấp
> **✅ Hoàn thành** — commit [`97acc0e`](https://github.com/NeitLN/UniPilot-AI/commit/97acc0e). Xác minh bằng số đo thật trên tài khoản demo: bar chart giờ ra đúng **98/105/107px** (khớp GPA 3.25/3.49/3.57, trước đó cả 3 đều 98px); ô search **358px** ở 390px viewport và **466px** ở 768px (trước đó 49px/36px). 12/12 E2E test xanh, 144/144 unit test xanh.
>
> **Phát hiện phát sinh ngoài kế hoạch:** viết test `layout.spec.ts` (mục 1.3) phát hiện `gpa.spec.ts` **chưa bao giờ dọn dữ liệu** sau khi test — tài khoản E2E tích luỹ 9 dòng điểm rác qua nhiều lần chạy, đủ để **tự nó** làm tràn ngang biểu đồ GPA ở 390px, độc lập với lỗi QA-01. Đã dọn 9+4 dòng rác và bổ sung bước dọn dẹp vào cả `gpa.spec.ts` lẫn `layout.spec.ts` để không tích luỹ lại.

### 1.1 — QA-01: Biểu đồ GPA bị flex ép bằng nhau

**File:** `components/gpa/GpaTrendChart.tsx` *(sửa 1 file → khắc phục cả trang GPA lẫn Dashboard)*

**Vấn đề:** cột bar là flex-item trong cột `flex-col` cao 120px chứa cả `<span>` nhãn (~16px) + `gap-1.5`. Khi bar cần 107px thì tổng vượt 120px → flex co bar lại → mọi bar đều bị kẹp về 98px.

**Cách sửa:** thêm `shrink-0` vào div của bar.

**Tiêu chí chấp nhận:**
- [ ] Với GPA 3.25 / 3.49 / 3.57, `getBoundingClientRect().height` = **98 / 105 / 107** (khớp `style.height`)
- [ ] Trường hợp GPA = 0 vẫn hiện vạch tối thiểu 6px (không biến mất)
- [ ] Trường hợp GPA = 4.0 không tràn khỏi khung
- [ ] Đúng ở cả Dashboard và trang GPA, cả light + dark

### 1.2 — QA-02: Ô tìm kiếm Assignments bị bóp còn 36–49px

**File:** `components/assignments/AssignmentFilters.tsx`

**Vấn đề:** `<select>` lấy chiều rộng nội tại theo option dài nhất (301px) và không co; ô search `flex-1` chỉ nhận phần thừa.

**Cách sửa:** ô search `basis-full sm:basis-auto sm:flex-1` (xuống dòng riêng ở màn nhỏ) + select `min-w-0 max-w-[45%] truncate`.

**Tiêu chí chấp nhận:**
- [ ] Ô search ≥ 200px ở **cả** 390px, 768px và 1280px
- [ ] Không tràn ngang ở mọi breakpoint
- [ ] Vẫn giữ được `?q=` khi đổi bộ lọc (không làm hỏng hành vi đang đúng)

### 1.3 — Chặn tái diễn: test regression cho layout

> Cả 2 lỗi trên **lọt qua** 144 unit test + 7 E2E test, vì unit test chỉ phủ `lib/rules/*` còn E2E không kiểm tra kích thước.

**File mới:** `tests/e2e/layout.spec.ts`

**Nội dung:**
- [ ] Với ≥2 học kỳ có GPA khác nhau → chiều cao 2 bar phải **khác nhau**
- [ ] Ô search ≥ 200px ở 390 / 768 / 1280
- [ ] Không route nào có `scrollWidth > clientWidth` ở 390px

**Commit:** `fix(ui): P0 — GPA trend bars collapse to equal height, search input unusable below lg`

---

# Phase 2 — FR-20: Quản lý môn học

> **Mục tiêu:** vá lỗ hổng chức năng lớn nhất. `courses` là thực thể xương sống nhưng chỉ tạo được, không sửa/xoá.
> **Thời lượng:** ~4 giờ · **Rủi ro:** trung bình (đụng tới dữ liệu ảnh hưởng GPA)
> **✅ Hoàn thành** — commit [`378098d`](https://github.com/NeitLN/UniPilot-AI/commit/378098d). 14/14 E2E, 144/144 unit test xanh; xác minh trực tiếp trên tài khoản demo (mobile bottom nav 8 cột vẫn đạt 45.5×44px, không tràn ngang, cả 2 theme).
>
> **Đính chính AC-5 sau khi đọc kỹ schema:** `grades.credit_hours` là trường **nhập riêng, độc lập hoàn toàn** với `courses.credits` — GPA hiện tại không hề đọc số tín chỉ của môn ở bất cứ đâu. Cảnh báo "GPA sẽ đổi từ X thành Y" như review đề xuất sẽ là **thông tin bịa** vì thay đổi đó không có thật. Đã thay bằng ghi chú trung thực: môn đã có điểm sẽ hiện "số tín chỉ ở đây không ảnh hưởng điểm đã ghi nhận" thay vì tính GPA giả.
>
> **Phát hiện phát sinh:** `grades.course_id` là `not null ... on delete cascade` ở tầng DB — xoá thẳng một môn đang có điểm sẽ **âm thầm xoá theo mọi điểm số** của môn đó. `deleteCourse` phải kiểm tra usage **trước khi** chạm tới lệnh xoá, không được dựa vào DB tự chặn. Ngoài ra, lúc xác minh dialog xoá-bị-chặn trên tài khoản thật, phát hiện `onClick={onClose}` trên các Link "Xem thêm" (điều hướng sang trang khác) đua với chính điều hướng của Link và **chặn mất navigation** — đã bỏ, vì điều hướng sang route khác thì cả dialog lẫn trang hiện tại tự unmount, không cần đóng dialog thủ công.

### 2.1 — Server actions

**File:** `app/(app)/courses/actions.ts` *(mới)*

- [ ] `updateCourse(id, prevState, formData)` — validate qua `validateCourse` sẵn có, kiểm tra quyền sở hữu bằng `courseBelongsToCaller`
- [ ] `deleteCourse(id)` — **chặn xoá** nếu còn tham chiếu
- [ ] `getCourseUsage(id)` — đếm assignment / grade / class_block đang trỏ vào môn, dùng cho cả cảnh báo lẫn chặn xoá

**Quy tắc nghiệp vụ (BR mới):** *Không bao giờ cascade khi xoá môn.* Dữ liệu học tập ưu tiên hơn sự tiện lợi của thao tác xoá.

### 2.2 — Trang quản lý

**File:** `app/(app)/courses/page.tsx` *(mới)*

- [ ] Danh sách toàn bộ môn, **nhóm theo học kỳ**, giảm dần (kỳ mới nhất trên cùng)
- [ ] Mỗi dòng: mã, tên, tín chỉ, và số liệu sử dụng (*"3 bài tập · 1 điểm · 4 buổi học"*)
- [ ] Nút Sửa / Xoá
- [ ] Empty state khi chưa có môn nào
- [ ] Thêm mục **Courses** vào sidebar + bottom nav *(lưu ý: bottom nav đang `grid-cols-7` → thành 8, cần kiểm tra lại vùng chạm 44px trên 390px)*

### 2.3 — Sửa môn

**File:** `components/courses/CourseForm.tsx` *(mở rộng — hiện chỉ hỗ trợ tạo)*

- [ ] Nhận `initialValues` để dùng lại cho chế độ sửa (theo đúng pattern của `AssignmentForm`)
- [ ] **AC-5:** nếu đổi số tín chỉ của môn **đã có điểm** → cảnh báo trước khi lưu: *"Thay đổi này sẽ làm GPA từ 3.46 thành 3.41"* (tính bằng `gpa()` có sẵn, không viết lại công thức)

### 2.4 — Xoá môn

**File:** `components/courses/DeleteCourseDialog.tsx` *(mới)*

- [ ] Môn **chưa** có dữ liệu liên quan → xoá được, có xác nhận
- [ ] Môn **đang có** dữ liệu → **chặn**, hiện rõ: *"Không thể xoá — môn này đang có 3 bài tập và 1 điểm số"*, kèm link tới các mục đó

**Tiêu chí chấp nhận Phase 2:** AC-1 → AC-5 của FR-20 trong review.

**Verify thêm:** sau khi sửa tín chỉ, GPA ở **Dashboard, trang GPA và Forecast** đều phải cập nhật đồng bộ.

**Commit:** `feat(courses): FR-20 full course CRUD with referential guards`

---

# Phase 3 — Tin cậy & phản hồi

> **Mục tiêu:** những thứ khiến người dùng dám tin để dùng lâu dài, và biết được hệ thống vừa làm gì.
> **Thời lượng:** ~4.5 giờ · **Rủi ro:** thấp
> **✅ Hoàn thành** — 4 commit riêng (`43fa564`, `6b87065`, `8135151`, `52fd5e4`). 149/149 unit test, 14/14 E2E xanh; xác minh trực tiếp trên tài khoản demo ở cả 3 viewport + 2 theme.
>
> **Phụ thuộc ngoài chưa giải quyết được (đã ghi rõ, không bỏ dở âm thầm):** FR-21 cần thêm `/auth/confirm` vào allowlist redirect URL trong Supabase Auth dashboard — không có quyền cấu hình trong phiên này nên chưa xác minh được đường dẫn thật qua email (link click), chỉ xác minh được toàn bộ logic phía ứng dụng (form, route handler, page states).
>
> **3 bug thật tìm được khi xác minh trên tài khoản thật** (không phải trên dữ liệu giả lập):
> - **3.3:** nhãn "Target GPA" dán đè lên cột cao nhất khi 2 giá trị gần nhau (2.95–3.87 với target 3.60) — chữ chồng lên nhau không đọc được. Chuyển từ overlay nổi trên chart sang chú thích cố định bên dưới tiêu đề.
> - **3.3:** `text-tangerine-text` (màu cố định, thiết kế để đi kèm nền `tangerine-tint` sáng) dùng đứng một mình trên `bg-card` — khi `bg-card` đổi tối theo theme, chữ gần như biến mất. Đổi sang `text-ink-2` (màu tự đổi theo theme).
> - **3.2:** tài khoản demo có sẵn 1 kết nối Google Calendar thật từ trước (scope cũ `calendar.readonly`, trước khi Đợt 4 mở rộng sang `calendar.events`) — xác nhận panel "sync thất bại" hoạt động đúng với lỗi thật từ Google API, không phải giả lập.

### 3.1 — FR-21: Quên mật khẩu (~2h)

**File:** `app/(auth)/login/actions.ts`, `app/(auth)/forgot-password/page.tsx` *(mới)*, `app/(auth)/reset-password/page.tsx` *(mới)*

- [ ] `requestPasswordReset(email)` dùng `supabase.auth.resetPasswordForEmail`
- [ ] Link *"Quên mật khẩu?"* ở màn đăng nhập
- [ ] **AC-3 (bảo mật):** email chưa đăng ký vẫn trả về **cùng một** thông báo thành công — không tiết lộ email nào tồn tại
- [ ] Trang đặt mật khẩu mới, xử lý token hết hạn (>1h) → cho gửi lại
- [ ] Kiểm tra `proxy.ts` cho phép 2 route mới này qua mà không bị đá về `/login` *(hiện `PUBLIC_ROUTES` chỉ có `/login`)*

> ⚠️ **Phụ thuộc ngoài:** cần cấu hình redirect URL trong Supabase Auth settings. Nếu chưa có quyền, tôi sẽ code xong và ghi rõ bước cấu hình còn thiếu thay vì bỏ dở.

### 3.2 — FR-23: Phản hồi đồng bộ Google Calendar (~1h)

**File:** `app/(app)/planner/actions.ts`, `components/planner/PlanEditor.tsx`

Hiện `confirmPlan` **nuốt toàn bộ lỗi** push (cố ý, để không chặn confirm) → người dùng không hề biết lịch có lên Google hay không.

- [ ] `confirmPlan` trả về `{ pushed: number } | { pushSkipped: "not_connected" } | { pushFailed: string }`
- [ ] Đã kết nối → *"Đã thêm 5 buổi học vào Google Calendar"*
- [ ] Chưa kết nối → *"Plan đã lưu. Kết nối Google Calendar để tự động thêm vào lịch."* + link
- [ ] Lỗi → *"Plan đã lưu, nhưng chưa đồng bộ được."* + nút thử lại
- [ ] **AC-4 (bất biến):** plan **luôn** confirm thành công, không bao giờ rollback vì lỗi Google

### 3.3 — UX-01: Co trục Y biểu đồ GPA (~1h)

**File:** `components/gpa/GpaTrendChart.tsx` *(nối tiếp Phase 1.1)*

Sửa xong flex-shrink thì 3.25 → 3.57 vẫn chỉ chênh 9px/120px. Vẫn không đọc được xu hướng.

- [ ] Trục Y co về `[min − 0.3, max + 0.3]`, kẹp trong `[0, 4.0]`
- [ ] Hiện nhãn min/max của trục để người đọc biết trục **không** bắt đầu từ 0
- [ ] Đường tham chiếu **target GPA** (đã có `profiles.target_gpa`)
- [ ] Chỉ 1 học kỳ → không co trục (không có xu hướng để thể hiện)
- [ ] Mọi học kỳ cùng GPA → không chia cho 0

### 3.4 — UX-03: Schedule hiện giờ kết thúc, bỏ tên môn lặp (~30 phút)

**File:** `components/schedule/ScheduleGrid.tsx`

- [ ] Dòng phụ: `7:00 AM–9:00 AM · P.B305` thay vì `7:00 AM · <tên môn lặp lại>`
- [ ] Chỉ hiện tên môn khi nó **khác** tiêu đề block
- [ ] Sự kiện cả ngày hiện `Cả ngày`, không hiện giờ

**Commit:** 4 commit riêng theo mã FR/UX.

---

# Phase 4 — Toàn vẹn dữ liệu & ghi nhận thủ công

> **Mục tiêu:** sửa rủi ro mất dữ liệu thành tựu, rồi mới mở tính năng xoá.
> **Thời lượng:** ~5 giờ · **Rủi ro:** 🔴 **cao — có migration phá vỡ kiểu dữ liệu**

### 4.1 — Migration `ON DELETE SET NULL` (~2h) ⚠️ **PHẢI LÀM TRƯỚC 4.3**

**File:** `supabase/migrations/0012_focus_session_preserve_history.sql` *(mới)*

**Vấn đề:** `assignment_id uuid **not null** references assignments **on delete cascade**` → xoá 1 bài tập là **xoá luôn toàn bộ lịch sử focus** gắn với nó, làm đứt streak. Đây là dữ liệu thành tựu, không được mất theo. *(Đã gặp thật khi dọn dữ liệu test — ghi nhận ở `future_update.md` §7 từ lâu nhưng chưa sửa.)*

**Vì sao không phải sửa 1 dòng:** không thể `SET NULL` khi cột còn `NOT NULL` → phải bỏ ràng buộc → kiểu đổi thành nullable → lan ra toàn bộ nơi tiêu thụ.

**Các bước:**
- [ ] SQL: `drop constraint` → `alter column drop not null` → `add constraint ... on delete set null`
- [ ] `lib/supabase/types.ts`: `assignment_id: string` → `string | null` (Row/Insert/Update)
- [ ] `lib/rules/focus.ts`: `FocusSessionLike.assignmentId: string | null`; `minutesByAssignment` gom phiên mồ côi vào khoá riêng
- [ ] `app/(app)/focus/page.tsx`: `byAssignment` hiện *"Bài tập đã xoá"*; `byCourse` gom vào *"Không rõ môn"*
- [ ] `components/dashboard/FocusWeekKpi.tsx`, `components/focus/LearningStats.tsx`
- [ ] `app/(app)/focus/actions.ts`: tạo phiên mới **vẫn bắt buộc** có assignment (chỉ cho phép null với phiên mồ côi do xoá)
- [ ] Test: thêm case phiên có `assignmentId = null` → **vẫn tính vào streak và tổng phút**

**Tiêu chí chấp nhận:** xoá 1 assignment có lịch sử focus → **streak giữ nguyên**, tổng phút giữ nguyên, phiên hiện dưới nhãn *"Bài tập đã xoá"*.

### 4.2 — FR-22: Ghi phiên học thủ công (~2h)

**File:** `app/(app)/focus/actions.ts`, `components/focus/LogSessionDialog.tsx` *(mới)*

- [ ] Nút *"Ghi phiên đã học"* ở trang Focus
- [ ] Nhập: bài tập + thời lượng + thời điểm bắt đầu
- [ ] ≥25 phút → `result = completed`, **tính streak**; <25 phút → `partial`, **không** tính (đúng BR-04, dùng lại `classify()`)
- [ ] Chặn thời điểm trong tương lai
- [ ] Có nhãn phân biệt với phiên Pomodoro trong thống kê

> **Quyết định thiết kế cần chốt khi làm:** phân biệt phiên thủ công cần thêm cột (`source: 'timer' | 'manual'`). Sẽ gộp vào migration 4.1 để tránh 2 lần đổi schema.

### 4.3 — FR-25: Xoá vĩnh viễn khỏi kho lưu trữ (~1h) — *chỉ sau khi 4.1 xong*

**File:** `app/(app)/assignments/actions.ts`, `components/assignments/AssignmentItem.tsx`

- [ ] Nút *"Xoá vĩnh viễn"* chỉ hiện ở bộ lọc **Archived**
- [ ] Xác nhận nêu rõ hệ quả (sau 4.1 thì lịch sử focus **được giữ**, chỉ mất liên kết tên bài)
- [ ] Xoá khỏi DB

**Commit:** 3 commit, riêng migration một commit độc lập để dễ rollback.

---

# Phase 5 — Hoàn thiện & chuyển từ ghi nhận sang thấu hiểu

> **Mục tiêu:** giảm ma sát khi dùng, và bắt đầu trả lại insight thay vì chỉ hiển thị số.
> **Thời lượng:** ~7.5 giờ · **Rủi ro:** thấp

### 5.1 — FR-24: Nhãn & nhóm assignment lặp lại (~1h)

`recurrence_group_id` **đã có sẵn** trong DB (migration 0010) nhưng UI chưa dùng.

- [ ] Badge *"Lặp hàng tuần"* trên assignment thuộc chuỗi
- [ ] Sửa/Archive 1 mục trong chuỗi → hỏi *"Chỉ mục này"* / *"Mục này và các mục sau"* (dùng lại pattern của Schedule)

### 5.2 — QA-03: Dùng validate của app thay tooltip trình duyệt (~1h)

`required` của HTML chặn submit trước → bộ `validateAssignment` viết rất kỹ **không bao giờ chạy** ở nhánh thiếu trường.

- [ ] Thêm `noValidate` cho form, để logic của app tiếp quản
- [ ] Hiện **tất cả** lỗi cùng lúc, đúng style của app
- [ ] Giữ nguyên hành vi focus vào trường lỗi đầu tiên (`FIELD_ORDER` đã có)
- [ ] Áp dụng đồng bộ cho `AssignmentForm`, `EventForm`, `CourseForm`, `GradeForm`

### 5.3 — FR-26: Báo cáo tổng kết tuần (~4h)

- [ ] Số bài hoàn thành, tổng giờ học, streak, thay đổi GPA, tỉ lệ bám kế hoạch
- [ ] So sánh với tuần trước (↑/↓)
- [ ] **AC-3 — phần giá trị nhất:** rút ra ít nhất **1 nhận định bằng lời**, ví dụ: *"Bạn dành 150 phút cho Kỹ thuật lấy yêu cầu nhưng chỉ 25 phút cho Kiểm thử phần mềm, trong khi Kiểm thử có bài nộp sớm hơn 6 ngày."*
- [ ] Logic nhận định đặt trong `lib/rules/insights.ts` (thuần, có unit test — theo đúng nguyên tắc "quy tắc nghiệp vụ định nghĩa đúng một lần")
- [ ] Empty state tử tế khi tuần chưa có dữ liệu

### 5.4 — UX-05 / UX-06: Gọn giao diện mobile (~1.5h)

- [ ] Thẻ assignment thu gọn, Edit/Archive vào menu `⋯`
- [ ] Gộp ngày cuối tuần trống thành 1 dòng *"Cuối tuần — không có lịch"*
- [ ] Thêm tooltip/nhãn số phút cho chart `LearningStats` (đang thiếu, trong khi chart GPA có)

**Commit:** 4 commit theo mã.

---

## Bảng tổng hợp

| Phase | Nội dung | Giờ | Rủi ro | Phụ thuộc |
|---|---|---|---|---|
| **1** | Hotfix 2 lỗi P0 + test regression | ~1 | Rất thấp | — |
| **2** | FR-20 CRUD môn học | ~4 | Trung bình | — |
| **3** | Quên mật khẩu, phản hồi Google, trục Y, Schedule | ~4.5 | Thấp | 3.3 cần 1.1 xong |
| **4** | Migration FK, ghi phiên thủ công, xoá vĩnh viễn | ~5 | 🔴 Cao | **4.3 bắt buộc sau 4.1** |
| **5** | Nhãn lặp lại, validate, báo cáo tuần, gọn mobile | ~7.5 | Thấp | — |

**Tổng: ~22 giờ**

### Nếu cần cắt phạm vi

- **Tối thiểu để dùng thật:** Phase 1 + 2 + 3.1 (~7h) — hết lỗi hỏng tính năng, quản lý được môn học, không mất tài khoản khi quên mật khẩu.
- **Có thể hoãn:** Phase 5 toàn bộ — đều là cải thiện, không có gì đang hỏng.
- **Không được hoãn:** Phase 4.1 nếu định làm 4.3. Mở xoá vĩnh viễn khi FK còn `CASCADE` sẽ **âm thầm phá lịch sử học tập** của người dùng.

---

## Đề xuất bắt đầu

**Phase 1** — ~1 giờ, rủi ro rất thấp, khắc phục ngay 2 tính năng đang hỏng, và bổ sung test chặn tái diễn để lỗi layout kiểu này không lọt lưới lần nữa.
