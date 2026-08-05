# UniPilot AI — Lộ trình hành động

**Nguồn:** `UNIPILOT_COMPLETE_PRODUCT_AUDIT.md` (audit ngày 2026-08-05)
**Mục đích:** biến 24 phát hiện của báo cáo thành các bước thực thi được, bắt đầu làm ngay.

---

## Cách phân loại

Ba nhóm được tách theo một câu hỏi duy nhất: **"Ngay lúc này có gì đang sai không?"**

| Nhóm | Định nghĩa | Số mục |
|---|---|---|
| **Phần 1 — Lỗi thật** | Có thứ đo được là **sai ngay bây giờ**: vi phạm chuẩn, hoặc cho ra kết quả không đúng. Sửa = khôi phục tính đúng đắn. | 5 |
| **Phần 2 — Nâng cấp nền tảng** | **Không có gì hỏng**, nhưng hệ thống thiếu lớp bảo vệ, thiếu giàn giáo vận hành, hoặc chất lượng có thể tốt hơn. | 11 |
| **Phần 3 — Ý tưởng tính năng** | Năng lực sản phẩm **chưa tồn tại**. Đây là đặt cược sản phẩm, không phải sửa chữa. | 5 |
| *(Không cần làm)* | Đã xong, hoặc đã kết luận là không cần hành động. | 3 |

**Lưu ý về mức độ:** báo cáo không có P0 hay P1 nào — chỉ có 8×P2 và 10×P3. Nghĩa là **không mục nào trong lộ trình này là khẩn cấp**. Thứ tự dưới đây tối ưu theo *rủi ro tích luỹ*, không theo mức độ hoảng loạn.

---

## Thứ tự thực thi đề xuất

Ba phần là cách **phân loại**, không phải thứ tự làm. Có ba ràng buộc phụ thuộc thật cần tôn trọng:

```
Bước 2.1 (commit 70 file)  ─┐
                            ├─→ mọi bước còn lại  (cần điểm rollback trước khi sửa gì)
Bước 2.2 (thêm CI)         ─┘

Bước 2.5 (test cho lib/push) ──→ Bước 1.5 (sửa N+1 trong lib/push)
                                  (không có test thì sửa mù)
```

**Thứ tự khuyến nghị:** `2.1` → `2.2` → toàn bộ **Phần 1** → phần còn lại của **Phần 2** → **Phần 3**.

Lý do đưa 2.1 và 2.2 lên đầu dù chúng thuộc nhóm "nâng cấp": hiện có **70 file chưa commit** (không có điểm quay lui) và **không có CI** (không ai được báo khi hỏng). Sửa lỗi trước khi có hai thứ này là làm việc không lưới an toàn.

---

---

## Trạng thái thực thi (cập nhật 2026-08-05)

**Phần 1 và Phần 2 đã hoàn thành.** 24 commit trên nhánh `feat/ui-redesign-and-audit`, chưa push.

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| 1.1 | xong | `/reports` còn 1 `<h1>`, giao diện không đổi |
| 1.2 | xong | `/courses` outline H1→H2→H2 |
| 1.3 | xong | 2 nút 23px → 29px |
| 1.4 | xong | **Chẩn đoán ban đầu sai** — xem mục 0 của báo cáo audit |
| 1.5 | xong | **Phần lớn không tồn tại** — đường cron đã batch sẵn |
| 2.1 | xong | 9 commit, mỗi commit pass tsc + test khi checkout cô lập |
| 2.2 | xong | e2e giới hạn `main`/PR cùng repo để hạn chế rác DB dùng chung |
| 2.3 | xong | FK thiếu index về 0, planner xác nhận dùng index |
| 2.4 | xong | Đếm nguyên tử trong Postgres; xác minh 429 qua HTTP thật |
| 2.5 | xong | 3 module trắng đã có test; chứng minh bắt được regression |
| 2.6 | xong | `/api/health` miễn auth; báo lỗi có cấu trúc ra stderr + webhook tuỳ chọn `ERROR_WEBHOOK_URL`. Gắn Sentry sau là đổi mỗi `deliver()` |
| 2.7 | xong | Chỉ `LearningStats` thiếu thật; 2 card kia đã có sẵn |
| 2.8 | xong | audio 16.8 MB → 9.2 MB, thêm chỉ báo dung lượng |
| 2.9 | xong | `requireEnv` nêu đúng tên biến thiếu |
| 2.10 | xong | Ngưỡng `BELOW_AVERAGE_MARGIN = 0.3` — **quyết định sản phẩm** đã được chấp nhận; đặt về 0 để khôi phục hành vi cũ |
| 2.11 | xong | `lib/rules` phủ 14/14 |

**Phát sinh ngoài lộ trình:** dark mode có 49 lỗi contrast thật (audit ghi là *chưa kiểm được*). Đã sửa toàn bộ và thêm test hồi quy đo thật trên 10 route.

**Số liệu:** 440 unit test (từ 327), 38 file test (từ 26), 47 e2e. tsc, lint và build sạch.

**Phần 3: đã làm 3.4.** Các bước còn lại (3.1, 3.2, 3.3, 3.5) là đặt cược sản phẩm cần bạn quyết trước khi viết code. Chọn 3.4 trước vì nó gần một lỗi UX hơn là tính năng mới.

| Bước | Trạng thái | Ghi chú |
|---|---|---|
| 3.4 | xong một nửa | **Luận điểm gốc sai một phần** — onboarding *có* thu `weekly_availability_hours` (bước 1), nên AI Planner không hề bị chặn. Ngõ cụt thật chỉ nằm ở thẻ "On track". Đã sửa theo vế thứ hai của đề xuất (thẻ tự nói ra thứ nó thiếu); vế "onboarding thu thêm 2 trường" vẫn để ngỏ vì đó là quyết định sản phẩm |
| 3.2 | xong | Nhắc giữa tuần khi bám kế hoạch tụt dưới 50%. Chống trùng bằng unique index — **bản partial đầu tiên của tôi sai**, Postgres không suy ra được nên mọi insert đều ném lỗi; phát hiện bằng cách thử trên DB thật chứ mock unit test không bắt được |
| 3.1 / 3.3 / 3.5 | chưa bắt đầu | chờ bạn quyết |

**Phát sinh ngoài lộ trình (đợt 2):** chỉ báo giờ hiện tại của `/schedule` rớt contrast dark mode (2.61:1). Test hồi quy 10 route trước đó không bắt được vì nhãn này chỉ render khi giờ hiện tại nằm trong khung 08:00–20:00 — lần chạy trước rơi ngoài khung.

---

# PHẦN 1 — LỖI THẬT

*5 mục. Tất cả đều đã được **xác minh bằng đo đạc**, không phải suy đoán.*

---

### Bước 1.1 — Bỏ `<h1>` trùng trên trang Weekly report

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| BUG-01 (P3) | Accessibility / semantic HTML | **S** | Rất thấp |

**Vấn đề.** Trang `/reports` có **hai** thẻ `<h1>`: tiêu đề trang ở `app/(app)/reports/page.tsx:218`, và câu khẩu hiệu của hero ở `components/reports/WeeklyRecapHero.tsx:89` ("You kept showing up."). Xác minh: `document.querySelectorAll('h1').length` trả về `2`.

**Việc cần làm.**
1. Đổi `<h1>` trong `WeeklyRecapHero.tsx` thành `<h2>`. Giữ nguyên toàn bộ class typography — đây chỉ là đổi thẻ, không đổi giao diện.
2. Thêm assertion vào `tests/e2e/reports.spec.ts`: trang chỉ có đúng 1 `<h1>`.

**File.** `components/reports/WeeklyRecapHero.tsx`, `tests/e2e/reports.spec.ts`

**Xong khi.** `/reports` có đúng một `<h1>`; thứ tự heading chạy h1 → h2 không nhảy cấp; ảnh chụp màn hình không đổi.

---

### Bước 1.2 — Sửa nhảy cấp heading trên trang Courses

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| BUG-02 (P3) | Accessibility / WCAG 1.3.1 | **S** | Rất thấp |

**Vấn đề.** `/courses` đi thẳng từ `<h1>Courses</h1>` xuống `<h3>{course.name}</h3>` trong `CourseCard.tsx:59`, bỏ qua cấp h2. Người dùng screen reader duyệt theo cấp heading sẽ tưởng bị thiếu nội dung.

**Việc cần làm.**
1. Đổi tiêu đề thẻ course (dòng 59) từ `<h3>` thành `<h2>`.
2. **Giữ nguyên** `<h2>` ở dòng 110 — đó là trong modal, và dialog mở ra một ngữ cảnh heading mới nên h2 ở đó là đúng.

**File.** `components/courses/CourseCard.tsx`

**Xong khi.** Cấu trúc heading của `/courses` là h1 → h2 không nhảy cấp; typography của thẻ không đổi.

---

### Bước 1.3 — Nâng hai nút trên trang Focus lên tối thiểu 24px

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| BUG-03 (P3) | Accessibility / WCAG 2.5.8 | **S** | Rất thấp |

**Vấn đề.** Đo được ở 1440px: "View all history" là **110 × 23 px**, "This week" là **71 × 23 px**. Thiếu đúng 1px so với sàn 24px.

**Việc cần làm.**
1. Thêm `min-h-6 px-1 -mx-1` vào cả hai nút — vùng chạm vượt 24px mà trọng lượng thị giác không đổi.
2. *(Không đụng vào skip link 1×1px — đó là mẫu visually-hidden chuẩn, đã xác minh nó là tab stop đầu tiên và có outline khi focus.)*

**File.** `components/focus/FocusHistoryCard.tsx`, `components/focus/LearningStats.tsx`

**Xong khi.** Mọi phần tử tương tác trên `/focus` đo được ≥24px cả hai chiều; bố cục nhìn không đổi.

---

### Bước 1.4 — Sửa contrast rớt chuẩn do modifier độ mờ

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| A11Y-01 (P2) | Accessibility / WCAG 1.4.3 | **M** | Thấp |

**Vấn đề — đọc kỹ, vì cách hiểu hời hợt sẽ dẫn đến sửa sai chỗ.**

Mọi **token nền tảng đều ĐẠT** chuẩn AA:

| Cặp màu | Tỉ lệ | Kết quả |
|---|---|---|
| `ink-3` trên `card` (sáng) | 5.06:1 | ĐẠT |
| `ink-3` trên `card` (tối) | 5.61:1 | ĐẠT |
| `dusk-muted` trên `ink` | 5.99:1 | ĐẠT |

Lỗi đến từ **modifier độ mờ chồng lên chính những token đó**:

| Tổ hợp | Tỉ lệ | Kết quả |
|---|---|---|
| `text-ink-3/90` trên `bg-card` | 4.12:1 | **RỚT** |
| `text-ink-3/80` trên `bg-card` | 3.38:1 | **RỚT** |
| `text-ink-3/70` trên `bg-card` | 2.83:1 | **RỚT** |
| `dusk-muted/80` trên `bg-ink` | 4.30:1 | **RỚT** |

Đo thực tế trên `/risk`: chip trọng số (`×0.40`, `×0.35`, `×0.25`) hiển thị `rgb(108,95,148)` trên `rgb(29,19,56)` = **3.08:1** ở cỡ chữ 11px, trong khi yêu cầu là 4.5:1.

Có **47 class chữ dùng modifier độ mờ**. Phần lớn là `text-ink/70` trên nền lime/mint — `--ink` tối đến mức ở 70% vẫn thừa tương phản, **những cái đó không sao**. Nguy hiểm là modifier đặt lên token vốn đã tinh chỉnh sát ngưỡng 4.5 (`ink-3`, `dusk-*`).

**Việc cần làm.**
1. Thêm token chuyên dụng vào `app/globals.css`: `--ink-4` và `--dusk-faint`, chọn giá trị sao cho **đạt AA ở chính giá trị hiển thị cuối cùng** (không cần modifier).
2. Mở rộng `tests/components/semantic-color-text-guard.test.ts` — file này đã chặn `text-mint`/`text-coral`/`text-tangerine` trần rồi — để bắt thêm `text-{ink-3,dusk-*}/<số>`. **Viết test này trước khi sửa call site**, để nó đỏ, rồi sửa cho xanh.
3. Sửa khoảng 10 call site thật (bắt đầu từ chip trọng số ở `/risk`).

**File.** `app/globals.css`, `tests/components/semantic-color-text-guard.test.ts`, `components/risk/*`, `components/settings/*`, `components/courses/*`

**Xong khi.** Không node chữ nào đo dưới 4.5:1 (hoặc 3:1 với chữ lớn) trên mọi route, ở cả hai theme; guard test đỏ nếu ai đó lại đặt modifier độ mờ lên token chữ muted.

---

### Bước 1.5 — Gom truy vấn N+1 khi giao thông báo và đẩy lịch

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| PERF-02 (P3) | Performance / database | **M** | **Trung bình** |

> ⚠️ **Phụ thuộc: phải làm Bước 2.5 (viết test cho `lib/push`) TRƯỚC.** Đường code này hiện **không có test nào**, và nó chạy tự động trên cron — sửa mù ở đây là cách chắc chắn nhất để làm hỏng thứ không ai nhìn thấy.

**Vấn đề.** `lib/push/deliver.ts:91` phát **một câu `UPDATE` cho mỗi thông báo bên trong vòng lặp**. `lib/calendar/push.ts:74` phát **một câu `UPDATE` cho mỗi phiên học**. Hàm `deliverAllDueNotifications` chạy qua *mọi* người dùng mỗi 15 phút, nên tổng số lượt round-trip tăng theo (số user × số thông báo đến hạn).

**Việc cần làm.**
1. Trong `deliver.ts`: gom theo trạng thái kết quả, phát **một** `UPDATE ... WHERE id = ANY($1)` cho mỗi nhóm trạng thái.
2. Trong `calendar/push.ts`: gom thành một upsert duy nhất sau vòng lặp.
3. Thêm test khẳng định: giao N thông báo phát ra **số câu UPDATE không đổi**, không phải N câu.

**File.** `lib/push/deliver.ts`, `lib/calendar/push.ts`, `tests/push/deliver.test.ts` (tạo ở bước 2.5)

**Xong khi.** Số câu UPDATE không tăng theo số thông báo; hành vi giao thông báo không đổi và được test phủ.

---

# PHẦN 2 — NÂNG CẤP NỀN TẢNG

*11 mục. Không có gì đang hỏng — đây là lớp bảo vệ còn thiếu.*

---

### Bước 2.1 — Chốt 70 file đang dang dở *(làm đầu tiên)*

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| CODE-01 (P2) | Source control | **S** | Không |

**Vấn đề.** `git status --short` cho **70 file chưa commit**, trải trên chín mảng việc khác nhau (zoom 120%, sửa Modal, AI Planner hero, hai đợt Schedule, Focus timer, GPA tracker, Weekly report, và các bản sửa lỗi). Mất thư mục làm việc là mất tất cả. Không bisect được, không review được, không có điểm quay lui nào giữa chín thay đổi.

**Việc cần làm.**
1. Tạo nhánh mới.
2. Commit thành **chín commit mạch lạc** theo đúng ranh giới trên.
3. Sau **mỗi** commit, chạy `npm test` để chắc commit đó tự nó xanh.

**Xong khi.** `git status` sạch; mỗi commit build được và pass test.

---

### Bước 2.2 — Thêm CI *(làm thứ hai — đòn bẩy cao nhất trong toàn bộ báo cáo)*

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| DEVOPS-01 (P2) | DevOps | **S** | Không (thuần bổ sung) |

**Vấn đề.** `.github/workflows/` có đúng **một** file: `notifications-cron.yml`. **Không có workflow nào chạy `lint`, `tsc --noEmit`, `test` hay `playwright test`** khi push hay mở PR.

**Vì sao đây là mục quan trọng nhất.** Repo có 346 unit test và 33 e2e test — viết tốt, có thật. **Không có gì chạy chúng.** Năm test e2e hỏng được tìm ra hôm nay (DOM nhân đôi trong `AssignmentCard`, link teaser đã chết, hai assertion Settings lạc hậu) — vài cái đã hỏng từ một lần redesign đã merge. **Một job CI sẽ bắt được từng cái ngay tại PR làm hỏng chúng.** Test không phải chỗ thiếu; cái thiếu là trigger.

**Việc cần làm.**
1. Tạo `.github/workflows/ci.yml` chạy trên `push` và `pull_request`: install → `lint` → `tsc --noEmit` → `test` → `build`.
2. Thêm Playwright thành job riêng với secret e2e, hoặc giới hạn chỉ chạy trên `main` nếu lo lộ secret ở fork.

**Xong khi.** Một PR có unit test hỏng **không thể** merge với trạng thái xanh.

---

### Bước 2.3 — Thêm 11 index cho foreign key

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| PERF-01 (P2) | Database / scalability | **S** | Rất thấp (thuần bổ sung) |

**Vấn đề.** Xác minh bằng truy vấn `pg_constraint` trên **database thật**: 11 foreign key không có index dẫn đầu.

```
assignments.course_id        focus_sessions.assignment_id    risk_warnings.user_id
class_blocks.course_id       grades.course_id                study_sessions.assignment_id
courses.user_id              notifications.assignment_id     study_sessions.plan_id
notifications.class_block_id notifications.user_id
```

Postgres **không** tự tạo index cho foreign key — chỉ cho primary key và unique constraint.

**Vì sao quan trọng:**
- `courses.user_id`, `notifications.user_id`, `risk_warnings.user_id` — policy RLS của mọi bảng này lọc `user_id = auth.uid()`. Không index nghĩa là **quét tuần tự ở mọi truy vấn, của mọi người dùng**.
- `study_sessions.plan_id` — policy RLS là subquery tương quan join theo `plan_id`. Đây là cái tệ nhất trong nhóm.
- `*.course_id` — xoá một course phải quét bảng con để kiểm tra ràng buộc.

Hiện **chưa ai thấy chậm** (41 assignment, 55 focus session). Đây là vách đá phía trước, không phải sự cố đang diễn ra.

**Việc cần làm.** Một migration bổ sung, `supabase/migrations/0019_missing_fk_indexes.sql`, tạo cả 11 index. Dùng `create index concurrently` nếu áp lên production đang có tải thật.

**Xong khi.** Truy vấn audit `pg_constraint` trả về 0 dòng; `explain analyze` trên một truy vấn `courses` cho thấy index scan.

---

### Bước 2.4 — Thêm rate limit, ưu tiên route AI tính phí

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| SEC-01 (P2) | Security / chống lạm dụng (OWASP API4:2023) | **M** | Thấp |

**Vấn đề.** Tìm `ratelimit|rateLimit|Retry-After|429` trên toàn bộ `app/` và `lib/` — **không có kết quả nào**. `/api/plan/generate` kiểm `getUser()` và cổng nghiệp vụ `canGeneratePlan`, rồi gọi thẳng Gemini. Không có throttle theo user, không có đường trả 429 ở đâu cả.

Bất kỳ người dùng đã đăng nhập nào cũng có thể gọi route AI tính phí nhanh hết mức mạng cho phép. `/api/export` có cùng tính chất và nặng I/O.

**Việc cần làm.**
1. Tạo `lib/rate-limit.ts`. Với stack hiện tại, phương án ít ma sát nhất là bảng `rate_limits` (`user_id`, `route`, `window_start`, `count`) với upsert nguyên tử — hoặc Upstash Redis nếu muốn tách khỏi database chính.
2. Gắn vào `/api/plan/generate` **trước** (chi phí), rồi `/api/export` (I/O), rồi `/api/calendar/sync`.
3. Trả `429` kèm header `Retry-After`.

**Xong khi.** Lần gọi sinh kế hoạch thứ 11 trong một giờ trả về `429` kèm `Retry-After`; giới hạn được ép ở phía server và có test phủ.

---

### Bước 2.5 — Viết test cho ba module đang trắng *(chặn Bước 1.5)*

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| TEST-01 (P2) | Test coverage | **M** | Không |

**Vấn đề.**

| Module | Số file | Số test |
|---|---|---|
| `lib/push` | 3 | **0** |
| `lib/offline` | 3 | **0** |
| `lib/risk` | 1 | **0** |

`lib/push` là cái đáng lo nhất: nó là đường giao thông báo, khó kiểm bằng tay nhất, chạy không người trông trên cron, và **đã từng ship một lỗi âm thầm** (SR-01 — route cron bị redirect về `/login` trước khi kiểm `CRON_SECRET` kịp chạy, nghĩa là thông báo theo lịch **có lẽ chưa bao giờ được gửi**). Đúng đoạn code cần test nhất lại không có test nào.

`lib/offline` là hàng đợi replay ghi dữ liệu sau khi có mạng lại — hỏng âm thầm là mất dữ liệu.

**Việc cần làm.**
1. `tests/push/deliver.test.ts`: không có thông báo đến hạn; subscription chết bị dọn; trạng thái thất bại một phần.
2. `tests/offline/queue.test.ts`: enqueue, replay, replay sau khi lỗi.
3. `tests/risk/*.test.ts`: đường tính điểm.

**Xong khi.** Ba module đều có test; `npm test` vẫn xanh.

---

### Bước 2.6 — Thêm health check và giám sát lỗi

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| DEVOPS-02 (P2) | DevOps / SRE | **M** | Thấp |

**Vấn đề.** Không có route `/api/health`. Không có Sentry/Datadog/Logtail trong `package.json`. Không có `vercel.json` hay `Dockerfile`. `app/error.tsx` và `app/global-error.tsx` **có tồn tại** (tốt — lỗi được bắt và render), nhưng **không có gì báo cáo chúng đi đâu cả**.

Hệ quả: một lỗi production chỉ hiện với đúng sinh viên gặp phải, và không ai khác biết. Không có tín hiệu nào cho biết cron thông báo đã ngừng, Gemini đang từ chối, hay đồng bộ lịch đang hỏng.

**Việc cần làm.**
1. Thêm `GET /api/health` trả về build SHA và một round-trip database tối giản.
2. Gắn bộ báo cáo lỗi vào cả hai error boundary và các API route.
3. Ghi lại tài liệu môi trường triển khai (repo hiện **không** ghi lại nó được deploy ở đâu và bằng cách nào).

**Xong khi.** `/api/health` trả 200 kèm xác nhận kết nối DB; một lỗi ném ra trong server component xuất hiện trên dashboard giám sát trong vòng một phút.

---

### Bước 2.7 — Thêm empty state thật cho các thẻ dữ liệu

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| UX-01 (P2) | UX / empty states | **M** | Thấp |

**Vấn đề.** Với tài khoản mới, biểu đồ Learning rhythm vẽ bảy cột cao 2px trên một trục có nhãn đầy đủ, và Plan adherence hiện tiêu đề với một dòng chữ và không có con số nào. Cả hai **trông như tải lỗi**, chứ không phải "bạn chưa làm việc này".

**Việc cần làm.** Với mỗi thẻ dữ liệu, thêm nhánh zero-state rõ ràng: một câu giải thích và (nếu hợp lý) một CTA. Lưu ý: `FocusHistoryCard` đang dùng `return null` — tốt hơn là vẽ khung rỗng, nhưng lại để lại một lỗ trong lưới. Nên dùng state có minh hoạ nhỏ thay vì `null`.

**File.** `components/focus/LearningStats.tsx`, `components/reports/PlanAdherenceCard.tsx`, `components/gpa/GpaTrendChart.tsx`

**Xong khi.** Với tài khoản hoàn toàn mới, mọi thẻ trên `/focus`, `/reports`, `/gpa` đều hiện **hoặc** dữ liệu thật **hoặc** một câu hướng dẫn cách tạo dữ liệu. Không thẻ nào vẽ trục mà không có chuỗi số liệu.

---

### Bước 2.8 — Giảm cân tài sản tĩnh

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| PERF-03 (P3) | Performance / asset | **S** | Thấp |

**Vấn đề.** Audio **17 MB** (`satie-gymnopedie-1.ogg` 6.3 MB, `satie-gymnopedie-3.ogg` 5.5 MB, `debussy-reverie.ogg` 3.9 MB). Mascot PNG **~3.6 MB** (lớn nhất `pilo-ai-planner.png` 655 KB).

**Đã có lớp giảm nhẹ và chúng có tác dụng thật:** thẻ `<audio>` có `preload="none"` nên không tải gì cho tới khi người dùng bật Lo-fi; mọi mascot đi qua `next/image` không có cờ `unoptimized` và **không có thẻ `<img>` thô nào**, nên PNG được phục vụ dưới dạng WebP/AVIF đã resize.

**Rủi ro còn lại.** Sinh viên dùng 4G bật Lo-fi sẽ kéo một file 6.3 MB mà không được cảnh báo và không biết dung lượng.

**Việc cần làm.** Encode lại audio ở bitrate thấp hơn (128kbps là thừa cho nhạc nền, cắt được ~70%), hoặc rút thành loop ngắn liền mạch. Tuỳ chọn: hiện "streams ~2 MB" cạnh nút Lo-fi. Nén PNG nguồn bằng `oxipng`/`pngquant`.

**Xong khi.** File audio lớn nhất dưới 2 MB; tổng `public/` dưới 6 MB; chất lượng nghe ở âm lượng bình thường không giảm rõ rệt.

---

### Bước 2.9 — Xác thực biến môi trường Supabase

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| SEC-02 (P3) | Configuration robustness | **S** | Rất thấp |

**Vấn đề.** Tám chỗ dùng `process.env.X!`: `NEXT_PUBLIC_SUPABASE_URL!` (×4), `NEXT_PUBLIC_SUPABASE_ANON_KEY!` (×3), `SUPABASE_SERVICE_ROLE_KEY!` (×1). Trong khi đó `lib/calendar/oauth.ts`, `lib/calendar/tokenCrypto.ts` và `lib/gemini/client.ts` đều xác thực đàng hoàng và ném `Missing required env var: X`.

Deploy thiếu key Supabase sẽ cho ra một lỗi khó hiểu từ sâu trong client thay vì một thông báo nêu đúng tên biến.

**Việc cần làm.** Tái dùng mẫu `requireEnv(name)` đã có sẵn trong `lib/calendar/oauth.ts` cho ba biến Supabase.

**File.** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`, `lib/supabase/middleware.ts`

**Xong khi.** Khởi động mà thiếu `NEXT_PUBLIC_SUPABASE_URL` sẽ hỏng với thông báo `Missing required env var: NEXT_PUBLIC_SUPABASE_URL`.

---

### Bước 2.10 — Nâng ngưỡng nhãn "Below average"

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| UX-02 (P3) | UX / information design | **S** | Thấp |

**Vấn đề.** `dragsGpaDown()` là `row.gradePoint < overallGpa`. Với bộ dữ liệu chín môn thực tế, nhãn xuất hiện trên **6/9 dòng**. Nhãn áp cho hai phần ba số dòng là trang trí, không phải thông tin. Nguyên nhân: vị từ đúng về toán nhưng không có ngưỡng ý nghĩa — theo định nghĩa, khoảng một nửa số môn luôn nằm dưới trung bình.

**Việc cần làm.** Chọn một trong hai: nâng ngưỡng lên khoảng cách có ý nghĩa (ví dụ thấp hơn GPA tích luỹ **hơn 0.3**), hoặc chỉ hiện nhãn trên đúng môn tệ nhất. **Đây là quyết định sản phẩm, không phải sửa lỗi** — hành vi hiện tại bảo vệ được, chỉ là không hữu ích.

**File.** `lib/rules/gpa.ts`, `components/gpa/CourseBreakdown.tsx`, và unit test tương ứng.

**Xong khi.** Trên dữ liệu thực tế, nhãn xuất hiện ở thiểu số dòng; luật mới có unit test ở đúng ngưỡng mới.

---

### Bước 2.11 — Thêm unit test cho `avatar-color`

| Nguồn | Loại | Công sức | Rủi ro hồi quy |
|---|---|---|---|
| CODE-02 (P3) | Test coverage | **S** | Không |

**Vấn đề.** 13/14 module trong `lib/rules/` có test tương ứng. `avatar-color` là chỗ trống duy nhất. Nó mã hoá **cùng bảng màu sáu tông** với `course-tone.ts` và check constraint của migration 0018 — ba nơi phải khớp nhau, mà không có gì khẳng định điều đó.

**Việc cần làm.** Một test khẳng định bảng màu export ra khớp **chính xác** với danh sách giá trị hợp lệ trong check constraint của DB.

**Xong khi.** `lib/rules/` phủ test 14/14.

---

# PHẦN 3 — Ý TƯỞNG TÍNH NĂNG

*5 mục. Đây là **đặt cược sản phẩm**, không phải sửa chữa. Mỗi mục cần bạn quyết định có đáng làm không trước khi ai đó viết code.*

---

### Bước 3.1 — Đưa Workload Risk ra mặt tiền

| Nguồn | Loại | Công sức |
|---|---|---|
| PROD-01 | Product | **M** |

**Luận điểm.** Ứng dụng sinh viên nào cũng có assignment và timer. **Rất ít cái tính được điểm rủi ro có trọng số.** Đây là tính năng khác biệt nhất của UniPilot, và hiện nó nằm sau một link sidebar, không có mặt tiền chủ động nào.

**Đề xuất.** Hiện delta rủi ro trên Dashboard khi nó vượt ngưỡng. Dữ liệu đã có sẵn.

---

### Bước 3.2 — Đóng vòng lặp của AI Planner

| Nguồn | Loại | Công sức |
|---|---|---|
| PROD-02 | Product | **L** |

**Luận điểm.** `planAdherence` đã được tính và hiển thị trong Weekly report. Nhưng sinh viên đang tụt lại **không được báo trong tuần** — chỉ biết sau đó, trong một bản báo cáo họ có thể không mở. Dữ liệu để nhắc **đã tồn tại**.

**Đề xuất.** Nhắc trong tuần khi tỉ lệ bám kế hoạch rơi dưới ngưỡng, qua kênh thông báo đã có.

**Đã làm.** Cron thông báo (15 phút/lần) nay tạo tối đa **một** nhắc cho mỗi tuần kế hoạch, khi tỉ lệ bám tụt **dưới 50%**. Ba chốt chặn, tất cả đều để ngăn một cái nhắc gây nhiễu — vì nhắc sai không hề miễn phí: đó chính là cách sinh viên tắt hẳn quyền thông báo, và kéo theo cả những nhắc đang hoạt động tốt:

| Chốt chặn | Vì sao |
|---|---|
| ≥ 3 buổi đã trôi qua | 1/2 hiện ra là "sụp 50%" nhưng thực chất chỉ là một ngày lỡ |
| ≥ 2 ngày còn lại | Nhắc vào ngày cuối tuần kế hoạch là trách móc, không phải nhắc — không còn gì để làm |
| Mục "Plan check-ins" trong Settings | Người dùng tắt được; mặc định bật |

**Ba điều đáng ghi lại:**

1. **Một lỗi thật suýt lọt.** Index chống trùng ban đầu tôi viết là *partial* (`where dedupe_key is not null`) vì nó diễn đạt đúng ý định hơn. Nhưng Postgres chỉ suy ra được partial index khi `ON CONFLICT` lặp lại đúng predicate, mà `onConflict` của supabase-js chỉ nhận tên cột — nên **mọi insert đều ném lỗi**. Mock unit test không bắt được (mock không kiểm conflict target); chỉ lộ ra khi thử trên Postgres thật. Bỏ predicate là đủ: `NULL` vốn khác nhau trong unique index, nên mọi `kind` cũ vẫn lặp tự do (đã kiểm chứng cả hai chiều).
2. **Không lặp lại N+1.** Sweep là 4 truy vấn gom lô, không phải vòng lặp theo user — tập ở đây là "mọi người có kế hoạch đang chạy", nên vòng lặp sẽ đúng hình dạng N+1 mà audit đã bắt ở `lib/calendar/push.ts`, lại nằm trên đường chạy không ai theo dõi. Có test khoá số round trip là hằng số với 25 user.
3. **Giới hạn đã biết, không giấu.** Ghép ngày cần timezone, mà cron không có "người xem" nào để lấy cookie timezone — nên nó dùng timezone của server. Với sinh viên ở múi giờ xa, một buổi học sát nửa đêm có thể rơi sang ngày bên cạnh, lệch `kept` một buổi. Cố tình **không** vá bằng cách nới lỏng phép ghép, vì để cái nhắc báo một con số khác với Weekly report còn tệ hơn.

**Phát hiện kèm theo (chưa sửa).** `weekly_report` và `focus_reminders` trong `notification_preferences` là **công tắc chết**: người dùng bật/tắt được trong Settings nhưng chúng không chặn bất cứ thứ gì. Đây là UI nói dối, nên xử lý riêng.

---

### Bước 3.3 — Màn hình "hôm nay" xuyên module

| Nguồn | Loại | Công sức |
|---|---|---|
| PROD-03 | Product | **L** |

**Luận điểm.** Mỗi module trả lời tốt câu hỏi của riêng nó. Câu hỏi hằng ngày — **"ba tiếng tới tôi thực sự làm gì"** — hiện chỉ được Dashboard trả lời một phần, vì nó chưa gộp lớp học + deadline + phiên học đã lên kế hoạch vào một dòng thời gian.

---

### Bước 3.4 — Onboarding phải thiết lập những trường đang chặn tính năng

| Nguồn | Loại | Công sức |
|---|---|---|
| PROD-04 | Product / activation | **M** |

**Luận điểm.** `weekly_availability_hours`, `target_gpa` và `program_total_credits` đều **chặn tính năng thật**: AI Planner từ chối chạy nếu không có availability; thẻ "On track" của GPA không render nếu thiếu tổng tín chỉ. Sinh viên bỏ qua onboarding sẽ gặp vài thẻ chết mà **không được giải thích tại sao**.

> **Đính chính (2026-08-05, khi bắt tay làm).** Vế đầu sai. `OnboardingWizard.tsx` có `STEPS = ["Availability", "Course", "First task"]` và **thu `weekly_availability_hours` ngay ở bước 1**, nên AI Planner chưa bao giờ bị chặn vì lý do này. Chỉ `target_gpa` và `program_total_credits` là không được hỏi ở đâu cả, và ngõ cụt thật vì thế thu lại còn đúng một chỗ: thẻ "On track".

**Đề xuất.** Onboarding thu ba trường này, hoặc mỗi thẻ bị chặn tự nói ra thứ nó đang thiếu kèm link tới đúng chỗ điền.

**Đã làm.** Vế thứ hai. `OnTrackSetupCard` chiếm đúng ô của thẻ "On track" khi thiếu trường, nêu **đích danh** trường nào đang thiếu (một hay cả hai, chia số ít/số nhiều) và link thẳng tới `/settings#study-preferences`. Xác minh hai chiều trên dữ liệu thật: xoá `program_total_credits` → thẻ setup hiện đúng nội dung; trả lại giá trị cũ (40) → thẻ "On track" thật quay lại. 5 test component, có chứng minh bắt được regression.

**Chưa làm.** Đưa hai trường này vào onboarding. Đó là quyết định sản phẩm: onboarding hiện có 3 bước, thêm trường sẽ kéo dài luồng đăng ký để đổi lấy một thẻ mà nhiều sinh viên có thể không cần.

---

### Bước 3.5 — Quyết định về phân biệt "Submitted" và "Completed"

| Nguồn | Loại | Công sức |
|---|---|---|
| PROD-05 | Product / data model | **M** |

**Luận điểm.** Bản thiết kế Weekly report hiện cả hai nhãn, nhưng schema chỉ ghi `completed_at`. Giao diện hiện đang ghi "Completed" cho mọi dòng — **trung thực, nhưng mất đi sắc thái mà thiết kế muốn có**.

**Cần quyết.** Nếu sự phân biệt này quan trọng với sinh viên thì cần thêm cột. Nếu không, nên bỏ nó khỏi bản thiết kế. **Không nên bịa nhãn từ dữ liệu không tồn tại.**

---

# Phụ lục — Những mục KHÔNG cần làm

Ghi lại để không ai tưởng đây là việc bị bỏ sót.

| Mục | Lý do |
|---|---|
| **UX-03** — hai thẻ cùng tên "Predicted grades" | **Đã sửa** trong đợt làm việc hôm nay (đổi thành "Course predictions"). |
| **SEC-03** — salt cố định trong KDF token lịch | **Chấp nhận được như hiện tại.** Salt cố định chỉ làm yếu KDF khi đầu vào là mật khẩu entropy thấp; ở đây đầu vào là secret server entropy cao. IV ngẫu nhiên mỗi token và auth tag GCM mới là phần quan trọng, và cả hai đều đúng. **Ghi lại để một reviewer sau này không "sửa" nó và làm hỏng việc giải mã mọi token đang có.** Hậu tố `v1` trong salt đã lường trước tình huống này. |
| **PERF-04** — số đo hiệu năng | Chỉ là **đường cơ sở**, không phải lỗi. Lưu ý: đây là số localhost, **không phải field data** — không throttle mạng, không thiết bị thật, không CDN. |

---

## Bảng tổng hợp

| Phần | Số bước | Tổng công sức | Có gì đang hỏng không? |
|---|---|---|---|
| **Phần 1 — Lỗi thật** | 5 | 3×S + 2×M | Có — vi phạm chuẩn đo được |
| **Phần 2 — Nâng cấp** | 11 | 6×S + 5×M | Không — thiếu lớp bảo vệ |
| **Phần 3 — Tính năng** | 5 | 3×M + 2×L | Không — chưa tồn tại |

**Nhắc lại:** báo cáo không có P0 hay P1. Không mục nào là khẩn cấp. Nếu chỉ làm được hai việc, hãy làm **Bước 2.1** (chốt 70 file) và **Bước 2.2** (thêm CI) — chúng bảo vệ mọi thứ còn lại.
