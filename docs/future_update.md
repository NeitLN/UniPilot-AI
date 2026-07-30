# UniPilot AI — Đánh giá trải nghiệm & Kế hoạch nâng cấp

**Ngày đánh giá:** 30/07/2026
**Phương pháp:** Chạy thật toàn bộ 8 module trên `localhost:3000` bằng tài khoản `tien.vo539@gmail.com`, thao tác từng luồng như người dùng thật (tạo/sửa/xoá, filter, validate, keyboard, mobile), đối chiếu với code
**Phạm vi:** Dashboard · Assignments · AI Planner · Schedule · Focus timer · GPA tracker · Workload risk · Settings

---

## 0. Tổng quan nhanh

**Tin tốt trước:** Chạy hết 9 route, không có **một** lỗi JavaScript, lỗi runtime, hay request thất bại nào. Validation ở AI Planner hoạt động chính xác (thử nhập giờ kết thúc trước giờ bắt đầu → báo đúng *"End time must be after the start time"*). Điều hướng, filter, form đều hoạt động. Nền tảng rất chắc.

Những gì bên dưới **không phải lỗi làm sập app** — chúng là chỗ *cấn* khi dùng thật, và những thứ nên thêm để sản phẩm hoàn chỉnh hơn.

| Nhóm | Số lượng | Mức độ |
|---|---|---|
| Lỗi logic / thiếu nhất quán (đã verify) | 3 | 🔴 Nên sửa |
| Vấn đề hiệu năng (đã verify trong code) | 3 | 🟠 Nên sửa sớm |
| Tính năng thiếu so với kỳ vọng | 7 | 🟡 Tuỳ mức đầu tư |
| Accessibility / polish | 5 | 🟢 Nhanh, dễ |

---

## 1. 🔴 Lỗi logic & thiếu nhất quán (đã kiểm chứng thực tế)

### B-01 — Chữ "active" mang **hai nghĩa khác nhau** ở hai màn hình

Đây là lỗi rõ ràng nhất tìm được.

**Cách tái hiện:** Vào Assignments → Edit một assignment → đổi Status thành **Done** → Save.

**Kết quả thực tế đo được:**
```
ASSIGNMENTS page header: "1 active · sorted by due date"
  → Item đã Done VẪN nằm trong danh sách        ❌
DASHBOARD "Due soon"
  → Item đã Done đã bị ẩn đúng                  ✅
```

**Nguyên nhân trong code:**

| Nơi | Query | Kết quả |
|---|---|---|
| [app/(app)/assignments/page.tsx](../app/(app)/assignments/page.tsx) | chỉ `.is("archived_at", null)` | Done **vẫn tính là active** |
| [components/dashboard/ActiveTasksKpi.tsx](../components/dashboard/ActiveTasksKpi.tsx) | `.is("archived_at", null).neq("status", "done")` | Done **bị loại** |
| [components/dashboard/DueSoonSection.tsx](../components/dashboard/DueSoonSection.tsx) | `.is("archived_at", null).neq("status", "done")` | Done **bị loại** |

Nên hai màn hình cùng nói về "assignment đang hoạt động" nhưng ra hai con số khác nhau. Người dùng đánh dấu xong việc, quay lại Assignments vẫn thấy "1 active" → tưởng chưa lưu.

**Đề xuất sửa:** Thống nhất một định nghĩa. Gợi ý hợp lý nhất:
- Mặc định danh sách **ẩn** item Done (thêm `.neq("status","done")`)
- Thêm option `Done` vào filter Status để xem lại khi cần (filter này **đã có sẵn**, chỉ là danh sách gốc không lọc)
- Hoặc giữ hiển thị nhưng đổi nhãn `"1 active"` → `"1 task · 0 chưa xong"`

---

### B-02 — Phiên focus ngắn hiển thị **"0 min"**, coi như không tồn tại

**Ảnh chụp thực tế màn hình Focus:**
```
Plus 3 partial sessions (0 min) — not counted toward the streak.
By course:      Kỹ thuật lấy yêu cầu      0 min
By assignment:  QA Test Assignment        0 min
```

3 phiên đã được lưu đúng vào DB, nhưng vì làm tròn xuống phút nên hiện `0 min` ở cả 3 chỗ. Người dùng nhìn vào nghĩ dữ liệu bị mất.

**Đề xuất sửa (chọn 1):**
- Hiện giây khi < 1 phút: `"3 partial sessions (2 min 15s)"`
- Hoặc `"< 1 min"` thay vì `0 min`
- **Và** ẩn hẳn các dòng `0 min` trong "By course" / "By assignment" — chúng chỉ là nhiễu

---

### B-03 — Assignment đã archive thì **biến mất vĩnh viễn**, không có cách xem lại

FR-19 yêu cầu archive (đã làm đúng: có xác nhận, ẩn khỏi danh sách, huỷ reminder). Nhưng:

- Filter Status chỉ có: `All statuses` / `Not started` / `In progress` / `Done` — **không có "Archived"**
- Không có trang/tab nào liệt kê item đã archive
- Không có nút Restore

Dữ liệu vẫn nằm nguyên trong DB (`archived_at` được set) nhưng **không có đường nào để nhìn thấy nó nữa**. Với sinh viên muốn xem lại bài tập kỳ trước, đây là mất mát thật.

**Đề xuất sửa:** Thêm `Archived` vào dropdown Status (query đổi thành `.not("archived_at","is",null)`), kèm nút "Restore" trong item. Ước tính ~30 phút.

---

## 2. 🟠 Hiệu năng (đã kiểm chứng trong code)

### P-01 — Điểm Workload Risk bị tính **2 lần mỗi lần load Dashboard**

```
components/dashboard/RiskHud.tsx:20        → computeAndStoreRisk(...)
components/dashboard/WorkloadRiskKpi.tsx:12 → computeAndStoreRisk(...)
```

Cả hai component đều nằm trên Dashboard, mỗi lần gọi chạy **6–7 query song song** + **1 lệnh upsert ghi DB**. Nghĩa là mỗi lần mở Dashboard:
- ~14 query đọc trùng lặp hoàn toàn
- 2 lệnh ghi (upsert) cho cùng một dòng dữ liệu

Chính comment trong code cũng đã ghi nhận vấn đề tranh chấp này (dẫn tới migration 0005 phải thêm ràng buộc unique để chống trùng warning).

**Đề xuất sửa:** Bọc bằng `cache()` của React — đúng 1 dòng, dedupe tự động trong cùng một lần render:
```ts
import { cache } from "react";
export const computeAndStoreRisk = cache(async (supabase, userId) => { ... });
```
Grep toàn repo: `cache()` hiện **chưa được dùng ở đâu cả**. Đây là cải thiện lớn nhất/rẻ nhất.

---

### P-02 — Query `focus_sessions` **không giới hạn**, phình vô hạn theo thời gian

[lib/risk/compute.ts:53](../lib/risk/compute.ts)
```ts
supabase.from("focus_sessions").select("started_at"),   // ← không có .gte() nào
```

Câu này tải **toàn bộ phiên focus từ trước đến nay**, chỉ để đếm xem có đủ 7 ngày khác nhau hay không. Dùng 1 năm → vài nghìn dòng tải mỗi lần vào Dashboard, chỉ để lấy ra một con số ≥ 7.

**Đề xuất sửa:** Thêm `.gte("started_at", ngày_30_hôm_trước)`. Vì gate chỉ cần biết "có ≥ 7 ngày gần đây không", cửa sổ 30 ngày là quá đủ.

---

### P-03 — Không có phân trang ở Assignments / Grades

Cả hai query đều **không có `.limit()`**. NFR-01 đặt mục tiêu 200 assignment — ở mức đó vẫn ổn, nhưng không có giới hạn nào cả nghĩa là sẽ xấu dần đều. Nên thêm phân trang hoặc infinite scroll khi vượt ~50 dòng.

---

## 3. 🟡 Tính năng còn thiếu so với kỳ vọng người dùng

### F-01 — Pomodoro **không có nghỉ giữa hiệp** (khác chính định nghĩa trong SRS)

Glossary trong SRS ghi nguyên văn:
> *"Pomodoro — A time management technique using 25-minute focused work intervals **followed by 5-minute breaks**."*

Nhưng app chỉ có phần làm việc 25 phút. Kiểm tra màn hình Focus: **không có** nút Break, không có bộ đếm nghỉ, không có chu kỳ dài (thường 4 pomodoro → nghỉ 15–30 phút).

**Đề xuất:** Sau khi hoàn thành 25 phút, tự chuyển sang đếm ngược 5 phút nghỉ; sau 4 chu kỳ thì nghỉ dài. Đây là tính năng "đúng bài" nhất nên thêm.

### F-02 — Không có nút **Pause**

Chỉ có `Start` và `Stop`. Mà Stop = ghi nhận Partial + **mất streak**. Thực tế đang học bị gián đoạn (có người gọi, đi vệ sinh) là chuyện bình thường — hiện tại người dùng buộc phải chọn giữa "để timer chạy sai" hoặc "mất streak".

### F-03 — Trường **Weight %** bắt buộc nhập nhưng gần như vô dụng

Đây là phát hiện đáng chú ý. Grep toàn bộ code, `weight` chỉ được:
1. Lưu vào DB
2. Gửi vào prompt của Gemini

Nó **không hề được hiển thị ở bất kỳ đâu trong UI**, và **không hề được cộng dồn thành điểm môn học**.

Người dùng bị bắt buộc điền "Weight %" cho *mọi* assignment (trường required) nhưng không nhận lại được gì. Trong khi kỳ vọng tự nhiên là:
> Điểm từng assignment × trọng số → điểm dự kiến của môn → GPA dự báo

Hiện `grades` chỉ lưu **điểm tổng kết cuối cùng** của môn (`grade_point`), nhập tay. Không có liên kết nào giữa assignment và grade.

**Đề xuất:** Thêm ô nhập điểm đạt được cho mỗi assignment (vd: 8.5/10), rồi tính điểm môn dự kiến = Σ(điểm × weight). Đây là tính năng biến app từ "sổ ghi chép" thành "công cụ dự báo thật" — và tận dụng được dữ liệu đã bắt người dùng nhập sẵn.

### F-04 — Không có ô **tìm kiếm** ở Assignments

Chỉ có 2 dropdown (course + status). Với 50–100 bài tập thì cuộn tìm rất mệt.

### F-05 — **Chưa cài được lên điện thoại** (thiếu PWA manifest)

```
Service Worker đã đăng ký:  ✅ 1
<link rel="manifest">:       ❌ null
```

App **đã có** service worker và chạy offline được (NFR-05 đạt), nhưng **thiếu file `manifest.json`** → trình duyệt không cho "Add to Home Screen". Đang là "nửa PWA".

Với một app tên là *"Student Life OS"* mà sinh viên muốn mở nhanh trên điện thoại, thiếu cái này khá tiếc. Chỉ cần thêm 1 file manifest + icon là xong.

### F-06 — Không có **giao diện tối** (dark mode)

Kiểm tra: **0** class `dark:` trong toàn bộ DOM, **không có** media query `prefers-color-scheme`. Sinh viên học đêm khá nhiều.

### ~~F-07 — Giao diện chỉ có tiếng Anh~~ — **BỎ QUA (theo yêu cầu)**

Giao diện tiếng Anh là chủ đích, không cần đa ngôn ngữ. Giữ lại mục này chỉ để ghi nhận đã cân nhắc và loại bỏ.

---

## 4. 🟢 Accessibility & polish (sửa nhanh)

### A-01 — Không có "Skip to content", phải nhấn **11 lần Tab** mới tới nội dung chính

Đo thực tế: từ lúc load trang, người dùng bàn phím phải Tab **11 lần** (qua 8 link sidebar + nút đăng xuất + 2 chuông thông báo) mới vào được `<main>` — **lặp lại ở mọi trang**.

**Sửa:** Thêm link ẩn "Skip to main content" ở đầu trang, chỉ hiện khi focus. ~10 phút.

### A-02 — Settings chỉ dựa vào validation của trình duyệt

Nhập Target GPA = 9 → trình duyệt chặn bằng tooltip mặc định (`"Value must be less than or equal to 4."`), server action không chạy, giá trị không lưu (verify: reload vẫn là 3.6 ✅).

Hoạt động **đúng**, nhưng khác với các form còn lại trong app (Assignment/Course/Event đều hiện lỗi inline màu đỏ ngay dưới ô). Nên đồng bộ cho nhất quán.

### A-03 — GPA Forecast hiện "3.60 — Achievable" khi **chưa có điểm nào**

Màn hình GPA lúc trống:
```
Cumulative GPA: 0.00 · 0 credits
Course breakdown: No grades yet — add your first one.
Forecast → REQUIRED AVERAGE: 3.60 → "Achievable with your remaining credits."
```

Toán học không sai (`(3.6×15 − 0)/15 = 3.6`) nhưng nói "khả thi" khi chưa có dữ liệu gì là vô nghĩa, dễ gây hiểu nhầm. Nên hiện "Nhập điểm trước để xem dự báo".

### A-04 — Trang Focus trống mênh mông trên màn hình rộng

Ở 1440px, hai thẻ nằm gọn ở 1/3 trên, còn lại là khoảng trắng lớn. Có thể tận dụng: biểu đồ focus theo ngày, lịch sử phiên gần đây, hoặc mục tiêu tuần.

### A-05 — Notifications thiếu thao tác hàng loạt

Chỉ có "Mark all read". Chưa có: xoá thông báo, lọc theo loại (reminder / risk warning / plan session), gom nhóm theo ngày.

---

## 5. 🚀 Ý tưởng nâng tầm dự án

Xếp theo **giá trị / công sức**:

| Ưu tiên | Tính năng | Vì sao đáng làm |
|---|---|---|
| ⭐⭐⭐ | **Điểm assignment → điểm môn dự kiến** (F-03) | Tận dụng trường `weight` đã bắt nhập sẵn. Biến app từ ghi chép thành dự báo thật. Kết nối được 2 module đang rời rạc (Assignments ↔ GPA) |
| ⭐⭐⭐ | **PWA manifest** (F-05) | Chỉ 1 file + icon. Đã có sẵn service worker, chỉ thiếu mảnh cuối để cài lên điện thoại |
| ⭐⭐⭐ | **Break timer Pomodoro** (F-01) | Đúng định nghĩa trong chính SRS. Không có nó thì Pomodoro chưa trọn vẹn |
| ⭐⭐ | **Xem lại assignment đã archive** (B-03) | Dữ liệu đã có sẵn trong DB, chỉ cần thêm filter |
| ⭐⭐ | **Dark mode** (F-06) | Tailwind hỗ trợ sẵn, chủ yếu là công thêm biến màu |
| ⭐⭐ | **Đồng bộ 2 chiều Google Calendar** | Hiện chỉ đọc (`calendar.readonly`). Cho phép đẩy phiên học đã confirm sang Google Calendar sẽ khép kín vòng lặp |
| ⭐ | **Thống kê học tập theo thời gian** | Biểu đồ giờ học/tuần, môn nào tốn thời gian nhất, tương quan giờ học ↔ điểm số |
| ⭐ | **Assignment lặp lại** | Bài tập hàng tuần hiện phải nhập tay từng cái (Schedule đã có recurring rồi, tái dùng được logic) |
| ⭐ | **Xuất dữ liệu (CSV/JSON)** | An tâm về dữ liệu, và tiện làm báo cáo |
| ⭐ | **Đính kèm file / link vào assignment** | Gom đề bài, tài liệu về một chỗ |

---

## 6. Đề xuất lộ trình

### Đợt 1 — Sửa lỗi & tối ưu (~4–5 giờ)
> Toàn bộ đều là việc nhỏ, rủi ro thấp, giá trị thấy ngay.

1. B-01 — Thống nhất định nghĩa "active" giữa Assignments và Dashboard
2. B-02 — Sửa hiển thị `0 min` cho phiên focus ngắn + ẩn dòng 0 min
3. B-03 — Thêm filter "Archived" + nút Restore
4. P-01 — Bọc `computeAndStoreRisk` bằng `cache()` (1 dòng, giảm ~14 query mỗi lần load Dashboard)
5. P-02 — Giới hạn query `focus_sessions` trong 30 ngày
6. A-01 — Thêm skip-link
7. A-03 — Sửa Forecast khi chưa có điểm

### Đợt 2 — Hoàn thiện tính năng (~6–8 giờ)
1. F-05 — PWA manifest + icon (cài được lên điện thoại)
2. F-01 — Break timer 5 phút + chu kỳ dài
3. F-02 — Nút Pause
4. F-04 — Ô tìm kiếm Assignments
5. P-03 — Phân trang

### Đợt 3 — Tính năng lớn (~8–12 giờ)
1. F-03 — Điểm assignment → điểm môn dự kiến *(giá trị cao nhất)*
2. F-06 — Dark mode

### Đợt 4 — Mở rộng
- Đồng bộ 2 chiều Google Calendar
- Thống kê học tập
- Assignment lặp lại, đính kèm file, xuất dữ liệu

---

## 7. Ghi chú kỹ thuật

**Không tìm thấy lỗi runtime nào** trong toàn bộ đợt kiểm thử — 0 console error, 0 page error, 0 request thất bại trên cả 9 route.

**Dữ liệu mẫu đã nạp (30/07/2026):** Đã dọn sạch artifact test cũ (`QA Test Assignment`, draft plan thừa, block `Study English`) và nạp bộ dữ liệu thực tế cho sinh viên IT năm 2 kỳ 253:

| Bảng | Số lượng | Nội dung |
|---|---|---|
| `courses` | 14 (+1 của bạn tự thêm) | 6 môn kỳ 253 đang học + 8 môn 3 kỳ trước (242/251/252) |
| `assignments` | 10 | Đủ trạng thái: 1 quá hạn, 2 đang làm, 5 chưa bắt đầu, 2 đã xong |
| `grades` | 8 | Điểm 3 kỳ trước → biểu đồ GPA trend có 3 mốc (3.25 → 3.49 → 3.57) |
| `class_blocks` | 28 | Thời khoá biểu 7 buổi/tuần × 4 tuần, có phòng học |
| `focus_sessions` | 18 | 10 ngày liên tiếp → streak 10 ngày, mở khoá Workload Risk |

Kết quả: Dashboard hiện GPA **3.46**, 8 task đang mở, 12 cycle/300 phút tuần này, Workload Risk **9/100**.

> ⚠️ Lưu ý: `focus_sessions.assignment_id` có `ON DELETE CASCADE` — xoá một assignment sẽ **xoá luôn toàn bộ lịch sử focus** gắn với nó (gặp thật khi dọn dữ liệu test: xoá 1 assignment làm mất 3 phiên focus và đứt streak). Cân nhắc đổi sang `ON DELETE SET NULL` để giữ lịch sử học tập, vì đây là dữ liệu thành tích người dùng không nên mất theo.

**Lệnh kiểm thử lại:**
```bash
npm run dev          # khởi động
npm test             # 121 unit test
npm run test:e2e     # 7 E2E test (cần: npm run seed:e2e 1 lần đầu)
npx tsc --noEmit     # typecheck
```
