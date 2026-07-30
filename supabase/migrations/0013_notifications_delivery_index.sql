-- SR-05 (docs/PRODUCT_REVIEW_3.md): deliverAllDueNotifications sweeps
-- `is(delivered_at, null) and lte(scheduled_at, now)` on every cron tick
-- (every 15 min) with no supporting index — a full table scan that gets
-- worse as notification history grows. delivered_at is the more selective
-- predicate (only ever null for a short window before delivery), so it
-- leads the composite.
create index if not exists notifications_pending_idx
  on notifications (delivered_at, scheduled_at);
