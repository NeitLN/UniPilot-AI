-- QA4-01 (docs/PRODUCT_REVIEW_4.md): confirmPlan never demoted a
-- previously-active plan before activating a new one, so a user who
-- confirmed more than once ended up with several study_plans rows all
-- status='active' for the same week. /planner and /reports both read
-- "the" active plan via .limit(1).maybeSingle() — an arbitrary pick among
-- duplicates, silently — and each confirm re-inserted a full set of
-- "study_session" reminder notifications on top of whatever the previous
-- confirm had already inserted.

-- 1. One-time cleanup: for every user with more than one "active" plan,
-- keep the one confirmed most recently (that's the one a real user last
-- intentionally chose) and cancel the rest. Ties broken by generated_at,
-- then id, so this is deterministic even if confirmed_at ever collides.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by confirmed_at desc nulls last, generated_at desc, id
    ) as rn
  from study_plans
  where status = 'active'
)
update study_plans
set status = 'cancelled'
where id in (select id from ranked where rn > 1);

-- 2. Clean up exact-duplicate reminder notifications left behind by the
-- redundant confirms above (same title + same scheduled_at can only mean
-- the same session was reminded twice, since a real user's sessions don't
-- repeat both fields together). Keeps the earliest row per duplicate
-- group, drops the rest. Scoped to kind='study_session' — the only kind
-- confirmPlan's reminder path produces, so this can't touch assignment or
-- event reminders.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, kind, title, scheduled_at
      order by id
    ) as rn
  from notifications
  where kind = 'study_session'
)
delete from notifications
where id in (select id from ranked where rn > 1);

-- 3. DB-level guarantee going forward: a partial unique index makes two
-- simultaneously-active plans for the same user unrepresentable, rather
-- than relying solely on confirmPlan's application-level demote-then-
-- activate sequence staying correct forever.
create unique index if not exists study_plans_one_active_per_user
  on study_plans (user_id)
  where status = 'active';
