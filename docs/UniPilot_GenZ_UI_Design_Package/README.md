# UniPilot Gen Z UI Design Package

## Cách dùng với Claude Code

1. Giải nén toàn bộ package vào thư mục gốc của repository `UniPilot-AI`.
2. Giữ nguyên cấu trúc thư mục, đặc biệt là `docs/design-concepts/`.
3. Mở `UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md` trong Claude Code.
4. Gửi Claude Code lệnh sau:

```text
Read AGENTS.md, UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md, app/globals.css, docs/ANIMATION_SYSTEM.md, and every image in docs/design-concepts/ before editing. Use the live source as the functional truth and the design-concept images as the approved visual target. Start with Phase 0, then implement one phase at a time. Use real data only, preserve current behavior, do not create fake controls, and do not commit or push unless I ask. After every phase, run relevant tests and capture real screenshots before continuing.
```

## Nội dung package

- `UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md`: roadmap triển khai chi tiết theo phase và step.
- 8 ảnh concept — **đã giải nén và hợp nhất vào `docs/design-concepts/` ở gốc repo**, nên bản sao trong thư mục package đã được xoá (trùng byte-for-byte, chỉ làm nặng repo thêm 9 MB).

Repo đánh số khác package vì có thêm hai ảnh (`00-dashboard-reference`, `01-assignments`), nên mọi số **dịch lên một**:

| Trong package          | Trong repo                                  |
| ---------------------- | ------------------------------------------- |
| `01-ai-planner.png`    | `docs/design-concepts/02-ai-planner.png`    |
| `02-schedule.png`      | `docs/design-concepts/03-schedule.png`      |
| `03-courses.png`       | `docs/design-concepts/04-courses.png`       |
| `04-focus-timer.png`   | `docs/design-concepts/05-focus-timer.png`   |
| `05-gpa-tracker.png`   | `docs/design-concepts/06-gpa-tracker.png`   |
| `06-workload-risk.png` | `docs/design-concepts/07-workload-risk.png` |
| `07-weekly-report.png` | `docs/design-concepts/08-weekly-report.png` |
| `08-settings.png`      | `docs/design-concepts/09-settings.png`      |

Các số liệu hiển thị trong ảnh concept chỉ là minh họa. Khi build, Claude phải lấy hoặc suy ra mọi dữ liệu từ source, Supabase và rule hiện có.
