# UniPilot AI — Design Gap Review (bản build hiện tại vs. concept đã duyệt)

**Ngày review:** 2026-08-03
**Người review:** Designer pass, đối chiếu 1:1
**Bản gốc (source of truth):** `docs/design-concepts/00..09-*.png`
**Bản build:** `docs/screenshots/pixel-match-*.png` (chụp 2026-08-03, 19:47–20:39)
**Spec:** `docs/UNIPILOT_CLAUDE_PIXEL_MATCH_BUILD_SPEC.md`

---

## 0. Kết luận nhanh

**Chưa đạt pixel-match.** Ước lượng độ khớp tổng thể: **~55–60%**.

Phần **kiến trúc** đã đúng ở hầu hết màn: shell (sidebar eggplant + capsule lime + top bar trắng),
bảng màu, bố cục bento 2 cột, và **toàn bộ 8 file mascot đã được nối đúng chỗ**
(`lib/pilo-mascots.ts` + 9 điểm dùng trong `components/`). Đây là phần khó nhất và nó đã xong.

Phần **chưa đạt** nằm ở lớp chi tiết thị giác — thứ tạo ra cảm giác "Gen Z" của bản concept:

| Nhóm lỗi                                                                     | Mức độ                       |
| ---------------------------------------------------------------------------- | ---------------------------- |
| Thiếu icon chip có nền tint (concept dùng ở gần như mọi metric card)         | 🔴 Nặng — ảnh hưởng cả 9 màn |
| Card metric bị làm trắng phẳng thay vì tint theo màu (mint/rose/lime/violet) | 🔴 Nặng                      |
| Sai vị trí / sai loại control (nút, tab, filter, segmented)                  | 🟠 Vừa                       |
| Thiếu hẳn một số block đã có trong concept                                   | 🟠 Vừa                       |
| Sai type scale (số liệu quá nhỏ so với concept)                              | 🟡 Nhẹ nhưng khắp nơi        |

> ### ⚠️ Lưu ý quan trọng về phương pháp
>
> Ảnh chụp hiện tại dùng **tài khoản E2E gần như rỗng** (1 course, 0 grade, 0 class,
> 0 overdue, chưa có plan). Vì vậy nhiều block **đã được code nhưng không render** —
> ví dụ `PredictedGrades`, `PredictedScenarios`, `GpaTrendChart`, `CourseBreakdown`,
> `CompletedRows`, `WeekTimeGrid` đều tồn tại trong repo.
>
> Trong tài liệu này mọi mục đều được gắn nhãn:
>
> - **[THIẾU]** — không có trong code, phải viết mới
> - **[SAI]** — có trong code nhưng thể hiện khác concept, phải sửa style/layout
> - **[?]** — chưa kiểm chứng được vì dữ liệu rỗng, cần seed lại rồi chụp lại
>
> **Việc đầu tiên cần làm:** seed một tài khoản demo giống concept (6 courses, ~8
> assignments trong đó 2 overdue, 3 semester grades, 1 draft plan, lịch học 1 tuần,
> vài focus session) rồi chụp lại toàn bộ 9 màn ở **1701 × 925**. Không có bước này
> thì không thể xác nhận pixel-match.

---

## 1. Shell dùng chung (áp dụng cho cả 9 màn)

| #   | Vấn đề                    | Concept                                                                                                                         | Hiện tại                                                                       | Loại           |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------- |
| G1  | **Icon trong sidebar**    | Mỗi mục nav có icon line 20px bên trái (grid, file, sparkle, calendar, book, clock, chart, warning, doc, gear)                  | Chỉ có text, không icon                                                        | **[THIẾU]**    |
| G2  | Logo mark                 | Pilo chiếm gần hết ô trắng bo góc 40px, nét rõ                                                                                  | Ảnh render ~31px, trông nhỏ và mờ trong ô                                      | **[SAI]**      |
| G3  | Bề rộng sidebar           | ~215–228px                                                                                                                      | 245px                                                                          | **[SAI]** nhẹ  |
| G4  | Đáy sidebar               | Không có block email/sign-out lộ ra                                                                                             | Có block `e2e-tests@unipilot.local` + nút "Sign out" bị chữ cắt cụt ("gn out") | **[SAI]**      |
| G5  | **Icon chip có nền tint** | Motif chủ đạo: ô bo tròn/vuông màu nhạt bọc icon, dùng ở metric card, evidence row, notification row, course-load, plan-health… | Gần như không nơi nào có                                                       | **[THIẾU]** 🔴 |
| G6  | Type scale số liệu        | Số metric to, đậm, display font (~32–40px)                                                                                      | Nhiều chỗ chỉ ~20–24px, đọc như text thường                                    | **[SAI]**      |
| G7  | Badge thông báo           | Chuông có badge đỏ "9+"                                                                                                         | Chuông trơn, không badge                                                       | **[SAI]**      |

---

## 2. Assignments — `01-assignments.png`

**Khớp: ~50%.** Đây là màn lệch nhiều nhất về _anatomy của row_.

### Đã đúng

- Section `Needs attention` (tone coral) và `Due this week` đã tồn tại trong
  `components/assignments/AssignmentSection.tsx` với `tone="attention"` + `bg-coral-tint`.
- `PiloPickCard` dùng đúng mascot `pilo-assignments.png`.
- `AssignmentWeekProgress` đã có ProgressRing + `tasks`/`completed` thật.

### Chưa đúng

| #   | Vấn đề             | Concept                                                                                                                            | Hiện tại                                                                                | Loại            |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------- |
| A1  | **Cấu trúc row**   | Ô check tròn viền màu → tiêu đề → dòng 2 `course · due` → badge trạng thái **bên phải** → **số % to, có màu** → progress bar → `⋯` | Badge trạng thái nằm **dưới tiêu đề**; % nhỏ màu xám; progress bar bé xíu dồn sang phải | **[SAI]** 🔴    |
| A2  | Màu progress       | Bar đổi màu theo trạng thái: coral (overdue), amber (high priority), violet (in progress)                                          | Bar xám đồng nhất                                                                       | **[SAI]**       |
| A3  | Icon section       | `Needs attention` có icon ⚠ tròn coral; `Due this week` có icon lịch nền violet nhạt                                               | Không có icon                                                                           | **[THIẾU]**     |
| A4  | Nút "Hide"         | Concept không có                                                                                                                   | Có link "Hide" ở mọi section                                                            | **[SAI]**       |
| A5  | Toolbar filter     | Chip có **icon** (lịch / lịch / lịch / check), chip đang chọn = **nền violet nhạt + viền violet + chữ violet**                     | Chip không icon, chip đang chọn = **nền violet đặc chữ trắng**                          | **[SAI]**       |
| A6  | Ô search           | Có icon kính lúp bên trong                                                                                                         | Không có icon                                                                           | **[THIẾU]**     |
| A7  | Nút Filter         | Pill trắng có viền + icon phễu, tách rời bên phải                                                                                  | Pill xám phẳng, không icon                                                              | **[SAI]**       |
| A8  | Nút Add assignment | Violet + icon `+`                                                                                                                  | Violet, không icon                                                                      | **[SAI]**       |
| A9  | **Pilo's pick**    | Mascot **bên trái**, tiêu đề + copy **bên phải mascot**, CTA lime full-width dưới cùng                                             | Mascot + tiêu đề nằm cùng hàng trên, copy xuống dòng dưới cả hai → mất bố cục 2 cột     | **[SAI]** 🔴    |
| A10 | **Quick wins**     | Card trắng, các dòng gợi ý có **icon check nền lime** + chevron `›`                                                                | Đang là **"Quick actions"** với 3 nút bấm xếp dọc — sai hẳn component                   | **[THIẾU]** 🔴  |
| A11 | Sparkle decor      | Có 3 tia lấp lánh quanh Pilo trong card violet                                                                                     | Không có                                                                                | **[THIẾU]** nhẹ |

---

## 3. AI Planner — `02-ai-planner.png`

**Khớp: ~60%.** Xem `pixel-match-planner-state-check.png` (bản có draft) để đối chiếu.

| #   | Vấn đề                 | Concept                                                                                                                                                                                                 | Hiện tại                                                                                                               | Loại          |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- |
| P1  | **Vị trí CTA hero**    | Nút lime `Review & confirm` nằm **dưới dòng summary**, canh trái theo cột nội dung                                                                                                                      | Nút bị đẩy sang **mép phải hero**, kèm link "Cancel draft" bên dưới                                                    | **[SAI]** 🔴  |
| P2  | Kích thước mascot hero | Pilo lớn, chân chạm mép dưới hero, cao ~220px                                                                                                                                                           | Nhỏ hơn rõ, nổi giữa khoảng trắng                                                                                      | **[SAI]**     |
| P3  | Nút header             | `Generate new plan` + icon sparkle ✦                                                                                                                                                                    | `Regenerate draft` / `Generate this week's plan`, không icon                                                           | **[SAI]**     |
| P4  | **Dải cảnh báo draft** | Nằm **dưới cùng trong card "Your week"**, gồm icon ⚠ + 2 dòng copy + **nút coral `Review & confirm plan`**                                                                                              | Là dải mỏng **phía trên** card, chỉ 1 dòng chữ, **không có nút**                                                       | **[SAI]** 🔴  |
| P5  | Tab ngày               | `Mon 3` (thứ trước, số sau), 7 tab **chia đều hết bề ngang**, có vạch ngăn                                                                                                                              | `3 Mon` (ngược thứ tự), tab dồn trái, có dot nhỏ phía trên                                                             | **[SAI]**     |
| P6  | Plan health            | 3 metric có **icon chip trắng** (lịch/đồng hồ/check), số rất to; vòng coverage dày nét, có caption `Great balance!`                                                                                     | Không icon chip, số nhỏ, vòng coverage là đường viền mờ rỗng                                                           | **[SAI]** 🔴  |
| P7  | **Timeline**           | Có **thanh dọc + node tròn** bên trái; mỗi session là card trắng có **vạch màu môn bên trái**, giờ xếp 2 dòng (`9:00 / – / 10:00`), badge loại `Assignment` bên phải, `AI reason:` in nghiêng, menu `⋯` | Không có thanh/node; giờ nằm 1 dòng; không có vạch màu; dùng 2 nút icon (bút / X) thay cho `⋯`; badge loại đặt sai chỗ | **[SAI]** 🔴  |
| P8  | Pilo's note            | 2 dòng copy + **nét vẽ nguệch ngoạc** trang trí bên phải                                                                                                                                                | 1 dòng, không có nét vẽ                                                                                                | **[SAI]** nhẹ |
| P9  | Availability           | 3 trạng thái: Morning (mint) / Afternoon-Evening (amber) / **Low energy (coral)**; hàng hôm nay có pill `Today`; trục `08 12 16 20`                                                                     | Chỉ **2 trạng thái**, không có coral; không có pill `Today`; trục `8 12 16 20`                                         | **[SAI]**     |

---

## 4. Schedule — `03-schedule.png`

**Khớp: ~45%.** Lệch nhiều về bố cục header và card ngày.

| #   | Vấn đề                                 | Concept                                                                                                          | Hiện tại                                                                                                       | Loại                |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------- |
| S1  | **Header**                             | `+ Add event` (violet) + `Sync Google Calendar` (trắng, có logo Google) ở **góc trên phải, cùng hàng với title** | `Add course` + `New event` nằm **hàng dưới, bên trái**; không có nút Sync ở header                             | **[SAI]** 🔴        |
| S2  | **Vị trí view switcher**               | Day/Week/Month + `‹ Today ›` + nhãn `Aug 3–9, 2026` nằm **bên trong header của card lịch**                       | Nằm **ngoài card**, ở hàng header trang                                                                        | **[SAI]** 🔴        |
| S3  | Card "Next class"                      | Có **ô icon môn học màu** (mint), tên môn to, giờ, phòng, và **pill lime `In 45 min`**                           | Chỉ có text `NEXT CLASS` + 1 dòng, không icon (pill `In … min` có trong code nhưng không thấy vì rỗng dữ liệu) | **[SAI]** / **[?]** |
| S4  | Metric `classes today` / `free blocks` | Mỗi card có **icon chip tròn** (sách violet nhạt / lịch mint) + dòng phụ (`Across 3 courses`, `2h 30m total`)    | Không icon chip                                                                                                | **[THIẾU]**         |
| S5  | **Card "Today" bên phải**              | **Nền eggplant tối**, chữ trắng, dot màu theo môn, và nút lime `▶ Start focus` **full-width dưới cùng**          | `bg-card` — **nền trắng**; `Start focus` là pill lime nhỏ **trên header**                                      | **[SAI]** 🔴        |
| S6  | Card "Free time"                       | Card riêng: `2h 30m available this week` + progress bar + `2 blocks remaining`                                   | **Không có**                                                                                                   | **[THIẾU]**         |
| S7  | Dòng Google Calendar                   | Có logo Google + `Last synced 2 min ago` + **check tròn xanh** bên phải                                          | Dòng text trơn + nút violet                                                                                    | **[SAI]**           |
| S8  | Lưới tuần                              | Có đường current-time đỏ kèm nhãn `9:45 AM`, block môn màu, marker deadline riêng                                | Lưới rỗng — `WeekTimeGrid` có tồn tại                                                                          | **[?]** cần seed    |

---

## 5. Courses — `04-courses.png`

**Khớp: ~50%.**

| #   | Vấn đề                 | Concept                                                                                                                                            | Hiện tại                                                                                   | Loại         |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------ |
| C1  | **Card có accent màu** | Nền card **tint nhạt theo màu môn** + viền cùng màu; badge mã môn cùng màu; progress bar cùng màu                                                  | `border-2 tone.border/70 bg-card` — **chỉ viền có màu, nền luôn trắng**; badge luôn violet | **[SAI]** 🔴 |
| C2  | Layout card            | `Progress` + `NN%` nằm **cùng hàng trên bar**; hàng deadline có **icon lịch nền tint**                                                             | Bố cục gần đúng nhưng icon lịch là emoji/glyph nhỏ, không có nền tint                      | **[SAI]**    |
| C3  | Badge assignments      | Pill có **icon clipboard** + `4 assignments`; trạng thái xong = pill xanh `✓ All caught up`                                                        | Pill chữ trơn, không icon                                                                  | **[SAI]**    |
| C4  | Nút Add course         | Violet đặc + icon `+`                                                                                                                              | Nút text nhạt, không nền, không icon                                                       | **[SAI]**    |
| C5  | Bộ lọc                 | 2 **dropdown**: `📅 Semester 253 ⌄` và `⚙ All courses ⌄`, style pill trắng viền                                                                    | 3 **chip** (All / Needs attention / All caught up) + 1 `<select>` mặc định của trình duyệt | **[SAI]**    |
| C6  | **Course load**        | Icon chip violet + `20 assignments total` + `6 due this week` + **thanh nhiều đoạn màu** (mỗi môn 1 đoạn) + caption `Balanced across your courses` | Thanh **1 màu violet liền**, không phân đoạn                                               | **[SAI]** 🔴 |
| C7  | Grid                   | 3 cột trên desktop rộng                                                                                                                            | Chỉ 1 course nên chưa xác nhận được                                                        | **[?]**      |

---

## 6. Focus timer — `05-focus-timer.png`

**Khớp: ~40%.** Màn lệch nhiều thứ hai.

| #   | Vấn đề                | Concept                                                                                                                                | Hiện tại                                                                                                                                             | Loại           |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1  | Bộ chọn task          | Label `What are you working on?`, control là **pill trắng bo tròn có icon môn + chevron**                                              | Label `Assignment`, dùng `<select>` mặc định                                                                                                         | **[SAI]**      |
| F2  | Hàng Duration         | **Không có** trên concept (25/45/60 nằm ở Settings)                                                                                    | Có hàng segmented `25m / 45m / 60m` chiếm chỗ ngay trên đồng hồ                                                                                      | **[SAI]**      |
| F3  | **Mascot**            | Pilo đeo tai nghe + laptop + cây, cao ~180px, đặt bên phải vòng đồng hồ                                                                | Render rất nhỏ (~60px) và tối màu — **sai tỉ lệ nghiêm trọng**                                                                                       | **[SAI]** 🔴   |
| F4  | Caption vòng          | `FOCUS SESSION`                                                                                                                        | `FOCUS TIMER`                                                                                                                                        | **[SAI]** nhẹ  |
| F5  | Nút chính             | `▶ Start focus` (có icon)                                                                                                              | `Start`                                                                                                                                              | **[SAI]**      |
| F6  | **Hàng control dưới** | 3 pill trắng: `☕ Short break 5m`, `🛋 Long break 15m`, `♫ Lo-fi · Off ⌄`                                                               | **Không có** (logic break đã có trong `FocusTimer.tsx` nhưng chưa lộ ra ở trạng thái idle)                                                           | **[THIẾU]** 🔴 |
| F7  | Footnote              | `🔔 Notifications will stay quiet while you focus.`                                                                                    | **Không có**                                                                                                                                         | **[THIẾU]**    |
| F8  | Card "This week"      | 3 metric có **icon chip tròn** (khối/đồng hồ/lửa) + số rất to; lưới Mon–Sun mỗi ngày **2 ô vuông nhỏ màu theo cường độ**; legend 5 mức | Không icon chip; mỗi ngày là **1 thanh violet dài giống hệt nhau** → legend 5 màu trở nên vô nghĩa; thêm dòng `By assignment` không có trong concept | **[SAI]** 🔴   |
| F9  | Today's goal          | Số `2 of 4 cycles` rất to màu lime + **huy hiệu cờ tròn lớn** bên phải                                                                 | Chữ nhỏ, cờ là glyph tí hon                                                                                                                          | **[SAI]**      |
| F10 | **Focus history**     | Card riêng: 3 thẻ session cuộn ngang (icon chip, `Today, 10:30 AM`, tên task, `⏱ 25:00`, badge `Focus`) + link `View all history`      | **Không có component nào**                                                                                                                           | **[THIẾU]** 🔴 |
| F11 | **Learning rhythm**   | Biểu đồ **phút theo từng ngày trong tuần** (Mon–Sun), trục 0–60m, link `This week`                                                     | Đang là `Learning stats` — **phút theo tuần, 8 tuần gần nhất**. Sai đơn vị trục hoàn toàn                                                            | **[SAI]** 🔴   |
| F12 | Bảng thừa             | Concept không có                                                                                                                       | Có bảng `COURSE / TIME / GRADE` ở cuối trang                                                                                                         | **[SAI]**      |

---

## 7. GPA tracker — `06-gpa-tracker.png`

**Khớp: ~45%** (nhiều block bị ẩn do 0 grade — cần seed rồi review lại).

| #   | Vấn đề                     | Concept                                                                                                                                                               | Hiện tại                                                                                      | Loại           |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| GP1 | **Card "On track" (mint)** | Card mint riêng cạnh hero: check tròn đen, `You need a 3.72 average across your remaining credits`, progress bar, `62% of credits completed` / `15 credits remaining` | **Không có.** Comment trong `GpaHero.tsx` nói schema thiếu `total-program-credits` nên đã bỏ  | **[THIẾU]** 🔴 |
| GP2 | Bố cục hero                | `3.46 /4.0` rất to **bên trái**, vòng `Target 3.60` **bên phải**                                                                                                      | Vòng target **bên trái**, số GPA bên phải — **đảo ngược**                                     | **[SAI]** 🔴   |
| GP3 | Header                     | `Add grade` (violet + `+`) cùng hàng title, subtitle ngay dưới title                                                                                                  | Subtitle và nút bị tách xuống hàng riêng, nút không có `+`                                    | **[SAI]**      |
| GP4 | Course breakdown           | Bảng: icon môn màu, cột `Credits`, badge chữ điểm (`A-`,`B`,`B+`,`A`) + số, cột `Contribution` có bar + %, `⋯`                                                        | Component có tồn tại — chưa render được                                                       | **[?]**        |
| GP5 | GPA trend                  | Bar + line, đường target nét đứt, nhãn giá trị `3.18 / 3.32 / 3.46` với giá trị cuối bọc **chip violet**                                                              | Component có tồn tại — chưa render được                                                       | **[?]**        |
| GP6 | Predicted grades           | 3 card viền màu (coral / violet / mint) mỗi card có **sparkline nhỏ** + caption giả định                                                                              | `PredictedGrades` + `PredictedScenarios` có tồn tại — chưa render                             | **[?]**        |
| GP7 | What-if simulator          | 2 input + **nút tròn đen `▸`** + **panel trắng kết quả** `Required average 3.72 across remaining credits`                                                             | Có input, **thiếu nút `▸`**, phần kết quả là dòng chữ trong hộp trắng không có type scale lớn | **[SAI]**      |
| GP8 | Pilo insight               | Card trắng dưới breakdown: Pilo GPA ~96px bên trái, tiêu đề violet `Pilo insight`, 2 dòng copy                                                                        | `PiloGpaInsight` có tồn tại — chưa render vì không có grade                                   | **[?]**        |

---

## 8. Workload risk — `07-workload-risk.png`

**Khớp: ~75% — màn tốt nhất.**

| #   | Vấn đề                  | Concept                                                                                                            | Hiện tại                                                                                                       | Loại          |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------- |
| R1  | **3 chỉ số trong hero** | Mỗi chỉ số: số to + **5 ô pill phân đoạn màu theo mức** + nhãn mức (`Moderate` / `High` / `Low`)                   | Chỉ có số + **hệ số `×0.40`** (thứ nội bộ, không có trong concept); không có pill phân đoạn, không có nhãn mức | **[SAI]** 🔴  |
| R2  | Thanh score             | Thanh **chia đoạn rời** (~9 block) + **mũi tên ▼ chỉ vị trí phía trên**                                            | Thanh gradient liền + vạch trắng mỏng                                                                          | **[SAI]**     |
| R3  | Evidence rows           | Icon **chip tròn lớn có nền tint**; **tiêu đề có màu** (coral/amber/mint); có **4–5 chấm cường độ** bên phải badge | Icon vuông tí hon; tiêu đề đen; **không có chấm cường độ**                                                     | **[SAI]**     |
| R4  | Pilo suggestion         | Copy **thụt vào bên phải mascot**, mascot chiếm cột trái, CTA lime bên phải dưới                                   | Copy chiếm full-width phía trên, mascot dưới trái → chữ và mascot không tạo thành 2 cột                        | **[SAI]**     |
| R5  | A lighter week          | **3 dòng**, icon **viền tròn** (check / đồng hồ / lịch)                                                            | **2 dòng**, icon đặc khác kiểu                                                                                 | **[SAI]** nhẹ |
| R6  | 7-day trend             | Line violet + **nhãn số tại từng điểm** + đường threshold coral nét đứt + trục 0/60/100                            | Có component; ảnh bị cắt dưới màn — cần chụp lại full-page                                                     | **[?]**       |
| R7  | Nút Refresh             | Nằm **góc trên phải trang**, pill trắng viền                                                                       | Nằm **bên trong hero tối**                                                                                     | **[SAI]**     |

---

## 9. Weekly report — `08-weekly-report.png`

**Khớp: ~45%.**

| #   | Vấn đề                       | Concept                                                                                                                                  | Hiện tại                                                                                        | Loại                |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------- |
| W1  | Header                       | Subtitle ngay dưới title; **2 nút**: `‹ Previous week` (trắng) + `This week` (violet)                                                    | Chỉ có `‹ Previous week`; **thiếu nút `This week`**; subtitle bị đẩy xa title                   | **[SAI]**           |
| W2  | **Vòng mục tiêu trong hero** | **Cung tròn hở lớn** (half-donut) lime/đen: `325` / `/ 400 min` / `Weekly goal`                                                          | Vòng tròn mờ nhỏ ghi `2% OF AVAILABLE TIME` — **sai hẳn kiểu đồ hoạ và sai thông điệp**         | **[SAI]** 🔴        |
| W3  | Headline hero                | `You kept showing up.` cỡ rất lớn (~44px)                                                                                                | `Good progress this week.` nhỏ hơn nhiều                                                        | **[SAI]**           |
| W4  | **4 metric card**            | Nền **tint** (mint / rose / lime / violet) + **icon chip tròn** (check/đồng hồ/lửa/biểu đồ) + delta ↑↓ có màu                            | **4 card trắng phẳng**, label in hoa xám, không icon, không tint                                | **[SAI]** 🔴        |
| W5  | Study rhythm                 | Có **trục y 0–120 + gridline**, nhãn số trên từng cột, và **`Where your time went` nằm TRONG cùng card** với 3 legend môn + % + mini bar | Không trục/gridline; `Where your time went` là **card riêng bên dưới**                          | **[SAI]** 🔴        |
| W6  | Plan adherence               | Lime, `80%` cực to, `4 of 5 planned sessions completed`, **hình bia + mũi tên lớn** bên phải                                             | Dải lime mỏng chỉ có 1 dòng chữ + glyph bia tí hon                                              | **[SAI]** 🔴        |
| W7  | This week's win              | Pilo ~110px bên trái, copy ngắn, **tên bài in đậm màu violet**                                                                           | Pilo nhỏ hơn, copy dài tràn dòng                                                                | **[SAI]**           |
| W8  | Worth a look                 | Card **amber tint** + icon ⚠ chip + `Software Testing is due soon` + chevron                                                             | Code có (`reports/page.tsx:275`) nhưng render ra chưa thấy tone amber/icon/chevron              | **[SAI]** / **[?]** |
| W9  | Activity list                | 3 dòng: chip check xanh, `Submitted`/`Completed`, tên bài, dot màu + tên môn, timestamp, chevron `›`                                     | `CompletedRows` khớp cấu trúc; **cố ý chỉ dùng một nhãn `Completed`** — xem quyết định bên dưới | **[ĐÃ QUYẾT]**      |

> **Quyết định về `Submitted` vs `Completed` (PROD-05, chốt 2026-08-05).**
> **Không thêm cột.** Mẫu thiết kế vẽ hai nhãn, nhưng schema chỉ có một trạng thái kết thúc (`assignment_status = 'done'` + `completed_at`), nên bất kỳ nhãn "Submitted" nào hiện giờ cũng là **bịa ra từ dữ liệu không tồn tại**.
>
> Lý do không thêm: với sinh viên, "làm xong" và "nộp" gần như luôn là cùng một khoảnh khắc. Tách đôi trạng thái kết thúc buộc họ phải duy trì một phân biệt mà đa số sẽ không duy trì — và một phân biệt không được duy trì thì sinh ra **nhãn sai**, tệ hơn hẳn một nhãn đúng. Nó cũng buộc phải rà lại mọi chỗ đang kiểm `status = 'done'` (đếm KPI, weekly report, risk, planner).
>
> Vì vậy `CompletedRows` giữ đúng một nhãn. Đây là chênh lệch **có chủ đích** so với mẫu, không phải thiếu sót — đừng "sửa" nó cho khớp ảnh.
>
> Nếu sau này thật sự cần: thêm `submitted_at timestamptz` (một cột mốc thời gian, **không** thêm giá trị enum), để mọi thứ đang kiểm `'done'` không phải đổi.

---

## 10. Settings — `09-settings.png`

**Khớp: ~40%.** Sai nhiều nhất ở **cấu trúc lưới**.

| #    | Vấn đề                | Concept                                                                                                                                       | Hiện tại                                                                               | Loại         |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------ |
| ST1  | **Lưới nội dung**     | Bên phải là **bento 2 cột**: Profile full-width; rồi `Study preferences \| Appearance`; rồi `Notifications \| (Connections + Data & privacy)` | `lg:grid-cols-[1fr_3fr]` → nav + **1 cột dọc duy nhất**, mọi card full-width xếp chồng | **[SAI]** 🔴 |
| ST2  | Nav trái              | Mỗi mục có **icon** (person/book/palette/bell/link/shield); mục đang chọn = **nền violet nhạt + chữ violet + vạch violet bên trái**           | **Không icon**; mục đang chọn = **pill violet đặc chữ trắng**                          | **[SAI]** 🔴 |
| ST3  | Subtitle              | `Make UniPilot work your way.` + **pill xanh `✓ Saved`**                                                                                      | Hiện email người dùng; không có pill Saved                                             | **[SAI]**    |
| ST4  | Card Profile          | Avatar + nút `Change avatar` **dưới avatar**; `Full name` và `Email` **2 cột cạnh nhau**; `Save changes` violet **bên phải**                  | Email là text tĩnh, Full name ở dưới, Save ở dưới trái; **không có `Change avatar`**   | **[SAI]** 🔴 |
| ST5  | Study preferences     | `Weekly availability` hiển thị **`18 hours` cỡ lớn màu violet** + hàng chip Mon–Sun ngay dưới                                                 | Là **ô input số** thường, không có con số lớn; chip ngày nằm tận cuối card             | **[SAI]**    |
| ST6  | Default focus session | Segmented 3 nút, nút chọn = **nền violet chữ trắng**                                                                                          | Segmented trên **nền xám**, nút chọn là **thẻ trắng** — đảo ngược tương phản           | **[SAI]**    |
| ST7  | Appearance            | **3 tile lớn** (Light/Dark/System) có icon, tile chọn = **viền violet + check tròn góc trên phải**, kèm caption giải thích                    | `AppearanceCard` có tồn tại — chưa xác nhận có đúng dạng tile                          | **[?]**      |
| ST8  | Notifications         | 4 dòng, mỗi dòng có **icon chip vuông tint** + tiêu đề + mô tả + **toggle switch**                                                            | Component có — chưa xác nhận có icon chip                                              | **[?]**      |
| ST9  | Connections           | Logo Google Calendar + mô tả + **pill xanh `✓ Connected`** + nút **viền violet `Manage`**                                                     | Component có — chưa xác nhận style                                                     | **[?]**      |
| ST10 | Data & privacy        | `Export my data` (icon download + chevron) và **`Delete account` nền coral tint** + icon thùng rác + chevron                                  | Component có — chưa xác nhận style                                                     | **[?]**      |

---

## 11. Thứ tự ưu tiên sửa

### Bước 0 — Bắt buộc trước mọi việc

- [ ] Seed tài khoản demo đầy đủ (6 courses, 8 assignments / 2 overdue, 3 semester grades, 1 draft plan, lịch tuần, focus history)
- [ ] Chụp lại 9 màn ở **1701 × 925**, full-page
- [ ] Re-review các mục **[?]** ở trên

### Đợt 1 — Sửa hệ thống, ảnh hưởng mọi màn (lãi nhất)

1. **G5** Tạo primitive `IconChip` (nền tint + icon) và áp vào mọi metric card / evidence row / notification row
2. **G1** Thêm icon cho sidebar nav
3. **G6** Chuẩn hoá type scale cho số liệu (display font, 32–40px)
4. **W4 / S4 / C3 / P6 / F8** Áp `IconChip` + nền tint cho toàn bộ metric card

### Đợt 2 — Sai cấu trúc (phải đổi layout)

5. **ST1** Settings → bento 2 cột
6. **A1 + A2** Assignments row anatomy (badge sang phải, % to có màu, bar đổi màu)
7. **P7** Planner timeline (thanh dọc + node + vạch màu môn)
8. **S1 + S2** Schedule header + đưa view switcher vào trong card
9. **S5** Card "Today" đổi sang nền eggplant tối
10. **GP2** Đảo hero GPA (số bên trái, vòng target bên phải)

### Đợt 3 — Block còn thiếu

11. **A10** Quick wins (thay Quick actions)
12. **F6 + F7** Hàng control break/audio + footnote notification
13. **F10** Focus history cards
14. **F11** Learning rhythm → đổi trục sang phút/ngày trong tuần
15. **S6** Card Free time
16. **GP1** Card "On track" mint — _cần bàn:_ schema chưa có tổng tín chỉ chương trình, phải thêm field hoặc suy ra từ dữ liệu khác
17. **W2** Cung tròn mục tiêu trong hero Weekly report
18. **W6** Plan adherence với `80%` lớn + hình bia
19. **ST4** Change avatar + bố cục 2 cột trong Profile

### Đợt 4 — Tinh chỉnh

20. **A5–A8, C4, C5, GP3, P3** Icon cho nút/filter, đổi `<select>` sang dropdown custom
21. **R1–R3** Pill phân đoạn + chấm cường độ + tiêu đề có màu ở Workload risk
22. **G2, G3, G4, G7** Logo mark, bề rộng sidebar, khối sign-out, badge chuông
23. **P8, A11** Trang trí (nét vẽ Pilo's note, sparkle)

---

## 12. Ghi chú về ràng buộc

Một số lệch là **cố ý và có lý do**, không nên sửa mù:

- **GP1** — `GpaHero.tsx` ghi rõ schema không có `total-program-credits`, nên card "On track"
  bị bỏ thay vì bịa số. Đây là quyết định đúng theo spec §2 (dữ liệu thật > hình ảnh).
  Muốn khớp concept thì phải **mở rộng schema trước**, không phải hard-code `15 credits remaining`.
- **F2** — hàng Duration `25m/45m/60m` xuất hiện thừa vì concept đặt nó ở Settings.
  Trước khi xoá cần chắc Settings đã ghi được `default focus duration` và Focus timer đọc đúng giá trị đó.
- **A4** — nút "Hide" không có trong concept nhưng là tính năng thật đang chạy.
  Cần hỏi lại: bỏ hẳn, hay giữ nhưng đổi sang dạng icon kín đáo hơn?
- Mọi số liệu trong concept (`3.46`, `80%`, `54/100`, `325 min`) là **dữ liệu minh hoạ**.
  Tuyệt đối không hard-code — spec §1 cấm rõ.
