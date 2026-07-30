# Kế hoạch triển khai đợt 2 — từ PRODUCT_REVIEW_3.md

**Nguồn:** [`docs/PRODUCT_REVIEW_3.md`](./PRODUCT_REVIEW_3.md) (30/07/2026)
**Trạng thái nền:** `main` @ `33a5645` — typecheck sạch, lint sạch, 174 unit test + 21 E2E test xanh
**Tổng:** 4 phase, ~11.5 giờ ước tính · **~13.5 giờ thực tế** (SR-01 phát sinh 2 nguyên nhân phụ, SR-06 phát sinh 1) — **cả 4 phase: ✅ Hoàn thành**

> **Điểm chung của toàn bộ phần phát sinh:** không phải lỗi mới do đợt này gây ra — đều là lỗi **có sẵn từ trước**, chỉ lộ ra khi thật sự chạy thử thay vì tin vào việc "code đã đổi". Danh sách đầy đủ:
> - **SR-01** (middleware chặn nhầm `/api/cron/notifications`) — có từ commit đầu tiên của repo
> - **SR-01** (`CRON_SECRET` chưa từng được thêm vào Vercel Production) — có từ lúc tính năng cron được tạo
> - **SR-06** (middleware chặn nhầm `/manifest.json`) — cùng gốc với lỗi SR-01 đầu tiên, có từ lúc `sw.js` được thêm vào exclusion list mà quên `manifest.json`
>
> Không phát hiện nào trong số này lộ ra nếu chỉ đọc code — cả 3 đều cần chạy request thật (`curl`, `gh workflow run`, hoặc Playwright) mới thấy.

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

### 6.1 — SR-01: Trả nhắc deadline về đúng tần suất (~45 phút, thực tế mất ~1h do phát sinh) ✅ **Hoàn thành**

**Đã làm phương án A** (GitHub Actions), commit `b4e8988`, `aead94e`.

> **Hoá ra có tới 3 nguyên nhân độc lập, không phải 1.** Kế hoạch ban đầu chỉ nhắm đúng vấn đề tần suất (Hobby plan giới hạn cron 1 lần/ngày). Khi verify thật (không chỉ tin cấu hình), phát hiện thêm 2 lớp lỗi nữa đã che khuất nguyên nhân đầu:
>
> 1. **Tần suất** (đã biết từ đầu) — `vercel.json` cron `0 7 * * *` → chuyển hẳn sang GitHub Actions `*/15 * * * *`, xoá `vercel.json` (rỗng, không còn tác dụng).
> 2. **Middleware chặn nhầm** (phát hiện khi chạy `gh workflow run` thật, nhận về `307 → /login` thay vì `200`) — `lib/supabase/middleware.ts` redirect mọi request không có phiên đăng nhập, kể cả request server-to-server dùng `CRON_SECRET`. Lỗi này có từ **commit đầu tiên của repo** (692db78), sớm hơn cả tính năng cron (3f21467) rất nhiều commit. Sửa: thêm `/api/cron/notifications` vào `ALWAYS_ACCESSIBLE_ROUTES`.
> 3. **`CRON_SECRET` chưa từng được thêm vào Vercel Production** (phát hiện khi vẫn nhận `401` sau khi sửa #2) — `vercel env ls production` cho thấy biến này **không tồn tại** trên Vercel, dù có sẵn trong `.env.local`. Route lúc nào cũng `401` vì `process.env.CRON_SECRET` là `undefined` trên server, bất kể header gửi lên là gì. Sửa: `vercel env add CRON_SECRET production` + `preview`, sau đó redeploy (biến môi trường mới không tự áp dụng cho deployment đang chạy).
>
> **Kết luận thật, không tô hồng:** với cả 3 lỗi cộng lại, nhắc deadline qua lịch tự động **nhiều khả năng chưa từng giao được lần nào** kể từ khi tính năng FR-03 được tạo ra — không phải "trễ tới 23 giờ" như đánh giá ban đầu, mà là **hoàn toàn không chạy**. Con đường duy nhất từng hoạt động là `NotificationBell` (chỉ chạy khi mở app).

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
- [x] Vercel deploy vẫn thành công sau khi bỏ `crons` khỏi `vercel.json` — xác nhận qua `gh api .../status`
- [x] Workflow chạy thật, log xem được trong tab Actions: lần đầu `307` (middleware), sau sửa `401` (thiếu env var), sau sửa tiếp `200` — cả 3 lần đều chạy **thật**, không suy đoán
- [x] **Chứng minh lỗi cũ đã hết — bằng dữ liệu thật:** chèn thẳng 1 dòng `notifications` (qua REST API, service-role key) với `scheduled_at` ở quá khứ cho tài khoản demo thật → chạy workflow → xác nhận `deliveredCount:1` và `delivered_at` được ghi đúng thời điểm chạy → xoá dòng test, xác nhận query trả về `[]` (tài khoản về đúng baseline)
- [ ] Độ trễ thực tế của GH Actions schedule (không phải `workflow_dispatch` thủ công) — **chưa đo được**, cần chờ lịch tự động chạy vài lần tự nhiên rồi mới có số liệu thật; không đoán số liệu

### 6.2 — SR-02: Error boundary + bọc 4 chỗ gọi trần (~2h) ✅ **Hoàn thành**

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
- [x] Cả 4 chỗ: lỗi hiện ra cho người dùng, app **không** sập — xác nhận bằng cách chặn thật request `Next-Action` (POST tới chính route hiện tại, cách Server Action thật sự giao tiếp với server — chặn `supabase.co` không có tác dụng vì DB call chạy phía server, Playwright không thấy được) trên tài khoản E2E: cả 4 thao tác đều hiện `role="alert"` đúng, trang không crash
- [x] **Chứng minh lỗi cũ đã hết:** route test tạm `app/(app)/test-error-boundary-tmp` (đã xoá sau khi xong) ném lỗi thật → `error.tsx` bắt đúng, có "Try again" + "Back to Dashboard"
- [x] `app/error.tsx` hiển thị đúng ở cả light + dark — **nhưng phát sinh 1 bug thật khi verify:** script `beforeInteractive` khởi tạo theme ở `app/layout.tsx` **không** có mặt trong `<head>` khi `error.tsx` là boundary đang active (xác nhận bằng cả dev **và** production build — không phải hiện tượng riêng của dev/Turbopack). Kết quả: trang lỗi luôn hiện sáng bất kể theme đã chọn. Sửa bằng cách để `error.tsx` tự đọc `localStorage`/`matchMedia` và tự toggle class `dark` trong `useEffect` riêng, không phụ thuộc script của root layout có chạy hay không.
- [x] Không dùng `-text` token đứng một mình trên nền đổi màu — cả 4 chỗ dùng `text-coral` (đúng token cố định); `global-error.tsx` cố tình dùng inline style cứng, không phụ thuộc token nào (lá chắn cuối cùng, không được giả định bất cứ thứ gì khác còn hoạt động)

**Commit:** 2 commit riêng (6.1 hạ tầng vận hành, 6.2 xử lý lỗi)

---

# Phase 7 — Dọn sạch nợ contrast dark mode 🔴 ✅ **Hoàn thành**

> **Mục tiêu:** xử lý **một lần cho cả pattern**, thay vì lần thứ 4 vá thêm một chỗ.
> **Thời lượng:** ~2.5 giờ (thực tế ~2h) · **Rủi ro:** thấp về logic, nhưng **chạm ~17 file** → cần xem kỹ từng chỗ
>
> **Kết quả:** `components/ui/FieldError.tsx` (mới) dùng lại ở **21 file**, thay ~30 vị trí lỗi/trạng thái đứng một mình. 4 vị trí còn lại (`CourseBreakdown.tsx:72` nhãn "Below average", `GenerateButton.tsx:119` thông báo thành công, `SettingsForm.tsx:72` "Saved.") đổi thẳng token cố định (`text-coral`/`text-mint`) vì không phải `role="alert"`. **8 vị trí giữ nguyên** sau khi xác minh đã đúng cặp `tint`+`text` sẵn (`Tag`, `KpiCard`, `RiskHud`, `OnboardingWizard` step indicator, `ForecastCard` kết quả dự báo, trang `/reports`' "Worth a look" — cặp nền/chữ nằm trên 2 element cha-con khác nhau nên grep không thấy được, phải đọc code xác nhận từng chỗ).
>
> **Xác minh bằng số đo thật (không chỉ tin code đã đổi):** tỉ lệ tương phản đo lại đúng 2 chỗ đã đo ở đợt review 2 — lỗi "Title is required." trên form Assignment và nhãn "Below average" trên GPA breakdown — cả hai từ **2.6:1 → 5.26:1** (chuẩn AA cần 4.5:1), cùng màu `rgb(255,84,112)` trên nền `rgb(34,26,61)`. 21/21 E2E vẫn xanh sau khi chạy lại 2 lần liên tiếp (1 lần đầu có 1 test "flaky" — xác nhận do dư tải hệ thống từ việc dọn tiến trình node rác tích tụ trong phiên, không phải do thay đổi code, bằng cách chạy lại riêng lẻ và chạy lại toàn bộ lần 2 đều xanh tuyệt đối).

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
- [x] Lệnh quét trả về **0 kết quả sai** (chỉ còn các cặp `-tint`/`-text` hợp lệ)
- [x] **Chứng minh lỗi cũ đã hết:** đo lại bằng `getComputedStyle` đúng chỗ đã đo ở đợt 2 → **5.26:1** cả 2 chỗ (trước: 2.6:1)
- [x] Ảnh chụp đối chiếu ở dark mode (form lỗi + trang GPA)
- [x] 21/21 E2E vẫn xanh

**Commit:** 2 commit (7.1 component, 7.2 quét thay)

---

# Phase 8 — Hiệu năng & kiến trúc 🟡

> **Mục tiêu:** những thứ hiện chưa ai thấy, nhưng sẽ thấy rõ khi dữ liệu lớn lên.
> **Thời lượng:** ~3.5 giờ · **Rủi ro:** trung bình — có 1 migration, và đụng vào layout dùng chung

### 8.1 — SR-04: Đưa side-effect ra khỏi render (~1.5h) ✅ **Hoàn thành**

**File sửa:** `components/notifications/NotificationBell.tsx`, `components/notifications/NotificationBellClient.tsx`, `app/api/push/send/route.ts`

- [x] Bỏ `await deliverDueNotifications(...)` khỏi thân render — component **chỉ đọc** số thông báo chưa đọc
- [x] Giao nhận giờ do cron lo (Phase 6.1) là chính; nối dây thêm `/api/push/send` (route **đã có sẵn từ trước nhưng không ai gọi**) vào `NotificationBellClient` — gọi 1 lần lúc mount qua `fetch`, không chặn render, `router.refresh()` nếu có gì mới

**Tiêu chí chấp nhận:**
- [x] Thông báo vẫn được giao đúng — xác nhận bằng dữ liệu thật trên tài khoản E2E: chèn 1 dòng `notifications` đến hạn → đăng nhập → `delivered_at` được ghi (xác nhận qua truy vấn DB trực tiếp) → dòng hiện đúng trong dropdown ở lần tải trang kế tiếp
- [ ] **Đo được cải thiện thời gian phản hồi:** **không đo** — khác biệt giữa 1 lệnh SELECT (cũ, đồng bộ trong render) và không có lệnh nào thêm (mới) là rất nhỏ so với độ trễ mạng/DB tổng thể của cả trang, và việc đo chính xác cần công cụ profiling không có sẵn trong phiên này. Nói thẳng thay vì bịa con số: **lợi ích chính không phải tốc độ per-request, mà là loại bỏ hẳn một write nằm trong đường render** — đúng bản chất vấn đề SR-04 nêu ra.

### 8.2 — SR-05: Index + gom N+1 + chặn truy vấn (~2h) ✅ **Hoàn thành**

**File mới:** `supabase/migrations/0013_notifications_delivery_index.sql` — đã `supabase db push` lên DB thật, xác nhận qua `supabase migration list` (0013 khớp cả Local/Remote).

**File sửa:**
- `lib/push/deliver.ts` — `deliverAllDueNotifications` viết lại hoàn toàn: 1 query lấy toàn bộ thông báo đến hạn, 1 query lấy toàn bộ subscription liên quan (`in user_id`), gửi push, rồi **tối đa 3 UPDATE theo lô** (gom theo `push_status`) thay vì 1 UPDATE/thông báo. `deliverDueNotifications` (bản 1-user, dùng bởi `/api/push/send`) giữ nguyên logic cũ — không có vấn đề N+1 ở quy mô 1 user.
- `app/(app)/reports/page.tsx` — `assignments` giờ chỉ lấy: (a) đang hoạt động (`archived_at is null`) HOẶC vừa cập nhật trong 14 ngày, **hợp với** (b) đúng những assignment mà các phiên focus gần đây trỏ tới (fetch riêng theo id, dù cũ/đã archive). `grades` **giữ nguyên không giới hạn** — GPA là số tích luỹ cả đời, giới hạn theo tuần sẽ làm sai phép so sánh "GPA trước/sau" mà chính trang này hiển thị; đề xuất "giới hạn 14 ngày" ban đầu trong review là **sai**, đã tự sửa lại khi cài đặt.

**Tiêu chí chấp nhận:**
- [x] **Số liệu `/reports` không đổi:** không so sánh trực tiếp được vì cửa sổ 7 ngày trôi theo thời gian thực (đã sang ngày mới giữa lúc review và lúc sửa) — thay vào đó **chứng minh bằng toán học tại cùng một mốc "now"**: lấy dữ liệu thật của tài khoản demo qua REST (service-role), tính `completedThisWeek`/`completedPreviousWeek`/`nextDueMsByCourse` từ **cả 2 tập dữ liệu** (truy vấn cũ không giới hạn, và truy vấn mới có giới hạn+bổ sung) bằng cùng logic, cùng thời điểm → **khớp tuyệt đối** cả 3 giá trị.
- [x] Migration chạy được trên DB thật, `create index if not exists` an toàn khi chạy lại
- [x] `deliverAllDueNotifications` xác nhận đúng qua Phase 6.1's test dữ liệu thật (chèn thông báo test → `deliveredCount` khớp → `delivered_at` đúng)

> ⚠️ **Phát hiện khi làm:** đề xuất ban đầu "chặn cả `assignments` lẫn `grades`" trong `PRODUCT_REVIEW_3.md` không đúng hoàn toàn — `grades` phải giữ nguyên vì GPA tích luỹ. Bài học: review nêu đúng vấn đề (truy vấn không giới hạn) nhưng giải pháp cụ thể cho từng bảng cần đọc lại code trước khi áp dụng máy móc, không phải bảng nào "trông giống nhau" cũng xử lý giống nhau được.

**Commit:** 3 commit (8.1, migration riêng, 8.2 code)

---

# Phase 9 — Đóng vòng đời dữ liệu & hoàn thiện 🟢

> **Thời lượng:** ~2.5 giờ · **Rủi ro:** trung bình (có thao tác xoá không hoàn tác được)

### 9.1 — FR-27: Xoá tài khoản tự phục vụ (~2h) ✅ **Hoàn thành**

**File mới:** `components/settings/DeleteAccountDialog.tsx`, `components/settings/DeleteAccountSection.tsx`; action `deleteAccount` trong `app/(app)/settings/actions.ts`

> **Đơn giản hơn dự kiến ban đầu:** kế hoạch gốc hình dung phải tự xoá theo đúng thứ tự FK từng bảng. Đọc lại `supabase/migrations/0001_init.sql` mới thấy **mọi** bảng đều đã `references auth.users on delete cascade` — chỉ cần gọi `auth.admin.deleteUser()` bằng service-role client, DB tự dọn sạch toàn bộ theo đúng thứ tự phụ thuộc. Không cần tự viết logic xoá từng bảng (vừa đơn giản hơn, vừa an toàn hơn — không có rủi ro tự đoán sai thứ tự).

- [x] Nút "Delete account" ở khối **"Danger zone"** riêng, tách hẳn khỏi "Export your data"
- [x] Xác nhận: gõ đúng email để kích hoạt nút xoá (cùng mức nghiêm trọng với FR-25)
- [x] Gợi ý xuất dữ liệu trước khi xoá — ghi rõ trong nội dung dialog, trỏ tới khối "Export your data" ngay bên dưới trên cùng trang (không cần thêm anchor-link riêng vì đã luôn hiển thị sẵn)
- [x] Xoá qua `auth.admin.deleteUser()` (service-role), cascade tự động qua mọi bảng
- [x] Sau khi xoá: đăng xuất, về `/login?deleted=1` kèm thông báo trung lập ("Account deleted. Thanks for using UniPilot AI.")

**Xác minh bằng tài khoản dùng-một-lần thật** (không dùng tài khoản demo hay E2E, đúng yêu cầu): tạo tài khoản mới qua Admin API, chèn dữ liệu thật vào **cả 9 bảng** (profiles, courses, assignments, grades, focus_sessions, class_blocks, notifications, push_subscriptions, google_calendar_connections), sau đó dùng đúng luồng UI thật (đăng nhập → Settings → Delete account → gõ email xác nhận → bấm xoá) để xoá. Xác nhận sau đó:
- Nút xác nhận **đúng là bị khoá** khi bỏ trống hoặc gõ sai email, chỉ mở khi khớp chính xác
- Redirect đúng về `/login?deleted=1`, hiện đúng thông báo trung lập
- Truy vấn trực tiếp bằng service-role: **cả 9 bảng lẫn chính `auth.users`** đều trả về rỗng/404 — không sót một dòng nào
- Tài khoản demo thật (`tien.vo539@gmail.com`) xác nhận vẫn còn nguyên vẹn sau khi thao tác (chỉ mở dialog để chụp ảnh, không xác nhận xoá)

### 9.2 — SR-06: PWA manifest theo theme (~20 phút, thực tế ~40 phút do phát sinh) ✅ **Hoàn thành**

**File sửa:** `public/manifest.json`, `app/layout.tsx`, **`proxy.ts` (phát sinh)**

- [x] Thêm trường `"id": "/"`
- [x] **Giới hạn thật, đã kiểm chứng qua tài liệu Next.js 16 của chính dự án** (`node_modules/next/dist/docs/.../manifest.md`): `background_color` (màn hình splash lúc mở app từ icon màn hình chính) **không thể** làm theo theme — kể cả `manifest.ts` server-generated cũng không giải quyết được, vì trình duyệt không gửi `prefers-color-scheme` đáng tin cậy khi fetch manifest, và app đã cài thường cache manifest lúc cài đặt chứ không fetch lại mỗi lần mở. Đây là giới hạn nền tảng thật — **không cố làm fix giả**.
- [x] Thay vào đó, làm đúng phần **thật sự hỗ trợ**: `viewport.themeColor` trong `app/layout.tsx` chuyển sang dạng mảng theo `media` (`(prefers-color-scheme: light/dark)`) — ảnh hưởng màu thanh địa chỉ trình duyệt (Android Chrome), xác nhận render đúng 2 thẻ `<meta name="theme-color" media="...">` trong HTML thật.

> ⚠️ **Phát hiện phát sinh khi verify (cùng lớp lỗi với SR-01):** `curl` thẳng `/manifest.json` không có session trả về **307 redirect sang `/login`** thay vì JSON — `proxy.ts`'s matcher loại trừ `sw.js`/ảnh tĩnh nhưng **quên `manifest.json`**. Nghĩa là trình duyệt đánh giá khả năng "Add to Home Screen" ngay tại trang `/login` (trang công khai, chưa có session) sẽ luôn fetch thất bại — có thể đã âm thầm chặn luôn việc cài PWA cho bất kỳ ai chưa từng đăng nhập trước đó. Sửa: thêm `manifest\\.json` vào matcher, cùng nhóm với `sw.js` (lý do giống hệt — file tĩnh không bao giờ được redirect). Xác nhận `curl` không session giờ trả `200` đúng JSON; `sw.js` và các route cần đăng nhập khác không bị ảnh hưởng.

**Commit:** 2 commit

---

## Bảng tổng hợp

| Phase | Nội dung | Giờ ước tính | Giờ thực tế | Mức | Trạng thái |
|---|---|---|---|---|---|
| **6** | Cron nhắc deadline + error boundary | ~3 | ~4 (2 nguyên nhân phụ ở 6.1) | 🔴 P0 | ✅ |
| **7** | Quét sạch contrast dark mode | ~2.5 | ~2 | 🔴 P0 | ✅ |
| **8** | Side-effect, index, N+1, chặn truy vấn | ~3.5 | ~3.5 | 🟡 P1 | ✅ |
| **9** | Xoá tài khoản + manifest | ~2.5 | ~3 (1 nguyên nhân phụ ở 9.2) | 🟡 P1 | ✅ |

**Tổng ước tính: ~11.5 giờ · Tổng thực tế: ~13.5 giờ**

**Commit cuối:** `33a5645` — 174/174 unit test, 21/21 E2E test xanh, Vercel deploy thành công cho toàn bộ commit trong kế hoạch này.

### Nếu cần cắt phạm vi

- **Tối thiểu để giao cho người dùng thật:** Phase 6 + 7 (~5.5h) — hết chuyện app sập khi lỗi, hết chuyện nhắc deadline vô dụng, hết chuyện không đọc được chữ ở dark mode.
- **Có thể hoãn:** Phase 8 — chưa ai thấy ở quy mô hiện tại. Nhưng **8.2 sẽ khó sửa dần** khi dữ liệu đã lớn, nên đừng hoãn quá lâu.
- **Không nên hoãn:** 6.1. Mỗi ngày trôi qua là một ngày tính năng nhắc deadline đang lặng lẽ không hoạt động đúng cho người dùng đóng app.

---

## Đề xuất bắt đầu

**Phase 6.1** — ~45 phút, sửa đúng thứ tôi làm hỏng ở phiên trước, và là thứ duy nhất trong kế hoạch đang **âm thầm ảnh hưởng người dùng thật ngay lúc này**.

Cần bạn quyết 1 việc trước khi bắt đầu: **chọn phương án A / B / C cho SR-01** (xem bảng so sánh ở `PRODUCT_REVIEW_3.md`). Mặc định tôi làm **A (GitHub Actions, miễn phí, ~15 phút/lần)**.
