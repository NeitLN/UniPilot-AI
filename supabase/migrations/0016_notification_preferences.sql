-- UNIPILOT_8_SCREENS_GENZ_UI_BUILD_ROADMAP.md Step 0.6 — Settings' concept
-- shows four independent notification-category toggles. Today the app only
-- has a single global browser push permission (PushNotificationSettings);
-- these categories are real per-user preferences the notification
-- delivery logic must actually read, not decorative switches.

create table notification_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  assignment_reminders boolean not null default true,
  workload_warnings boolean not null default true,
  weekly_report boolean not null default true,
  focus_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "notification_preferences_self" on notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Same pattern as handle_new_user() (0008_profiles_trigger.sql): give every
-- new signup a default row so a NULL-row edge case never has to be handled
-- app-side, and backfill existing users the same way.
create or replace function handle_new_user_notification_preferences()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_notification_preferences
after insert on auth.users
for each row execute function handle_new_user_notification_preferences();

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;
