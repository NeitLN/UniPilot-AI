-- UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.7 — Weekly Report needs
-- to know exactly when an assignment was marked done. `updated_at` is only a
-- proxy (any edit bumps it, not just a status change to "done"), so it's
-- not safe to use for "completed this week" queries.

alter table assignments
  add column completed_at timestamptz null;

-- Historical approximation only: for rows already `done`, the true
-- completion moment was never recorded, so `updated_at` is the closest
-- available signal. Documented here rather than silently presented as
-- exact — Weekly Report's presentation layer should treat any completed_at
-- that predates this migration's deploy date as approximate.
update assignments
set completed_at = updated_at
where status = 'done' and completed_at is null;

-- Going forward, application code (app/(app)/assignments/actions.ts) is
-- responsible for setting completed_at = now() when status transitions to
-- 'done', and null when it transitions away from 'done' — kept in the app
-- layer (not a trigger) so the same validated, single code path that
-- already owns every other status transition owns this one too.
