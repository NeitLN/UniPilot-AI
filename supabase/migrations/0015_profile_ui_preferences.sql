-- UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.5 — the Focus Timer and
-- Settings concepts both need real, saved study preferences (default focus
-- duration, daily goal, preferred study days) that don't exist yet. These
-- are genuine user settings, not derived data, so they belong on `profiles`
-- alongside the existing target_gpa/weekly_availability_hours.

alter table profiles
  add column default_focus_minutes int not null default 25
    check (default_focus_minutes in (25, 45, 60)),
  add column daily_focus_goal_cycles int not null default 4
    check (daily_focus_goal_cycles between 1 and 12),
  -- ISO 8601 weekday numbering: 1=Monday .. 7=Sunday. Validated in the
  -- application layer (lib/rules/preferences.ts), not by a CHECK
  -- constraint, since validating "every element in 1..7" needs an array
  -- unnest that's easier to test as a pure TS function than SQL.
  add column preferred_study_days smallint[] not null default '{1,2,3,4,5}';
