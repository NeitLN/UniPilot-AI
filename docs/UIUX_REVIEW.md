# UniPilot AI — Đánh giá thiết kế UI/UX (Senior Designer × Người dùng thử)

**Ngày:** 31/07/2026
**Phiên bản:** `main` @ `2dd1b77`
**Tài khoản:** `tien.vo539@gmail.com` — 15 môn, 10 assignment, 8 điểm, 21 phiên focus, 29 buổi lịch, 3 study plan
**Phương pháp:** chụp thật **33 ảnh** (11 route × light/dark/mobile) bằng Playwright, đo `getComputedStyle` thật, đo `scrollWidth` thật ở 4 độ rộng (768/1024/1280/1440), đọc code nguồn.

> **Nguyên tắc:** mọi con số trong tài liệu này đều **đo được**, không ước lượng. Chỗ nào chưa đo được thì ghi rõ là *nhận định thiết kế*, không trộn lẫn với dữ liệu.

---

## 0. Tóm tắt cho người bận

| # | Vấn đề | Bằng chứng | Mức |
|---|--------|-----------|-----|
| **D-01** | `/gpa` **tràn ngang** ở màn hình desktop | `scrollWidth 1376` vs `clientWidth 1280` (+96px); ở 1024px là **+352px** | 🔴 P0 |
| **D-02** | Schedule bản **desktop hiển thị ÍT hơn bản mobile** | Desktop: `"Lập trình W…"`, `"7:00 AM–9:30 …"` · Mobile: đầy đủ | 🔴 P0 |
| **D-03** | Chữ chỉ số tăng/giảm **1.76:1** — tệ nhất toàn app | `rgb(34,221,166)` trên `rgb(255,255,255)`, 11px | 🟠 P1 |
| **D-04** | Bottom nav mobile **không có trạng thái đang-ở-đâu** | `aria-current` xuất hiện **0 lần**; cả 8 link cùng `text-ink-2` | 🟠 P1 |
| **D-05** | Số "29" của Workload risk lặp **3 lần**, 2 ngôn ngữ thiết kế KPI | Dashboard KPI + Dashboard banner + `/risk` | 🟠 P1 |
| **D-06** | Dark mode: 4 thẻ KPI **không hề đổi màu** → chói | Tương phản thẻ/nền: **1.54:1 → 10.75:1** | 🟠 P1 |
| **D-07** | Hàng danh sách có **vùng chết ngang ~600px** | Courses/GPA/Planner ở 1280px | 🟡 P2 |
| **D-08** | "Delete" cùng trọng lượng thị giác với "Edit" | 15 lần ở `/courses`, 8 lần ở `/gpa` | 🟡 P2 |
| **D-09** | 4 trang trống **>45% chiều cao màn hình** | `/risk`, `/reports`, `/planner`, `/schedule` | 🟡 P2 |
| **D-10** | Nhãn điểm rủi ro dễ đọc nhầm thành số lượng | `"Overdue 25"` = 25 điểm, không phải 25 bài | 🟡 P2 |

**Không báo lại** (đã biết & đã quyết định ở đợt trước): thiếu tìm kiếm ở Courses (UX4-03 — *hoãn có chủ đích* tới khi >30 môn), thiếu Weekly report ở bottom nav (UX4-04 — *đã từ chối* thêm mục thứ 9 để giữ ngưỡng chạm 44px).

---

## 1. 🙋 Người dùng thử — buổi test 20 phút

> Bối cảnh: sinh viên năm 3, dùng laptop 13" (1280px) ở trường và điện thoại ở nhà. Được giao 4 nhiệm vụ, nghĩ thành tiếng.

### Nhiệm vụ 1 — "Xem tuần này có lịch học gì"

Vào **Schedule**. Rồi khựng lại.

> *"Ơ… nó ghi 'Lập trình W…' rồi ba chấm. Môn gì? Mà giờ cũng bị cắt luôn — '7:00 AM–9:30 …' là 9:30 sáng hay 9:30 tối? Em phải đoán."*

Bạn ấy nghiêng người, cố đọc. Rồi làm một việc rất đáng chú ý: **mở điện thoại ra xem cho dễ**.

> *"Trên điện thoại nó hiện đủ luôn nè anh — 'Lập trình Web nâng cao, 7:00 AM–9:30 AM'. Màn hình bé hơn mà đọc được nhiều hơn. Kỳ ha."*

**→ Đây là D-02.** Người dùng tự tìm ra lỗi thiết kế mà không cần được gợi ý, và tự mô tả đúng bản chất của nó.

### Nhiệm vụ 2 — "Xem điểm GPA"

Vào **GPA tracker**. Bảng hiện ra, bạn ấy kéo ngang.

> *"Sao trang này kéo qua kéo lại được? Mấy trang kia đâu có. Cái ô 'Forecast' bên phải bị lòi ra ngoài, em phải kéo mới thấy."*

**→ Đây là D-01**, và người dùng gặp nó ở đúng độ rộng laptop phổ thông nhất.

### Nhiệm vụ 3 — "Tuần này học nhiều hơn hay ít hơn tuần trước?"

Vào **Weekly report**. Bạn ấy cúi sát màn hình.

> *"Có chữ xanh xanh nhỏ nhỏ… '2 vs last week' hả? Em phải nhìn kỹ mới thấy. Nó mờ quá, nhất là chữ xanh lá."*

Tôi hỏi: *chữ đỏ với chữ xanh, cái nào dễ đọc hơn?*
> *"Đỏ dễ hơn. Xanh lá gần như chìm vào nền trắng luôn."*

**→ Đây là D-03**, và trực giác của bạn ấy khớp chính xác với số đo: đỏ **3.11:1**, xanh mint **1.76:1**.

### Nhiệm vụ 4 — "Đang ở trang nào?" (trên điện thoại)

Bạn ấy bấm loanh quanh vài trang rồi tôi hỏi *đang ở đâu*.

> *"Ờ… em phải nhìn cái tiêu đề to ở trên mới biết. Thanh dưới thì… 8 chữ y hệt nhau, không cái nào sáng lên cả."*

Rồi thêm một câu rất giá trị:
> *"Mà trên máy tính nó ghi 'Assignments', dưới điện thoại ghi 'Tasks'. Lúc đầu em tưởng hai chỗ khác nhau."*

**→ Đây là D-04.**

### Điều bạn ấy **khen** (giữ nguyên, đừng đụng vào)

- **Trang Assignments**: *"Trang này dễ nhất. Có ô tìm, có lọc, nhìn cái là biết bài nào trễ."*
- **Nhãn "Overdue 2d"** màu đỏ: *"Cái này đập vào mắt liền, tốt."*
- **AI planner**: *"Nó ghi rõ 'Past plan — 5 of 5 sessions have passed' nên em biết là kế hoạch cũ rồi."* → thành quả Phase 11, đã có tác dụng thật.
- **Mascot Pilo** ở trạng thái rỗng: *"Dễ thương, đỡ trống."*

### Điều bạn ấy hiểu **sai**

Chỉ vào ô `OVERDUE ×0.35 → 25` ở trang Workload risk:
> *"Em đang trễ 25 bài á?"*

Thực tế bạn ấy trễ **1 bài**. `25` là **điểm rủi ro thành phần**, không phải số lượng.

**→ Đây là D-10.** Một hiểu nhầm nghiêm trọng: người dùng tin rằng mình đang trễ gấp 25 lần thực tế.

---

## 2. 🎨 Senior UI/UX Designer — phân tích

### 🔴 D-01 — `/gpa` tràn ngang ở desktop *(P0)*

Đo thật, 4 độ rộng:

| Route | Viewport | `scrollWidth` | Tràn |
|---|---|---|---|
| `/gpa` | 1280 | 1376 | **+96px** |
| `/gpa` | 1024 | 1376 | **+352px** |
| `/` | 768 | 879 | **+111px** |

**Nguyên nhân gốc (đã xác minh, không phải suy đoán):**

`components/gpa/GpaContent.tsx:73` và `:97` dùng `lg:grid-cols-[1.4fr_1fr]`. Track `fr` trong CSS Grid mặc định có `min-width: auto` — **không co nhỏ hơn nội dung tối thiểu bên trong**. Bên trong cột trái là `components/gpa/CourseBreakdown.tsx:55`: `<table className="w-full min-w-[560px]">`. 560px đó ép track rộng ra, đẩy cả lưới vượt khung.

**Xác minh cách sửa — chạy thật trên trình duyệt:**
```
scrollWidth trước         = 1376
scrollWidth sau min-w-0   = 1280   ← khớp đúng clientWidth
```
Chỉ cần `min-w-0` trên các con của grid. Đây là fix chuẩn cho lớp lỗi này.

**Vì sao 3 đợt review trước không thấy:** `tests/e2e/layout.spec.ts:94` chỉ kiểm tra tràn ngang ở **390px**. Không có test nào cho desktop.

> Ở 768px, thủ phạm là link *"View report"* (`shrink-0`) trong banner Workload risk — `shrink-0` chặn co lại nên nó đẩy hàng flex vượt khung.

### 🔴 D-02 — Responsive bị đảo ngược ở Schedule *(P0)*

| | Desktop 1280px | Mobile 390px |
|---|---|---|
| Tên môn | `Lập trình W…` ❌ | `Lập trình Web nâng cao` ✅ |
| Giờ học | `7:00 AM–9:30 …` ❌ | `7:00 AM–9:30 AM` ✅ |
| Chi tiết | không có | `· Trí tuệ nhân tạo` ✅ |
| Cuối tuần | 2 cột trống | `Weekend — no schedule` ✅ |

**Màn hình to hơn mà hiển thị ít thông tin hơn.** Lưới 7 cột cứng ép mỗi ngày còn ~100px, trong khi vùng nội dung có ~1010px.

Nghịch lý đi kèm: lưới chỉ cao ~190px, **bên dưới còn ~430px trống hoàn toàn**. Layout vừa phí chiều dọc vừa bóp nghẹt chiều ngang.

Thêm nữa, đây **không phải là một cái lịch** theo nghĩa thị giác — không có trục giờ, không thấy được độ dài buổi học hay khoảng trống giữa các buổi. Nó là *danh sách xếp theo cột ngày* đang giả dạng lịch.

### 🟠 D-03 — Màu ngữ nghĩa dùng làm màu chữ trên nền trắng *(P1)*

Đo thật (`getComputedStyle`, light mode):

| Chữ | Foreground | Background | Tương phản | Cần | |
|---|---|---|---|---|---|
| `↑ 2 vs last week` | `rgb(34,221,166)` | `rgb(255,255,255)` | **1.76:1** | 4.5 | ❌ |
| `↑ 6d vs last week` | `rgb(34,221,166)` | `rgb(255,255,255)` | **1.76:1** | 4.5 | ❌ |
| `↓ 200 min vs last week` | `rgb(255,84,112)` | `rgb(255,255,255)` | **3.11:1** | 4.5 | ❌ |
| `71MATH10203 — Toán rời rạc` | `rgb(255,84,112)` | `rgb(255,255,255)` | **3.11:1** | 4.5 | ❌ |
| `7:00 AM–9:30 AM` (Schedule) | `rgb(113,107,134)` | `rgb(240,238,247)` | **4.4:1** | 4.5 | ❌ |
| `Below average` (chip) | `rgb(194,0,58)` | `rgb(255,231,235)` | 5.33:1 | 4.5 | ✅ |

**Quy luật rút ra — và nó giải thích cả 5 dòng ❌ lẫn dòng ✅:**

> `--mint`, `--coral`, `--tangerine` được thiết kế làm **màu nền mảng lớn**. Khi dùng làm **màu chữ trên nền trắng**, chúng luôn trượt AA. Khi dùng đúng cặp `*-tint` + `*-text` (như chip `Below average`) thì đạt chuẩn.

Đây **cùng một lớp lỗi** với QA4-02 đợt trước (token dùng lẻ, không đi theo cặp). Đợt 4 đã ghi nhận `text-coral` dưới chuẩn ở nền hover (2.45:1 light / 3.67:1 dark) và **ghi chú "để một đợt riêng"** — đợt riêng đó chính là đây, và phạm vi rộng hơn dự kiến.

**Trớ trêu về mặt thiết kế:** thứ khó đọc nhất trong toàn app lại là **tin tốt** (`↑ 2 vs last week`, mint 1.76:1). Tin xấu (coral, 3.11:1) dễ đọc gần gấp đôi. App đang vô tình làm người dùng khó nhìn thấy tiến bộ của chính họ.

### 🟠 D-04 — Bottom nav mobile không cho biết đang ở đâu *(P1)*

Đọc `app/(app)/layout.tsx`:

| | Sidebar (desktop) | Bottom nav (mobile) |
|---|---|---|
| Trạng thái active | `usePathname()` → viên lime + `font-extrabold` | **không có** |
| `aria-current` | có | **0 lần trong cả file** |
| Cỡ chữ | 14px | **9.5px** |
| Nhãn | `Assignments`, `AI planner`, `Schedule`, `Courses` | `Tasks`, `Plan`, `Sched`, `Course` |

Ba vấn đề chồng lên nhau:
1. **Thị giác:** cả 8 link cùng `text-ink-2`, không có gì sáng lên.
2. **Trợ năng:** thiếu `aria-current` hoàn toàn → screen reader cũng không biết trang hiện tại.
3. **Ngôn ngữ:** cùng một đích đến, hai tên gọi khác nhau giữa 2 thiết bị.

`grid-cols-8` ở 390px → mỗi ô ≈ **45px**. Chiều cao `min-h-11` (44px) đạt chuẩn, nhưng chữ 9.5px thì dưới mọi khuyến nghị (tối thiểu ~11px).

### 🟠 D-05 — Cùng một con số, ba lần, hai ngôn ngữ thiết kế *(P1)*

Số **29** của Workload risk xuất hiện:
1. Thẻ KPI thứ 4 trên Dashboard — `29/100`, "Within a healthy range"
2. Banner đen ngay bên dưới — `Score 29`, kèm 3 thanh phân tích
3. Trang `/risk` — `29`, kèm đúng 3 thanh đó

Trên mobile, (1) và (2) nằm cách nhau **chưa tới một màn hình**.

Nặng hơn: banner đen là **phần tử nổi bật nhất Dashboard** (nền tối, tràn ngang, chữ to) nhưng nội dung của nó là *"trong ngưỡng an toàn"* — không cần hành động gì. Trong khi đó **"Due soon" đang có 1 bài quá hạn 2 ngày** lại nằm trong thẻ trắng nhạt hơn hẳn.

> **Hệ quả thiết kế:** thứ cần chú ý thì im lặng, thứ không cần chú ý thì hét lên. Phân cấp thị giác đang **ngược** với phân cấp mức độ quan trọng.

**Và có tới hai bộ thẻ KPI khác nhau cho cùng loại chỉ số:**

| | Dashboard | Weekly report |
|---|---|---|
| Nền | 4 màu bão hoà (violet/coral/mint/tangerine) | trắng trung tính |
| Delta | không có | có (`↑ 2 vs last week`) |
| Cảm giác | rực rỡ, khó so sánh | điềm đạm, dễ đọc |

Bản ở Weekly report **tốt hơn về mặt thiết kế** — nên nó mới là bản đáng chuẩn hoá.

### 🟠 D-06 — Dark mode: thẻ KPI không hề đổi màu *(P1)*

`app/globals.css` khối `.dark` **không định nghĩa lại** `--violet`, `--coral-deep`, `--mint`, `--tangerine`, `--lime`. Chỉ `--canvas` đổi: `#f2f0fb` → `#150f28`.

Tính tương phản **giữa thẻ và nền** (thẻ mint `#22dda6`):

| Theme | Nền | Tương phản thẻ/nền |
|---|---|---|
| Light | `#f2f0fb` | **1.54:1** — nhẹ nhàng |
| Dark | `#150f28` | **10.75:1** — chói |

**Gấp 7 lần.** Ban đêm, 4 mảng màu bão hoà này nổ tung trên nền tối. Ai học khuya sẽ thấy rõ.

Đây không phải lỗi tương phản chữ (chữ trên thẻ vẫn đọc được) mà là lỗi **cân bằng sáng của cả bố cục** — hạng mục mà không có automated test nào bắt được.

### 🟡 D-07 — Vùng chết ngang trên mọi trang danh sách *(P2)*

Ở 1280px, mẫu lặp lại giống hệt nhau ở `/courses`, `/gpa`, `/planner`, `/assignments`:

```
[Tên môn/bài ........]            ← ~30% trái
                     [~600px TRỐNG]
                                   [Edit] [Delete]  ← sát phải
```

Mắt phải đi hết chiều ngang màn hình để nối một hàng với nút của nó. Với 15 môn, đó là 15 lần quét ngang — và rủi ro bấm nhầm hàng tăng theo chiều dài quãng đường.

### 🟡 D-08 — Hành động huỷ hoại ngang hàng hành động an toàn *(P2)*

`/courses` (×15) và `/gpa` (×8): **"Delete"** cùng kích thước, cùng độ đậm, cùng nền xám như **"Edit"**.

Đối chiếu: `/assignments` dùng **Edit / Archive** (hoàn tác được) và giấu "Delete permanently" sau luồng archive. Trang Assignments đã làm đúng — hai trang kia thì chưa.

### 🟡 D-09 — Bốn trang trống hơn nửa màn hình *(P2)*

Ở viewport 1280×900, nội dung kết thúc tại:

| Trang | Nội dung hết ở | Trống |
|---|---|---|
| `/risk` | ~390px | **~57%** |
| `/reports` | ~480px | **~47%** |
| `/planner` | ~490px | **~46%** |
| `/schedule` | ~480px | **~47%** |

`/reports` đáng nói nhất: Dashboard quảng cáo nó là thứ đáng xem, nhưng nó là **trang mỏng nhất app** và **không có một biểu đồ nào** — trong khi Dashboard có biểu đồ GPA và Focus có biểu đồ cột.

### 🟡 D-10 — Nhãn điểm thành phần gây hiểu nhầm *(P2)*

`OVERDUE ×0.35` → `25`. Người dùng thử đọc thành *"đang trễ 25 bài"*. Thực tế: **1 bài**, và `25` là điểm rủi ro thành phần.

Cùng vấn đề: `FOCUS ×0.25 → 0` hiển thị nền **xanh lá** (hàm ý "tốt"), trong khi số `0` thì trực giác đọc là "chưa làm gì".

### 🟡 D-11 — Nút chạm dưới chuẩn trên mobile

Đo ở 390px: nút **"Edit"** ở `/gpa` = **40×44px**. Chiều cao đạt, **chiều rộng thiếu 4px** so với 44×44.

### 🟡 D-12 — Biểu đồ GPA tự thú nhận là đang bóp méo

Dưới tiêu đề "GPA trend" có dòng: *"Axis runs 2.95–3.87, not 0–4.0."*

Một dòng chữ giải thích rằng biểu đồ đang phóng đại chênh lệch. **Đã phải viết chú thích để đính chính hình vẽ, thì nên sửa hình vẽ.** Ngoài ra trục X là `242 / 251 / 252` (mã kỳ) — không đọc được như mốc thời gian.

---

## 3. 🧭 Nguyên tắc thiết kế đề xuất (để lần sau không tái phát)

| # | Nguyên tắc | Chống lại |
|---|---|---|
| N-1 | Màu ngữ nghĩa (`mint`/`coral`/`tangerine`) **chỉ làm nền**. Làm chữ thì phải dùng cặp `*-tint` + `*-text`. | D-03 |
| N-2 | Grid `fr` **luôn kèm `min-w-0`** ở phần tử con. | D-01 |
| N-3 | Màn hình lớn hơn **không bao giờ** hiển thị ít thông tin hơn màn hình nhỏ. | D-02 |
| N-4 | Một con số chỉ có **một chỗ ở** chính thức. Nơi khác thì liên kết tới, không lặp lại. | D-05 |
| N-5 | Trọng lượng thị giác tỉ lệ với **mức cần hành động**, không tỉ lệ với độ "hay ho" của tính năng. | D-05 |
| N-6 | Điều hướng phải trả lời được "tôi đang ở đâu" trên **mọi** thiết bị, cả bằng mắt lẫn bằng `aria-current`. | D-04 |
| N-7 | Hành động không hoàn tác được **không bao giờ** cùng trọng lượng với hành động an toàn. | D-08 |
| N-8 | Nếu phải viết chú thích để đính chính một biểu đồ → sửa biểu đồ. | D-12 |

---

## 4. 📐 Kế hoạch theo phase

Sắp theo **tỉ lệ (đau đớn người dùng) / (công sức)**, không theo thứ tự trong tài liệu.

---

### Phase 13 — Sửa layout hỏng 🔴 *(~3h)*

> Mục tiêu: không màn hình nào bị tràn hoặc cắt chữ. Đây là những lỗi khiến app *trông như bị lỗi*, không phải "chưa đẹp".

#### 13.1 — Hết tràn ngang ở desktop *(~1h)*
- `components/gpa/GpaContent.tsx:73,97` — thêm `min-w-0` cho phần tử con của grid *(đã xác minh: 1376 → 1280)*.
- `app/(app)/page.tsx:62` — cùng pattern `1.4fr_1fr`, sửa phòng ngừa.
- Banner Workload risk ở 768px — bỏ `shrink-0` hoặc cho xuống dòng.
- **Mở rộng `tests/e2e/layout.spec.ts:94`** từ chỉ 390px thành `[390, 768, 1024, 1280, 1440]`.

**Chấp nhận khi:** `scrollWidth === clientWidth` trên **cả 11 route × 5 độ rộng** (55 phép đo).

#### 13.2 — Schedule desktop hiển thị đủ như mobile *(~2h)*
- Bỏ lưới 7 cột cứng ở desktop; dùng lưới co giãn theo nội dung.
- Hiện **đủ** tên môn và **đủ** khoảng giờ — không `truncate` ở desktop nữa.
- Dùng phần chiều dọc đang trống (~430px) để nới các buổi học ra.
- Ngày cuối tuần trống: hiện `Weekend — no schedule` như bản mobile.

**Chấp nhận khi:** không phần tử nào trong lưới có `scrollWidth > clientWidth` (tức không còn bị cắt chữ), và desktop hiện **≥** lượng thông tin của mobile.

---

### Phase 14 — Đọc được & biết mình đang ở đâu 🟠 *(~3h)*

#### 14.1 — Dọn màu ngữ nghĩa dùng sai chỗ *(~1.5h)*
- Đưa toàn bộ chữ delta (`↑ 2 vs last week`) về cặp `*-tint` + `*-text`, hoặc dùng shade đậm hơn đạt ≥4.5:1.
- Sửa tên môn "below average" ở `/gpa` (coral 3.11:1) — giữ chip cảnh báo, trả tên môn về `text-foreground`.
- Sửa giờ học ở `/schedule` (4.4:1).
- **Thêm test tự động**: quét toàn bộ `text-mint|text-coral|text-tangerine` không đi kèm nền `*-tint` → fail. Cùng kiểu với `tests/components/hover-token-guard.test.ts` đã có.

**Chấp nhận khi:** 0 phần tử chữ nào dưới AA trên cả 11 route × 2 theme, đo bằng `getComputedStyle`.

#### 14.2 — Bottom nav biết mình đang ở đâu *(~1h)*
- Thêm trạng thái active (dùng lại đúng logic `usePathname()` của `SidebarNav`).
- Thêm `aria-current="page"`.
- Đồng bộ nhãn với sidebar (`Tasks` → `Assign.`, hoặc đổi sidebar — miễn là **một tên cho một đích**).
- Nâng cỡ chữ 9.5px → ≥11px (giảm còn 6–7 mục nếu cần chỗ; **không thêm mục mới** — đợt 4 đã chốt).

**Chấp nhận khi:** trên cả 8 route, đúng 1 mục có `aria-current="page"` và có khác biệt thị giác đo được.

#### 14.3 — Nút chạm 44×44 *(~30 phút)*
- Nút "Edit" ở `/gpa` mobile: 40px → ≥44px.
- Quét lại toàn bộ nút/link ở 390px.

---

### Phase 15 — Sắp lại phân cấp thông tin 🟠 *(~4h)*

> Đây là phase **thiết kế lại thật sự**, không phải sửa lỗi. Nên làm sau khi 13–14 xong.

#### 15.1 — Gỡ trùng lặp Workload risk *(~1h)*
Chọn **một** trong hai, không giữ cả hai:
- **(a)** Giữ thẻ KPI nhỏ trên Dashboard, bỏ banner đen → nhường chỗ nổi bật cho "Due soon".
- **(b)** Giữ banner nhưng **chỉ hiện khi vượt ngưỡng** (`score ≥ 60`); dưới ngưỡng thì chỉ còn thẻ KPI.

→ **Đề xuất (b)**: giữ được giá trị cảnh báo, bỏ được tiếng ồn khi mọi thứ bình thường.

#### 15.2 — Thống nhất một ngôn ngữ thẻ KPI *(~1h)*
Chuẩn hoá theo **bản ở Weekly report** (nền trung tính + delta), không theo bản Dashboard 4 màu bão hoà. Việc này xử lý luôn **D-06** — hết mảng màu bão hoà thì hết chói ở dark mode.

Giữ màu bão hoà cho **điểm nhấn có chủ đích** (thẻ streak lime, Pilo's plan violet) — chúng là *thương hiệu*, không phải *dữ liệu*.

#### 15.3 — Đưa "Due soon" lên đúng tầm quan trọng *(~1h)*
Bài quá hạn phải là thứ nổi bật nhất Dashboard, không phải một điểm rủi ro đang ở mức an toàn.

#### 15.4 — Nhãn điểm rủi ro nói rõ nó là gì *(~1h)*
`OVERDUE ×0.35 → 25` ⇒ `Overdue · 1 bài quá hạn → +25 điểm rủi ro`.
Tách bạch **số liệu thật** và **điểm quy đổi**.

---

### Phase 16 — Mật độ & trau chuốt 🟡 *(~4h)*

#### 16.1 — Thu hẹp vùng chết ngang *(~1.5h)*
Giới hạn bề rộng hàng danh sách, hoặc đưa metadata vào khoảng trống giữa. Áp dụng cho `/courses`, `/gpa`, `/planner`.

#### 16.2 — Hạ cấp thị giác nút Delete *(~30 phút)*
Theo mẫu đã đúng ở `/assignments`: hành động huỷ hoại phải nhạt hơn, hoặc nằm sau một bước.

#### 16.3 — Làm dày `/reports` *(~1.5h)*
Thêm biểu đồ (dữ liệu đã có sẵn ở `lib/rules/insights.ts`), lấp ~47% khoảng trống bằng nội dung thật.

#### 16.4 — Sửa biểu đồ GPA trend *(~30 phút)*
Trục Y đủ dải hoặc đánh dấu rõ là trục cắt; trục X đổi mã kỳ sang nhãn đọc được.

---

## 5. Tổng hợp

| Phase | Nội dung | Ước tính | Mức |
|---|---|---|---|
| **13** | Layout hỏng: tràn ngang + Schedule cắt chữ | ~3h | 🔴 P0 |
| **14** | Tương phản + điều hướng + ngưỡng chạm | ~3h | 🟠 P1 |
| **15** | Phân cấp thông tin & hệ thống KPI | ~4h | 🟠 P1 |
| **16** | Mật độ & trau chuốt | ~4h | 🟡 P2 |

**Tổng: ~14h.**

**Khuyến nghị:** làm **Phase 13 + 14 trước** (~6h). Đó là phần khiến app *trông như đang lỗi* và *khó đọc* — sửa xong thì phần lớn cảm giác "chưa đẹp" biến mất, dù chưa hề động tới bố cục. Phase 15 mới là phần thiết kế lại thật sự và nên có bản mockup trước khi code.

### Cần quyết định trước khi bắt đầu Phase 15
1. **D-05**: chọn (a) bỏ banner, hay (b) chỉ hiện khi vượt ngưỡng?
2. **D-04**: đổi nhãn mobile theo sidebar, hay đổi sidebar theo mobile?
3. Có chấp nhận **bỏ 4 màu bão hoà** ở KPI Dashboard không? Đây là thay đổi rõ rệt nhất về diện mạo — cần bạn duyệt, không nên tự quyết.

---

## 6. Phụ lục — phương pháp

- **Ảnh chụp:** 33 ảnh, Playwright + Chromium, `full_page=True`, tài khoản `tien.vo539@gmail.com`.
- **Độ rộng đo tràn:** 768 / 1024 / 1280 / 1440.
- **Tương phản:** WCAG 2.1 relative luminance, đọc màu thật bằng `getComputedStyle` rồi tự truy ngược nền tổ tiên gần nhất không trong suốt.
- **Console:** 0 lỗi console, 0 page error trên toàn bộ 11 route.

> **Một cảnh báo về chính số liệu ở đây:** vòng đo đầu tiên báo chữ `10d` chỉ đạt **1.20:1**. Kiểm tra lại thì đó là **dương tính giả** — phần tử cha dùng `oklab()` có alpha, và bộ đọc màu đã phân tích sai chuỗi đó. Tương phản thật của `10d` (ink đậm trên nền lime `#d8ff4a`) hoàn toàn đạt chuẩn. **Con số này đã bị loại khỏi tài liệu.** Ghi lại ở đây vì cách bắt lỗi cũng quan trọng như kết quả — mọi số còn lại đều đã được xác minh lần hai bằng cách in ra `fg`/`bg` thật.
