# UniPilot AI — Design System (single source of truth)

> **Đọc file này trước khi viết bất kỳ dòng UI nào.**
> Mọi giá trị dưới đây trích trực tiếp từ mockup đã duyệt (`UniPilot_AI_Dashboard_v3.png`)
> và brand kit (`Pilo_Brand_Kit.png`). Không tự chế màu, không tự chế size.
> Nếu cần một giá trị chưa có ở đây, hỏi trước khi tự đặt.

---

## 0. Cách dùng file này với Claude Code

Đặt file ở `docs/DESIGN.md`, rồi thêm vào `CLAUDE.md` ở gốc repo:

```md
# UniPilot AI

Trước khi viết hoặc sửa UI, luôn đọc `docs/DESIGN.md`.
Trước khi viết logic nghiệp vụ, luôn đọc `docs/ROADMAP.md` mục 
tương ứng và `lib/rules/`.

Ràng buộc không được vi phạm:
- Không hardcode hex màu trong component. Chỉ dùng token Tailwind.
- Không đặt logic nghiệp vụ trong component. Đưa vào `lib/rules/`.
- Không gọi Gemini hoặc Google API từ client. Chỉ qua Route Handler.
```

Khi bắt đầu một task UI, prompt kiểu: *"Đọc docs/DESIGN.md rồi dựng
component KpiCard theo spec mục 5.1"*. Claude Code sẽ có đủ số đo.

---

## 1. Nhận diện

| | |
|---|---|
| Tên sản phẩm | **UniPilot AI** |
| Linh vật | **Pilo** — cú nhỏ đội mũ phi công |
| Tính cách | Bình tĩnh, thực tế, hơi tếu. Không hype, không dùng emoji trong UI. |
| Giọng văn | Ngắn, chủ động, xưng hô trực tiếp. "This week is packed" chứ không phải "Warning: high workload detected". |

Pilo xuất hiện ở: logo sidebar, card AI plan, empty state, màn hình onboarding,
và khoảnh khắc ăn mừng (xong task, lên streak). **Không** rải Pilo khắp nơi.

---

## 2. Màu

### 2.1 Bảng token

| Token | Hex | Dùng cho |
|---|---|---|
| `violet` | `#6C3CF5` | Hành động chính, AI planner, study block |
| `violet-deep` | `#5A2FE0` | Cánh Pilo, hover của violet |
| `violet-soft` | `#8B62FF` | Bụng Pilo, fill phụ |
| `violet-tint` | `#EDE7FF` | Nền tag "In progress", nền chip nhạt |
| `lime` | `#D8FF4A` | Nhấn **duy nhất**: focus card, CTA xác nhận, nav active, mũ Pilo |
| `lime-deep` | `#B8E62E` | Viền mũ Pilo, hover của lime |
| `lime-tint` | `#EAFBCF` | Nền mood "happy" |
| `ink` | `#171429` | Chữ chính, nút tối |
| `ink-2` | `#4A4460` | Chữ phụ |
| `ink-3` | `#8A83A3` | Chữ mờ, metadata |
| `night` | `#1D1338` | Nền sidebar, nền risk HUD |
| `canvas` | `#F2F0FB` | Nền toàn trang |
| `coral` | `#FF5470` | Overdue, GPA tụt, badge thông báo |
| `coral-tint` | `#FFE7EB` | Nền tag "Overdue" |
| `tangerine` | `#FFB020` | High priority, workload-risk, mỏ và chân Pilo |
| `tangerine-tint` | `#FFF1D6` | Nền tag "High priority" |
| `mint` | `#22DDA6` | Trạng thái tốt, sync thành công |
| `mint-tint` | `#DEFBF1` | Nền badge thành công |
| `sky` | `#45C2FF` | Class block từ Google Calendar, kính Pilo |
| `line` | `#F0EEF7` | Đường kẻ ngăn trong card |
| `border-cb` | `#DCD8EC` | Viền checkbox |

Màu chỉ dùng trong sidebar tối: `#9C90C4` (chữ phụ), `#B7ACD8` (nav item),
`#6C5F94` (nhãn nhóm), `#33245C` (viền + nút phụ), `#2A1D4D` (khối sync),
`#A79CCB` (chữ phụ trên HUD), `#C9BEE8` (chữ nút phụ), `#382A5E` (ô segment tắt).

### 2.2 Quy tắc bắt buộc

1. **Lime là màu nhấn duy nhất.** Một màn hình có tối đa 2 vùng lime lớn.
2. **Nền đặt Pilo phải là trắng.** Nền lime thì mũ chìm, nền violet thì thân chìm.
3. Màu không bao giờ là tín hiệu duy nhất. Overdue phải có **chữ** `Overdue` — BR-01.
4. Chữ trên nền màu đặc dùng tông tối cùng họ, không dùng xám:
   - trên `mint` → `#08372A`
   - trên `tangerine` → `#4A2C00`
   - trên `lime` → `ink`
   - trên `violet` / `coral` → trắng

---

## 3. Chữ

```bash
npm i @fontsource/fredoka @fontsource/nunito
```

```ts
// app/layout.tsx
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
```

| Vai trò | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Tên app (sidebar) | Fredoka | 700 | 20px | -0.03em |
| Lời chào (topbar) | Fredoka | 700 | 30px | -0.03em |
| Tiêu đề card | Fredoka | 700 | 18px | -0.03em |
| Tiêu đề HUD | Fredoka | 700 | 19px | -0.03em |
| Số KPI lớn | Fredoka | 700 | 46px | -0.045em |
| Số timer | Fredoka | 700 | 40px | -0.045em |
| Số thống kê | Fredoka | 700 | 20px | -0.03em |
| Nội dung chính | Nunito | 700 | 14px | 0 |
| Nội dung phụ | Nunito | 600 | 11.5px | 0 |
| Tag / nhãn | Nunito | 800 | 11px | 0 |
| Nhãn nhóm nav | Nunito | 800 | 10px | 1.4px, uppercase |

**Fredoka chỉ có tới weight 700.** Đặt 800 sẽ bị giả bold, nhìn bệt. Nunito thì
dùng được 800.

Fredoka chỉ dùng cho tiêu đề và con số. Toàn bộ phần đọc dài là Nunito.

---

## 4. Hình khối, khoảng cách

| Thuộc tính | Giá trị |
|---|---|
| Bo góc card | `30px` |
| Bo góc nút, ô nhập | `14px` (16px cho nút to trong card màu) |
| Bo góc nav item | `16px` |
| Bo góc pill / tag | `20px` (full round) |
| Bo góc chip icon | `13–14px` |
| Bo góc checkbox | `7px` |
| Khoảng cách giữa card | `14px` |
| Khoảng cách giữa nhóm lớn | `16px` |
| Padding card | `20px 22px` |
| Padding KPI card | `18px 20px 20px` |
| Padding trang | `24px 26px 26px` |
| Đường kẻ trong card | `1.5px solid #F0EEF7` |

**Không dùng box-shadow.** Phân tách bằng màu nền và bo góc. Toàn bộ mockup
không có một shadow nào.

---

## 5. Layout

```
┌──────────┬──────────────────────────────────────────────┐
│ sidebar  │ topbar (h auto)                              │
│ 246px    ├──────────────────────────────────────────────┤
│ night    │ KPI grid: repeat(4, 1fr), gap 14             │
│          ├──────────────────────────────────────────────┤
│          │ Risk HUD (full width, night)                 │
│          ├───────────────────────┬──────────────────────┤
│          │ cột trái  1.4fr       │ cột phải  1fr        │
│          │  Due soon             │  Focus (lime)        │
│          │  Today                │  Pilo's plan (violet)│
│          │  Semester breakdown   │  GPA trend           │
└──────────┴───────────────────────┴──────────────────────┘
```

- Grid hai cột: `grid-template-columns: 1.4fr 1fr; gap: 14px`
- Mỗi cột là một flex column, `gap: 14px`
- Sidebar `width: 246px; padding: 24px 16px; flex-shrink: 0`
- Vùng chính `flex: 1; padding: 24px 26px 26px; gap: 16px`

### Mobile (≤768px)
- Sidebar → bottom nav 6 tab, cao 64px, nền `night`, tab active chữ `lime`
- Tất cả grid → 1 cột
- KPI 4 thẻ → grid 2×2
- Risk HUD → xếp dọc: tiêu đề, 3 factor, 2 nút full width
- Khung test bắt buộc: **375×667** (NFR-03)

---

## 6. Component spec

### 6.1 Sidebar

```
.logo       44×44, radius 16, nền TRẮNG, chứa <PiloIcon size={34} />
tên app     Fredoka 700 20px, trắng
phụ đề      Nunito 600 11.5px, #9C90C4
nhãn nhóm   Nunito 800 10px, letter-spacing 1.4px, uppercase, #6C5F94
nav item    padding 11px 13px, radius 16, gap 12, icon 18px
            mặc định  Nunito 600 14px, #B7ACD8
            active    nền lime, chữ ink, weight 800
badge số    nền #33245C, chữ #C9BEE8, radius 20, padding 2px 8px, 11px/800
            khi active: nền ink, chữ lime
chấm cảnh báo  8×8 tròn, tangerine
khối sync   nền #2A1D4D, radius 20, padding 13px 14px
            dòng 1: mint, 800, 12.5px  |  dòng 2: #9C90C4, 500, 11.5px
avatar      36×36, radius 13, nền coral, chữ trắng Fredoka 700 13px
```

### 6.2 KPI card

```
radius 30, padding 18px 20px 20px, nền màu đặc
chip icon   38×38, radius 13, nền rgba(trắng .20) hoặc rgba(tối .14)
nhãn        700 12.5px, opacity .75
số          Fredoka 700 46px, line-height 1, letter-spacing -.045em
đơn vị      700 13px, opacity .7, margin-left 6px
thanh bar   height 7, radius 5, nền rgba đối lập
chú thích   600 11.5px, opacity .72, margin-top 11px
```

Bốn thẻ theo thứ tự cố định: **GPA (violet) · Active tasks (coral) ·
Focus this week (mint) · Workload-risk (tangerine)**.

### 6.3 Risk HUD

```
nền night, radius 30, padding 20px 24px, flex, gap 26, align center
tiêu đề     Fredoka 700 19px trắng + pill điểm số
pill        nền tangerine, chữ ink, Nunito 800 11.5px, radius 20, padding 4px 11px
mô tả       #A79CCB, 500 12.5px, line-height 1.55, max-width 430px
factor      width 104px, nhãn #A79CCB 700 11px, số Fredoka 700 16px trắng
segment     5 ô, height 9, radius 3, gap 3
            ô tắt #382A5E, ô bật = màu của factor
            workload → tangerine, overdue → coral, focus → lime
nút chính   nền lime, chữ ink, 800 13px, radius 14, padding 11px 18px
nút phụ     nền #33245C, chữ #C9BEE8, 700 13px
```

Số ô sáng = `Math.round(factor / 20)`.

**Bắt buộc có dòng disclaimer** trong phần mô tả: công cụ hỗ trợ lập kế hoạch,
không phải chẩn đoán y tế hay tâm lý — BR-06.

### 6.4 Card trắng (Due soon, Today, Semester breakdown)

```
nền trắng, radius 30, padding 20px 22px
header      Fredoka 700 18px + link phải (violet 800 12.5px)
            hoặc metadata phải (#8A83A3 600 11.5px)
row         padding 11px 0, border-top 1.5px #F0EEF7, gap 13
            row đầu: không border, padding-top 0
checkbox    20×20, radius 7, viền 2.2px #DCD8EC
tiêu đề     700 14px  |  meta 600 11.5px #8A83A3
tag         Nunito 800 11px, radius 20, padding 4px 10px
progress    width 92, thanh height 7 radius 5 nền #F0EEF7, % 700 10.5px phải
```

Bảng màu tag:

| Trạng thái | Nền | Chữ |
|---|---|---|
| Overdue | `#FFE7EB` | `#C2003A` |
| High priority | `#FFF1D6` | `#8A5300` |
| In progress | `#EDE7FF` | `#6C3CF5` |
| Not started | `#F0EEF7` | `#4A4460` |

### 6.5 Focus card (lime)

```
nền lime, radius 30, padding 20px 22px, text-align center
sticker     góc trên phải 16/16, nền ink chữ lime, 800 11px,
            radius 20, padding 6px 12px, transform rotate(6deg)
vòng tròn   150×150, SVG r=65, stroke-width 12
            track rgba(23,20,41,.14) · progress ink, stroke-linecap round
            stroke-dasharray 408, đổi stroke-dashoffset theo thời gian còn lại
số          Fredoka 700 40px  |  nhãn dưới 800 10.5px uppercase ls 1.4px opacity .6
chip task   nền rgba(23,20,41,.09), radius 20, padding 8px 14px, 700 12.5px
nút start   nền ink chữ trắng, radius 16, padding 13px, 800 14px, flex 1
nút phụ     nền rgba(23,20,41,.09), radius 16, 700 14px
thống kê    border-top 2px rgba(23,20,41,.13), 3 cột đều
            số Fredoka 700 20px · nhãn 700 10.5px opacity .62
```

**Nút Start bị disable khi chưa chọn assignment** — BR-04. Disable thì giảm
opacity xuống .45 **và** hiện dòng lý do bên dưới, không im lặng.

### 6.6 Plan card (violet)

```
nền violet, radius 30, padding 20px 22px, chữ trắng
avatar Pilo  40×40, radius 14, nền TRẮNG, chứa <PiloIcon mood="happy" size={36} />
tiêu đề      "Pilo's plan" Fredoka 700 18px trắng
badge Draft  nền rgba(trắng .22), chữ trắng, 800 10.5px, radius 20
dòng ngày    padding 9px 0, border-top 1.5px rgba(trắng .16)
             thứ #C9B9FF 800 11.5px width 34 · môn 600 13px · giờ Fredoka 700 13.5px
ghi chú      #C9B9FF 500 11.5px, line-height 1.55
nút confirm  nền lime chữ ink, radius 16, padding 13px, 800 14px, flex 1
nút phụ      nền rgba(trắng .18), radius 16, 700 14px
```

Badge **Draft** phải luôn hiện khi `status === 'draft'`. Nháp không bao giờ tự
chuyển active — BR-02.

---

## 7. Pilo — mã nguồn

Bốn file này đặt trong `public/`. Bản React ở mục 7.5 dùng khi cần đổi mood
động.

### 7.1 `pilo-mascot.svg` — toàn thân, mắt mở (mặc định)

```svg
<svg viewBox="0 0 200 200" class="" xmlns="http://www.w3.org/2000/svg">
 <g transform="translate(0,-8)">
  <ellipse cx="84" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="116" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="50" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(-10 50 120)"/>
  <ellipse cx="150" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(10 150 120)"/>
  <ellipse cx="100" cy="108" rx="52" ry="58" fill="#6C3CF5"/>
  <ellipse cx="100" cy="140" rx="29" ry="22" fill="#8B62FF"/>
  <path d="M52.7 84 A52 58 0 0 1 147.3 84 Z" fill="#D8FF4A"/>
  <path d="M88 68 H112" stroke="#1D1338" stroke-width="4" stroke-linecap="round"/>
  <circle cx="78" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="122" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="74.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="118.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="83" cy="103" r="20" fill="#fff"/>
  <circle cx="117" cy="103" r="20" fill="#fff"/>
  <circle cx="84" cy="105" r="9" fill="#1D1338"/>
  <circle cx="116" cy="105" r="9" fill="#1D1338"/>
  <circle cx="87.5" cy="101.5" r="3" fill="#fff"/>
  <circle cx="119.5" cy="101.5" r="3" fill="#fff"/>
  <path d="M100 118 l8 8 l-8 8 l-8 -8 z" fill="#FFB020"/>
 </g>
</svg>
```

### 7.2 `pilo-mascot-happy.svg` — mắt cong, dùng khi xong task / lên streak

```svg
<svg viewBox="0 0 200 200" class="" xmlns="http://www.w3.org/2000/svg">
 <g transform="translate(0,-8)">
  <ellipse cx="84" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="116" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="50" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(-10 50 120)"/>
  <ellipse cx="150" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(10 150 120)"/>
  <ellipse cx="100" cy="108" rx="52" ry="58" fill="#6C3CF5"/>
  <ellipse cx="100" cy="140" rx="29" ry="22" fill="#8B62FF"/>
  <path d="M52.7 84 A52 58 0 0 1 147.3 84 Z" fill="#D8FF4A"/>
  <path d="M88 68 H112" stroke="#1D1338" stroke-width="4" stroke-linecap="round"/>
  <circle cx="78" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="122" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="74.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="118.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="83" cy="103" r="20" fill="#fff"/>
  <circle cx="117" cy="103" r="20" fill="#fff"/>
  <path d="M74 108 q9 -13 18 0" stroke="#1D1338" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M108 108 q9 -13 18 0" stroke="#1D1338" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M100 118 l8 8 l-8 8 l-8 -8 z" fill="#FFB020"/>
 </g>
</svg>
```

### 7.3 `pilo-mascot-sleepy.svg` — mắt nhắm, dùng cho empty state

```svg
<svg viewBox="0 0 200 200" class="" xmlns="http://www.w3.org/2000/svg">
 <g transform="translate(0,-8)">
  <ellipse cx="84" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="116" cy="168" rx="10" ry="5.5" fill="#FFB020"/>
  <ellipse cx="50" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(-10 50 120)"/>
  <ellipse cx="150" cy="120" rx="12" ry="23" fill="#5A2FE0" transform="rotate(10 150 120)"/>
  <ellipse cx="100" cy="108" rx="52" ry="58" fill="#6C3CF5"/>
  <ellipse cx="100" cy="140" rx="29" ry="22" fill="#8B62FF"/>
  <path d="M52.7 84 A52 58 0 0 1 147.3 84 Z" fill="#D8FF4A"/>
  <path d="M88 68 H112" stroke="#1D1338" stroke-width="4" stroke-linecap="round"/>
  <circle cx="78" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="122" cy="68" r="10" fill="#45C2FF" stroke="#1D1338" stroke-width="4"/>
  <circle cx="74.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="118.5" cy="64.5" r="2.8" fill="#fff"/>
  <circle cx="83" cy="103" r="20" fill="#fff"/>
  <circle cx="117" cy="103" r="20" fill="#fff"/>
  <path d="M74 102 q9 12 18 0" stroke="#1D1338" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M108 102 q9 12 18 0" stroke="#1D1338" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M100 118 l8 8 l-8 8 l-8 -8 z" fill="#FFB020"/>
 </g>
</svg>
```

### 7.4 `pilo-icon.svg` — mark rút gọn cho logo, favicon, size nhỏ

Bỏ cánh, chân, kính. Dùng cho mọi vị trí **≤ 56px**.

```svg
<svg viewBox="46 36 108 108" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg">
 <g transform="translate(0,-8)">
  <ellipse cx="100" cy="108" rx="52" ry="58" fill="#6C3CF5"/>
  <path d="M52.7 84 A52 58 0 0 1 147.3 84 Z" fill="#D8FF4A"/>

  <circle cx="83" cy="103" r="20" fill="#fff"/>
  <circle cx="117" cy="103" r="20" fill="#fff"/>
  <circle cx="84" cy="105" r="10" fill="#1D1338"/>
  <circle cx="116" cy="105" r="10" fill="#1D1338"/>
  <path d="M100 118 l8 8 l-8 8 l-8 -8 z" fill="#FFB020"/>
 </g>
</svg>
```

### 7.5 React component

```tsx
// components/brand/Pilo.tsx
type Mood = 'ready' | 'happy' | 'sleepy';

const SRC: Record<Mood, string> = {
  ready:  '/pilo-mascot.svg',
  happy:  '/pilo-mascot-happy.svg',
  sleepy: '/pilo-mascot-sleepy.svg',
};

export function Pilo({ mood = 'ready', size = 120 }: { mood?: Mood; size?: number }) {
  return (
    <img
      src={SRC[mood]}
      width={size}
      height={size}
      alt=""            // trang trí, có text đi kèm ở mọi chỗ dùng
      aria-hidden="true"
    />
  );
}

export function PiloIcon({ size = 34 }: { size?: number }) {
  return <img src="/pilo-icon.svg" width={size} height={size} alt="" aria-hidden="true" />;
}
```

### 7.6 Quy tắc dùng Pilo

| Được | Không được |
|---|---|
| Nền trắng, canvas, tint nhạt | Nền lime (mũ chìm), nền violet (thân chìm) |
| Dùng `pilo-icon` cho ≤56px | Thu nhỏ bản toàn thân xuống dưới 56px |
| Đổi mood theo trạng thái thật | Dùng mood happy cho lỗi hoặc cảnh báo |
| Giữ đúng tỉ lệ vuông | Kéo méo, xoay, đổi màu thân |

Pilo **không xuất hiện** trong màn hình workload-risk cao. Cảnh báo quá tải mà
có mascot vui vẻ đứng cạnh là sai giọng.

---

## 8. Tailwind config

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet:    { DEFAULT: '#6C3CF5', deep: '#5A2FE0', soft: '#8B62FF', tint: '#EDE7FF' },
        lime:      { DEFAULT: '#D8FF4A', deep: '#B8E62E', tint: '#EAFBCF' },
        ink:       { DEFAULT: '#171429', 2: '#4A4460', 3: '#8A83A3' },
        night:     '#1D1338',
        canvas:    '#F2F0FB',
        coral:     { DEFAULT: '#FF5470', tint: '#FFE7EB', text: '#C2003A' },
        tangerine: { DEFAULT: '#FFB020', tint: '#FFF1D6', text: '#8A5300' },
        mint:      { DEFAULT: '#22DDA6', tint: '#DEFBF1', text: '#08372A' },
        sky:       '#45C2FF',
        line:      '#F0EEF7',
        // riêng cho vùng nền tối
        dusk: {
          text:   '#B7ACD8',
          muted:  '#9C90C4',
          label:  '#6C5F94',
          border: '#33245C',
          panel:  '#2A1D4D',
          seg:    '#382A5E',
          hud:    '#A79CCB',
          btn:    '#C9BEE8',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        sans:    ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        card: '30px',
        ctl:  '16px',
        btn:  '14px',
        pill: '20px',
      },
      letterSpacing: {
        display: '-0.03em',
        num:     '-0.045em',
      },
    },
  },
} satisfies Config;
```

Thêm vào `globals.css`:

```css
body { @apply bg-canvas text-ink font-sans antialiased; }
h1, h2, h3 { @apply font-display tracking-display; }
.num { @apply font-display tracking-num; }
```

---

## 9. Business rule ảnh hưởng trực tiếp tới UI

Sáu rule này quyết định UI phải hiển thị cái gì, không chỉ là logic ngầm.

| Rule | UI phải làm gì |
|---|---|
| **BR-01** | Overdue và High priority là **nhãn chữ** riêng, phân biệt được khi in trắng đen. Màu chỉ là lớp phụ trợ. |
| **BR-02** | Kế hoạch AI luôn có badge `Draft` và nút `Confirm plan`. Không có đường nào để nháp tự thành active. |
| **BR-03** | Mọi màn hình có dữ liệu lịch phải hiện **last-sync time** và trạng thái sync. |
| **BR-04** | Nút Start focus disable khi chưa chọn assignment, kèm lý do hiển thị. |
| **BR-05** | GPA luôn hiển thị **đúng 2 chữ số thập phân**, kể cả `3.50`. Không rút gọn. |
| **BR-06** | Card risk phải có dòng "planning aid, not a medical assessment". Thiếu dữ liệu thì hiện "chưa tính được", không hiện 0. |

---

## 10. Accessibility

- Contrast tối thiểu 4.5:1 cho chữ thường. Chú ý nhất: chữ trên `lime` và
  `tangerine` — luôn dùng tông tối cùng họ ở mục 2.2.
- Nút chỉ có icon phải có `aria-label`.
- Focus ring nhìn thấy được: `outline: 2px solid #6C3CF5; outline-offset: 2px`.
- Vùng chạm tối thiểu 44×44 trên mobile.
- `prefers-reduced-motion` → tắt animation vòng đếm ngược, chỉ cập nhật số.
- Pilo luôn `aria-hidden`, vì mọi chỗ đặt Pilo đều có text đi kèm.

---

## 11. Checklist trước khi merge một PR về UI

- [ ] Không có hex màu viết thẳng trong `.tsx`
- [ ] Không có `box-shadow`
- [ ] Không có font-weight 800 gắn với Fredoka
- [ ] Card dùng `rounded-card`, nút dùng `rounded-btn`
- [ ] Trạng thái nào cũng có nhãn chữ, không chỉ có màu
- [ ] Test ở 375×667, không có scroll ngang
- [ ] Chữ trên nền màu đặc dùng đúng tông ở mục 2.2
- [ ] Pilo đặt trên nền trắng, dùng đúng bản icon nếu ≤56px
