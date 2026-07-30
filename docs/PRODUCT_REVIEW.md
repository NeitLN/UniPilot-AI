# UniPilot AI — Đánh giá đa góc nhìn (UI/UX · QA · PM · BA · Người dùng)

**Ngày:** 30/07/2026
**Phiên bản đánh giá:** sau khi hoàn thành cả 4 đợt của `future_update.md` (commit `2a69a13`)
**Tài khoản kiểm thử:** `tien.vo539@gmail.com` (dữ liệu thật, 6 môn kỳ 253 + 8 môn 3 kỳ trước)

**Phạm vi đã chạy thật:** 9 route × 3 viewport (390px mobile / 768px tablet / 1280px desktop), cả light + dark mode, đo bằng Playwright (kích thước DOM thật, không ước lượng bằng mắt).

> **Kết quả tổng quát:** 0 console error, 0 page error, 0 request lỗi, 0 tràn ngang trên mobile.
> Nhưng **2 lỗi giao diện thật** đã được xác nhận bằng số đo, trong đó **1 lỗi làm hỏng hoàn toàn ý nghĩa của biểu đồ GPA** — tính năng trung tâm của sản phẩm.

---

## 1. 🎨 Senior UI/UX — Đánh giá giao diện

### Điểm mạnh (giữ nguyên, đừng sửa)

| Hạng mục | Nhận xét |
|---|---|
| **Hệ thống design token** | Rất tốt. Toàn bộ màu đi qua CSS custom property nên dark mode hoạt động mà không cần `dark:` rải khắp nơi. Có comment giải thích lý do chọn từng màu (contrast ratio) — hiếm thấy. |
| **Bản sắc thương hiệu** | Bộ màu tím-chanh + mascot Pilo tạo cá tính rõ, không bị "template SaaS chung chung". |
| **Dark mode** | Chất lượng cao. Sidebar/nút giữ nền tối cố định, chỉ nền canvas và chữ đảo — đúng cách làm. Không chớp sáng khi load. |
| **Trạng thái rỗng (empty state)** | Có mascot + câu dẫn hành động, không phải màn hình trắng. |
| **Cảm ứng** | 7/7 nút bottom-nav đều đạt 44×44px. Không có target nhỏ nào (trừ skip-link vốn cố ý ẩn). |

### Vấn đề giao diện

#### UX-01 — Biểu đồ GPA trend không truyền tải được xu hướng ⚠️ **Nghiêm trọng**

Đây vừa là **lỗi kỹ thuật** (xem QA-01) vừa là **lỗi thiết kế thông tin**, cần sửa cả hai:

- **Lỗi kỹ thuật:** 3 cột đang render **cao bằng nhau đúng 98px** dù giá trị là 3.25 / 3.49 / 3.57.
- **Lỗi thiết kế:** kể cả khi sửa lỗi trên, trục Y bắt đầu từ 0 nên khoảng cách 3.25 → 3.57 chỉ tạo chênh lệch **9px trên tổng 120px**. Người dùng vẫn không thấy được mình đang tiến bộ.

> **Khuyến nghị:** trục Y nên co về vùng dữ liệu thật (ví dụ min−0.3 → max+0.3), thêm nhãn trục và đường tham chiếu target GPA. GPA đi từ 3.25 lên 3.57 là một câu chuyện tích cực — hiện tại sản phẩm đang giấu mất câu chuyện đó.

#### UX-02 — Thanh lọc Assignments vỡ layout dưới 1024px ⚠️ **Nghiêm trọng**

Số đo thật ô tìm kiếm:

| Viewport | Chiều rộng ô search | Đánh giá |
|---|---|---|
| 390px (mobile) | **49px** | Không dùng được |
| 768px (tablet) | **36px** | Không dùng được — tệ hơn cả mobile |
| 1280px (desktop) | 548px | Bình thường |

Nguyên nhân: `<select>` tự giãn theo option dài nhất (`71ITSE20204 — Cấu trúc dữ liệu và giải thuật` = 301px) và **không co lại**, trong khi ô search `flex-1` phải nhận phần thừa.

#### UX-03 — Schedule lặp lại thông tin, thiếu giờ kết thúc

Mỗi buổi học hiện đang hiển thị:
```
Lập trình Web nâng cao          ← tiêu đề
7:00 AM · Lập trình Web nâng cao ← giờ + TÊN MÔN LẶP LẠI
```
Tên môn bị lặp 2 lần vì tiêu đề block trùng tên môn, đồng thời **không hiển thị giờ kết thúc** — sinh viên không biết buổi học dài bao lâu nếu chỉ nhìn lịch.

> **Khuyến nghị:** dòng 2 nên là `7:00 AM–9:00 AM · P.B305`; chỉ hiện tên môn khi nó **khác** tiêu đề.

#### UX-04 — Assignment lặp lại trông như dữ liệu trùng lặp

Sau khi tạo 1 assignment lặp hàng tuần, danh sách hiện 4 dòng **giống hệt nhau**, chỉ khác ngày. Không có badge `Lặp hàng tuần`, không nhóm lại. Người dùng dễ tưởng bị lỗi nhân bản và đi xoá thủ công.

#### UX-05 — Thẻ assignment quá cao trên mobile

Mỗi thẻ chiếm ~150px (tiêu đề + môn + tag + thanh tiến độ + 2 nút). 8 assignment = cuộn rất dài. Nút `Edit`/`Archive` luôn hiện dù ít dùng.

> **Khuyến nghị:** thu gọn còn 1 dòng thông tin + tiến độ, đưa Edit/Archive vào menu `⋯` hoặc swipe.

#### UX-06 — Ngày cuối tuần trống vẫn chiếm chỗ

Ở chế độ Week trên mobile, SAT/SUN không có lịch nhưng vẫn render 2 thẻ trống. Nên gộp thành một dòng `Cuối tuần — không có lịch`.

#### UX-07 — Thông báo lỗi form dùng tooltip mặc định của trình duyệt

Khi submit form rỗng, modal đứng yên nhưng **0 thông báo lỗi nào của app hiện ra** — vì thuộc tính `required` của HTML chặn trước, nên bộ validate riêng (`validateAssignment`, vốn viết rất kỹ) không bao giờ chạy. Kết quả: người dùng thấy tooltip xám của Chrome, sai hoàn toàn với ngôn ngữ thiết kế, và mỗi lần chỉ báo được 1 lỗi.

---

## 2. 🧪 Tester / QA — Lỗi phát hiện

### QA-01 — Cột biểu đồ GPA bị flex-shrink ép bằng nhau 🔴 **Nghiêm trọng**

**Bằng chứng đo được:**

| Học kỳ | GPA | `style.height` (đúng) | Chiều cao render (thực tế) |
|---|---|---|---|
| 242 | 3.25 | 98px | 98px ✅ |
| 251 | 3.49 | **105px** | **98px** ❌ |
| 252 | 3.57 | **107px** | **98px** ❌ |

**Nguyên nhân:** cột chart là flex-item trong container `flex-col` cao 120px, bên trong còn `<span>` nhãn số (~16px) + `gap-1.5` (6px). Khi bar cần 107px thì tổng 129px > 120px, flex tự động **co bar lại** cho vừa → mọi bar đều bị kẹp về đúng 98px.

**Phạm vi ảnh hưởng:** cả 2 nơi — `GpaTrendChart` (trang GPA) **và** `GpaTrendCard` (Dashboard).

**Hệ quả:** Toàn bộ tính năng "GPA trend" hiển thị sai. Sinh viên có GPA giảm mạnh cũng thấy biểu đồ y hệt người có GPA tăng.

**Cách sửa:** thêm `shrink-0` cho div của bar (1 class), hoặc tính chiều cao bar trừ đi phần nhãn.

> *(Ghi chú: chart mới `LearningStats` ở trang Focus **không dính lỗi này** — đã kiểm tra, 8/8 cột render đúng chiều cao — vì không có nhãn đặt phía trên bar.)*

### QA-02 — Ô tìm kiếm Assignments bị bóp còn 36–49px 🔴 **Nghiêm trọng**

Chi tiết số đo ở **UX-02**. Là lỗi chặn chức năng: tính năng search (F-04 vừa làm ở Đợt 2) **không dùng được trên mobile/tablet** — tức trên chính thiết bị mà PWA hướng tới.

**Cách sửa:** cho ô search `basis-full sm:basis-auto` (xuống dòng riêng trên màn nhỏ), và giới hạn select bằng `max-w-[45%] truncate`.

### QA-03 — Bộ validate riêng của form không bao giờ chạy 🟡 **Trung bình**

Xem **UX-07**. Không gây mất dữ liệu, nhưng khiến toàn bộ logic validate đã viết trở thành code chết ở nhánh "thiếu trường bắt buộc", và trải nghiệm lỗi không đồng nhất với phần còn lại của app.

### QA-04 — Google Calendar push không có phản hồi nào cho người dùng 🟡 **Trung bình**

`confirmPlan()` đẩy lịch lên Google theo kiểu *best-effort* và **nuốt toàn bộ lỗi** (cố ý — để không chặn việc confirm plan). Nhưng hệ quả là: nếu push thất bại (chưa kết nối Google, hết hạn quyền, lỗi API), **người dùng không hề biết**. Họ tưởng lịch đã lên Google Calendar trong khi thực tế không có gì.

**Cách sửa:** trả về số buổi đã đẩy trong kết quả của `confirmPlan` và hiện toast `Đã đẩy 5 buổi lên Google Calendar` hoặc `Chưa kết nối Google Calendar — plan vẫn được lưu`.

### QA-05 — Sự cố dữ liệu trong lúc kiểm thử (đã xử lý)

Khi verify tính năng lặp lại ở phiên trước, 4 dòng `Weekly quiz recurring test` bị để sót lại trong tài khoản thật, làm **Workload Risk nhảy từ 9 lên 32** và Active tasks từ 8 lên 11. **Đã xoá sạch trong phiên này** — đã xác minh còn đúng 8 active, 0 dòng test.

> Bài học quy trình: mọi verify sau này nên chạy trên tài khoản `e2e-tests@unipilot.local`, không dùng tài khoản demo thật.

### Những thứ đã kiểm tra và **đạt**

- ✅ Không có lỗi console/page/network trên cả 9 route × 3 viewport
- ✅ Không tràn ngang (`scrollWidth == clientWidth`) trên mobile ở mọi trang
- ✅ Giữ được tham số `?q=` khi đổi bộ lọc trạng thái (search + filter kết hợp đúng)
- ✅ Modal đóng bằng phím `Escape`
- ✅ Bottom nav mobile: 7/7 link, tất cả đạt 44px
- ✅ Phân trang ẩn đúng khi số item < 20
- ✅ Dark mode: không chớp sáng, giữ lựa chọn sau khi reload
- ✅ Export API: JSON trả đủ 5 nhóm dữ liệu, CSV đúng `Content-Type` + `Content-Disposition`, trả 400 khi `type` sai

---

## 3. 📊 Product Manager — Chức năng đã đủ chưa?

### Bức tranh hiện tại

Sản phẩm đã phủ **trọn vòng đời học tập**: nhập môn học → nhập bài tập → AI lên kế hoạch → tập trung làm (Pomodoro) → ghi điểm → theo dõi GPA → cảnh báo quá tải. Đây là một vòng khép kín thực sự, không phải tập hợp tính năng rời rạc. Về độ chín, phần lõi đã ở mức **có thể dùng thật hàng ngày**.

### Khoảng trống ưu tiên theo giá trị/công sức

| Ưu tiên | Khoảng trống | Vì sao quan trọng | Ước tính |
|---|---|---|---|
| 🔴 **P0** | **Không thể sửa/xoá môn học** | `courses` là thực thể xương sống (assignment, điểm, lịch đều trỏ vào). Hiện chỉ có `createCourse` — **không có update, không có delete, không có trang quản lý**. Gõ sai tên môn hoặc sai số tín chỉ là **sai vĩnh viễn**, và số tín chỉ sai sẽ làm **lệch GPA** — tức lỗi dữ liệu lan sang tính năng cốt lõi. | 3–4h |
| 🔴 **P0** | **Sửa 2 lỗi QA-01, QA-02** | Một cái làm hỏng biểu đồ GPA, một cái làm hỏng tìm kiếm trên mobile. | 1h |
| 🟠 **P1** | **Quên mật khẩu** | Có đăng ký + đăng nhập nhưng **không có reset password**. Người dùng quên mật khẩu là mất tài khoản vĩnh viễn. Chặn phát hành thật. | 2h |
| 🟠 **P1** | **Phản hồi khi đẩy Google Calendar** (QA-04) | Tính năng vừa xây xong nhưng "vô hình" với người dùng. | 1h |
| 🟠 **P1** | **Ghi phiên học thủ công** | Học offline/trên giấy không ghi nhận được → streak đứt oan, Workload Risk tính sai (thiếu yếu tố focus). Pomodoro không phải cách học duy nhất. | 2h |
| 🟡 **P2** | **Đính kèm link/file vào assignment** | Đã có trong danh sách ý tưởng cũ. Gom đề bài + tài liệu về một chỗ. | 3h |
| 🟡 **P2** | **Báo cáo tổng kết tuần/kỳ** | Dữ liệu đã có sẵn hết (giờ học, điểm, tỉ lệ hoàn thành) nhưng chưa có nơi tổng hợp thành "câu chuyện". Đây là thứ tạo cảm giác thành tựu và giữ chân người dùng. | 4h |
| 🟡 **P2** | **Dọn kho lưu trữ** | Assignment chỉ archive được, **không xoá cứng**. Sau vài kỳ, kho archive phình mãi không dọn được. | 1h |
| 🟢 **P3** | **Nhập dữ liệu (import)** | Đã có export nhưng không có import → chưa thật sự "làm chủ dữ liệu", không chuyển được máy/tài khoản. | 3h |

### Góc nhìn chiến lược

Sản phẩm đang mạnh ở **ghi nhận** (tracking) nhưng còn yếu ở **thấu hiểu** (insight). Người dùng nhập rất nhiều dữ liệu — bài tập, điểm, giờ học, lịch — nhưng sản phẩm trả lại tương đối ít kết luận:

- Biểu đồ GPA (đang lỗi) là nơi duy nhất thể hiện xu hướng theo thời gian
- Bảng "thời gian ↔ điểm" mới thêm là bước đi đúng hướng, nhưng chưa rút ra kết luận nào
- Workload Risk đưa ra điểm số nhưng gợi ý hành động còn mỏng

> **Đề xuất định hướng:** đợt tiếp theo nên tập trung vào **"sản phẩm nói cho tôi biết điều tôi chưa tự nhận ra"** — ví dụ: *"Bạn dành 150 phút cho Kỹ thuật lấy yêu cầu nhưng chỉ 25 phút cho Kiểm thử phần mềm, trong khi Kiểm thử có bài nộp sớm hơn 6 ngày."* Dữ liệu để nói câu đó **đã có sẵn trong DB**, chỉ chưa ai viết logic.

---

## 4. 📋 Business Analyst — Yêu cầu chức năng mới

Đánh số tiếp nối bộ FR trong SRS gốc.

---

### FR-20 — Quản lý môn học (CRUD đầy đủ) 🔴 P0

**Bối cảnh:** Hiện chỉ tạo được môn (`createCourse` trong `app/(app)/schedule/actions.ts`). Không có route `/courses`, không có `updateCourse`, không có `deleteCourse`.

**Mô tả:** Người dùng phải xem được danh sách toàn bộ môn học, sửa và xoá được môn.

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Vào trang quản lý môn | Thấy danh sách tất cả môn, nhóm theo học kỳ, kèm số tín chỉ |
| AC-2 | Sửa tên/mã/tín chỉ/học kỳ của môn | Lưu thành công; GPA **tự tính lại** nếu tín chỉ thay đổi |
| AC-3 | Xoá môn **chưa** có dữ liệu liên quan | Xoá thành công |
| AC-4 | Xoá môn **đang có** assignment/điểm/lịch | **Chặn xoá**, hiện rõ: *"Không thể xoá — môn này đang có 3 bài tập và 1 điểm số"*, kèm link tới các mục đó |
| AC-5 | Sửa số tín chỉ của môn đã có điểm | Cảnh báo trước: *"Thay đổi này sẽ làm GPA từ 3.46 thành 3.41"* |

**Quy tắc nghiệp vụ:** Không bao giờ xoá lan (cascade) môn học. Dữ liệu học tập của người dùng phải được ưu tiên hơn sự tiện lợi của thao tác xoá.

---

### FR-21 — Đặt lại mật khẩu 🟠 P1

**Bối cảnh:** `app/(auth)/login/actions.ts` có `signInWithPassword` và `signUp` nhưng **không có** `resetPasswordForEmail`.

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Màn đăng nhập | Có link *"Quên mật khẩu?"* |
| AC-2 | Nhập email đã đăng ký | Nhận email chứa link đặt lại |
| AC-3 | Nhập email **chưa** đăng ký | Hiện **cùng một** thông báo thành công (không tiết lộ email nào tồn tại — chống dò tài khoản) |
| AC-4 | Mở link đặt lại | Đặt được mật khẩu mới, tự đăng nhập, mọi phiên cũ bị thu hồi |
| AC-5 | Link quá 1 giờ | Báo hết hạn, cho gửi lại |

---

### FR-22 — Ghi phiên học thủ công 🟠 P1

**Bối cảnh:** `focus_sessions` chỉ được tạo bởi Pomodoro timer. Học offline không ghi nhận được → streak đứt oan và yếu tố `focus` trong Workload Risk (trọng số 0.25) bị tính thiếu.

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Trang Focus | Có nút *"Ghi phiên đã học"* |
| AC-2 | Nhập bài tập + thời lượng + thời điểm bắt đầu | Tạo bản ghi `focus_sessions` |
| AC-3 | Thời lượng ≥ 25 phút | Ghi `result = completed`, **được tính vào streak** |
| AC-4 | Thời lượng < 25 phút | Ghi `result = partial`, **không** tính streak (đúng BR-04) |
| AC-5 | Chọn thời điểm trong tương lai | Chặn — chỉ ghi được phiên đã xảy ra |
| AC-6 | Phiên ghi tay | Có nhãn phân biệt với phiên Pomodoro trong thống kê |

---

### FR-23 — Phản hồi kết quả đồng bộ Google Calendar 🟠 P1

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Confirm plan khi **đã** kết nối Google | Toast: *"Đã thêm 5 buổi học vào Google Calendar"* |
| AC-2 | Confirm plan khi **chưa** kết nối | Thông báo nhẹ: *"Plan đã lưu. Kết nối Google Calendar để tự động thêm vào lịch."* + link kết nối |
| AC-3 | Google trả lỗi | *"Plan đã lưu, nhưng chưa đồng bộ được với Google Calendar."* + nút thử lại |
| AC-4 | Mọi trường hợp trên | **Plan vẫn luôn được confirm thành công** — không bao giờ rollback vì lỗi Google |

---

### FR-24 — Nhãn và nhóm cho assignment lặp lại 🟡 P2

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Assignment thuộc chuỗi lặp | Hiện badge *"Lặp hàng tuần"* (đã có sẵn `recurrence_group_id`, chỉ chưa dùng ở UI) |
| AC-2 | Sửa 1 assignment trong chuỗi | Hỏi rõ: *"Chỉ mục này"* / *"Mục này và các mục sau"* (giống Schedule đã làm) |
| AC-3 | Archive 1 assignment trong chuỗi | Hỏi tương tự AC-2 |

---

### FR-25 — Xoá vĩnh viễn khỏi kho lưu trữ 🟡 P2

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Xem bộ lọc "Archived" | Mỗi mục có nút *"Xoá vĩnh viễn"* |
| AC-2 | Bấm xoá vĩnh viễn | Hộp thoại xác nhận **cảnh báo rõ** rằng lịch sử focus gắn với bài này cũng mất theo |
| AC-3 | Xác nhận | Xoá khỏi DB |

> ⚠️ **Ràng buộc kỹ thuật bắt buộc kèm theo:** `focus_sessions.assignment_id` hiện là `ON DELETE CASCADE`. **Phải đổi sang `ON DELETE SET NULL` trước khi mở tính năng này**, nếu không mỗi lần xoá bài tập sẽ thổi bay lịch sử học tập và làm đứt streak — đây là dữ liệu thành tựu của người dùng, không được mất theo. *(Rủi ro này đã được ghi nhận từ `future_update.md` §7 nhưng đến nay vẫn chưa sửa.)*

---

### FR-26 — Báo cáo tổng kết tuần 🟡 P2

**Tiêu chí chấp nhận:**
| # | Điều kiện | Kết quả mong đợi |
|---|---|---|
| AC-1 | Xem báo cáo tuần | Thấy: số bài hoàn thành, tổng giờ học, streak, thay đổi GPA, tỉ lệ bám kế hoạch |
| AC-2 | So sánh | Có đối chiếu với tuần trước (↑/↓) |
| AC-3 | Có dữ liệu bất thường | Rút ra **ít nhất 1 nhận định bằng lời**, ví dụ: *"Bạn học Kiểm thử phần mềm ít hơn 60% so với các môn khác, trong khi môn này có bài nộp sớm nhất."* |
| AC-4 | Tuần chưa có dữ liệu | Empty state tử tế, không phải bảng số 0 |

---

## 5. 👤 Người dùng thử — Phản hồi thật khi dùng

> *Ghi lại theo đúng thứ tự tôi gặp khi dùng app như một sinh viên bình thường.*

**"Mở lên là hiểu ngay."** Dashboard rất tốt — 4 con số lớn ở trên, việc cần làm ở dưới. Không phải học cách dùng. Mascot Pilo làm app đỡ khô khan, đây là điểm cộng thật chứ không phải trang trí thừa.

**"Nhưng biểu đồ GPA thì tôi không hiểu để làm gì."** Ba cột cao y hệt nhau. Tôi nhìn số bên trên mới biết là 3.25 → 3.49 → 3.57. Vậy thì cái biểu đồ tồn tại làm gì, khi tôi vẫn phải đọc số? *Tôi đang tiến bộ rõ ràng mà nhìn hình thì tưởng mình giậm chân tại chỗ.* Đây là chỗ tôi thất vọng nhất, vì GPA là lý do chính tôi dùng app này.

**"Tìm kiếm trên điện thoại thì chịu."** Tôi mở trên điện thoại, thấy một ô vuông tí xíu cạnh dropdown môn học. Gõ vào thì chữ chạy mất, không đọc được mình đang gõ gì. Trên máy tính bảng còn nhỏ hơn nữa. Cuối cùng tôi bỏ, cuộn tay tìm cho nhanh.

**"Lịch học thì thiếu giờ tan."** Nhìn thấy `7:00 AM · Lập trình Web nâng cao`. Tên môn viết 2 lần, nhưng **giờ kết thúc thì không có**. Tôi cần biết học tới mấy giờ để còn xếp lịch đi làm thêm buổi chiều. Đây là thứ tôi phải mở app khác để tra.

**"Tạo bài tập lặp lại xong hơi hoảng."** Tôi chọn lặp hàng tuần, xong danh sách hiện ra 4 dòng giống hệt nhau. Thoạt nhìn tưởng app bị lỗi tạo trùng, suýt nữa xoá bớt đi. Phải nhìn kỹ ngày mới hiểu. Nên có chữ *"lặp hàng tuần"* để tôi yên tâm.

**"Gõ sai tên môn là chịu chết."** Tôi tạo môn bị thiếu dấu, muốn sửa lại mà **tìm mãi không thấy chỗ nào sửa được**. Không có trang danh sách môn học, không có nút sửa, không có nút xoá. Môn đó giờ nằm vĩnh viễn trong dropdown với cái tên sai. Đây là chỗ khó chịu nhất về mặt sử dụng.

**"Tuần rồi tôi học ở thư viện, app không biết."** Tôi ngồi thư viện học 3 tiếng liền không bật app. Về nhà mở lên thì streak **đứt**, mà tôi có lười đâu. Không có cách nào nói với app rằng "tôi đã học rồi". Cảm giác bị app chấm điểm sai.

**"Confirm plan xong không biết có lên lịch Google chưa."** Bấm Confirm plan, plan chuyển sang Active. Nhưng nó có đẩy sang Google Calendar không? Không thấy báo gì. Tôi phải tự mở Google Calendar ra kiểm tra.

**"Quên mật khẩu là mất tài khoản."** Tôi thử tìm link "Quên mật khẩu" ở màn đăng nhập — **không có**. Với app giữ toàn bộ dữ liệu học tập của tôi, đây là điều khiến tôi không dám tin tưởng để dùng lâu dài.

**Điều tôi thích nhất:** dark mode. Tôi hay học đêm, bật lên là dịu mắt ngay, không bị lóe trắng lúc chuyển trang. Làm rất chỉn chu.

**Điều tôi mong có nhất:** một chỗ đính link đề bài vào từng assignment. Giờ tôi vẫn phải mở Google Classroom song song để xem đề, app này chỉ nhắc "có bài" chứ không cho tôi xem "bài gì".

---

## 6. 🎯 Tổng hợp — Thứ tự nên làm

| # | Hạng mục | Loại | Ưu tiên | Công sức |
|---|---|---|---|---|
| 1 | **QA-01** — Sửa flex-shrink biểu đồ GPA (2 component) | Bug | 🔴 P0 | 15 phút |
| 2 | **QA-02** — Sửa layout ô tìm kiếm Assignments | Bug | 🔴 P0 | 30 phút |
| 3 | **FR-20** — CRUD môn học + trang quản lý | Chức năng | 🔴 P0 | 3–4h |
| 4 | **UX-01** — Co trục Y biểu đồ GPA về vùng dữ liệu | UX | 🟠 P1 | 1h |
| 5 | **FR-21** — Quên mật khẩu | Chức năng | 🟠 P1 | 2h |
| 6 | **FR-23** — Phản hồi đồng bộ Google Calendar | Chức năng | 🟠 P1 | 1h |
| 7 | **FR-22** — Ghi phiên học thủ công | Chức năng | 🟠 P1 | 2h |
| 8 | **UX-03** — Hiện giờ kết thúc, bỏ tên môn lặp ở Schedule | UX | 🟠 P1 | 30 phút |
| 9 | **FR-24** — Nhãn assignment lặp lại | UX | 🟡 P2 | 1h |
| 10 | **QA-03** — Dùng validate của app thay tooltip trình duyệt | Bug | 🟡 P2 | 1h |
| 11 | **Đổi `focus_sessions` sang `ON DELETE SET NULL`** | Kỹ thuật | 🟡 P2 | 30 phút |
| 12 | **FR-25** — Xoá vĩnh viễn khỏi archive *(sau #11)* | Chức năng | 🟡 P2 | 1h |
| 13 | **FR-26** — Báo cáo tổng kết tuần | Chức năng | 🟡 P2 | 4h |
| 14 | **UX-05/06** — Thu gọn thẻ mobile, gộp ngày trống | UX | 🟢 P3 | 2h |
| 15 | Đính kèm link/file vào assignment | Chức năng | 🟢 P3 | 3h |
| 16 | Nhập dữ liệu (import) | Chức năng | 🟢 P3 | 3h |

**Gợi ý gói phát hành:**
- **Hotfix ngay (~45 phút):** #1, #2 — hai lỗi này đang làm hỏng tính năng đã hoàn thiện.
- **Đợt 5 — "Làm chủ dữ liệu" (~8h):** #3, #4, #5, #6, #8 — vá các lỗ hổng chặn việc dùng thật.
- **Đợt 6 — "Từ ghi nhận sang thấu hiểu" (~9h):** #7, #11, #12, #13 — biến dữ liệu đã có thành insight.

---

## 7. Ghi chú kiểm chứng

Mọi con số trong tài liệu này đều đo trực tiếp trên DOM đang chạy (`getBoundingClientRect`), không ước lượng bằng mắt:

- Chiều cao cột chart: so `element.style.height` (giá trị code tính ra) với `getBoundingClientRect().height` (giá trị render thật) → phát hiện chênh lệch 105→98 và 107→98.
- Chiều rộng ô search: đo ở đúng 3 breakpoint 390 / 768 / 1280.
- Vùng chạm: quét toàn bộ `a, button, select, input[type=checkbox]` tìm phần tử < 44px.
- Tràn ngang: so `documentElement.scrollWidth` với `clientWidth` trên từng route.

**Lệnh chạy lại bộ kiểm thử tự động hiện có:**
```bash
npx tsc --noEmit     # typecheck — đang sạch
npx eslint app components lib tests   # lint — đang sạch
npx vitest run       # 144 unit test — đang xanh
npm run test:e2e     # 7 E2E test
```

> **Lưu ý về độ phủ test:** cả 2 lỗi P0 ở trên **đều không bị bộ test hiện tại bắt được**, vì unit test chỉ phủ logic thuần (`lib/rules/*`) còn E2E không kiểm tra kích thước/layout. Đây chính là lý do nên bổ sung một vài assertion về layout (chiều rộng ô search, chiều cao bar chart) — lỗi render kiểu này sẽ tiếp tục lọt lưới nếu chỉ dựa vào test logic.
