# UniPilot AI — Đánh giá đa góc nhìn, đợt 2 (UI/UX · QA · PM · BA · Người dùng)

**Ngày:** 30/07/2026
**Phiên bản đánh giá:** sau khi hoàn thành cả 5 phase của [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) (commit `8d99c10`)
**Tài khoản kiểm thử:** `tien.vo539@gmail.com` (dữ liệu thật)
**Phạm vi đã chạy thật:** toàn bộ route chính (Dashboard, Assignments, AI planner, Schedule, Courses, Focus, GPA, Risk, Reports, Settings) × light/dark, 390/768/1280px, đo bằng Playwright (console/page error thật, `getComputedStyle` thật cho màu chữ, không ước lượng bằng mắt).

> **Kết quả tổng quát:** 0 console error, 0 page error trên mọi route đã kiểm tra. Toàn bộ 8 finding P0/P1 của [`PRODUCT_REVIEW.md`](./PRODUCT_REVIEW.md) (đợt 1) đã được xác nhận **vẫn đứng vững** — không có lỗi nào tái phát.
> Nhưng đợt này lộ ra **1 lỗi hệ thống** chưa từng được đợt 1 phát hiện: hàng chục thông báo lỗi/trạng thái trên khắp app **đọc gần như không được ở dark mode**, đo được tỉ lệ tương phản thật ~2.6:1 (chuẩn WCAG AA yêu cầu 4.5:1).

---

## 1. 🎨 Senior UI/UX — Đánh giá giao diện

### Đã tốt hơn hẳn so với đợt 1

| Hạng mục | Nhận xét |
|---|---|
| **Biểu đồ GPA / Learning stats** | Trục Y co đúng vùng dữ liệu, có đường target, có nhãn min/max; `LearningStats` giờ có nhãn số phút trên từng cột — không còn "biểu đồ câm" như đợt 1. |
| **Assignment lặp lại** | Badge *"Recurring"* hiện rõ, không còn trông như dữ liệu trùng lặp. |
| **Mobile assignment card** | Edit/Archive gọn vào menu `⋯`, đúng khuyến nghị UX-05 cũ. |
| **Schedule cuối tuần** | Gộp đúng thành *"Weekend — no schedule"* ở mobile, giữ nguyên lưới 7 cột ở desktop. |
| **Form validation** | Submit rỗng giờ hiện đúng lỗi của app (`role="alert"`), không còn tooltip xám mặc định của Chrome. |
| **Weekly report (mới)** | Xác nhận lại lần nữa trên dữ liệu thật: insight tự sinh ra đúng và có ý nghĩa — không phải câu chữ máy móc. |

### Vấn đề mới phát hiện

#### UI-01 — Chữ lỗi/trạng thái gần như vô hình ở dark mode ⚠️ **Nghiêm trọng — lan khắp app**

Đo trực tiếp bằng `getComputedStyle` trên lỗi "Title is required." khi submit rỗng form Assignment (dark mode):

| Thuộc tính | Giá trị đo được |
|---|---|
| Màu chữ | `rgb(194, 0, 58)` (`--coral-text`) |
| Nền dialog | `rgb(34, 26, 61)` (`--card` ở dark mode) |
| **Tỉ lệ tương phản** | **~2.6 : 1** — WCAG AA cho chữ thường yêu cầu **4.5 : 1** |

Xác nhận bằng mắt trên ảnh chụp thật (form Assignment bỏ trống, dark mode): chữ đỏ đô mờ hẳn trên nền tím than, khó đọc rõ rệt so với label/placeholder trắng cùng màn hình.

**Đây không phải lỗi mới phát sinh** — là đúng lớp lỗi đã tìm thấy và **sửa riêng lẻ 3 lần** trong 5 phase vừa qua (nhãn target trên biểu đồ GPA ở Phase 3.3, nút xoá vĩnh viễn ở Phase 4.3, tự phát hiện và cân nhắc ở Phase 5 cho `ClassDetailPanel.tsx`). Cả 3 lần đều sửa **đúng 1 chỗ cụ thể** thay vì quét toàn bộ pattern — nên phần lớn vẫn còn nguyên.

**Quét tĩnh xác nhận quy mô:** `text-coral-text` / `text-mint-text` / `text-tangerine-text` đứng **một mình** (không đi kèm nền `-tint` tương ứng) xuất hiện ở **~34 vị trí trên 17 file**, gần như toàn bộ là dòng `<p role="alert">` / `<span role="alert">` báo lỗi field của mọi form trong app (`AssignmentForm`, `EventForm`, `CourseForm`, `GradeForm`, `ArchiveDialog`, `DeleteAssignmentDialog`, `DeleteCourseDialog`, `LogSessionDialog`, `SettingsForm`, `OnboardingWizard`, `WarningActions`, `GenerateButton`, `ForecastCard`...), cộng thêm 1 chỗ hiển thị dữ liệu bình thường chứ không phải lỗi: **cột "Below average" trên bảng GPA breakdown** (`CourseBreakdown.tsx:72`) — xác nhận thấy được **ngay trên ảnh chụp** trang GPA thật ở dark mode, không phải suy luận.

**Vì sao lặp lại nhiều lần:** `--coral-text`/`--mint-text`/`--tangerine-text` được thiết kế **cố ý** là màu đậm để tương phản với nền `-tint` sáng của chính nó (xem comment trong `globals.css`) — nền đó **không đổi** theo theme (ở lại pastel sáng cả 2 chế độ). Bug chỉ xảy ra khi dùng riêng `text-X-text` mà **không** kèm `bg-X-tint`, đứng trên một nền khác **có** đổi màu (`bg-card`, `bg-line`, hoặc không nền gì cả nằm trên `bg-canvas`). Rất dễ mắc vì cả 2 class đều nằm sẵn trong cùng bộ token, IDE gợi ý y hệt nhau.

**Không thuộc `KpiCard`, `Tag`, `RiskHud`, `OfflineBanner`, `SyncStatusBar`, `ActivePlanSummary`:** những chỗ này đã kiểm tra riêng — đều dùng **đúng cặp** `bg-X-tint text-X-text` hoặc nền cố định `bg-mint`/`bg-tangerine` (không đổi theo theme) + `text-X-text`, nên an toàn, không nằm trong danh sách cần sửa.

> **Khuyến nghị:** đây là lúc nên xử lý **một lần cho cả pattern** thay vì tiếp tục sửa từng chỗ khi tình cờ phát hiện — ví dụ thêm một class dùng chung cho `role="alert"` (`text-coral` thay vì `text-coral-text`, đã có tiền lệ dùng đúng ở `LoginForm`) hoặc một component `<FieldError>` chung để mọi form gọi lại, tránh 34 chỗ copy-paste cùng một lỗi.

---

## 2. 🧪 Tester / QA — Xác nhận & bổ sung

### Đã xác nhận lại — không có gì tái phát

- 0 console error, 0 page error trên **mọi** route đã test, cả 2 theme.
- QA-01 (biểu đồ GPA), QA-02 (ô search), FR-20 (CRUD môn học), FR-21 (quên mật khẩu — phần logic ứng dụng), FR-23 (phản hồi Google Calendar), FR-25 (xoá vĩnh viễn), migration 0012 (giữ lịch sử focus) — tất cả **vẫn đúng** như lúc xác minh ở các phase trước.
- 174/174 unit test, 21/21 E2E test xanh tại thời điểm viết review này.

### Phụ thuộc ngoài vẫn còn mở (đã ghi từ Phase 3, chưa đổi)

**FR-21** vẫn chưa xác minh được đường link thật qua email (click từ hộp thư) — vẫn cần cấu hình redirect URL trong Supabase Auth dashboard, ngoài quyền truy cập của phiên làm việc này. Toàn bộ logic phía ứng dụng (form, route handler, các trạng thái trang) đã xác minh đúng.

### 1 quan sát nhỏ, không phải lỗi

Dashboard dùng skeleton loading cho từng KPI card riêng biệt (React Suspense) — khi chụp ảnh ngay sau khi đăng nhập, một số card vẫn còn ở trạng thái skeleton dù trang "networkidle". Đây là hành vi **đúng thiết kế** (progressive rendering), không phải lỗi — chỉ là artifact của kịch bản chụp ảnh tự động, ghi lại để không ai nhầm là bug khi xem lại ảnh chụp.

---

## 3. 📊 Product Manager — Đánh giá độ hoàn thiện

Sau 5 phase, sản phẩm đã bao phủ đầy đủ 6 hoạt động cốt lõi (UA-1 → UA-6) cộng thêm quản lý môn học, báo cáo tuần, xoá vĩnh viễn có kiểm soát, đồng bộ Google Calendar 2 chiều có phản hồi lỗi rõ ràng, và ghi nhận thủ công. Đây là mức độ hoàn thiện của một sản phẩm **dùng thật được hàng ngày**, không còn ở giai đoạn MVP.

**Việc còn thiếu, xếp theo giá trị:**

- **Tự xoá tài khoản/dữ liệu:** trang Settings có xuất dữ liệu (JSON/CSV) nhưng không có đường xoá toàn bộ tài khoản tự phục vụ — với một app lưu dữ liệu học tập cá nhân, đây là mảnh còn thiếu của vòng đời dữ liệu (có ghi/xuất nhưng không có xoá triệt để do người dùng chủ động).
- **Tìm kiếm chỉ có ở Assignments:** Courses, Schedule, GPA đều không có ô tìm kiếm riêng — chưa phải vấn đề lớn ở quy mô dữ liệu hiện tại (vài chục môn/bài), nhưng sẽ lộ rõ khi dùng qua nhiều kỳ.
- **Contrast bug ở mục 1** nên được ưu tiên hơn bất kỳ tính năng mới nào — ảnh hưởng **trải nghiệm đọc** trên toàn bộ app, không phải một tính năng đơn lẻ.

---

## 4. 📋 Business Analyst — Yêu cầu mới

### FR-27: Xoá tài khoản tự phục vụ

**Vấn đề:** Settings có "Export data" nhưng không có "Delete account" — người dùng muốn ngừng dùng app phải tự liên hệ hoặc dữ liệu tồn tại vĩnh viễn.

**Tiêu chí chấp nhận:**
- Nút "Delete account" ở Settings, tách biệt rõ khỏi vùng "Export data" (không đặt cạnh nhau — hai hành động trái ngược mục đích)
- Xác nhận 2 bước: nhập lại mật khẩu hoặc gõ email để xác nhận, giống mức độ nghiêm trọng của FR-25 (xoá vĩnh viễn assignment) nhưng cho **toàn bộ** dữ liệu
- Xoá theo đúng thứ tự FK hiện có (assignments, courses, grades, focus_sessions, class_blocks, study_plans/study_sessions, notifications, profiles) rồi xoá tài khoản Supabase Auth qua service-role
- Sau khi xoá: đăng xuất và chuyển về `/login` với thông báo trung lập, không tiết lộ liệu tài khoản có tồn tại (nhất quán với AC-3 của FR-21)

### Việc kỹ thuật (không phải FR — là nợ kỹ thuật cần dọn)

**TD-01: Chuẩn hoá màu chữ trạng thái/lỗi trong dark mode** — xem chi tiết mục 1 (UI-01). Không phải một tính năng, mà là loại bỏ hẳn khả năng lặp lại pattern lỗi đã xảy ra 3+ lần bằng cách quét sạch 1 lần, thay vì tiếp tục vá từng chỗ khi tình cờ phát hiện.

---

## 5. 🙋 Người dùng thử — Ghi chú trải nghiệm

Đăng nhập, đổi sang dark mode (dùng ban đêm vì màn hình sáng chói mắt) — thử bỏ trống form thêm assignment để xem app phản ứng ra sao. Có chữ báo lỗi xuất hiện đúng ("Title is required.", "Pick a course.", "Due date is required.", "Pick a priority.") nhưng phải **nhìn kỹ mới thấy** — màu đỏ đô gần như chìm vào nền tím than, khác hẳn cảm giác rõ ràng dứt khoát của phần còn lại giao diện (label trắng, viền tím sáng quanh ô lỗi). Nếu không phải đang chủ động tìm lỗi để kiểm tra, rất có thể sẽ **bỏ qua luôn dòng chữ đó** và không hiểu vì sao bấm "Add assignment" không có phản hồi gì.

Sang trang GPA tracker, thấy 3 môn có nhãn "Below average" màu đỏ — cũng cùng cảm giác đó, tên môn hơi khó đọc so với các dòng còn lại màu trắng bình thường.

Ngoài điểm này, trải nghiệm mượt: mở "Weekly report" thấy ngay một câu nhận xét cụ thể ("dành 150 phút cho môn này nhưng chỉ 25 phút cho môn kia dù nộp sớm hơn") — cảm giác app thực sự "hiểu" chứ không chỉ đếm số.

---

## 6. Danh sách ưu tiên

| # | Vấn đề | Mức độ | Nỗ lực ước tính |
|---|---|---|---|
| 1 | **UI-01 / TD-01** — chuẩn hoá `text-X-text` standalone trong dark mode (~34 chỗ) | 🔴 Cao | ~2–3h (tạo `<FieldError>` dùng chung + thay class ở các chỗ còn lại) |
| 2 | FR-27 — xoá tài khoản tự phục vụ | 🟡 Trung bình | ~2h |
| 3 | FR-21 — xác minh redirect URL thật qua email | 🟡 Trung bình (phụ thuộc ngoài) | cần quyền Supabase dashboard |
| 4 | Tìm kiếm ở Courses/Schedule/GPA | 🟢 Thấp | ~1–2h nếu cần |

**Lệnh xác minh dùng trong đợt review này:**
```
npx tsc --noEmit && npx eslint app components lib tests && npx vitest run
npx playwright test --project=chromium
grep -rn "text-coral-text\|text-mint-text\|text-tangerine-text" --include="*.tsx" app components \
  | grep -v "bg-coral-tint\|bg-mint-tint\|bg-tangerine-tint"
```
