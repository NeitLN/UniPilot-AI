# UniPilot — Quyết định tính năng tiếp theo

**Ngày:** 2026-08-06
**Commit gốc:** `7cceb0e`
**Quy trình:** 4 vai đánh giá độc lập (Product Manager → UX Researcher + Gen Z Beta Tester → Senior Product Designer → Senior Full-stack Technical Lead), sau đó hợp nhất thành quyết định chung.

---

## 0. Tóm tắt quyết định

**Làm 3 tính năng. Không làm 5 tính năng.**

| #      | Tính năng                                                           | Vì sao                                                 | Effort |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| **F1** | **Quick capture** — thêm bài tập chỉ với tiêu đề + hạn nộp          | Hành động thường xuyên nhất đang có form nặng nhất     | **S**  |
| **F2** | **Nhắc cập nhật tiến độ sau phiên Focus**                           | Hai tính năng dùng nhiều nhất không hề nối với nhau    | **M**  |
| **F3** | **Dự báo điểm theo từng môn** — "cần bao nhiêu điểm ở phần còn lại" | Câu hỏi phổ biến nhất của sinh viên, dữ liệu đã có sẵn | **M**  |

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

#### Khoảng trống 3 — Không trả lời được câu hỏi phổ biến nhất

`predictedCourseScore` (`lib/rules/gpa.ts:259`) chỉ tính trung bình **những gì đã có điểm**. Không có hàm nào trả lời: _"tôi cần bao nhiêu điểm ở phần còn lại để đạt 80% môn này?"_

`requiredAverage` có tồn tại — nhưng ở **cấp GPA toàn khoá**, tức "cần trung bình 3.6 cho các tín chỉ còn lại". Đó là con số trừu tượng. Còn "cần 78% bài cuối kỳ để giữ điểm A môn Cấu trúc dữ liệu" là con số **hành động được ngay**.

Dữ liệu đã có đủ: mỗi assignment có `weight` và `score`.

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
- Vấp: biết "cần trung bình 3.6 các tín chỉ còn lại" nhưng **không biết phải làm gì với con số đó tuần này**
- Nhu cầu: _quy đổi mục tiêu về hành động cụ thể của từng môn_

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

### 3.3. F3 — Dự báo điểm theo môn

**Vị trí:** thẻ mới trong modal chi tiết môn học (`/courses` → bấm vào một môn), không phải trang mới.

```
┌────────────────────────────────────────────────┐
│  Dự báo điểm — Cấu trúc dữ liệu                │
│                                                │
│  Đã chấm      60% trọng số   →  trung bình 82% │
│  Còn lại      40% trọng số   →  chưa chấm      │
│                                                │
│  Muốn kết thúc ở:   [ 80 ]%                    │
│                                                │
│  →  Cần đạt  77%  ở phần còn lại               │
│      "Trong tầm với."                          │
└────────────────────────────────────────────────┘
```

**Bốn trạng thái:**

| Trạng thái        | Điều kiện                      | Hiển thị                                                                                             |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Bình thường       | cần ≤ 100%                     | Số cần đạt + đánh giá                                                                                |
| Không thể         | cần > 100%                     | "Không thể đạt bằng phần còn lại" — nêu mức cao nhất có thể                                          |
| Đã chắc chắn      | đạt kể cả khi phần còn lại = 0 | "Đã chắc suất — kể cả bỏ trống phần còn lại"                                                         |
| **Thiếu dữ liệu** | tổng trọng số ≠ 100 (±2)       | Không hiện dự báo. Thay bằng: "Trọng số các bài mới cộng được 60%. Thêm phần còn lại để xem dự báo." |

Trạng thái thứ tư là quan trọng nhất — xem mục 4.3.

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

### 4.3. F3 — Dự báo điểm theo môn · Rủi ro **TRUNG BÌNH** ⚠️

Đây là tính năng duy nhất có rủi ro thật, và rủi ro nằm ở **tính đúng đắn của con số**, không phải ở kỹ thuật.

**Vấn đề:** công thức cần biết _"còn bao nhiêu trọng số chưa chấm"_. App chỉ biết trọng số của **những bài sinh viên đã nhập**.

Nếu tổng trọng số các bài đã nhập là **60%**, có hai khả năng hoàn toàn khác nhau:

- Sinh viên **chưa nhập hết** bài tập (còn 40% ở các bài chưa ghi) → dự báo sẽ **sai**
- Môn học **chỉ tính 60%** qua bài tập, 40% còn lại là chuyên cần/thi vấn đáp → dự báo cũng **sai**

App không thể phân biệt hai trường hợp này.

**Cách xử lý bắt buộc:** chỉ hiển thị dự báo khi tổng trọng số nằm trong khoảng **98–102%**. Ngoài khoảng đó, **không đoán** — hiện thông báo yêu cầu bổ sung trọng số.

> Đây chính là nguyên tắc đã áp dụng ở quyết định PROD-05 (`docs/DESIGN_PIXEL_MATCH_GAP_REVIEW.md` W9): **không bịa nhãn từ dữ liệu không tồn tại**. Một dự báo điểm sai còn nguy hiểm hơn không có dự báo — sinh viên có thể dựa vào đó mà học ít đi.

**Không cần schema mới:** mục tiêu điểm nhập trực tiếp trên thẻ (giống What-if simulator của GPA đã làm), không lưu vào DB.

### 4.4. Bảng tổng hợp rủi ro

|     | Migration | Action mới | Gọi AI | Rủi ro chính                              |
| --- | --------- | ---------- | ------ | ----------------------------------------- |
| F1  | Không     | Không      | Không  | Prompt AI hiểu nhầm `weight 0`            |
| F2  | Không     | Không      | Không  | Offline queue + xung đột                  |
| F3  | Không     | Không      | Không  | **Dự báo sai khi trọng số không đủ 100%** |

Không tính năng nào cần bảng mới, cột mới, hay chi phí API tăng thêm.

---

## 5. Cuộc họp chung — quyết định

### 5.1. Thứ tự thực hiện

```
F1 (Quick capture)  →  F2 (Nhắc tiến độ)  →  F3 (Dự báo môn)
     S                      M                     M
```

**Vì sao thứ tự này:**

1. **F1 trước** — rẻ nhất, rủi ro thấp nhất, và nó **làm tăng lượng dữ liệu đầu vào** cho mọi thứ phía sau. Nhiều bài tập được ghi hơn → Planner tốt hơn, Risk chính xác hơn, F3 có dữ liệu để dự báo.
2. **F2 tiếp** — phụ thuộc vào việc có bài tập để gắn (F1 tạo ra chúng), và đóng luôn việc còn tồn từ audit trước.
3. **F3 cuối** — cần trọng số đầy đủ mới chạy được, mà F1 chính là thứ khiến sinh viên chịu khó nhập trọng số (vì giờ nhập được **sau**, không bị ép nhập ngay).

Ba tính năng này **không độc lập** — chúng xếp theo đúng thứ tự phụ thuộc dữ liệu.

### 5.2. Chỉ số đo lường

| Tính năng | Chỉ số                                           | Hiện tại         | Mục tiêu |
| --------- | ------------------------------------------------ | ---------------- | -------- |
| F1        | Số bài tập tạo / người dùng hoạt động / tuần     | cần đo           | +40%     |
| F1        | Tỉ lệ bài tập được bổ sung trọng số trong 7 ngày | —                | > 50%    |
| F2        | Tỉ lệ phiên Focus hoàn thành có cập nhật tiến độ | 0% (bất khả thi) | > 35%    |
| F2        | Độ lệch giữa `progress` và thực tế               | không đo được    | —        |
| F3        | Tỉ lệ môn học có đủ trọng số 100%                | cần đo           | > 60%    |

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

| Ý tưởng                                    | Vì sao không                                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bảng xếp hạng / so sánh bạn bè**         | Thêm một cơ chế giữ chân **cạnh tranh** với cơ chế trung thực app đang có. Học tập không phải trò chơi tổng bằng không, và so sánh GPA công khai là rủi ro tâm lý thật.                                    |
| **AI chat tutor**                          | Bề mặt AI thứ hai, chi phí token tăng theo lượt chat (không theo tuần như Planner), và không ai kiểm chứng được câu trả lời có đúng không. Planner an toàn vì output của nó được validate lại server-side. |
| **Gamification streak (huy hiệu, cấp độ)** | Streak hiện tại trung thực vì nó chỉ đếm việc có thật. Thêm phần thưởng sẽ tạo động cơ **gian lận chính mình** — bấm timer rồi bỏ đó.                                                                      |
| **Chia sẻ lịch / nhóm học**                | Cần mô hình quyền hạn hoàn toàn mới, phá vỡ mô hình RLS "mỗi người một cõi" đang rất chắc chắn (đã kiểm chứng 15/15 bảng chặn truy cập chéo). Chi phí bảo mật rất lớn.                                     |
| **Tích hợp LMS (Moodle/Canvas)**           | Giá trị cao nhưng phụ thuộc từng trường, không có API chuẩn, và mỗi trường một kiểu xác thực. Đây là dự án riêng, không phải một tính năng.                                                                |
| **Tự suy tiến độ từ thời gian học**        | Học 2 tiếng ≠ xong 50%. Đây là **bịa dữ liệu**, đúng thứ mà quyết định PROD-05 đã bác bỏ.                                                                                                                  |

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

### 7.3. F3 — Dự báo điểm theo môn

**File cần sửa:**

| File                                        | Việc                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `lib/rules/gpa.ts`                          | Thêm `courseGradeForecast(assignments, targetPercent)` |
| `components/courses/CourseForecastCard.tsx` | **File mới**                                           |
| `components/courses/CourseCard.tsx`         | Gắn thẻ vào modal chi tiết môn                         |
| `tests/rules/gpa.test.ts`                   | Test 4 trạng thái + biên trọng số                      |

**Chữ ký hàm đề xuất:**

```ts
export type CourseForecastStatus =
  | "ok" // cần ≤ 100%
  | "impossible" // cần > 100%
  | "secured" // đạt kể cả khi phần còn lại = 0
  | "incomplete-weights"; // tổng trọng số ngoài 98–102%

export interface CourseForecast {
  status: CourseForecastStatus;
  gradedWeight: number; // % trọng số đã chấm
  remainingWeight: number; // % trọng số chưa chấm
  currentAverage: number | null;
  requiredOnRemaining: number | null;
  maxAchievable: number; // điểm cao nhất còn có thể đạt
}
```

**Tiêu chí nghiệm thu:**

- Tổng trọng số 60% → **không** hiện dự báo, hiện lời nhắc bổ sung
- Tổng trọng số 100% → hiện đúng số cần đạt
- Cần > 100% → trạng thái "không thể", nêu mức cao nhất có thể đạt
- Đã chắc suất → nói rõ, không bắt học thêm vô ích
- Test biên: tổng 98%, 100%, 102% đều hiện; 97% và 103% thì không

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
