-- §5 (future_update.md) "Đồng bộ 2 chiều Google Calendar": once a study
-- plan is confirmed, its sessions get pushed to the user's Google Calendar.
-- Tracks the resulting event id so a session already pushed is never
-- double-created on a retry.

alter table study_sessions
  add column gcal_event_id text;
