# UniPilot AI — Đánh giá cấp Senior (kiến trúc · độ tin cậy · vận hành)

**Ngày:** 30/07/2026
**Phiên bản:** `main` @ `b2872a5` (sau 5 phase + 2 đợt review)
**Khác biệt so với 2 đợt trước:** đợt 1 và 2 soi **bề mặt** (giao diện, luồng người dùng, tính năng thiếu). Đợt này soi **thứ chỉ hỏng khi có sự cố hoặc khi dữ liệu lớn lên** — xử lý lỗi, side-effect, truy vấn không chặn, và vận hành production.

> **Kết luận thẳng:** giao diện và tính năng đã ở mức dùng thật được. Nhưng có **3 vấn đề nền** khiến sản phẩm chưa đủ tin cậy để giao cho người dùng thật — và **vấn đề nghiêm trọng nhất là do chính tôi gây ra ở phiên trước**, cần nói rõ trước tiên.

---

## 🔴 SR-01 — Nhắc deadline gần như mất tác dụng khi đóng app *(hồi quy do tôi gây ra)*

### Chuyện gì đã xảy ra

Phiên trước, để sửa lỗi Vercel deploy thất bại, tôi hạ lịch cron từ `*/15 * * * *` (15 phút/lần) xuống `0 7 * * *` (1 lần/ngày) vì gói Hobby chỉ cho phép chạy hàng ngày. Tôi **có** ghi chú đánh đổi này trong commit message — nhưng đánh giá nó nhẹ hơn thực tế rất nhiều.

### Vì sao nó nghiêm trọng hơn tôi đã nói

Điều tra lại đường đi của thông báo, có **đúng 2 cơ chế giao nhận**:

| Cơ chế | Kích hoạt khi nào | Tình trạng |
|---|---|---|
| `NotificationBell` (Server Component trong layout) → `deliverDueNotifications` | Mỗi lần người dùng **mở/chuyển trang** trong app | ✅ Vẫn chạy tốt |
| `/api/cron/notifications` → `deliverAllDueNotifications` | Theo lịch cron | ⚠️ **Đã bị hạ xuống 1 lần/ngày** |

Nghĩa là: **đang mở app thì vẫn nhận được nhắc.** Nhưng toàn bộ giá trị của FR-03 là *nhắc khi bạn KHÔNG mở app* — đó mới là lúc cần được nhắc.

**Tính bằng số thật** (cron 07:00 UTC = 14:00 giờ VN):

| Đặt nhắc lúc | Thực tế nhận được | Trễ |
|---|---|---|
| 09:00 sáng thứ Hai | 14:00 thứ Hai | **5 giờ** |
| 15:00 chiều thứ Hai | 14:00 thứ **Ba** | **23 giờ** |

Trung bình trễ ~12 giờ. Với thông báo có nội dung *"This assignment is due soon"*, một cái nhắc đến **sau khi đã quá hạn** không chỉ vô dụng — nó phản tác dụng, làm người dùng mất tin vào tính năng nhắc.

### Ba lựa chọn, và tôi khuyến nghị cái nào

| Phương án | Chi phí | Độ trễ | Đánh giá |
|---|---|---|---|
| **A. GitHub Actions cron** gọi `/api/cron/notifications` kèm `CRON_SECRET` | **0đ** | ~15 phút (GH Actions có thể trôi 5–15 phút khi tải cao) | ✅ **Khuyến nghị.** Repo đã ở sẵn GitHub, endpoint và cơ chế xác thực đã có sẵn — chỉ cần thêm 1 file workflow. Không đổi 1 dòng code ứng dụng. |
| B. Nâng Vercel lên Pro | ~$20/tháng | Đúng 15 phút | Chuẩn nhất về kỹ thuật, nhưng trả tiền cho đúng 1 tính năng cron thì không đáng ở giai đoạn này. |
| C. Giữ 1 lần/ngày, sửa lại kỳ vọng | 0đ | 24h | Chỉ chấp nhận được nếu đổi hẳn định vị: bỏ "nhắc trước deadline", đổi thành "tóm tắt mỗi sáng". Là quyết định **sản phẩm**, không phải kỹ thuật — cần bạn quyết. |

> **Bài học rút ra cho tôi:** khi buộc phải đánh đổi để sửa một lỗi khác, mức độ ảnh hưởng của đánh đổi đó phải được đánh giá **ngang hàng với lỗi gốc** — không chỉ ghi chú lại rồi đi tiếp. Đáng lẽ tôi phải dừng lại và hỏi bạn ngay lúc đó, vì nó làm hỏng một tính năng đang chạy đúng.

---

## 🔴 SR-02 — Không có error boundary nào, và cách bắt lỗi không nhất quán

### Bằng chứng

```
find app -name "error.tsx" -o -name "global-error.tsx" -o -name "not-found.tsx"
→ (không có file nào)
```

Trong khi đó có **hơn 20 chỗ** `throw new Error(...)` trong các server action.

**Codebase đang tồn tại song song 2 phong cách:**

✅ **Đúng** — các dialog đều bắt lỗi và hiện ra cho người dùng:
`ArchiveDialog`, `DeleteAssignmentDialog`, `DeleteCourseDialog`, `CourseBreakdown` (xoá điểm), `PlanEditor` (huỷ kế hoạch) — đều có `try/catch` + `setError`.

❌ **Thiếu** — các thao tác nhanh gọi thẳng, không bắt gì:

| Vị trí | Hành động |
|---|---|
| `AssignmentItem.tsx:54` | `restoreAssignment` — khôi phục bài tập |
| `NotificationBellClient.tsx:41,47` | đánh dấu đã đọc / đọc tất cả |
| `NotificationsList.tsx:24,30` | đánh dấu đã đọc / đọc tất cả |
| `ClassDetailPanel.tsx:51` | gán môn học cho buổi học |

**Hậu quả cụ thể:** mạng chớp một cái lúc bấm "Restore" → action `throw` → không có `catch` → không có `error.tsx` → **toàn bộ app sập về màn hình lỗi mặc định của Next.js**, mất hết trạng thái đang làm. Người dùng không làm gì sai, và cũng không hiểu chuyện gì vừa xảy ra.

> **Khuyến nghị:** đây là 2 việc tách biệt, làm cả hai:
> 1. Thêm `app/error.tsx` + `app/global-error.tsx` — **lưới an toàn cuối**, để lỗi ngoài dự kiến vẫn ra một màn hình có thiết kế + nút thử lại, thay vì màn hình trắng của framework.
> 2. Bọc `try/catch` cho 4 chỗ trên, đúng pattern các dialog đã làm sẵn — lưới an toàn thì không nên là **cách xử lý chính**.

---

## 🔴 SR-03 — Nợ kỹ thuật contrast dark mode *(nhắc lại từ đợt 2, chưa xử lý)*

~34 vị trí trên 17 file dùng `text-coral-text` / `text-mint-text` / `text-tangerine-text` đứng một mình trên nền **có** đổi màu theo theme. Đo thật: **2.6:1** (chuẩn WCAG AA cần 4.5:1).

Đợt 2 đã phân tích đầy đủ — xem [`PRODUCT_REVIEW_2.md`](./PRODUCT_REVIEW_2.md) §UI-01. Nhắc lại ở đây vì nó vẫn là lỗi **ảnh hưởng rộng nhất** còn tồn đọng, và đã bị vá lẻ 3 lần mà chưa quét sạch.

---

## 🟡 SR-04 — Ghi dữ liệu ngay trong lúc render Server Component

`components/notifications/NotificationBell.tsx:18`:

```ts
await deliverDueNotifications(supabase, user.id);
```

`NotificationBell` nằm trong `app/(app)/layout.tsx` → **chạy trên mọi lần render của mọi trang**. Và `deliverDueNotifications` không chỉ đọc — nó **gửi push và UPDATE bảng `notifications`**.

**Ba vấn đề từ một chỗ:**

1. **Side-effect trong render** — vi phạm nguyên tắc cơ bản của Server Component. React có thể render lại, và với `<Suspense>` thì thứ tự/số lần không được đảm bảo như trực giác.
2. **Không cache được** — mọi trang đều phải chờ xong việc gửi push trước khi hiện chuông thông báo. Mỗi lần chuyển trang đều gánh thêm độ trễ này.
3. **Không thể chuyển sang render tĩnh** — bất kỳ trang nào cũng buộc phải dynamic vì layout có side-effect.

> **Khuyến nghị:** để `NotificationBell` **chỉ đọc** (đếm số chưa đọc). Việc giao nhận đưa hẳn về cron (đã sửa ở SR-01) — đúng chỗ của nó. Nếu vẫn muốn giao nhận tức thì khi người dùng đang mở app, gọi `/api/push/send` (route **đã tồn tại sẵn nhưng hiện không có ai gọi**) từ client sau khi trang đã hiện, thay vì chặn render.

---

## 🟡 SR-05 — Truy vấn không chặn giới hạn, và N+1 trong cron

**a) `deliverAllDueNotifications` — N+1 + quét toàn bảng**

```ts
.from("notifications").select("user_id").is("delivered_at", null).lte("scheduled_at", now)
// → rồi lặp tuần tự: mỗi user thêm 2 query + mỗi thông báo 1 UPDATE
```

Bảng `notifications` **không có index nào** (đã kiểm tra toàn bộ migration). Với 1 người dùng thì không ai thấy gì; với vài trăm người thì đây là quét toàn bảng + vòng lặp tuần tự trong một serverless function **có giới hạn thời gian chạy**.

**b) Trang `/reports` — không giới hạn** *(code do tôi viết ở Phase 5)*

```ts
supabase.from("assignments").select(...)   // toàn bộ, không lọc theo thời gian
supabase.from("grades").select(...)        // toàn bộ
```

Trang chỉ hiển thị **7 ngày**, nhưng lại tải **toàn bộ lịch sử**. Sau 4 năm học thì đây là vài nghìn dòng để tính ra vài con số. Trang `/focus` làm đúng hơn — có `.gte("started_at", sixtyDaysAgo)`.

> **Khuyến nghị:** thêm index `notifications (delivered_at, scheduled_at)`; gom vòng lặp N+1 thành thao tác theo lô; chặn khoảng thời gian cho truy vấn ở `/reports` (chỉ cần 14 ngày cho phần so sánh, và `grades` chỉ cần `created_at` để tách mốc — có thể lọc thẳng trên DB).

---

## 🟢 SR-06 — PWA manifest không theo theme *(file bạn đang mở)*

`public/manifest.json` cố định `"background_color": "#F2F0FB"` (nền sáng). Người dùng dark mode cài app về màn hình chính sẽ thấy **màn hình splash sáng chói** mỗi lần mở — đúng cái mà chế độ tối sinh ra để tránh. Cũng thiếu trường `"id"` (khuyến nghị của chuẩn PWA để định danh app ổn định khi `start_url` đổi).

Nhỏ, nhưng là chi tiết mà một sản phẩm đã đầu tư dark mode kỹ như thế này không nên bỏ sót.

---

## 🟢 SR-07 — Những thứ đã làm **tốt**, nên giữ nguyên

Một review chỉ liệt kê lỗi là review kém. Những điểm sau ở trên mức trung bình rõ rệt:

| Hạng mục | Nhận xét |
|---|---|
| **RLS** | 13/13 bảng bật RLS, mỗi bảng có policy `user_id = auth.uid()` cho cả `using` lẫn `with check`. `study_sessions` còn dùng policy gián tiếp qua `study_plans` — đúng và chặt. |
| **Bảo vệ service-role key** | `lib/supabase/service.ts` có `import "server-only"` → rò rỉ sang client là **lỗi build**, không phải lỗi runtime âm thầm. Đúng cách. |
| **Quy tắc nghiệp vụ tách bạch** | `lib/rules/*` thuần, không phụ thuộc DB, 174 unit test. Cùng một hàm validate chạy ở cả client và server — không có 2 nguồn sự thật. |
| **Comment giải thích "tại sao"** | Hiếm gặp. Ví dụ `--tangerine-text` ghi rõ lý do chọn màu và ràng buộc contrast; migration 0012 giải thích vì sao dò tên FK động thay vì hardcode. Người sau đọc hiểu được **ý định**, không chỉ **hành động**. |
| **Cron có xác thực** | `/api/cron/notifications` kiểm tra `Bearer CRON_SECRET`, từ chối 401 nếu thiếu — không phải endpoint mở. |

---

## Bảng ưu tiên

| # | Mã | Vấn đề | Mức | Nỗ lực |
|---|---|---|---|---|
| 1 | SR-01 | Nhắc deadline trễ tới 24h khi đóng app | 🔴 P0 | ~45 phút (phương án A) |
| 2 | SR-02 | Không có error boundary + 4 chỗ không bắt lỗi | 🔴 P0 | ~2h |
| 3 | SR-03 | Contrast dark mode, ~34 vị trí | 🔴 P0 | ~2.5h |
| 4 | SR-04 | Side-effect trong render Server Component | 🟡 P1 | ~1.5h |
| 5 | SR-05 | N+1 + thiếu index + truy vấn không chặn | 🟡 P1 | ~2h |
| 6 | FR-27 | Xoá tài khoản tự phục vụ *(từ đợt 2)* | 🟡 P1 | ~2h |
| 7 | SR-06 | PWA manifest không theo theme | 🟢 P2 | ~20 phút |

**Tổng: ~11 giờ.** Kế hoạch chia phase: [`IMPLEMENTATION_PLAN_2.md`](./IMPLEMENTATION_PLAN_2.md)

---

## Một nhận xét cuối, ở góc độ senior

Sản phẩm này có chất lượng **code** cao hơn mức chất lượng **vận hành**. Quy tắc nghiệp vụ tách bạch, có test, RLS chặt, comment giải thích ý định — đó là những thứ khó dạy. Nhưng cả 3 lỗi P0 ở trên đều thuộc cùng một nhóm: **"chuyện gì xảy ra khi có sự cố"** — mạng lỗi, cron không chạy, người dùng bật dark mode.

Đó là khác biệt điển hình giữa một codebase *viết tốt* và một hệ thống *chạy được thật*. Việc cần làm tiếp không phải thêm tính năng — mà là làm cho những tính năng đang có **đáng tin cậy khi mọi thứ không diễn ra như ý**.
