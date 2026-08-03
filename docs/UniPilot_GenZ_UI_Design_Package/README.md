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
- `docs/design-concepts/01-ai-planner.png`
- `docs/design-concepts/02-schedule.png`
- `docs/design-concepts/03-courses.png`
- `docs/design-concepts/04-focus-timer.png`
- `docs/design-concepts/05-gpa-tracker.png`
- `docs/design-concepts/06-workload-risk.png`
- `docs/design-concepts/07-weekly-report.png`
- `docs/design-concepts/08-settings.png`

Các số liệu hiển thị trong ảnh concept chỉ là minh họa. Khi build, Claude phải lấy hoặc suy ra mọi dữ liệu từ source, Supabase và rule hiện có.
