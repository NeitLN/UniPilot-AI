# UniPilot AI — Build Roadmap

> Personal Student Life OS · Next.js + TypeScript + Supabase + Gemini
> Tài liệu nguồn: `2474802010391_VoVietTien_UniPilot_AI_SRS_v1.1.docx`
> Design nguồn: `UniPilot_AI_Dashboard_v3.png` · `Pilo_Brand_Kit.png`
> Người build: Võ Việt Tiến — 2474802010391 · Lớp 253_72ITSE41103_01

---

## 0. Cách dùng file này

Mỗi phase là một nhánh Git riêng, merge vào `main` khi xong toàn bộ checklist. Không nhảy phase — thứ tự dưới đây được sắp theo **dependency thật**, không phải theo độ khó.

Mỗi phase có 4 phần:

| Phần | Ý nghĩa |
|---|---|
| **Mục tiêu** | Sau phase này app làm được gì |
| **Bao phủ** | FR / BR / NFR / TC nào trong SRS được hoàn thành |
| **Việc cần làm** | Checklist thực thi |
| **Điều kiện hoàn thành** | Test thủ công phải pass mới được merge |

Quy ước commit: `feat(assignments): add create form` · `fix(gpa): round to 2 decimals` · `chore(db): add focus_sessions table`

---

## 1. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────┐
│  Browser (Next.js App Router, TypeScript)       │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  │
│  │ UI (RSC + │  │ IndexedDB  │  │  Service   │  │
│  │  client)  │  │ cache+queue│  │  Worker    │  │
│  └───────────┘  └────────────┘  └────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │  Next.js Route Handlers │   ← API key sống ở đây, TC-03
        │  /api/plan/generate     │
        │  /api/calendar/sync     │
        │  /api/risk/compute      │
        │  /api/push/send         │
        └────┬──────────┬─────────┘
             │          │
   ┌─────────▼──┐  ┌────▼─────────────┐
   │  Supabase  │  │  Google APIs     │
   │  Postgres  │  │  Calendar (OAuth)│
   │  Auth+RLS  │  │  Gemini          │
   └────────────┘  └──────────────────┘
```

**Nguyên tắc bất di bất dịch:**

1. Gemini API key và Google client secret **không bao giờ** xuất hiện ở client (TC-03). Mọi lời gọi đi qua Route Handler.
2. Mọi bảng bật Row Level Security, policy `user_id = auth.uid()`. Đây là app cá nhân nhưng RLS vẫn bắt buộc (NFR-08).
3. Business rule BR-01 → BR-06 viết **một lần duy nhất** trong `lib/rules/`, cả client lẫn server import chung. Không copy công thức ra component.
4. Mỗi FR phải map được tới ít nhất một file trong repo. Xem bảng truy vết ở mục 12.

---

## 2. Cấu trúc thư mục

```
unipilot-ai/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # sidebar + topbar shell
│   │   ├── page.tsx                # Dashboard
│   │   ├── assignments/page.tsx
│   │   ├── planner/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── focus/page.tsx
│   │   ├── gpa/page.tsx
│   │   └── risk/page.tsx
│   ├── api/
│   │   ├── plan/generate/route.ts
│   │   ├── calendar/sync/route.ts
│   │   ├── risk/compute/route.ts
│   │   └── push/send/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── brand/                      # Pilo, Logo, PiloMood
│   ├── ui/                         # Button, Card, Tag, Progress, Modal
│   ├── dashboard/                  # KpiCard, RiskHud, DueSoonList, TodayList
│   ├── assignments/
│   ├── planner/
│   ├── focus/
│   └── gpa/
├── lib/
│   ├── rules/                      # BR-01..BR-06, thuần hàm, có unit test
│   │   ├── assignment.ts
│   │   ├── gpa.ts
│   │   ├── risk.ts
│   │   ├── plan.ts
│   │   └── focus.ts
│   ├── supabase/                   # client.ts, server.ts, types.ts
│   ├── offline/                    # idb.ts, queue.ts, sync.ts
│   ├── gemini/                     # prompt.ts, schema.ts, client.ts
│   └── calendar/                   # oauth.ts, map.ts
├── public/
│   ├── pilo-mascot.svg
│   ├── pilo-mascot-happy.svg
│   ├── pilo-mascot-sleepy.svg
│   ├── pilo-icon.svg
│   └── sw.js
├── supabase/migrations/
├── tests/
└── docs/
    ├── ROADMAP.md                  # file này
    └── TRACEABILITY.md
```

---

## 3. Design tokens (chốt trước khi code UI)

Dán thẳng vào `tailwind.config.ts` để không bao giờ phải nhớ hex.

```ts
colors: {
  violet:    { DEFAULT: '#6C3CF5', deep: '#5A2FE0', soft: '#8B62FF', tint: '#EDE7FF' },
  lime:      { DEFAULT: '#D8FF4A', deep: '#B8E62E', tint: '#EAFBCF' },
  ink:       { DEFAULT: '#1D1338', 2: '#4A4460', 3: '#8A83A3' },
  coral:     { DEFAULT: '#FF5470', tint: '#FFE7EB' },
  tangerine: { DEFAULT: '#FFB020', tint: '#FFF1D6' },
  mint:      { DEFAULT: '#22DDA6', tint: '#DEFBF1' },
  sky:       { DEFAULT: '#45C2FF' },
  canvas:    '#F2F0FB',
}
fontFamily: {
  display: ['Fredoka', 'sans-serif'],   // tiêu đề + con số, weight 600/700
  sans:    ['Nunito', 'sans-serif'],    // toàn bộ nội dung đọc, weight 400-800
}
borderRadius: { card: '30px', ctl: '16px', pill: '20px' }
```

**Quy tắc màu theo ngữ nghĩa** (không dùng màu tuỳ hứng):

| Màu | Dùng cho |
|---|---|
| Violet | Hành động chính, AI planner, study block |
| Lime | Nhấn duy nhất — focus, CTA xác nhận, mũ Pilo |
| Coral | Overdue, GPA tụt, cảnh báo đỏ |
| Tangerine | High priority, workload-risk |
| Mint | Trạng thái tốt, sync thành công |
| Sky | Class block từ Google Calendar |

**Nền đặt Pilo phải là trắng.** Trên nền lime mũ bị chìm, trên nền violet thân bị chìm.

---

## PHASE 0 — Khởi tạo dự án
**Ước lượng: 1 ngày**

### Mục tiêu
Repo chạy được `npm run dev`, có font, có màu, có Pilo, có layout rỗng của 7 route.

### Bao phủ
TC-01

### Việc cần làm
- [ ] `npx create-next-app@latest unipilot-ai --ts --tailwind --app --eslint`
- [ ] `npm i @fontsource/fredoka @fontsource/nunito` → import trong `app/layout.tsx`
- [ ] Dán bảng token ở mục 3 vào `tailwind.config.ts`
- [ ] Copy 4 file SVG Pilo vào `public/`
- [ ] `components/brand/Pilo.tsx` — props `mood: 'ready' | 'happy' | 'sleepy'`, `size`
- [ ] `components/brand/Logo.tsx` — mark trắng + wordmark `UniPilot` + `AI` (AI màu violet, nền tối thì lime)
- [ ] Dựng `app/(app)/layout.tsx`: sidebar 246px nền `ink`, topbar, vùng nội dung nền `canvas`
- [ ] 7 route rỗng: dashboard, assignments, planner, schedule, focus, gpa, risk
- [ ] `.env.local.example` liệt kê đủ biến (xem Phase 1)
- [ ] `.gitignore` chắc chắn có `.env.local`
- [ ] Prettier + ESLint + `npm run lint` sạch

### Điều kiện hoàn thành
Bấm 7 mục sidebar chuyển route đúng, mục đang mở có nền lime chữ ink. Pilo hiện ở logo và không vỡ nét ở 20px.

---

## PHASE 1 — Database, Auth, RLS
**Ước lượng: 1.5 ngày**

### Mục tiêu
Đăng nhập được, mỗi bảng có RLS, sinh type TypeScript từ schema.

### Bao phủ
TC-04, NFR-07, NFR-08, NFR-06

### Schema

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  target_gpa numeric(3,2) check (target_gpa between 0 and 4),
  weekly_availability_hours numeric(4,1) default 0 check (weekly_availability_hours >= 0),
  created_at timestamptz default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code text, name text not null,
  credits int not null check (credits > 0),
  semester text not null,
  created_at timestamptz default now()
);

create type assignment_status as enum ('not_started','in_progress','done');
create type assignment_priority as enum ('low','medium','high');

create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses on delete set null,
  title text not null,
  due_at timestamptz not null,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  priority assignment_priority not null,
  status assignment_status not null default 'not_started',
  progress int not null default 0 check (progress between 0 and 100),
  notes text,
  reminder_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table class_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses on delete set null,
  gcal_event_id text,
  title text not null, location text,
  start_at timestamptz not null, end_at timestamptz not null,
  synced_at timestamptz default now(),
  unique (user_id, gcal_event_id)
);

create type focus_result as enum ('completed','partial');

create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assignment_id uuid not null references assignments on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds > 0),
  result focus_result not null
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references courses on delete cascade,
  semester text not null,
  grade_point numeric(3,2) not null check (grade_point between 0 and 4),
  credit_hours int not null check (credit_hours > 0),
  created_at timestamptz default now(),
  unique (user_id, course_id, semester)
);

create type plan_status as enum ('draft','active','cancelled');

create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  status plan_status not null default 'draft',
  input_snapshot jsonb not null,
  generated_at timestamptz default now(),
  confirmed_at timestamptz
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references study_plans on delete cascade,
  assignment_id uuid references assignments on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null
);

create table risk_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  score_date date not null,
  workload_factor int not null,
  overdue_factor int not null,
  focus_factor int not null,
  score int not null,
  computed_at timestamptz default now(),
  unique (user_id, score_date)
);

create type warning_status as enum ('open','handled','dismissed');

create table risk_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  risk_score_id uuid not null references risk_scores on delete cascade,
  status warning_status not null default 'open',
  action_taken text,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  title text not null, body text,
  scheduled_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  push_status text default 'pending'
);
```

### Việc cần làm
- [ ] Tạo project Supabase, chạy migration trên
- [ ] Bật RLS cho **tất cả** bảng, policy: `using (user_id = auth.uid())` (bảng `profiles` dùng `id = auth.uid()`, bảng `study_sessions` join qua `study_plans`)
- [ ] Index: `assignments(user_id, due_at)`, `focus_sessions(user_id, started_at)`, `class_blocks(user_id, start_at)`
- [ ] Trigger `updated_at` cho `assignments`
- [ ] `npx supabase gen types typescript --linked > lib/supabase/types.ts`
- [ ] Auth email + password, trang `/login`, middleware chặn `(app)/*` khi chưa đăng nhập
- [ ] Seed script: 4 course, 12 assignment (3 overdue), 4 grade, 14 focus session — để dev không phải nhập tay

### Biến môi trường
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GEMINI_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### Điều kiện hoàn thành
Đăng xuất → vào `/` bị đẩy về `/login`. Tạo user thứ hai, user này **không** đọc được dữ liệu của user thứ nhất (test bằng Supabase SQL editor với `set role`).

---

## PHASE 2 — Assignment Management
**Ước lượng: 2.5 ngày** · Đây là phase quan trọng nhất, mọi module sau đều đọc dữ liệu từ đây.

### Mục tiêu
CRUD đầy đủ + validate theo BR-01.

### Bao phủ
FR-01, FR-02, FR-17, FR-18, FR-19 · BR-01 · UC-01 · US-01, US-02 · UA-1

### `lib/rules/assignment.ts`
```ts
// BR-01
export const REQUIRED = ['title','courseId','dueAt','weight','priority'] as const;
export function validateAssignment(input: AssignmentInput): FieldErrors {}
export function isOverdue(a: Assignment, now = new Date()): boolean {}
export function sortByDueDate(list: Assignment[]): Assignment[] {}
export function statusLabel(a: Assignment): string {}  // trả TEXT, không trả màu
```

### Việc cần làm
- [ ] Form tạo/sửa: title, course, due date, weight %, priority, status, progress slider 0–100, notes, reminder time
- [ ] Validate field-level, hiện lỗi ngay dưới ô nhập (không dùng alert)
- [ ] Danh sách sắp xếp theo `due_at` tăng dần, mặc định ẩn item đã archive
- [ ] **Nhãn chữ, không chỉ màu**: `Overdue 2d` và `High priority` là hai nhãn text riêng biệt, phân biệt được cả khi in trắng đen — BR-01 yêu cầu rõ điều này
- [ ] Progress bar theo `progress`, màu theo trạng thái (coral nếu overdue, tangerine nếu high, violet nếu in progress, xám nếu not started)
- [ ] Archive: modal xác nhận → set `archived_at` → huỷ reminder đang chờ
- [ ] Trang `/assignments` có filter theo course và status
- [ ] Unit test cho `lib/rules/assignment.ts`

### Điều kiện hoàn thành
Lưu thiếu bất kỳ field bắt buộc nào → chặn, báo đúng field. Đặt progress 101 → chặn. Archive mà không bấm xác nhận → không có gì thay đổi. Item quá hạn hiển thị chữ `Overdue`, không chỉ đổi màu.

---

## PHASE 3 — Dashboard shell
**Ước lượng: 1.5 ngày**

### Mục tiêu
Dựng đúng màn hình trong `UniPilot_AI_Dashboard_v3.png`, phần nào chưa có dữ liệu thì để skeleton.

### Bao phủ
NFR-01, NFR-03, NFR-04

### Việc cần làm
- [ ] `KpiCard` — 4 thẻ màu đặc: violet GPA, coral tasks, mint focus, tangerine risk
- [ ] `DueSoonList` — 5 assignment gần hạn nhất (nối vào Phase 2)
- [ ] `TodayList`, `RiskHud`, `FocusCard`, `PlanCard`, `GpaTrendCard` — dựng khung, dữ liệu giả có gắn `TODO: phase N`
- [ ] Grid `1.4fr 1fr`, gap 14px, card radius 30px
- [ ] Responsive: ≤768px xếp 1 cột, sidebar thành bottom nav 6 tab, chạm được bằng một tay ở khung 375×667 (NFR-03)
- [ ] Skeleton loader cho từng card, không chặn cả trang
- [ ] Empty state dùng Pilo mood `sleepy` + một câu mời hành động

### Điều kiện hoàn thành
Mở DevTools ở 375×667, không có scroll ngang, mọi nút chạm được bằng ngón cái. Lighthouse Performance ≥ 85 trên bản build production.

---

## PHASE 4 — Schedule + Google Calendar
**Ước lượng: 2 ngày**

### Mục tiêu
Đồng bộ lịch học từ Google Calendar, xem Day/Week/Month, hiện assignment gắn với từng buổi.

### Bao phủ
FR-07, FR-08 · BR-03 · TC-02 · UC-03 · US-05 · UA-3

### Việc cần làm
- [ ] OAuth 2.0 flow, scope `calendar.readonly`, lưu refresh token phía server
- [ ] `/api/calendar/sync` — pull event, upsert vào `class_blocks` theo `gcal_event_id`
- [ ] Ba view Day / Week / Month, giữ nguyên ngày đang chọn khi đổi view
- [ ] Ngày hiện tại luôn được highlight
- [ ] Gắn assignment vào class block bằng `course_id`, hiện chỉ báo "1 linked assignment"
- [ ] Click class → panel chi tiết: giờ, phòng, nguồn, danh sách assignment liên quan
- [ ] **Hiện `last-sync time` và trạng thái sync trên UI** — BR-03 bắt buộc
- [ ] Sync lỗi → giữ nguyên cache cũ + banner cảnh báo, tuyệt đối không xoá dữ liệu

### Điều kiện hoàn thành
Ngắt mạng rồi mở Schedule: vẫn thấy lịch lần sync gần nhất, kèm dòng "Last synced …" và cảnh báo. Không có màn hình trắng.

---

## PHASE 5 — Focus Session (Pomodoro)
**Ước lượng: 1.5 ngày**

### Mục tiêu
Timer 25 phút gắn với một assignment cụ thể, ghi log, tính streak.

### Bao phủ
FR-09, FR-10, FR-11 · BR-04 · UC-04 · US-06 · UA-4

### `lib/rules/focus.ts`
```ts
export const POMODORO_SECONDS = 25 * 60;
// BR-04: chỉ 'completed' mới tính streak
export function classify(elapsed: number): 'completed' | 'partial' {
  return elapsed >= POMODORO_SECONDS ? 'completed' : 'partial';
}
export function streakDays(sessions: FocusSession[], today: Date): number {}
export function weeklyStats(sessions: FocusSession[]): WeeklyFocusStats {}
```

### Việc cần làm
- [ ] Không chọn assignment → nút Start bị vô hiệu kèm lý do hiển thị (BR-04)
- [ ] Vòng tròn đếm ngược SVG, `stroke-dashoffset` chạy theo thời gian còn lại
- [ ] Lưu `started_at` xuống localStorage ngay khi bấm Start → reload trang không mất phiên
- [ ] Dừng sớm → modal xác nhận → lưu `partial` với `duration_seconds` thực tế
- [ ] Đủ 25:00 → lưu `completed`, Pilo đổi sang mood `happy`, tăng streak
- [ ] Thống kê tuần: số cycle hoàn thành, phút completed/partial, tổng theo course, tổng theo assignment, streak
- [ ] Unit test: dừng ở 24:59 phải ra `partial` và **không** tăng streak

### Điều kiện hoàn thành
Chạy 1 phiên đủ 25 phút (tạm hạ hằng số xuống 10s để test) → streak +1. Dừng sớm → streak giữ nguyên, phút vẫn được ghi.

---

## PHASE 6 — GPA Tracker
**Ước lượng: 1.5 ngày**

### Mục tiêu
Nhập điểm, tính GPA kỳ và tích luỹ, xem breakdown và dự báo.

### Bao phủ
FR-12, FR-13, FR-14 · BR-05 · UC-05 · US-07, US-08 · UA-5

### `lib/rules/gpa.ts`
```ts
// BR-05
export const qualityPoints = (gp: number, credits: number) => gp * credits;

export function gpa(rows: Grade[]): number {
  const qp = rows.reduce((s, r) => s + r.gradePoint * r.creditHours, 0);
  const cr = rows.reduce((s, r) => s + r.creditHours, 0);
  return cr === 0 ? 0 : Number((qp / cr).toFixed(2));   // luôn 2 chữ số
}

// Required = [target × (done + remaining) − currentQP] ÷ remaining
export function requiredAverage(
  target: number, doneCredits: number, remainingCredits: number, currentQP: number
): { value: number; achievable: boolean } {
  const v = (target * (doneCredits + remainingCredits) - currentQP) / remainingCredits;
  return { value: Number(v.toFixed(2)), achievable: v <= 4.0 };
}
```

### Việc cần làm
- [ ] Form nhập: course, semester, grade point (0.0–4.0), credit hours (> 0) — validate biên
- [ ] Bảng breakdown: grade point, credits, quality points, phần đóng góp vào GPA
- [ ] Biểu đồ trend theo từng kỳ (231 → 232 → 241 → 242)
- [ ] Ô dự báo: nhập target GPA + số tín còn lại → hiện `required average`
- [ ] Nếu required > 4.0 → nói thẳng "không đạt được với giả định hiện tại", không làm tròn xuống cho đẹp
- [ ] Highlight coral cho course kéo GPA xuống
- [ ] Unit test đúng theo ví dụ trong BR-05

### Điều kiện hoàn thành
Nhập `grade_point = 4.5` → bị chặn. GPA luôn hiển thị đúng 2 chữ số thập phân, kể cả `3.50` (không rút thành `3.5`).

---

## PHASE 7 — AI Study Planner (Gemini)
**Ước lượng: 3 ngày** · Phase khó nhất, làm sau khi Assignment + Schedule đã ổn định.

### Mục tiêu
Sinh bản nháp kế hoạch học theo ngày, cho sửa, chỉ kích hoạt khi người dùng bấm Confirm.

### Bao phủ
FR-04, FR-05, FR-06 · BR-02 · TC-03 · UC-02 · US-03, US-04 · UA-2

### Điều kiện đầu vào (BR-02 — chặn ở cả client và server)
1. `weekly_availability_hours > 0`
2. Có ít nhất 1 assignment chưa hoàn thành
Thiếu một trong hai → không gọi API, hiện hướng dẫn cụ thể phải nhập gì.

### `/api/plan/generate`
- [ ] Chỉ nhận POST, kiểm tra session Supabase trước tiên
- [ ] Gom input: pending assignments (title, due, weight, priority, progress), class blocks tuần đó, availability, target GPA
- [ ] Prompt yêu cầu Gemini trả **JSON thuần**, không markdown, không lời dẫn
- [ ] Schema trả về: `{ sessions: [{ assignmentId, startAt, endAt, reason }] }`
- [ ] Parse an toàn: strip ```` ```json ````, `JSON.parse` trong try/catch
- [ ] Timeout 20s → trả lỗi có nút **Retry** (TC-03)
- [ ] Lưu `input_snapshot` để sau này giải thích được vì sao AI xếp như vậy

### Validate phía server sau khi nhận kết quả (không tin AI)
- [ ] Không session nào chồng lên class block
- [ ] Tổng giờ mỗi ngày ≤ availability ngày đó
- [ ] Không xếp study session sau hạn nộp của assignment đó
- [ ] Session nào vi phạm → loại bỏ và đánh dấu để UI hiện lý do

### UI
- [ ] Card `Pilo's plan` với badge **Draft**, Pilo mood `happy`
- [ ] Xem theo ngày, sửa/xoá/kéo từng session, mỗi lần sửa validate lại
- [ ] Nút **Confirm plan** → `status = 'active'`, sinh reminder cho từng session (FR-06)
- [ ] Nút **Cancel** → xoá nháp, kế hoạch active cũ giữ nguyên
- [ ] **Nháp không bao giờ tự động active** — BR-02

### Điều kiện hoàn thành
Đặt availability = 0 → nút Generate bị chặn kèm lý do. Sinh nháp rồi F5 → kế hoạch cũ vẫn active, nháp vẫn là nháp. Ngắt mạng giữa lúc generate → hiện Retry, không crash.

---

## PHASE 8 — Workload-Risk Warning
**Ước lượng: 1.5 ngày**

### Mục tiêu
Tính điểm rủi ro hằng ngày, giải thích thành phần, gợi ý điều chỉnh.

### Bao phủ
FR-15, FR-16 · BR-06 · UC-06 · US-09 · UA-6

### `lib/rules/risk.ts`
```ts
// BR-06 — chỉ tính khi đủ 3 điều kiện
export function canCompute(i: RiskInput): boolean {
  return i.availableHours > 0 && i.pendingCount >= 1 && i.focusHistoryDays >= 7;
}

export function computeRisk(i: RiskInput) {
  const workload = Math.min(100, (i.plannedHours / i.availableHours) * 100);
  const overdue  = Math.min(100, i.overdueCount * 25);
  const focus    = Math.max(0, 100 - i.completedCycles7d * 10);
  const score    = Math.round(0.40 * workload + 0.35 * overdue + 0.25 * focus);
  return {
    workload: Math.round(workload),
    overdue:  Math.round(overdue),
    focus:    Math.round(focus),
    score,
    warn: score >= 60,
  };
}
```

### Việc cần làm
- [ ] `/api/risk/compute` chạy mỗi ngày (Vercel Cron hoặc gọi khi mở dashboard, chống trùng bằng unique `score_date`)
- [ ] Score ≥ 60 → tạo 1 warning `open`, thử gửi push; push fail vẫn **giữ nguyên warning in-app** (FR-16)
- [ ] HUD trên dashboard: 3 thanh 5 ô cho 3 factor, hiện đúng trọng số `×0.40 / ×0.35 / ×0.25`
- [ ] Trang report: score, ngưỡng, thời điểm tính, giá trị từng factor, khoảng dữ liệu dùng để tính
- [ ] Xếp hạng gợi ý theo factor đóng góp lớn nhất (workload cao → đề xuất dời session; overdue cao → đề xuất thương lượng hạn / cắt scope; focus thấp → đề xuất chạy Pomodoro)
- [ ] Nút **Confirm** áp dụng gợi ý → `status = 'handled'`; nút **Not now** → `status = 'dismissed'`
- [ ] **Bắt buộc có dòng disclaimer**: đây là công cụ hỗ trợ lập kế hoạch, không phải chẩn đoán y tế hay tâm lý — BR-06 và Product Vision đều nêu rõ
- [ ] Unit test: 18h planned / 14h available, 3 overdue, 6 cycles → workload 100 ⇒ kiểm lại số của bạn, đừng hardcode theo mockup

### Điều kiện hoàn thành
Thiếu 7 ngày lịch sử focus → không tính điểm, hiện "chưa đủ dữ liệu" chứ không trả 0. Tắt quyền notification → warning vẫn nằm trong app.

---

## PHASE 9 — Notifications
**Ước lượng: 1 ngày**

### Mục tiêu
Nhắc deadline theo thời điểm người dùng đặt, có fallback in-app.

### Bao phủ
FR-03 · TC-05

### Việc cần làm
- [ ] Đăng ký service worker `public/sw.js`
- [ ] Web Push + VAPID key, `/api/push/send`
- [ ] Xin quyền notification **đúng lúc** — sau khi user lưu assignment đầu tiên có reminder, không xin ngay lúc mở app lần đầu
- [ ] Lịch nhắc theo `reminder_at`; archive assignment thì huỷ reminder tương ứng (FR-19)
- [ ] Danh sách notification in-app luôn tồn tại kể cả khi từ chối quyền hoặc push thất bại (TC-05)
- [ ] Đánh dấu đã đọc, badge đỏ trên chuông ở topbar

### Điều kiện hoàn thành
Từ chối quyền notification → app vẫn chạy bình thường, mọi nhắc nhở vẫn thấy trong danh sách in-app.

---

## PHASE 10 — Offline mode
**Ước lượng: 1.5 ngày**

### Mục tiêu
Đọc được dữ liệu đã cache khi mất mạng, thao tác offline được xếp hàng và đồng bộ lại khi có mạng.

### Bao phủ
NFR-05, NFR-06 · TC-04

### Việc cần làm
- [ ] `lib/offline/idb.ts` — cache assignments, class blocks, focus sessions
- [ ] `lib/offline/queue.ts` — hàng đợi mutation: create/update assignment, focus log
- [ ] Nghe `online` / `offline`, tự flush hàng đợi khi có mạng
- [ ] Banner "Đang offline — thay đổi sẽ được đồng bộ khi có mạng lại"
- [ ] Xung đột: bản trên server mới hơn → hỏi người dùng, không ghi đè âm thầm
- [ ] Chặn AI Planner và Calendar Sync khi offline, nói rõ lý do

### Điều kiện hoàn thành
Bật airplane mode → mở app → vẫn thấy assignment và lịch. Sửa progress một task, bật mạng lại → thay đổi lên server, không mất dữ liệu.

---

## PHASE 11 — Hoàn thiện phi chức năng
**Ước lượng: 2 ngày**

### Bao phủ
NFR-01 → NFR-10

### Việc cần làm
- [ ] **NFR-01** Dashboard usable < ngưỡng đã cam kết — đo bằng Lighthouse, tối ưu bằng RSC + streaming + cache IndexedDB đọc trước
- [ ] **NFR-02** Đo thời gian generate plan 20 lần, ghi lại, ít nhất 18 lần đạt
- [ ] **NFR-03** Test thật ở 375×667
- [ ] **NFR-04** Nhờ 5 bạn cùng lớp dùng thử, ghi lại số người hoàn thành tác vụ không cần hướng dẫn
- [ ] **NFR-09** Rà lại: mỗi module chỉ import qua `lib/rules/`, không có logic nghiệp vụ nằm trong component
- [ ] **NFR-10** Test Chrome, Firefox, Safari iOS
- [ ] A11y: focus ring nhìn thấy được, `aria-label` cho nút chỉ có icon, contrast ≥ 4.5:1 (chú ý chữ trên nền lime và tangerine), `prefers-reduced-motion`
- [ ] Không có `console.log` sót lại, không có API key trong bundle client — kiểm bằng `npm run build` rồi grep

---

## PHASE 12 — Đóng gói và nộp
**Ước lượng: 1 ngày**

- [ ] `README.md`: mô tả, ảnh chụp màn hình, cách chạy, biến môi trường
- [ ] `docs/TRACEABILITY.md`: bảng FR → file → test
- [ ] Deploy Vercel, thêm biến môi trường production
- [ ] Quay demo 3–5 phút theo đúng 6 UA của SRS
- [ ] Chèn ảnh dashboard + brand kit vào mục **C. PROTOTYPES** trong SRS (mục này đang trống)
- [ ] Tag `v1.0.0`

---

## 12. Bảng truy vết FR → Phase

| FR | Nội dung | Phase | File chính |
|---|---|---|---|
| FR-01 | Thêm assignment | 2 | `components/assignments/AssignmentForm.tsx` |
| FR-02 | Danh sách theo due date | 2 | `lib/rules/assignment.ts` |
| FR-03 | Push nhắc deadline | 9 | `app/api/push/send/route.ts` |
| FR-04 | Sinh kế hoạch tuần | 7 | `app/api/plan/generate/route.ts` |
| FR-05 | Sửa / sinh lại kế hoạch | 7 | `components/planner/PlanEditor.tsx` |
| FR-06 | Lưu kế hoạch + reminder | 7 | `lib/rules/plan.ts` |
| FR-07 | Sync Google Calendar | 4 | `app/api/calendar/sync/route.ts` |
| FR-08 | Gắn class ↔ assignment | 4 | `components/schedule/ClassDetail.tsx` |
| FR-09 | Pomodoro 25 phút | 5 | `components/focus/FocusTimer.tsx` |
| FR-10 | Log completed / partial | 5 | `lib/rules/focus.ts` |
| FR-11 | Thống kê focus | 5 | `components/focus/FocusStats.tsx` |
| FR-12 | Tính GPA | 6 | `lib/rules/gpa.ts` |
| FR-13 | Dự báo GPA | 6 | `lib/rules/gpa.ts` |
| FR-14 | Breakdown theo môn | 6 | `components/gpa/CourseBreakdown.tsx` |
| FR-15 | Tính risk score | 8 | `lib/rules/risk.ts` |
| FR-16 | Tạo warning | 8 | `app/api/risk/compute/route.ts` |
| FR-17 | Sửa assignment | 2 | `components/assignments/AssignmentForm.tsx` |
| FR-18 | Status + progress | 2 | `lib/rules/assignment.ts` |
| FR-19 | Archive | 2 | `components/assignments/ArchiveDialog.tsx` |

---

## 13. Thứ tự đề nghị và tổng thời gian

```
Phase 0 ──► 1 ──► 2 ──┬──► 3 ──► 4 ──► 5 ──► 6 ──┬──► 7 ──► 8 ──► 9 ──► 10 ──► 11 ──► 12
                      │                          │
                 (2 là nền móng)        (7, 8 cần dữ liệu thật từ 2, 4, 5)
```

| Nhóm | Phase | Ngày |
|---|---|---|
| Nền tảng | 0, 1 | 2.5 |
| Lõi nghiệp vụ | 2, 3 | 4 |
| Tích hợp | 4, 5, 6 | 5 |
| Thông minh | 7, 8 | 4.5 |
| Hạ tầng | 9, 10 | 2.5 |
| Hoàn thiện | 11, 12 | 3 |
| **Tổng** | | **≈ 21.5 ngày công** |

---

## 14. Ba chỗ dễ mất điểm nhất

1. **Nháp AI tự động active.** BR-02 cấm rõ. Nếu code cho `status = 'active'` ngay sau khi generate là sai nghiệp vụ, không phải sai UI.
2. **Overdue chỉ phân biệt bằng màu.** BR-01 yêu cầu nhãn chữ riêng. Chấm bài rất dễ bắt lỗi này vì nó nằm ngay trên màn hình đầu tiên.
3. **Risk score tính khi chưa đủ dữ liệu.** BR-06 nêu 3 điều kiện tiên quyết. Trả về 0 khi thiếu dữ liệu là sai — phải trả về trạng thái "chưa tính được".
