-- UniPilot AI — Phase 4 schema addition: Google Calendar OAuth connection.
-- See docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 4.
-- One connection per user; also carries BR-03's last-sync time/status so the
-- Schedule UI can render it without a second table.

create type calendar_sync_status as enum ('never', 'ok', 'error');

create table google_calendar_connections (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scope text not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_status calendar_sync_status not null default 'never',
  last_sync_error text
);

alter table google_calendar_connections enable row level security;

create policy "google_calendar_connections_own" on google_calendar_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
