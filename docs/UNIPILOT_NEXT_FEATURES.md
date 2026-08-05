# UniPilot — Quyết định tính năng tiếp theo

**Ngày:** 2026-08-06
**Commit gốc:** `7cceb0e`
**Quy trình:** 4 vai đánh giá độc lập (Product Manager → UX Researcher + Gen Z Beta Tester → Senior Product Designer → Senior Full-stack Technical Lead), sau đó hợp nhất thành quyết định chung.

---

## 0. Tóm tắt quyết định

**Làm 3 tính năng. Không làm 5 tính năng.**

| #      | Tính năng                                                                 | Vì sao                                              | Effort |
| ------ | ------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| **F1** | **Quick capture** — thêm bài tập chỉ với tiêu đề + hạn nộp                | Hành động thường xuyên nhất đang có form nặng nhất  | **S**  |
| **F2** | **Nhắc cập nhật tiến độ sau phiên Focus**                                 | Hai tính năng dùng nhiều nhất không hề nối với nhau | **M**  |
| **F3** | **Dự báo GPA theo môn sắp học** — "cần bao nhiêu điểm mỗi môn để đạt 3.6" | Biến con số GPA trừu tượng thành mục tiêu từng môn  | **M**  |

Điểm chung của cả ba: **không mở bề mặt mới**. F1 và F2 gỡ bỏ ma sát trên luồng đã có; F3 dùng đúng dữ liệu đã thu thập. Không có tính năng nào cần bảng mới, không có tính năng nào cần gọi AI thêm.

**Không làm** (mục 6): bảng xếp hạng/social, AI chat tutor, gamification streak, chia sẻ lịch, tích hợp LMS.

---

## 1. Vai Product Manager — khảo sát và tìm khoảng trống

Không suy diễn: mọi kết luận dưới đây đều truy được về code hoặc schema thật.

### 1.1. Vòng lặp sản phẩm hiện tại

```
Assignments  →  AI Planner  →  Schedule  →  Focus  →  Weekly Report
  (cái gì)      (khi nào,      (đã chốt)   (làm)     (nhìn lại)
                 đề xuất)
```

Vòng lặp này hoàn chỉnh về mặt khái niệm. Vấn đề nằm ở **các mối nối giữa các bước**.

### 1.2. Ba khoảng trống đã xác thực

#### Khoảng trống 1 — Focus và Assignment không nói chuyện với nhau

```
$ grep -rn "progress" "app/(app)/focus/actions.ts"
→ NO — focus never writes assignment.progress
```

Sinh viên học 2 tiếng cho bài luận. Thanh tiến độ của bài luận đó **vẫn đứng yên ở 0%**. Muốn cập nhật phải rời Focus, sang Assignments, mở form sửa, kéo thanh trượt, lưu.

Đây là mối nối giữa **hai tính năng dùng nhiều nhất** — và nó không tồn tại.

Hệ quả dây chuyền: `progress` sai kéo theo AI Planner sai (nó đọc `progress` để xếp ưu tiên, xem `lib/gemini/prompt.ts:29`), và "Quick wins" (bài gần xong) cũng sai theo.

#### Khoảng trống 2 — Hành động thường xuyên nhất có form nặng nhất

`lib/rules/assignment.ts` bắt buộc **5 trường**: `title`, `courseId`, `dueAt`, `weight`, `priority`.

Nhưng schema thật lại khác:

| Trường      | DB                      | Form         | Nhận xét                                |
| ----------- | ----------------------- | ------------ | --------------------------------------- |
| `title`     | NOT NULL                | bắt buộc     | hợp lý                                  |
| `due_at`    | NOT NULL                | bắt buộc     | hợp lý — đây là deadline                |
| `course_id` | **NULLABLE**            | **bắt buộc** | ràng buộc chỉ có ở UI                   |
| `weight`    | NOT NULL, không default | **bắt buộc** | thường **chưa biết** lúc nghe thông báo |
| `priority`  | có default              | bắt buộc     | có thể suy ra                           |

`course_id` cho phép null trong DB nhưng form chặn — **đúng loại lỗi vừa sửa ở Focus timer** (nơi `assignment_id` nullable từ migration 0012 nhưng UI vẫn khoá nút Start).

Bối cảnh thật: giảng viên nói "bài luận nộp thứ Sáu tuần sau". Sinh viên có ~5 giây. Trọng số bài đó? Chưa công bố. Kết quả: hoặc bịa một con số, hoặc không ghi gì cả.

Thêm nữa, nút "Add assignment" **chỉ tồn tại trên trang `/assignments`** — không có trên Dashboard, không có trên Schedule.

#### Khoảng trống 3 — Con số GPA đúng nhưng không hành động được

App **đã** biết trả lời "cần trung bình bao nhiêu". `requiredAverage` (`lib/rules/gpa.ts:110`) tính ra con số đó, và `OnTrackCard` hiển thị nó:

> _"You need a 3.60 average across your remaining credits."_

Con số này **đúng về toán học nhưng vô dụng về hành động**. Sinh viên không học "các tín chỉ còn lại" — họ học **Giải thuật, Xác suất, Tiếng Anh**, mỗi môn một số tín chỉ khác nhau. Câu hỏi thật của họ là: _"vậy môn Giải thuật tôi phải được mấy điểm?"_

App đã có đủ dữ liệu để trả lời mà chưa dùng:

| Dữ liệu                          | Ở đâu                                       | Dùng để                             |
| -------------------------------- | ------------------------------------------- | ----------------------------------- |
| GPA hiện tại + tín chỉ đã tính   | `grades.grade_point`, `grades.credit_hours` | Điểm xuất phát                      |
| Môn sắp học + số tín chỉ mỗi môn | `courses.credits` (có `CHECK credits > 0`)  | Chia mục tiêu theo trọng số tín chỉ |
| Mục tiêu GPA                     | `profiles.target_gpa`                       | Đích đến                            |

**Cách nhận biết môn nào "sắp học":** `grades` có ràng buộc `UNIQUE (user_id, course_id, semester)`. Môn nào chưa có dòng điểm tương ứng thì chưa học xong. Không cần thêm cột, không cần sinh viên nhập lại gì.

### 1.3. Còn một khoảng trống từ audit trước, chưa làm

Audit ngày 2026-08-05 (`docs/audits/UNIPILOT_6_ROLE_PRODUCT_AUDIT.md` §12) đã ghi 3 việc "improve now". Hai việc đã xong; **việc thứ ba vẫn mở**:

> _Focus → immediate acknowledgement rather than waiting for a weekly report._

Hiện sau khi hoàn thành một chu kỳ, app chỉ nói **"Cycle logged — break started."** Đó là ghi nhận **cái đồng hồ**, không phải ghi nhận **công việc**.

**F2 giải quyết đồng thời Khoảng trống 1 và việc còn tồn này** — một tính năng đóng hai lỗ hổng.

---

## 2. Vai UX Researcher + Gen Z Beta Tester

> ⚠️ **Đây không phải nghiên cứu người dùng thật.** Không có sinh viên nào được phỏng vấn. Phần này là phân tích heuristic trên giao diện thật cộng với **số bước đếm được từ code**. Những con số bước là thật; các nhận định về cảm xúc là giả định cần kiểm chứng với người thật.

### 2.1. Đếm số bước — dữ liệu thật, không phải cảm tính

**Hành trình A — ghi lại một deadline vừa nghe được:**

| Bước | Hiện tại                                                 |
| ---- | -------------------------------------------------------- |
| 1    | Mở app                                                   |
| 2    | Bấm "Assignments" ở sidebar                              |
| 3    | Bấm "Add assignment"                                     |
| 4-8  | Điền **5 trường** (title, course, due, weight, priority) |
| 9    | Bấm lưu                                                  |

**3 lần bấm + 5 trường.** Trong đó `weight` thường chưa biết → sinh viên phải bịa số hoặc bỏ cuộc.

**Hành trình B — vừa học xong 25 phút, muốn ghi nhận tiến độ:**

| Bước | Hiện tại                             |
| ---- | ------------------------------------ |
| 1    | Kết thúc phiên → thấy "Cycle logged" |
| 2    | Bấm "Assignments"                    |
| 3    | Tìm đúng bài trong danh sách         |
| 4    | Mở menu "⋯"                          |
| 5    | Bấm "Edit"                           |
| 6    | Kéo thanh Progress                   |
| 7    | Bấm "Save changes"                   |

**6 bước sau khi đã học xong.** Thực tế: gần như không ai làm. Nên `progress` trong hệ thống luôn lệch khỏi thực tế.

### 2.2. Ba persona (mô phỏng — giả định, không phải dữ liệu)

**Persona A — sinh viên năm nhất, dùng điện thoại**

- Ấn tượng đầu: giao diện hiện đại, không giống cổng thông tin trường
- Điểm vấp: nghe deadline trong giờ học nhưng không kịp ghi vì form dài
- Nhu cầu: _ghi trước, bổ sung sau_

**Persona B — nhiều deadline, hay trì hoãn**

- Thích nhất: AI Planner đẻ ra lịch thật, sửa được
- Bực nhất: học xong không thấy gì thay đổi — thanh tiến độ vẫn 0%, cảm giác "học mà như chưa học"
- Nhu cầu: _công sức bỏ ra phải thấy được ngay_

**Persona C — bám GPA**

- Thích nhất: dự báo GPA
- Vấp: biết "cần trung bình 3.6 các tín chỉ còn lại" nhưng **không biết phải làm gì với con số đó** — không ai học "tín chỉ còn lại", người ta học Giải thuật và Xác suất
- Nhu cầu: _quy đổi mục tiêu GPA về điểm cần đạt ở từng môn cụ thể đang học_

### 2.3. Kết luận UX

Ba nhu cầu trên **khớp chính xác** với ba khoảng trống PM tìm được bằng code. Đó là tín hiệu tốt: hai cách tiếp cận độc lập chỉ về cùng một chỗ.

---

## 3. Vai Senior Product Designer — biến ý tưởng thành flow

Nguyên tắc chung: **không thêm trang mới**. Cả ba tính năng sống trong màn hình đã có.

### 3.1. F1 — Quick capture

**Flow:**

```
[Bất kỳ đâu]  →  Bấm "Add assignment"
                        ↓
        ┌───────────────────────────────┐
        │  Tiêu đề        [___________] │  ← chỉ 2 trường bắt buộc
        │  Hạn nộp        [___________] │
        │                               │
        │  ▸ Thêm chi tiết (tuỳ chọn)   │  ← thu gọn mặc định
        │                               │
        │         [ Thêm bài tập ]      │
        └───────────────────────────────┘
                        ↓
        Lưu xong → chip nhỏ: "Đã thêm. Bổ sung môn học & trọng số?"
```

**Chi tiết thiết kế:**

- Phần "Thêm chi tiết" chứa: môn học, trọng số, độ ưu tiên, tiến độ, điểm, ghi chú, lặp lại, nhắc nhở — **giữ nguyên toàn bộ**, chỉ đổi từ luôn hiện thành thu gọn.
- Mặc định khi bỏ trống: `weight = 0`, `priority = medium`, `course_id = null`.
- Bài tập chưa có môn học hiển thị chip xám **"Chưa có môn"** trên thẻ, bấm vào là gán được ngay tại chỗ.
- **Không** dùng dấu chấm than hay màu cảnh báo cho bài thiếu thông tin — thiếu trọng số là chuyện bình thường, không phải lỗi.

**Vì sao không làm ngược lại (form riêng "quick add"):** hai form cho cùng một việc sẽ lệch nhau theo thời gian, và người dùng phải học hai giao diện. Một form co giãn thì không.

### 3.2. F2 — Nhắc cập nhật tiến độ sau phiên Focus

**Flow:**

```
Hết 25 phút
    ↓
┌──────────────────────────────────────────┐
│  🦉  Xong một chu kỳ.                     │
│                                          │
│  Bài luận Triết học                      │
│  Tiến độ:  [====------]  40%             │  ← kéo được ngay
│            ↑ đang là 40%                 │
│                                          │
│  [ Bỏ qua ]          [ Lưu tiến độ ]     │
└──────────────────────────────────────────┘
    ↓                        ↓
 Nghỉ giải lao          Lưu + nghỉ giải lao
```

**Chi tiết thiết kế:**

- Chỉ hiện khi phiên **có gắn assignment**. Phiên "General study" bỏ qua bước này (không có gì để cập nhật).
- Thanh trượt **khởi tạo bằng giá trị hiện tại**, không phải 0 — sinh viên chỉnh chứ không nhập lại.
- "Bỏ qua" là hành động hạng nhất, không phải chữ nhỏ mờ. Không ép buộc.
- Nếu kéo lên 100% → hiện thêm lựa chọn **"Đánh dấu hoàn thành"**.
- Break vẫn bắt đầu ngay lập tức phía sau; hộp thoại này không chặn đồng hồ nghỉ.

**Nguyên tắc quan trọng — không tự đoán:** app **không** tự suy ra tiến độ từ thời gian học. Học 2 tiếng không có nghĩa là xong 50%. App chỉ **bỏ đi 6 bước điều hướng**, còn con số vẫn do sinh viên quyết.

### 3.3. F3 — Dự báo GPA theo môn sắp học

**Vị trí:** thẻ mới trên trang `/gpa`, đặt **ngay dưới `OnTrackCard`** — vì nó chính là phần trả lời tiếp cho con số mà thẻ kia vừa nêu. Không phải trang mới.

```
┌──────────────────────────────────────────────────────────┐
│  Cần bao nhiêu điểm mỗi môn?                             │
│                                                          │
│  Hiện tại   GPA 3.40  ·  9 tín chỉ đã tính               │
│  Mục tiêu   [ 3.6 ]                                      │
│                                                          │
│  →  Cần 3.80 ở mỗi môn dưới đây                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ CS302  Giải thuật      4 tín   [ 3.80 ]      🔓   │  │
│  │ MA201  Xác suất        3 tín   [ 3.80 ]      🔓   │  │
│  │ EN101  Tiếng Anh       2 tín   [ 3.80 ]      🔓   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  9 tín chỉ từ 3 môn chưa có điểm                         │
└──────────────────────────────────────────────────────────┘
```

**Sau khi sinh viên khoá một môn** (bấm 🔓 → 🔒, tự nhập điểm mình tin là đạt được):

```
│  →  Cần 3.64 ở 2 môn còn lại                             │
│                                                          │
│  │ CS302  Giải thuật      4 tín   [ 4.00 ]      🔒   │   │  ← đã khoá
│  │ MA201  Xác suất        3 tín   [ 3.64 ]      🔓   │   │  ← tính lại
│  │ EN101  Tiếng Anh       2 tín   [ 3.64 ]      🔓   │   │  ← tính lại
```

> Bộ số trên **đã kiểm chứng bằng công thức thật**, không phải minh hoạ ước chừng: GPA 3.40 trên 9 tín, mục tiêu 3.6, 9 tín sắp tới → cần 3.80/môn; khoá môn 4 tín ở 4.0 → hai môn còn lại thành 3.64, và GPA kết thúc đúng 3.600. Mức cao nhất có thể đạt trong ví dụ này là 3.70.

**Chi tiết thiết kế:**

- Mặc định **mọi môn cùng một mức** — đó là câu trả lời trung thực khi chưa biết gì thêm về từng môn.
- Khoá một môn = "tôi tin môn này được 4.0". Các môn chưa khoá **tự tính lại ngay**, không cần bấm nút.
- Số tín chỉ hiển thị cạnh mỗi môn, vì đó là lý do các con số **không** bằng nhau khi đã khoá — môn 4 tín kéo GPA mạnh hơn môn 2 tín.
- Dòng cuối luôn ghi **tổng tín chỉ và số môn đang tính**, để sinh viên phát hiện ngay nếu thiếu môn (xem §4.3).
- Mục tiêu GPA lấy từ `profiles.target_gpa`, chỉnh được ngay tại chỗ mà **không lưu** — giống What-if của `ForecastCard` đã làm.

**Năm trạng thái:**

| Trạng thái      | Điều kiện                | Hiển thị                                                                                        |
| --------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| Bình thường     | cần ≤ 4.0                | Điểm cần cho từng môn                                                                           |
| Không thể       | cần > 4.0                | "Không đạt được 3.6 với 9 tín chỉ này — cao nhất có thể là 3.55"                                |
| Đã chắc suất    | cần ≤ 0                  | "Đã chắc — kể cả rớt hết các môn này bạn vẫn trên 3.6"                                          |
| Chưa có môn nào | không môn nào thiếu điểm | "Thêm môn học kỳ tới vào Courses để xem cần bao nhiêu điểm"                                     |
| Đã khoá hết     | mọi môn đều khoá         | Không hiện "cần bao nhiêu" nữa, mà hiện **GPA kết quả**: "Với các điểm này bạn kết thúc ở 3.58" |

**Điểm quan trọng — trạng thái 4 không phải lỗi.** Sinh viên chưa nhập môn kỳ sau là chuyện bình thường; thẻ này chỉ nói cần thêm gì, không cảnh báo.

---

## 4. Vai Senior Full-stack Technical Lead — khả thi và rủi ro

### 4.1. F1 — Quick capture · Rủi ro **THẤP**

**Không cần migration.** Đây là điểm mấu chốt:

- `course_id` **đã** nullable → chỉ cần bỏ `required` ở UI và bỏ check ở `validateAssignment`
- `weight` NOT NULL nhưng chỉ cần **mặc định 0 ở server action**, không cần đổi schema
- `priority` đã có default

**Vì sao `weight = 0` an toàn:** các hàm tính điểm đã tự loại trừ nó từ trước:

```ts
// lib/rules/gpa.ts:263-264
const totalWeight = graded.reduce((s, a) => s + a.weight, 0);
if (graded.length === 0 || totalWeight === 0) return null;
```

```ts
// lib/rules/gpa.ts:320-321
const totalWeight = assignments.reduce((s, a) => s + a.weight, 0);
if (totalWeight === 0) return null;
```

Bài có `weight = 0` **không làm sai lệch** dự báo điểm — nó chỉ đơn giản không đóng góp. Đúng nghĩa ngữ nghĩa: "chưa biết trọng số" thì không nên ảnh hưởng dự báo.

**Cần kiểm tra khi làm:** `lib/gemini/prompt.ts:29` đưa `weight` vào prompt. Với `weight 0%`, AI Planner có thể xếp bài đó xuống cuối. Phải sửa prompt để phân biệt **"trọng số 0"** với **"chưa rõ trọng số"** — nếu không, quick capture sẽ vô tình làm bài tập bị AI bỏ qua.

**Rủi ro còn lại:** bài tập không có môn học sẽ không xuất hiện trong thống kê theo môn. Chấp nhận được và đã có tiền lệ — Focus timer vừa mở "General study" theo đúng logic này.

### 4.2. F2 — Nhắc tiến độ · Rủi ro **THẤP**

- Dùng lại `updateAssignment` action đã có, không cần action mới
- Không cần schema mới
- Ownership đã được `assignmentBelongsToCaller` bảo vệ

**Ba rủi ro cần xử lý:**

1. **Offline.** Phiên Focus có thể chạy khi mất mạng (đã có hàng đợi offline). Việc cập nhật tiến độ phải đi qua **cùng hàng đợi** `enqueueMutation("updateAssignment", …)`, không được gọi thẳng — nếu không sẽ mất dữ liệu khi offline.

2. **Xung đột.** `updateAssignment` đã có `snapshotUpdatedAt` để phát hiện chỉnh sửa đồng thời. Hộp thoại này phải gửi kèm snapshot, nếu không sẽ ghi đè thay đổi từ tab khác.

3. **Assignment bị xoá giữa phiên.** Nếu bài bị xoá trong lúc đang học, hộp thoại phải **không hiện** thay vì lỗi. Kiểm tra `assignmentId` còn nằm trong danh sách hiện tại trước khi render.

### 4.3. F3 — Dự báo GPA theo môn · Rủi ro **THẤP**

Bản này **an toàn hơn hẳn** bản dự báo theo trọng số bài tập đã bị loại (xem §6). Toàn bộ đầu vào đều là số sinh viên đã tự nhập, không có suy đoán nào.

**Công thức** — chính là `requiredAverage` đã có, không cần hàm toán mới:

```
tổngTínChỉ    = tínChỉĐãTính + Σ(tín chỉ mọi môn chưa có điểm)
qpĐãBiết      = qpHiệnTại + Σ(điểm khoá × tín chỉ)   ← môn đã khoá
tínChỉChưaKhoá = Σ(tín chỉ các môn chưa khoá)

điểmCầnMỗiMôn = (mụcTiêu × tổngTínChỉ − qpĐãBiết) ÷ tínChỉChưaKhoá
```

Đây đúng là `requiredAverage(mụcTiêu, tínChỉĐãTính + tínChỉĐãKhoá, tínChỉChưaKhoá, qpĐãBiết)` — hàm đã tồn tại và **đã có test**. Việc khoá môn chỉ là chuyển tín chỉ và quality point của môn đó từ vế "còn lại" sang vế "đã biết".

**Sáu trường hợp biên phải xử lý:**

| Trường hợp          | Xảy ra khi                                 | Xử lý                                                         |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Chia cho 0          | `tínChỉChưaKhoá = 0` (khoá hết môn)        | Không tính "cần bao nhiêu" — hiện **GPA kết quả** thay thế    |
| Không có môn nào    | Mọi môn đều đã có điểm                     | Trạng thái rỗng, không phải lỗi                               |
| Cần > 4.0           | Mục tiêu quá cao so với số tín chỉ còn lại | Nêu mức cao nhất có thể đạt                                   |
| Cần ≤ 0             | Đã chắc suất                               | "Kể cả rớt hết vẫn trên mục tiêu"                             |
| Chưa có điểm nào    | `tínChỉĐãTính = 0`                         | Công thức vẫn đúng: cần đúng bằng mục tiêu ở mọi môn          |
| Điểm khoá ngoài 0–4 | Sinh viên gõ 5                             | Chặn ở input, cùng ràng buộc `CHECK (grade_point 0–4)` của DB |

**Rủi ro thật duy nhất — danh sách môn không đầy đủ.** Nếu sinh viên mới nhập 2 trong 5 môn kỳ tới, dự báo sẽ tính trên 2 môn và ra con số sai.

Khác với bản bị loại, rủi ro này **nhìn thấy được và tự sửa được**: thẻ luôn ghi rõ _"9 tín chỉ từ 3 môn chưa có điểm"_ ngay dưới danh sách. Sinh viên biết mình học 5 môn sẽ lập tức thấy con số không khớp và vào Courses thêm. Còn ở bản trọng số bài tập, không cách nào biết "60% này là do thiếu bài hay do môn chỉ tính 60%".

**Không cần schema mới:** mục tiêu và điểm khoá đều là trạng thái tạm trên client, không lưu DB — giống What-if simulator của `ForecastCard` đã làm.

### 4.4. Bảng tổng hợp rủi ro

|     | Migration | Action mới | Gọi AI | Ghi DB    | Rủi ro chính                                     |
| --- | --------- | ---------- | ------ | --------- | ------------------------------------------------ |
| F1  | Không     | Không      | Không  | Có        | Prompt AI hiểu nhầm `weight 0`                   |
| F2  | Không     | Không      | Không  | Có        | Offline queue + xung đột                         |
| F3  | Không     | Không      | Không  | **Không** | Danh sách môn thiếu → số sai, nhưng tự thấy được |

Không tính năng nào cần bảng mới, cột mới, hay chi phí API tăng thêm. **F3 không ghi gì vào DB** — nó chỉ đọc và tính, nên không có rủi ro làm hỏng dữ liệu.

---

## 5. Cuộc họp chung — quyết định

### 5.1. Thứ tự thực hiện

```
F1 (Quick capture)  →  F2 (Nhắc tiến độ)  →  F3 (Dự báo GPA theo môn)
     S                      M                        M
```

**Vì sao thứ tự này:**

1. **F1 trước** — rẻ nhất, rủi ro thấp nhất, và nó **làm tăng lượng dữ liệu đầu vào** cho mọi thứ phía sau. Nhiều bài tập được ghi hơn → Planner tốt hơn, Risk chính xác hơn.
2. **F2 tiếp** — phụ thuộc vào việc có bài tập để gắn (F1 tạo ra chúng), và đóng luôn việc còn tồn từ audit trước.
3. **F3 cuối** — nhưng lý do khác hai cái trên: F3 **không phụ thuộc dữ liệu** của F1/F2. Nó đọc `courses` và `grades`, hai bảng F1/F2 không đụng tới, nên **về kỹ thuật có thể làm bất cứ lúc nào**.

> ⚠️ **F3 đã trở thành độc lập** sau khi đổi hướng. Bản cũ (theo trọng số bài tập) phải xếp cuối vì cần F1 làm sinh viên chịu nhập trọng số. Bản GPA thì không — nó chỉ cần `courses.credits`, thứ đã bắt buộc từ trước (`CHECK credits > 0`).
>
> Vẫn xếp cuối vì **giá trị/công sức thấp hơn**: F1 và F2 gỡ ma sát trên luồng hằng ngày, còn F3 phục vụ một câu hỏi mang tính thời điểm (đầu kỳ, lúc đăng ký môn). Nếu muốn có thứ gây ấn tượng nhanh, **F3 làm trước cũng được** mà không phá vỡ gì.

### 5.2. Chỉ số đo lường

| Tính năng | Chỉ số                                                                   | Hiện tại         | Mục tiêu |
| --------- | ------------------------------------------------------------------------ | ---------------- | -------- |
| F1        | Số bài tập tạo / người dùng hoạt động / tuần                             | cần đo           | +40%     |
| F1        | Tỉ lệ bài tập được bổ sung trọng số trong 7 ngày                         | —                | > 50%    |
| F2        | Tỉ lệ phiên Focus hoàn thành có cập nhật tiến độ                         | 0% (bất khả thi) | > 35%    |
| F2        | Độ lệch giữa `progress` và thực tế                                       | không đo được    | —        |
| F3        | Tỉ lệ người dùng có ≥1 môn chưa có điểm trong Courses                    | cần đo           | > 70%    |
| F3        | Tỉ lệ mở `/gpa` có tương tác với thẻ dự báo (đổi mục tiêu hoặc khoá môn) | —                | > 25%    |

**Bắc đẩu (giữ nguyên từ audit trước):** số phiên học **đã lên kế hoạch và thực hiện được** mỗi tuần.

### 5.3. Định nghĩa hoàn thành

Mỗi tính năng chỉ được coi là xong khi:

- [ ] `tsc`, `lint`, `format:check` sạch
- [ ] Có unit test cho phần logic thuần (đặt trong `lib/rules/`)
- [ ] Có E2E test cho luồng chính
- [ ] **Chứng minh test bắt được hồi quy** (cố tình phá, xem test có đỏ không)
- [ ] Kiểm chứng trên trình duyệt thật với dữ liệu thật
- [ ] Dọn sạch dữ liệu test sau khi kiểm chứng
- [ ] Dark mode + mobile 375px: 0 tràn ngang, 0 lỗi console

---

## 6. Những gì KHÔNG làm — và vì sao

Ghi lại để sau này không ai tưởng là bị bỏ sót.

| Ý tưởng                                             | Vì sao không                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bảng xếp hạng / so sánh bạn bè**                  | Thêm một cơ chế giữ chân **cạnh tranh** với cơ chế trung thực app đang có. Học tập không phải trò chơi tổng bằng không, và so sánh GPA công khai là rủi ro tâm lý thật.                                                                                                                                                                                                                                        |
| **AI chat tutor**                                   | Bề mặt AI thứ hai, chi phí token tăng theo lượt chat (không theo tuần như Planner), và không ai kiểm chứng được câu trả lời có đúng không. Planner an toàn vì output của nó được validate lại server-side.                                                                                                                                                                                                     |
| **Gamification streak (huy hiệu, cấp độ)**          | Streak hiện tại trung thực vì nó chỉ đếm việc có thật. Thêm phần thưởng sẽ tạo động cơ **gian lận chính mình** — bấm timer rồi bỏ đó.                                                                                                                                                                                                                                                                          |
| **Chia sẻ lịch / nhóm học**                         | Cần mô hình quyền hạn hoàn toàn mới, phá vỡ mô hình RLS "mỗi người một cõi" đang rất chắc chắn (đã kiểm chứng 15/15 bảng chặn truy cập chéo). Chi phí bảo mật rất lớn.                                                                                                                                                                                                                                         |
| **Tích hợp LMS (Moodle/Canvas)**                    | Giá trị cao nhưng phụ thuộc từng trường, không có API chuẩn, và mỗi trường một kiểu xác thực. Đây là dự án riêng, không phải một tính năng.                                                                                                                                                                                                                                                                    |
| **Tự suy tiến độ từ thời gian học**                 | Học 2 tiếng ≠ xong 50%. Đây là **bịa dữ liệu**, đúng thứ mà quyết định PROD-05 đã bác bỏ.                                                                                                                                                                                                                                                                                                                      |
| **Dự báo điểm theo trọng số bài tập trong một môn** | Từng là bản F3 đầu tiên, **đã loại**. Công thức cần biết "còn bao nhiêu trọng số chưa chấm", nhưng app không phân biệt được _sinh viên chưa nhập hết bài_ với _môn chỉ tính 60% qua bài tập_ — hai trường hợp cho ra dự báo sai hoàn toàn khác nhau, và không có cách nào tự phát hiện. Bản GPA thay thế không có vấn đề này vì mọi đầu vào đều là số sinh viên đã tự nhập và số môn thiếu thì nhìn thấy ngay. |

---

## 7. Đặc tả thi công

### 7.1. F1 — Quick capture

**File cần sửa:**

| File                                        | Việc                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/rules/assignment.ts`                   | Bỏ `courseId` và `weight` khỏi `validateAssignment`; giữ nguyên kiểm tra khoảng giá trị khi **có** nhập |
| `app/(app)/assignments/actions.ts`          | Mặc định `weight = 0`, `priority = "medium"`, `course_id = null` khi để trống                           |
| `components/assignments/AssignmentForm.tsx` | Gom các trường tuỳ chọn vào `<details>` thu gọn                                                         |
| `components/assignments/AssignmentCard.tsx` | Chip "Chưa có môn" + bấm để gán nhanh                                                                   |
| `lib/gemini/prompt.ts`                      | Phân biệt "trọng số 0" và "chưa rõ trọng số" trong prompt                                               |
| `tests/rules/assignment.test.ts`            | Test: thiếu môn/trọng số vẫn hợp lệ; giá trị ngoài khoảng vẫn bị chặn                                   |
| `tests/e2e/assignments.spec.ts`             | Test: tạo bài chỉ với tiêu đề + hạn nộp                                                                 |

**Tiêu chí nghiệm thu:**

- Tạo được bài tập chỉ với tiêu đề và hạn nộp
- Bài tập thiếu trọng số **không** làm thay đổi dự báo điểm của môn
- Bài tập không có môn học vẫn hiện đúng trong danh sách, có lối gán môn
- Nhập trọng số ngoài 0–100 vẫn bị từ chối như cũ

### 7.2. F2 — Nhắc tiến độ sau phiên Focus

**File cần sửa:**

| File                                              | Việc                                                         |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `components/focus/FocusTimer.tsx`                 | Sau chu kỳ hoàn thành, hiện hộp cập nhật tiến độ             |
| `components/focus/SessionProgressPrompt.tsx`      | **File mới** — hộp thoại thanh trượt                         |
| `lib/offline/queue.ts`                            | Đi qua hàng đợi offline sẵn có, không gọi thẳng              |
| `tests/components/SessionProgressPrompt.test.tsx` | **File mới**                                                 |
| `tests/e2e/focus.spec.ts`                         | Test: hoàn thành chu kỳ → cập nhật tiến độ → xác nhận đã lưu |

**Tiêu chí nghiệm thu:**

- Chỉ hiện khi phiên có gắn assignment
- Thanh trượt khởi tạo đúng bằng giá trị hiện tại
- "Bỏ qua" không lưu gì, và break vẫn chạy bình thường
- Offline: cập nhật vào hàng đợi, đồng bộ khi có mạng lại
- Assignment bị xoá giữa chừng: không hiện hộp thoại, không lỗi

### 7.3. F3 — Dự báo GPA theo môn sắp học

**File cần sửa:**

| File                                     | Việc                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| `lib/rules/gpa.ts`                       | Thêm `perCourseTargets()` — bọc quanh `requiredAverage` đã có |
| `components/gpa/PerCourseTargetCard.tsx` | **File mới** — thẻ có danh sách môn, khoá/mở, ô mục tiêu      |
| `components/gpa/GpaContent.tsx`          | Truy vấn môn chưa có điểm; đặt thẻ ngay dưới `OnTrackCard`    |
| `tests/rules/gpa.test.ts`                | Test 5 trạng thái + 6 trường hợp biên ở §4.3                  |
| `tests/e2e/gpa.spec.ts`                  | Test: đổi mục tiêu và khoá một môn thì các môn khác tính lại  |

**Truy vấn môn chưa có điểm** (`GpaContent.tsx`) — RLS đã giới hạn theo người dùng nên không cần thêm điều kiện:

```sql
select c.id, c.code, c.name, c.credits, c.semester
from courses c
where not exists (
  select 1 from grades g where g.course_id = c.id
)
order by c.semester, c.code
```

**Chữ ký hàm đề xuất:**

```ts
export type PerCourseTargetStatus =
  | "ok" // cần ≤ 4.0
  | "impossible" // cần > 4.0
  | "secured" // cần ≤ 0
  | "no-courses" // không môn nào thiếu điểm
  | "all-locked"; // đã khoá hết — hiện GPA kết quả thay vì "cần bao nhiêu"

export interface UpcomingCourse {
  id: string;
  code: string | null;
  name: string;
  credits: number;
  /** Điểm sinh viên tự khoá; null = để hệ thống tính. */
  lockedGradePoint: number | null;
}

export interface PerCourseTargetResult {
  status: PerCourseTargetStatus;
  /** Điểm cần đạt ở mỗi môn CHƯA khoá. Null khi all-locked/no-courses. */
  requiredPerUnlockedCourse: number | null;
  /** GPA cuối cùng nếu mọi môn đạt đúng như đang hiển thị. */
  projectedGpa: number;
  /** Mức cao nhất còn có thể đạt (mọi môn chưa khoá được 4.0). */
  maxAchievableGpa: number;
  totalUpcomingCredits: number;
  upcomingCourseCount: number;
}

export function perCourseTargets(
  currentQP: number,
  doneCredits: number,
  targetGpa: number,
  courses: UpcomingCourse[],
): PerCourseTargetResult;
```

**Tiêu chí nghiệm thu:**

- GPA 3.40 / **9 tín**, mục tiêu 3.6, 3 môn (4+3+2 tín) → cần **3.80** ở mỗi môn
- Khoá môn 4 tín ở 4.0 → hai môn còn lại tính lại thành **3.64**, không phải vẫn 3.80
- Cùng dữ liệu đó, `maxAchievableGpa` phải ra **3.70**
- Đổi thành 18 tín đã tính (giữ nguyên phần còn lại) → cần đúng **4.00**, tức sát trần; nếu mục tiêu nhích lên 3.61 thì phải chuyển sang trạng thái "không thể"
- Khoá **hết** môn → không hiện "cần bao nhiêu", hiện GPA kết quả
- Mục tiêu quá cao → trạng thái "không thể" **kèm mức cao nhất đạt được**
- Chưa có môn nào chưa điểm → trạng thái rỗng, **không phải cảnh báo**
- Chưa có điểm nào (`doneCredits = 0`) → cần đúng bằng mục tiêu ở mọi môn
- Không có `Infinity`/`NaN` lọt ra UI trong bất kỳ trường hợp nào
- Số tín chỉ và số môn đang tính **luôn hiển thị**, kể cả khi dự báo bình thường

---

## 8. Ước lượng

| Tính năng | Code     | Test     | Kiểm chứng | Tổng         |
| --------- | -------- | -------- | ---------- | ------------ |
| F1        | 0.5 ngày | 0.5 ngày | 0.5 ngày   | **1.5 ngày** |
| F2        | 1 ngày   | 0.5 ngày | 0.5 ngày   | **2 ngày**   |
| F3        | 1 ngày   | 1 ngày   | 0.5 ngày   | **2.5 ngày** |
|           |          |          |            | **6 ngày**   |

---

## 9. Việc còn tồn không thuộc phạm vi này

Ghi lại để không bị quên:

1. **12 GitHub secret chưa cấu hình** → job `e2e` trên CI vẫn fail. Chỉ chủ repo đặt được.
2. **Lock file sinh trên Windows** → CI phải dùng `npm install` thay vì `npm ci`. Cần sinh lại lock trên Linux.
3. **HYD-001** — cảnh báo hydration thấy trong log E2E, chưa tái hiện được.
4. **Thiết kế lại trang Settings** — đang chờ ảnh mẫu dưới 2000px.
