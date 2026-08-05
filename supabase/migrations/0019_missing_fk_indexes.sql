-- PERF-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — index every foreign key.
--
-- Postgres creates indexes for primary keys and unique constraints, but not
-- for foreign keys. Eleven of ours had none, confirmed by querying
-- pg_constraint against the live database rather than reading migrations.
--
-- Three reasons this matters here specifically:
--
--   * courses.user_id, notifications.user_id and risk_warnings.user_id are
--     what every RLS policy on those tables filters on (user_id = auth.uid()).
--     Unindexed, that is a sequential scan on every query, for every user.
--   * study_sessions.plan_id backs a correlated subquery in that table's RLS
--     policy, which has no user_id of its own and is scoped through its plan.
--   * The *.course_id and *.assignment_id columns are scanned to enforce the
--     constraint whenever a parent row is deleted. deleteCourse already walks
--     that path in production.
--
-- Nothing is slow today (41 assignments, 55 focus sessions) — this removes a
-- scaling cliff before it becomes an incident, and it is purely additive.
--
-- Applying to a busy production database: run these as
-- `create index concurrently` instead, one statement per transaction.
-- CONCURRENTLY is deliberately not used here because Supabase's migration
-- runner wraps each file in a transaction, and CONCURRENTLY cannot run inside
-- one.

create index if not exists courses_user_id_idx on courses (user_id);
create index if not exists notifications_user_id_idx on notifications (user_id);
create index if not exists risk_warnings_user_id_idx on risk_warnings (user_id);

create index if not exists study_sessions_plan_id_idx on study_sessions (plan_id);
create index if not exists study_sessions_assignment_id_idx on study_sessions (assignment_id);

create index if not exists assignments_course_id_idx on assignments (course_id);
create index if not exists class_blocks_course_id_idx on class_blocks (course_id);
create index if not exists grades_course_id_idx on grades (course_id);
create index if not exists focus_sessions_assignment_id_idx on focus_sessions (assignment_id);

create index if not exists notifications_assignment_id_idx on notifications (assignment_id);
create index if not exists notifications_class_block_id_idx on notifications (class_block_id);
