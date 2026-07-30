-- F-01 (future_update.md): weekly labs/quizzes previously had to be
-- typed in one at a time. Mirrors class_blocks.recurrence_group_id —
-- each materialized occurrence shares a group id so a later "delete this
-- and following" can find its siblings.

alter table assignments
  add column recurrence_group_id uuid;

create index if not exists assignments_recurrence_group_id_idx
  on assignments (recurrence_group_id);
