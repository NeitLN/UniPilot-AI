# UniPilot AI — Đánh giá 6 góc nhìn chuyên môn (đợt 4)

**Ngày:** 31/07/2026
**Phiên bản:** `main` @ `3c56cbc` — sau khi hoàn thành cả 9 phase của 2 đợt kế hoạch trước
**Tài khoản kiểm thử:** `tien.vo539@gmail.com` (dữ liệu thật: 15 môn, 10 assignment, 8 điểm, 21 phiên focus, 29 buổi lịch)
**Phương pháp:** chạy thật toàn bộ 11 route bằng Playwright, đo `getComputedStyle` thật, truy vấn thẳng DB production bằng service-role key, đọc code. **Không có con số nào trong tài liệu này là ước lượng.**

> **Kết luận:** 0 console error, 0 page error, mọi route tải ~1.7–2.2s. Nhưng đợt này tìm ra **2 lỗi P0 chưa từng bị phát hiện qua 3 đợt review trước** — trong đó 1 lỗi làm hỏng dữ liệu âm thầm và 1 lỗi khiến chữ **biến mất** khi hover ở dark mode trên 44 vị trí.

---

## 1. 🙋 Người dùng thật — "Tôi dùng app này để học"

Tôi đăng nhập, định xem tuần này phải làm gì.

**Dashboard ổn.** 4 thẻ KPI, có link "See your weekly report". Rõ ràng, không phải nghĩ.

**Nhưng vào AI planner thì tôi bối rối.** Nó ghi "Active plan" với badge xanh "Active", liệt kê 5 buổi học: *Jul 26, Jul 27, Jul 28, Jul 29, Jul 30*. Hôm nay là **31/07**. Tức là **toàn bộ 5 buổi đều đã trôi qua rồi**, nhưng app vẫn nói kế hoạch đang "Active" như thể tôi còn phải làm.

Tôi không biết:
- Tôi đã học xong những buổi này chưa? (app không đánh dấu)
- Tôi có nên bấm "Generate new draft" không? Nếu bấm thì kế hoạch cũ thành gì?
- Sao không có buổi nào cho tuần này?

> **Đây là cảm giác tệ nhất trong cả app**: tính năng được quảng cáo là "AI lập kế hoạch cho bạn" nhưng lại đưa cho tôi một tờ lịch của tuần trước và bảo nó vẫn "đang hoạt động".

**Chuyển sang dark mode (tôi học ban đêm) thì gặp lỗi rõ rệt.** Rê chuột vào nút "Edit" của một bài tập — nút đột nhiên **sáng trắng lên và chữ gần như biến mất**. Tôi tưởng mình bấm nhầm gì đó. Thử nút khác, nút "Archive", "Restore", nút trong dialog — **chỗ nào cũng vậy**.

**Vài điểm nhỏ khác:**
- Trang Courses có **15 môn** nhưng **không có ô tìm kiếm**, trong khi Assignments (10 mục) thì có. Ngược logic — chỗ nhiều dữ liệu hơn lại khó tìm hơn.
- "Weekly report" — thứ tôi thấy hữu ích nhất — **không có trên thanh dưới cùng ở điện thoại**, chỉ có trên máy tính. Mà tôi hay xem app bằng điện thoại.
- Trang Focus có nút "Log a past session" nhưng thú thật tôi chưa bao giờ để ý nó nằm ở đó.

---

## 2. 🧪 QA Tester — Lỗi chức năng

### 🔴 QA4-01 — Nhiều kế hoạch cùng "active", dữ liệu sai âm thầm **[P0]**

**Bằng chứng (truy vấn DB thật):**
```
status     week_start    confirmed    generated
active     2026-07-26    2026-07-30   2026-07-30
active     2026-07-26    2026-07-30   2026-07-30
active     2026-07-26    2026-07-30   2026-07-30
```
**3 kế hoạch cùng `status='active'`, cùng một tuần**, cho cùng một người dùng.

**Nguyên nhân:** `confirmPlan` (`app/(app)/planner/actions.ts`) chỉ `update` plan được chọn thành `active`, **không bao giờ hạ cấp plan đang active trước đó**. Mỗi lần confirm thêm 1 plan là tích luỹ thêm 1 bản "active".

**Hậu quả thật, không phải giả định:**
1. `/planner` dùng `.limit(1).maybeSingle()` → **âm thầm chọn 1 trong 3**, giấu 2 cái còn lại. Người dùng không hề biết.
2. `/reports` tính "Plan adherence" cũng `.limit(1)` → tỉ lệ bám kế hoạch tính trên **một plan tuỳ ý**, không phải plan thật sự đang dùng.
3. **18 thông báo `study_session`** trong DB — sinh ra từ 3 plan trùng lặp, mỗi lần confirm lại chèn thêm một bộ nhắc.

> Đây là lỗi *toàn vẹn dữ liệu*, không phải lỗi giao diện. Nó không báo lỗi, không crash — chỉ làm số liệu sai dần và không ai biết.

### 🔴 QA4-02 — Chữ biến mất khi hover ở dark mode, 44 vị trí **[P0]**

**Đo thật bằng `getComputedStyle` trên nút "Edit" (dark mode):**

| Trạng thái | Nền | Chữ | Tương phản |
|---|---|---|---|
| Bình thường | `rgb(51,40,90)` | `rgb(183,172,216)` | **6.22:1** ✅ |
| **Khi hover** | `rgb(230,226,242)` | `rgb(183,172,216)` | **1.67:1** ❌ |

Chuẩn WCAG AA cần **4.5:1**. Mức 1.67:1 nghĩa là chữ **gần như không đọc được**.

**Nguyên nhân:** `hover:bg-[#E6E2F2]` — một mã màu **hardcode sáng**, không đi qua design token nên **không đổi theo theme**. Đếm được **44 vị trí** trên toàn bộ `app/` + `components/`.

Đây **không phải** cùng lỗi với SR-03 (đợt trước, đã sửa) — SR-03 là dùng sai *token*; lỗi này là **hardcode hex bỏ qua token hoàn toàn**, nên lệnh quét của đợt trước không thể phát hiện.

*(Ảnh chụp xác nhận: nút được hover hiện thành ô sáng lạc lõng giữa các nút tối còn lại.)*

### 🟡 QA4-03 — Kế hoạch hết hạn vẫn gắn nhãn "Active"

`components/planner/ActivePlanSummary.tsx`: badge "Active" là **chuỗi cứng**, component **không nhận `now` và không so sánh thời gian ở bất kỳ đâu**. Một plan từ 3 tuần trước vẫn hiển thị y hệt plan của hôm nay.

### 🟡 QA4-04 — Đường ống push notification chưa từng có người đăng ký thật

**Bằng chứng DB:** `push_subscriptions` = **0 dòng**. `notifications.push_status`: 15× `no_subscription`, 3× `pending`, **0× `sent`**.

Kết hợp với việc cron chỉ vừa được sửa hôm qua (SR-01), nghĩa là **FR-03 chưa từng gửi thành công một push nào tới thiết bị thật** kể từ khi được xây. Toàn bộ giá trị hiện tại chỉ nằm ở danh sách thông báo trong app.

> Không phải bug code — logic đúng. Nhưng cần biết sự thật này trước khi coi FR-03 là "đã xong".

---

## 3. 🎨 UI/UX Designer — Giao diện & luồng

### UX4-01 — Trạng thái hover phá vỡ hệ thống theme *(xem QA4-02)*

Về mặt thiết kế hệ thống: app đã đầu tư rất bài bản vào design token (mọi màu đi qua CSS custom property, dark mode không cần rải `dark:`). Nhưng **44 chỗ hover thoát ra khỏi hệ thống đó** bằng hex cứng. Một hệ thống token chỉ mạnh bằng chỗ yếu nhất không tuân thủ nó.

**Khuyến nghị:** thêm token `--line-hover` (light: `#E6E2F2`, dark: sáng hơn `--line` một bậc, ví dụ `#3d3169`), thay toàn bộ 44 chỗ. Sửa một lần, không thể tái phát.

### UX4-02 — Plan không có vòng đời trực quan

Người dùng cần phân biệt được 3 trạng thái mà hiện tại trông giống hệt nhau: *buổi sắp tới*, *buổi đã qua*, *kế hoạch đã hết hạn*.

**Khuyến nghị:**
- Buổi đã qua: làm mờ + icon ✓/○
- Kế hoạch mà **mọi** buổi đều đã qua: đổi badge "Active" → "Đã kết thúc", kèm CTA rõ ràng *"Tạo kế hoạch tuần này"*
- Hiện tiến độ: *"3/5 buổi đã qua"*

### UX4-03 — Tìm kiếm không nhất quán

| Trang | Số mục thật | Có tìm kiếm? |
|---|---|---|
| Assignments | 10 | ✅ |
| **Courses** | **15** | ❌ |
| GPA (điểm) | 8 | ❌ |
| Schedule | 29 buổi | ❌ |

Trang **nhiều dữ liệu nhất lại không có tìm kiếm**. Người dùng học 4 kỳ sẽ tích luỹ 30–60 môn.

### UX4-04 — "Weekly report" thiếu ở điều hướng mobile

Sidebar (desktop) có 10 mục; bottom nav (mobile) chỉ có 8, thiếu **Weekly report** và Settings. Đây là quyết định có chủ ý từ Phase 5 (bottom nav đã đạt đúng ngưỡng 44×44px ở 8 mục) — nhưng hệ quả là **tính năng "thấu hiểu" nhất của sản phẩm gần như vô hình trên thiết bị được dùng nhiều nhất**.

**Khuyến nghị:** không nhồi mục thứ 9. Thay vào đó đưa "Weekly report" thành thẻ tóm tắt **ngay trên Dashboard mobile** (đã có link, nhưng chỉ là 1 dòng chữ — nên nâng thành thẻ có số liệu).

---

## 4. 🏗️ Tech Lead — Chất lượng code & khả năng mở rộng

**Quy mô:** 147 file, 14.191 dòng TypeScript.

### Điểm mạnh thật sự (giữ nguyên)

| Hạng mục | Đánh giá |
|---|---|
| **Tách quy tắc nghiệp vụ** | `lib/rules/*` thuần, **8/8 file có test**, 174 unit test. Cùng một hàm validate chạy cả client lẫn server — một nguồn sự thật. Đây là điểm mạnh nhất của codebase. |
| **RLS** | 13/13 bảng, policy `user_id = auth.uid()` cả `using` lẫn `with check`. |
| **Bảo vệ service-role** | `import "server-only"` → rò rỉ sang client là lỗi **build**, không phải lỗi runtime. |
| **Comment giải thích "tại sao"** | Hiếm gặp ở mức này. Người sau đọc hiểu được ý định. |

### TD4-01 — Trùng lặp cấu trúc form **[nợ kỹ thuật chính]**

- `function Field(...)` — định nghĩa lại **5 lần**
- `function inputClass(...)` — định nghĩa lại **7 lần**
- Chuỗi class nút submit lặp **6 lần**

Đợt trước (Phase 7.1) đã **cố ý không gom** để tránh trộn refactor cấu trúc vào một phase sửa lỗi contrast — quyết định đúng lúc đó. Nhưng nợ vẫn còn, và mỗi form mới lại copy thêm một bản.

### TD4-02 — Không có test nào ở tầng component

```
tests/rules/*.test.ts   → 174 test  ✅
tests/e2e/*.spec.ts     →  21 test  ✅
tests/**/*.test.tsx     →   0 test  ❌
```

Khoảng trống giữa "logic thuần" và "cả luồng qua trình duyệt" hoàn toàn không được phủ. Hệ quả cụ thể: **cả QA4-01 lẫn QA4-02 đều lọt qua 195 test hiện có** — vì unit test không biết đến DOM, còn E2E không kiểm tra trạng thái hover hay tính bất biến của dữ liệu.

### TD4-03 — `confirmPlan` thiếu tính nguyên tử

Ngoài việc không hạ cấp plan cũ (QA4-01), hàm này thực hiện **4 thao tác ghi tuần tự** (update plan → insert notifications → push Google Calendar → revalidate) mà không có transaction. Nếu lỗi giữa chừng, dữ liệu ở trạng thái nửa vời.

### TD4-04 — `lib/supabase/types.ts` viết tay (488 dòng)

Đây là file dài nhất dự án và được **duy trì thủ công** thay vì sinh bằng `supabase gen types`. Mỗi migration phải nhớ sửa tay — đã có tiền lệ sai (khi test FR-27 tôi phát hiện cột thật là `access_token_expires_at` nhưng ban đầu tôi đoán là `expires_at`; type file đúng, nhưng cơ chế thì mong manh).

---

## 5. 📊 Data Analyst — Dữ liệu nói gì

Toàn bộ số liệu dưới đây truy vấn trực tiếp từ DB production.

### Tính năng đã xây nhưng **không ai dùng**

| Tính năng | Xây ở | Dữ liệu thật | Tỉ lệ dùng |
|---|---|---|---|
| **FR-22** Ghi phiên học thủ công | Phase 4.2 | 21/21 phiên đều `source='timer'`, **0 phiên `manual`** | **0%** |
| **F-03** Điểm assignment → dự đoán | Đợt trước | **1/10** assignment có `score` | **10%** |
| **FR-19** Nhắc theo assignment | Sớm | **1/10** có `reminder_at` | **10%** |
| **FR-03** Push notification | Sớm | **0** `push_subscriptions`, **0** push `sent` | **0%** |
| **Lưu trữ (Archive)** | B-03 | **0** assignment archived | **0%** |

### Tính năng được dùng thật

| Tính năng | Dữ liệu |
|---|---|
| Focus timer | 21 phiên / 10 ngày, **475 phút**, 19 completed + 2 partial |
| Lịch học | 29 buổi |
| GPA | 8 điểm / 4 kỳ |
| Quản lý môn | 15 môn, **14/15 có liên kết thật** (chỉ 1 môn mồ côi) |

### 3 nhận định

**1. Tỉ lệ "xây xong nhưng không dùng" đang cao.** 5 tính năng ở mức 0–10%. Với FR-22 (0%) — mới xây 2 ngày trước — thì còn quá sớm để kết luận. Nhưng F-03 và FR-19 ở mức 10% sau thời gian dài hơn là **tín hiệu về khả năng khám phá (discoverability), không phải về giá trị tính năng**.

**2. Dữ liệu focus chỉ trải 10 ngày (21–30/07).** Mọi biểu đồ "8 tuần" trên trang Focus và mọi so sánh "tuần này vs tuần trước" ở `/reports` hiện đang chạy trên **1,5 tuần dữ liệu**. Các con số so sánh (↑2, ↓200 phút, ↑6d) **về mặt thống kê chưa có ý nghĩa** — nhưng giao diện trình bày chúng với vẻ chắc chắn như nhau.

**3. 15 môn / 10 assignment — tỉ lệ ngược.** Người dùng chăm khai báo môn hơn khai báo bài tập. Có thể vì lịch học đồng bộ từ Google tự sinh môn, còn assignment phải nhập tay từng cái. **Cơ hội:** gợi ý tạo assignment từ môn đã có.

---

## 6. 📋 Product Manager — Tổng hợp & quyết định

### Nguyên tắc quyết định đợt này

Sản phẩm đã qua 9 phase, chất lượng code cao, không còn lỗi chức năng lớn nào ở luồng chính. Nhưng đợt review này lộ ra một mẫu hình đáng chú ý: **hai lỗi P0 mới đều thuộc loại "im lặng"** — không crash, không báo lỗi, chỉ âm thầm làm sai (dữ liệu plan) hoặc âm thầm làm hỏng trải nghiệm (hover dark mode). Cả hai đều **lọt qua 195 test**.

→ Vì vậy ưu tiên số 1 không chỉ là *sửa 2 lỗi này*, mà là **bịt loại lỗ hổng đã cho phép chúng lọt qua** (TD4-02: không có test tầng component).

### Quyết định: làm gì / không làm gì

| Quyết định | Lý do |
|---|---|
| ✅ **LÀM** — QA4-01, QA4-02 | P0. Một cái sai dữ liệu, một cái hỏng khả năng đọc trên 44 vị trí. |
| ✅ **LÀM** — Vòng đời plan (QA4-03, UX4-02) | Đây là tính năng *bán hàng* của sản phẩm ("AI planner") mà đang tạo trải nghiệm tệ nhất. |
| ✅ **LÀM** — Token `--line-hover` + gom `Field`/`inputClass` | Sửa gốc, chặn tái phát. |
| ✅ **LÀM** — Test tầng component | Lỗ hổng đã được chứng minh bằng chính 2 lỗi P0 đợt này. |
| ⏸️ **HOÃN** — Tìm kiếm cho Courses/GPA/Schedule | Thật, nhưng chưa đau ở quy mô 15 môn. Làm khi >30 môn. |
| ⏸️ **HOÃN** — Transaction cho `confirmPlan` (TD4-03) | Sau khi sửa QA4-01, rủi ro còn lại thấp. Cần cân nhắc RPC/Postgres function — không nhỏ. |
| ⏸️ **HOÃN** — Sinh types tự động (TD4-04) | Đúng về nguyên tắc nhưng chưa gây lỗi thật lần nào. |
| ❌ **KHÔNG LÀM** — Xoá các tính năng 0% dùng | **Chưa đủ dữ liệu để kết luận.** Chỉ có 1 người dùng thật, FR-22 mới 2 ngày tuổi. Xoá bây giờ là quyết định dựa trên n=1. Thay vào đó: **cải thiện khả năng khám phá**, đo lại sau. |
| ❌ **KHÔNG LÀM** — Thêm mục thứ 9 vào bottom nav | Sẽ phá ngưỡng chạm 44×44px đã đo đạt ở Phase 5. |

---

# KẾ HOẠCH TRIỂN KHAI — 3 PHASE

**Nền:** `main` @ `3c56cbc` · 174 unit test + 21 E2E xanh · Tổng ước tính **~8 giờ**

## Quy trình verify (giữ nguyên từ 2 đợt trước)
```
npx tsc --noEmit → npx eslint app components lib tests → npx vitest run
→ npx playwright test --project=chromium
→ kiểm tra thật trên tài khoản demo: 3 viewport × 2 theme
```
**Bắt buộc:** mỗi hạng mục P0 phải **chứng minh lỗi cũ đã hết bằng số đo/truy vấn thật**, không chấp nhận "code đã đổi".

---

## Phase 10 — Sửa 2 lỗi P0 🔴 (~3h, thực tế ~2.5h) ✅ **Hoàn thành**

> **Mục tiêu:** một lỗi đang làm sai dữ liệu, một lỗi đang làm chữ biến mất. Ưu tiên tuyệt đối.

### 10.1 — QA4-01: Chỉ được tồn tại đúng 1 plan active (~1.5h) ✅

**File sửa:** `app/(app)/planner/actions.ts`
**File mới:** `supabase/migrations/0014_single_active_plan.sql`

- [x] `confirmPlan`: trước khi set plan mới thành `active`, hạ mọi plan `active` khác của user xuống `cancelled`
- [x] **Migration dọn dữ liệu lịch sử:** 3 plan active hiện có → giữ lại `f83e2e3e` (`confirmed_at` mới nhất, 14:04:53), 2 cái còn lại → `cancelled`
- [x] **Ràng buộc DB chống tái phát:** partial unique index `study_plans_one_active_per_user`
- [x] Dọn notification trùng lặp: rà theo `(user_id, kind, title, scheduled_at)`, giữ bản ghi cũ nhất mỗi nhóm — **18 → 13** (xoá đúng 5 bản ghi trùng đã xác định trước khi chạy)

**Tiêu chí chấp nhận — tất cả xác minh bằng truy vấn/thao tác thật:**
- [x] `study_plans?status=eq.active` cho tài khoản demo → **đúng 1 dòng** (`f83e2e3e`)
- [x] Confirm plan mới (2 vòng generate→confirm liên tiếp trên tài khoản E2E qua UI thật) → plan trước tự chuyển `cancelled`, xác nhận bằng truy vấn DB: `active` × 1, `cancelled` × 1, `draft` × 1 (đúng như thiết kế)
- [x] Ép `PATCH` 1 plan `cancelled` → `active` bằng service-role trong khi đã có 1 active → **DB từ chối**: `23505 duplicate key value violates unique constraint "study_plans_one_active_per_user"`
- [x] `/reports` "Plan adherence" vẫn 100%, không lỗi console, tính đúng trên plan hiện hành duy nhất

> Dữ liệu test trên tài khoản E2E (3 plan + 15 notification tạo ra trong lúc verify) đã dọn sạch sau khi xong.

### 10.2 — QA4-02: Token `--line-hover`, thay 44 vị trí (~1.5h) ✅

**File sửa:** `app/globals.css`, 44 vị trí trong 22 file ở `app/` + `components/`

**Tiêu chí chấp nhận — đo `getComputedStyle` thật trên nút "Edit", `/assignments`:**

| | Trước | Sau |
|---|---|---|
| Nền khi hover (dark) | `#E6E2F2` (giá trị light, hardcode) | `#3D3169` (token `--line-hover` riêng cho dark) |
| Tương phản chữ/nền khi hover (dark) | **1.67:1** ❌ | **5.38:1** ✅ |
| Nền khi hover (light) | `#E6E2F2` | `#E6E2F2` — **không đổi** |
| Tương phản (light) | 7.23:1 | 7.23:1 — không đổi |

- [x] `grep -rn "hover:bg-\[#" app components` → 0 kết quả
- [x] 21/21 E2E xanh (chạy 2 lần liên tiếp sau khi dọn dữ liệu rác tích luỹ trên tài khoản E2E — xem ghi chú bên dưới)

> ⚠️ **Phát hiện phụ, không sửa hôm nay:** khi tính tương phản cho token mới, phát hiện `text-coral` đứng trên nền hover (cả 2 theme) **cũng dưới chuẩn AA** — light 2.45:1, dark (sau khi sửa) 3.67:1. Đây là bug khác QA4-02 (không phải ink-2/ink-3 biến mất, mà là bản thân `text-coral` chưa từng đủ tương phản trên nền này ở **cả 2 theme**, kể cả trước khi sửa). Ghi nhận cho một đợt riêng, không mở rộng phạm vi Phase 10.
>
> ⚠️ **Phát hiện phụ khác:** lần chạy E2E đầu tiên sau khi sửa xong bị **fail thật** (không phải flaky) ở đúng test `assignments.spec.ts:7`, cả khi chạy riêng lẻ. Nguyên nhân: tài khoản E2E đã tích luỹ **32 dòng "E2E Assignment..." rác** qua nhiều lần chạy test suite suốt các đợt trước (không liên quan gì tới code Phase 10) — trang `/assignments` quá dài khiến việc định vị nút trong dialog bị lệch. Dọn về còn đúng 1 dòng cố định (`E2E Baseline Assignment`) thì test xanh lại ngay, xác nhận không phải regression từ Phase 10.

---

## Phase 11 — Vòng đời AI Planner 🟡 (~2.5h, thực tế ~2h) ✅ **Hoàn thành**

> **Mục tiêu:** biến tính năng bán hàng của sản phẩm từ "tờ lịch tuần trước" thành thứ dùng được.

### 11.1 — Phân biệt buổi đã qua / sắp tới (~1h) ✅

**File sửa:** `components/planner/ActivePlanSummary.tsx`

- [x] Nhận `now`, phân biệt buổi quá khứ (○, chữ `text-ink-3`) và sắp tới (●, chữ thường)
- [x] Hiện tiến độ: *"N of M sessions have passed"*
- [x] **Đúng nguyên tắc đã đặt ra:** không dùng chữ "completed"/"đã học xong" ở đâu cả — chỉ "have passed" (đã qua thời điểm), không suy ra việc học thật

> ⚠️ **Tự bắt và sửa 1 lỗi trước khi commit:** thiết kế ban đầu dùng `opacity-50` trên cả dòng để làm mờ buổi đã qua. Đo thử ở dark mode ra **3.97:1** — dưới chuẩn AA 4.5:1, tức là **suýt tái phạm đúng lớp lỗi QA4-02 vừa sửa xong trong cùng phase**. Đổi sang dùng token `text-ink-3` (đã có sẵn, đã kiểm chứng) thay vì opacity thô → đo lại **4.52:1**, đạt chuẩn.

### 11.2 — Trạng thái "kế hoạch đã kết thúc" (~1h) ✅

- [x] Mọi buổi đã qua → badge đổi thành **"Ended"**, tone `neutral` thay vì `mint`
- [x] CTA rõ trong nội dung card: *"This plan has ended. Use 'Generate new draft' above to plan this week."*
- [x] Logic thuần `computePlanProgress()` trong `lib/rules/plan.ts` — 5 unit test mới (rỗng / còn active / đã kết thúc / toàn bộ còn tương lai / biên đúng thời điểm `now`)

> **Phát hiện phát sinh, sửa luôn trong phase này:** `components/dashboard/PlanCard.tsx` (widget "Pilo's plan" trên Dashboard) là **component khác**, tách biệt hoàn toàn khỏi `ActivePlanSummary`, nhưng bị **đúng lỗi QA4-03 y hệt** — badge "Active" chỉ dựa vào `study_plans.status`, không hề biết thời gian. Phát hiện khi chụp ảnh xác nhận Phase 11 và thấy card này vẫn hiện "Active" dù plan đã kết thúc. Sửa bằng cách gọi lại đúng `computePlanProgress()` đã build ở trên — không viết lại logic lần hai, tránh 2 nguồn sự thật lệch nhau.

### 11.3 — Nâng link Weekly report trên Dashboard (~30 phút) ✅

**File mới:** `components/dashboard/WeeklyReportTeaser.tsx`

- [x] Đổi từ 1 dòng chữ thành thẻ có số liệu thật — **nhưng không phải streak/phút tuần này** như đề xuất ban đầu, vì 2 con số đó **đã hiển thị sẵn** ở `FocusCard`/`FocusWeekKpi` ngay phía trên (lặp lại không có giá trị). Thay bằng thứ duy nhất chỉ `/reports` mới tính: **so sánh với tuần trước** (↑/↓ phút, dùng lại `weekOverWeek()` từ `lib/rules/insights.ts`)

**Tiêu chí chấp nhận Phase 11 — xác minh bằng dữ liệu thật, cả 2 chiều:**
- [x] Dữ liệu demo thật (5/5 buổi đã qua) → cả `/planner` lẫn Dashboard's `PlanCard` đều hiện đúng "Ended", không còn "Active" ở đâu
- [x] Tạo 1 plan có buổi tương lai (tài khoản E2E, 1 buổi quá khứ + 1 buổi tương lai, dọn sạch sau khi xong) → hiện đúng "Active", markers `○`/`●` phân biệt đúng từng buổi, "1 of 2 sessions have passed"
- [x] Unit test: 179/179 xanh (174 → 179, +5 test `computePlanProgress`)
- [x] E2E: 21/21 xanh (2 lần chạy liên tiếp)
- [x] 0 page error trên mọi màn hình đã kiểm tra

**Tiêu chí chấp nhận Phase 11:**
- [ ] Với dữ liệu demo hiện tại (5 buổi đều đã qua) → hiện đúng "Đã kết thúc", không còn "Active"
- [ ] Tạo 1 plan có buổi tương lai → hiện đúng "Active" + phân biệt được quá khứ/tương lai
- [ ] Unit test cho logic mới trong `lib/rules/plan.ts`

---

## Phase 12 — Bịt lỗ hổng test & gom nợ kỹ thuật 🟡 (~2.5h, thực tế ~2h) ✅ **Hoàn thành**

> **Mục tiêu:** cả 2 lỗi P0 đợt này đều lọt qua 195 test. Không sửa nguyên nhân đó thì đợt sau lại lọt tiếp.

### 12.1 — Gom `Field` / `inputClass` (~1h) ✅

**File mới:** `components/ui/Field.tsx`

- [x] Diff từng bản trước khi gộp: **cả 5 bản `Field` giống hệt byte-for-byte**; 6/7 bản `inputClass` giống hệt, riêng `EventForm.tsx` có thêm `min-w-0` (layout flex-row cho input ngày giờ) — giữ nguyên khác biệt này qua tham số `extra?: string` thay vì đánh mất nó
- [x] `EventForm.tsx`: alias `inputClass` cục bộ = `sharedInputClass(hasError, "min-w-0")` — cả 9 chỗ gọi `inputClass(...)` trong file không cần sửa dòng nào, tránh rủi ro bỏ sót
- [x] Dùng lại `FieldError` đã có từ Phase 7
- [x] **Không đổi hành vi:** `npx tsc --noEmit` sạch, `eslint` sạch, 21/21 E2E xanh (chạy lại nguyên trạng ngay sau refactor)

### 12.2 — Test tầng component (~1.5h) ✅

**File mới:** `tests/components/ActivePlanSummary.test.tsx`, `FieldError.test.tsx`, `Field.test.tsx`, `hover-token-guard.test.ts`, `vitest.setup.ts`
**Gói thêm:** `jsdom`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@vitejs/plugin-react` (dev only — đã xác nhận `npm audit` sau khi cài: 12 lỗ hổng high vẫn y hệt trước, đều thuộc `eslint`/`next`/`postcss`/`sharp` có sẵn, không có lỗ hổng mới)

- [x] `ActivePlanSummary`: 3 test — toàn buổi quá khứ không hiện "Active", có buổi tương lai thì hiện đúng "Active", plan rỗng không bị gắn nhầm "Ended"
- [x] `FieldError`: luôn `role="alert"` (cả dạng `<p>` mặc định lẫn `as="span"`), không dùng `-text` token cố định
- [x] `Field` dùng chung: `getByLabelText` xác nhận liên kết label↔input đúng (label bọc input, không cần `htmlFor`/`id`), hiện lỗi đúng qua `FieldError`
- [x] `hover-token-guard.test.ts`: quét toàn bộ `app/`+`components/` tìm `hover:bg-\[#`, phải ra đúng 0 kết quả

> ⚠️ **2 lỗi tự bắt trong lúc viết test (không phải bug thật, lỗi ở cách viết test):** cả `FieldError.test.tsx` lẫn `Field.test.tsx` fail ở lần chạy đầu vì Testing Library **không tự cleanup DOM giữa các `it()`** — dự án dùng `import { describe, it } from "vitest"` tường minh thay vì `test.globals: true`, nên cơ chế auto-cleanup dựa vào `afterEach` toàn cục của RTL không tự đăng ký được. Sửa bằng cách gọi `cleanup()` tường minh trong `afterEach` ở `vitest.setup.ts`.

**Tiêu chí chấp nhận — xác minh thật, không chỉ chạy 1 lần:**
- [x] `npx vitest run` chạy chung test component lẫn test rules trong 1 lệnh: **191/191 xanh** (179 → 191, +12; 14 → 18 file test)
- [x] **Chứng minh lưới bắt được QA4-02 nếu tái phát** — quy trình thật, không suy luận: tạm đưa `hover:bg-[#E6E2F2]` trở lại `AssignmentItem.tsx` → chạy `hover-token-guard.test.ts` → **fail đúng, chỉ đúng dòng `AssignmentItem.tsx:124`** → revert bằng bản sao lưu → `git diff` xác nhận 0 thay đổi sót lại → chạy lại test → xanh
- [x] `npm run build` (production) vẫn sạch sau khi thêm 4 devDependencies mới
- [x] Verify thật trên tài khoản demo: submit rỗng `AssignmentForm` vẫn hiện đúng 5 lỗi qua `Field`/`FieldError` đã gộp; mở `EventForm` xác nhận layout `min-w-0` không tràn; 0 page error

---

## Bảng tổng hợp

| Phase | Nội dung | Giờ ước tính | Giờ thực tế | Mức | Trạng thái |
|---|---|---|---|---|---|
| **10** | Plan active trùng lặp + hover dark mode | ~3 | ~2.5 | 🔴 P0 | ✅ |
| **11** | Vòng đời AI Planner | ~2.5 | ~2 | 🟡 P1 | ✅ |
| **12** | Gom form + test tầng component | ~2.5 | ~2 | 🟡 P1 | ✅ |

**Tổng ước tính: ~8 giờ · Tổng thực tế: ~6.5 giờ** — cả 3 phase: **✅ Hoàn thành**

### Kết quả cuối cùng
- Unit + component test: **174 → 191** (bắt đầu đợt 4)
- E2E: **21/21** xanh xuyên suốt cả 3 phase
- 2 lỗi P0 (QA4-01 dữ liệu plan trùng lặp, QA4-02 chữ biến mất khi hover) — sửa tận gốc bằng ràng buộc DB (partial unique index) và token dùng chung, không chỉ vá triệu chứng
- 1 lỗi P0 thứ 3 tự phát hiện trong lúc làm Phase 11 (`PlanCard` trên Dashboard bị đúng lỗi QA4-03 độc lập) — sửa luôn bằng cách dùng lại đúng 1 hàm logic, không viết lần hai
- Lưới bảo vệ QA4-02 đã **chứng minh hoạt động thật** (không phải suy luận): cố tình tái tạo lỗi → test fail đúng dòng → revert → test xanh lại

### Đề xuất bắt đầu
**10.1** — vì mỗi lần bạn bấm "Confirm plan" là dữ liệu lại sai thêm một bậc, và partial unique index sẽ chặn vĩnh viễn lớp lỗi này ở tầng DB chứ không phụ thuộc code viết đúng.
