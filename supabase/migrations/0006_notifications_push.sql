-- UniPilot AI — Phase 9 schema additions: Web Push subscriptions, and a
-- way to tie a notification back to the assignment it reminds about so
-- archiving can cancel a still-pending reminder (FR-19).
-- See docs/UniPilot/UniPilot_AI_ROADMAP.md §PHASE 9.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_own" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table notifications
  add column assignment_id uuid references assignments on delete cascade;
