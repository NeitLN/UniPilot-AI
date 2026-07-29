-- UniPilot AI — manual calendar events + course creation.
-- Lets a user add their own Schedule events (Apple Calendar-style: all-day,
-- repeat, alert, notes) alongside Google Calendar-synced class_blocks, and
-- ties event alerts back to notifications the same way assignment reminders
-- already work (see lib/notifications/sync.ts).
--
-- Recurring events are materialized as one class_blocks row per occurrence
-- (same approach the Google sync already uses), grouped by
-- recurrence_group_id so "delete this and following" can target the group.

alter table class_blocks
  add column is_all_day boolean not null default false,
  add column notes text,
  add column reminder_minutes_before int,
  add column recurrence_group_id uuid;

create index class_blocks_recurrence_group_idx
  on class_blocks (recurrence_group_id)
  where recurrence_group_id is not null;

alter table notifications
  add column class_block_id uuid references class_blocks on delete cascade;
