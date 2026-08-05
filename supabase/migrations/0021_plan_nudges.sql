-- PROD-02 — in-week plan adherence nudges.
--
-- Two things are needed for this to be safe to run from a cron that fires
-- every 15 minutes: a way for the student to turn it off, and a way for the
-- sweep to be idempotent.

-- Default true, matching the other categories that carry real information
-- (assignment_reminders, workload_warnings). A student who has an active
-- plan has already opted into planning; the nudge is part of that, not a
-- separate marketing channel.
alter table notification_preferences
  add column if not exists plan_nudges boolean not null default true;

-- Idempotency key for notifications that a repeating job may try to create
-- more than once. Nullable and unconstrained for every existing kind:
-- assignment/event reminders are reconciled by their own foreign key and
-- must stay able to repeat (a weekly class has one row per occurrence).
alter table notifications
  add column if not exists dedupe_key text;

-- The sweep runs every 15 minutes and could overlap itself, so "at most one
-- nudge per plan week" cannot be a select-then-insert in application code —
-- that is a check-then-act race, the same one migration 0005 had to fix for
-- risk warnings. This makes the database refuse the duplicate instead, so
-- `on conflict do nothing` is enough on the write side.
--
-- Deliberately NOT a partial index (`where dedupe_key is not null`), even
-- though that reads like the tighter statement of intent. Postgres can only
-- infer a partial index when ON CONFLICT repeats its predicate, and
-- supabase-js `onConflict` takes column names only — the partial version
-- fails every insert with "no unique or exclusion constraint matching the
-- ON CONFLICT specification" (verified against the database, not assumed).
--
-- Nothing is lost: null values are distinct from each other in a unique
-- index, so every existing kind — which leaves dedupe_key null — stays
-- free to repeat exactly as before.
create unique index if not exists notifications_dedupe_key_idx
  on notifications (user_id, kind, dedupe_key);
