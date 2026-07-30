# Kế hoạch triển khai đợt 2 — từ PRODUCT_REVIEW_3.md

**Nguồn:** [`docs/PRODUCT_REVIEW_3.md`](./PRODUCT_REVIEW_3.md) (30/07/2026)
**Trạng thái nền:** `main` @ `b2872a5` — typecheck sạch, lint sạch, 174 unit test + 21 E2E test xanh
**Tổng:** 4 phase, ~11.5 giờ

> **Nguyên tắc xuyên suốt đợt này:** đợt 1 (Phase 1–5) là *thêm và sửa tính năng*. Đợt này là *làm cho tính năng đang có đáng tin cậy*. Không thêm tính năng mới nào ngoài FR-27 — và FR-27 cũng là để **đóng nốt vòng đời dữ liệu**, không phải mở rộng phạm vi.

---

## Quy trình verify (giữ nguyên từ đợt 1)

```
npx tsc --noEmit → npx eslint app components lib tests → npx vitest run
→ npx playwright test --project=chromium
→ kiểm tra thật bằng Playwright trên tài khoản demo: 3 viewport (390/768/1280) × 2 theme
```

**Bổ sung cho đợt này:** mỗi phase P0 phải có **cách chứng minh lỗi cũ đã thật sự hết**, không chỉ "code đã đổi" — nêu rõ ở từng phase.

---

# Phase 6 — Khôi phục độ tin cậy 🔴

> **Mục tiêu:** hai lỗi khiến app **không đáng tin khi có sự cố**. Ưu tiên tuyệt đối.
> **Thời lượng:** ~3 giờ · **Rủi ro:** thấp (không đụng schema, không đụng quy tắc nghiệp vụ)

### 6.1 — SR-01: Trả nhắc deadline về đúng tần suất (~45 phút) ⚠️ **cần bạn quyết trước**

**Mặc định tôi sẽ làm phương án A** (GitHub Actions) trừ khi bạn chọn khác — xem bảng so sánh 3 phương án ở `PRODUCT_REVIEW_3.md` §SR-01.

**File mới:** `.github/workflows/notifications-cron.yml`

```yaml
on:
  schedule:
    - cron: "*/15 * * * *"
```
→ `curl` tới `/api/cron/notifications` kèm header `Authorization: Bearer ${{ secrets.CRON_SECRET }}`

**File sửa:** `vercel.json` — bỏ hẳn khối `crons` (tránh 2 nguồn lịch chạy song song gây trùng lặp)

> ⚠️ **Phụ thuộc ngoài — cần bạn làm 1 bước thủ công:** thêm secret `CRON_SECRET` vào GitHub repo (Settings → Secrets and variables → Actions), **đúng giá trị** đang có trong `.env.local` và trong biến môi trường của Vercel. Tôi không có quyền ghi secret vào repo. Nếu chưa thêm, workflow sẽ chạy nhưng nhận 401 — và **tôi sẽ báo rõ chứ không coi là xong**.

**Tiêu chí chấp nhận:**
- [ ] Vercel deploy vẫn thành công sau khi bỏ `crons` khỏi `vercel.json`
- [ ] Workflow chạy thật ít nhất 1 lần, xem được log trong tab Actions, trả về `200` kèm `deliveredCount`
- [ ] **Chứng minh lỗi cũ đã hết:** tạo 1 assignment có `reminder_at` cách hiện tại ~2 phút, **đóng hẳn app**, xác nhận thông báo được giao trong vòng ≤20 phút (không phải chờ tới 14:00 hôm sau). Dọn sạch dữ liệu test sau khi xong.
- [ ] Ghi rõ độ trễ thực tế đo được vào doc (GH Actions có thể trôi 5–15 phút — nêu con số thật, không nêu con số lý thuyết)

### 6.2 — SR-02: Error boundary + bọc 4 chỗ gọi trần (~2h)

**File mới:**
- `app/error.tsx` — lỗi trong nhánh route, có nút "Thử lại" (`reset()`) + link về Dashboard
- `app/global-error.tsx` — lỗi ở tầng layout gốc (phải tự render cả `<html>`/`<body>`)

**File sửa — bọc `try/catch` + hiện lỗi, đúng pattern các dialog đã có sẵn:**

| File | Dòng | Hành động |
|---|---|---|
| `components/assignments/AssignmentItem.tsx` | 54 | `restoreAssignment` |
| `components/notifications/NotificationBellClient.tsx` | 41, 47 | đánh dấu đã đọc / tất cả |
| `components/notifications/NotificationsList.tsx` | 24, 30 | đánh dấu đã đọc / tất cả |
| `components/schedule/ClassDetailPanel.tsx` | 51 | `assignCourseToBlock` |

**Quyết định thiết kế cần chốt khi làm:** 4 chỗ này đều là **thao tác nhanh không có dialog**, nên không có sẵn chỗ để hiện `setError` như các dialog. Hai hướng:
- **(a)** thêm dòng lỗi nhỏ ngay tại chỗ (inline, `role="alert"`) — đơn giản, nhất quán với phần còn lại của app
- **(b)** làm một `<Toast>` dùng chung — đẹp hơn nhưng là primitive mới, app chưa từng có

→ **Tôi chọn (a)**, vì đợt này không phải lúc thêm primitive mới; nếu sau này cần toast thì làm riêng một lượt cho toàn app.

**Tiêu chí chấp nhận:**
- [ ] Cả 4 chỗ: lỗi hiện ra cho người dùng, app **không** sập
- [ ] **Chứng minh lỗi cũ đã hết:** tạm thời chặn request tới Supabase (Playwright `page.route(...)` → `abort`) rồi bấm "Restore" → xác nhận thấy dòng lỗi thay vì màn hình lỗi Next.js. Bỏ chặn, xác nhận hoạt động lại bình thường.
- [ ] `app/error.tsx` hiển thị đúng ở cả light + dark (dùng token, không hardcode màu)
- [ ] Không dùng `-text` token đứng một mình trên nền đổi màu (tránh tái phạm SR-03 ngay trong file mới)

**Commit:** 2 commit riêng (6.1 hạ tầng vận hành, 6.2 xử lý lỗi)

---

# Phase 7 — Dọn sạch nợ contrast dark mode 🔴

> **Mục tiêu:** xử lý **một lần cho cả pattern**, thay vì lần thứ 4 vá thêm một chỗ.
> **Thời lượng:** ~2.5 giờ · **Rủi ro:** thấp về logic, nhưng **chạm ~17 file** → cần xem kỹ từng chỗ

### 7.1 — Tạo component dùng chung (~45 phút)

**File mới:** `components/ui/FieldError.tsx`

Gom đúng một chỗ: `role="alert"` + cỡ chữ + màu đọc được ở cả 2 theme (`text-coral`, đã có tiền lệ dùng đúng ở `LoginForm`).

Hiện `Field` đang được **định nghĩa lặp lại** ở 4 file form (`AssignmentForm`, `EventForm`, `CourseForm`, `GradeForm`) — mỗi file một bản copy gần như y hệt. Đây là cơ hội gom lại, nhưng:

> **Giới hạn phạm vi có chủ ý:** đợt này **chỉ** thay phần hiện lỗi, **không** gom luôn `Field`/`inputClass`. Gom `Field` là refactor cấu trúc, đụng vào mọi form cùng lúc, và trộn nó vào một phase sửa lỗi contrast sẽ làm review khó và rollback khó. Ghi nhận là việc riêng, không làm ở đây.

### 7.2 — Quét và thay ~34 vị trí (~1.5h)

**Cách làm:** duyệt **từng chỗ một**, phân loại trước khi sửa — vì không phải chỗ nào cũng sai:

| Trường hợp | Xử lý |
|---|---|
| `text-X-text` **có** kèm `bg-X-tint` | ✅ **Giữ nguyên** — đúng thiết kế (Tag, KpiCard, RiskHud, OfflineBanner, SyncStatusBar, ActivePlanSummary) |
| `text-X-text` đứng một mình, là **thông báo lỗi** | → dùng `<FieldError>` |
| `text-X-text` đứng một mình, là **dữ liệu/nhãn** (vd "Below average" ở `CourseBreakdown.tsx:72`) | → đổi sang token đổi theo theme (`text-coral`) |

**Tiêu chí chấp nhận:**
- [ ] Lệnh quét trả về **0 kết quả sai** (chỉ còn các cặp `-tint`/`-text` hợp lệ):
  ```
  grep -rn "text-coral-text\|text-mint-text\|text-tangerine-text" --include="*.tsx" app components \
    | grep -v "bg-coral-tint\|bg-mint-tint\|bg-tangerine-tint"
  ```
- [ ] **Chứng minh lỗi cũ đã hết:** đo lại bằng `getComputedStyle` đúng chỗ đã đo ở đợt 2 (lỗi "Title is required." trên form Assignment, dark mode) → tỉ lệ tương phản **≥ 4.5:1** (trước: 2.6:1). Đo thêm nhãn "Below average" trên trang GPA.
- [ ] Ảnh chụp đối chiếu trước/sau ở dark mode cho ít nhất 3 màn khác nhau
- [ ] 21/21 E2E vẫn xanh (các test đang tìm `role="alert"` — không được đổi vai trò ARIA)

**Commit:** 2 commit (7.1 component, 7.2 quét thay)

---

# Phase 8 — Hiệu năng & kiến trúc 🟡

> **Mục tiêu:** những thứ hiện chưa ai thấy, nhưng sẽ thấy rõ khi dữ liệu lớn lên.
> **Thời lượng:** ~3.5 giờ · **Rủi ro:** trung bình — có 1 migration, và đụng vào layout dùng chung

### 8.1 — SR-04: Đưa side-effect ra khỏi render (~1.5h)

**File sửa:** `components/notifications/NotificationBell.tsx`

- [ ] Bỏ `await deliverDueNotifications(...)` khỏi thân render — component **chỉ đọc** số thông báo chưa đọc
- [ ] Việc giao nhận đã có cron lo (Phase 6.1). Nếu vẫn muốn giao tức thì lúc đang mở app: gọi `/api/push/send` từ client **sau khi trang đã hiện** (route này **đã tồn tại sẵn nhưng hiện không ai gọi** — chỉ cần nối dây, không phải viết mới)

**Tiêu chí chấp nhận:**
- [ ] Thông báo vẫn được giao đúng (qua cron, và qua lần gọi client nếu làm)
- [ ] **Đo được cải thiện:** so sánh thời gian phản hồi của một lần chuyển trang trước/sau — nêu con số thật, nếu không đo được khác biệt rõ thì **nói thẳng là không đo được**, không phóng đại

### 8.2 — SR-05: Index + gom N+1 + chặn truy vấn (~2h)

**File mới:** `supabase/migrations/0013_notifications_delivery_index.sql`
```sql
create index if not exists notifications_pending_idx
  on notifications (delivered_at, scheduled_at);
```

**File sửa:**
- `lib/push/deliver.ts` — `deliverAllDueNotifications`: bỏ vòng lặp gọi lại `deliverDueNotifications` cho từng user (đang tốn 2 query/user); lấy 1 lần toàn bộ thông báo đến hạn + toàn bộ subscription liên quan, rồi cập nhật theo lô
- `app/(app)/reports/page.tsx` — chặn khoảng thời gian cho `assignments`/`grades` thay vì tải toàn bộ lịch sử *(code do tôi viết ở Phase 5 — sửa lỗi của chính mình)*

**Tiêu chí chấp nhận:**
- [ ] `/reports` hiển thị **đúng y hệt** các con số như trước khi sửa (so sánh trực tiếp trên tài khoản demo: Completed 2, Study time 325 min, Streak 10d, GPA 3.46, adherence 100%, và **cùng một câu insight**)
- [ ] Migration chạy được trên DB thật, `create index if not exists` nên chạy lại nhiều lần vẫn an toàn
- [ ] Cron vẫn trả về đúng `deliveredCount` như logic cũ với cùng dữ liệu đầu vào

> ⚠️ **Cẩn trọng ở 8.2:** đây là chỗ dễ "tối ưu xong thì sai kết quả" nhất trong cả kế hoạch. Tiêu chí đầu tiên (số liệu `/reports` không đổi) là **bắt buộc**, không phải tuỳ chọn.

**Commit:** 3 commit (8.1, migration riêng, 8.2 code)

---

# Phase 9 — Đóng vòng đời dữ liệu & hoàn thiện 🟢

> **Thời lượng:** ~2.5 giờ · **Rủi ro:** trung bình (có thao tác xoá không hoàn tác được)

### 9.1 — FR-27: Xoá tài khoản tự phục vụ (~2h)

**File mới:** `app/(app)/settings/DeleteAccountDialog.tsx`, action trong `app/(app)/settings/actions.ts`

- [ ] Nút "Delete account" ở Settings, **tách hẳn** khỏi khối "Export your data" (hai hành động trái ngược mục đích, không đặt cạnh nhau)
- [ ] Xác nhận 2 bước: gõ đúng email để kích hoạt nút xoá (cùng mức nghiêm trọng với FR-25)
- [ ] Gợi ý xuất dữ liệu trước khi xoá, có link sẵn
- [ ] Xoá đúng thứ tự FK, rồi xoá tài khoản Auth bằng service-role client
- [ ] Sau khi xoá: đăng xuất, về `/login` kèm thông báo trung lập

> ⚠️ **Kiểm thử bắt buộc dùng tài khoản dùng-một-lần**, tuyệt đối **không** dùng `tien.vo539@gmail.com` (tài khoản demo thật, có dữ liệu 4 kỳ) và cũng **không** dùng `e2e-tests@unipilot.local` (mọi E2E test khác phụ thuộc vào nó). Tạo tài khoản mới riêng cho lần kiểm thử này, có dữ liệu ở **mọi** bảng, rồi xác nhận sau khi xoá không còn dòng nào sót ở bất kỳ bảng nào — kiểm tra trực tiếp bằng service-role client.

### 9.2 — SR-06: PWA manifest theo theme (~20 phút)

**File sửa:** `public/manifest.json`
- [ ] Thêm trường `"id"`
- [ ] Xử lý `background_color` cho dark mode (kiểm tra mức hỗ trợ thật của trình duyệt trước khi chọn cách làm — nếu manifest tĩnh không làm được thì **nói rõ giới hạn**, không hứa suông)

**Commit:** 2 commit

---

## Bảng tổng hợp

| Phase | Nội dung | Giờ | Mức | Phụ thuộc |
|---|---|---|---|---|
| **6** | Cron nhắc deadline + error boundary | ~3 | 🔴 P0 | 6.1 cần bạn thêm `CRON_SECRET` vào GitHub |
| **7** | Quét sạch contrast dark mode | ~2.5 | 🔴 P0 | — |
| **8** | Side-effect, index, N+1, chặn truy vấn | ~3.5 | 🟡 P1 | 8.1 nên sau 6.1 |
| **9** | Xoá tài khoản + manifest | ~2.5 | 🟡 P1 | — |

**Tổng: ~11.5 giờ**

### Nếu cần cắt phạm vi

- **Tối thiểu để giao cho người dùng thật:** Phase 6 + 7 (~5.5h) — hết chuyện app sập khi lỗi, hết chuyện nhắc deadline vô dụng, hết chuyện không đọc được chữ ở dark mode.
- **Có thể hoãn:** Phase 8 — chưa ai thấy ở quy mô hiện tại. Nhưng **8.2 sẽ khó sửa dần** khi dữ liệu đã lớn, nên đừng hoãn quá lâu.
- **Không nên hoãn:** 6.1. Mỗi ngày trôi qua là một ngày tính năng nhắc deadline đang lặng lẽ không hoạt động đúng cho người dùng đóng app.

---

## Đề xuất bắt đầu

**Phase 6.1** — ~45 phút, sửa đúng thứ tôi làm hỏng ở phiên trước, và là thứ duy nhất trong kế hoạch đang **âm thầm ảnh hưởng người dùng thật ngay lúc này**.

Cần bạn quyết 1 việc trước khi bắt đầu: **chọn phương án A / B / C cho SR-01** (xem bảng so sánh ở `PRODUCT_REVIEW_3.md`). Mặc định tôi làm **A (GitHub Actions, miễn phí, ~15 phút/lần)**.
