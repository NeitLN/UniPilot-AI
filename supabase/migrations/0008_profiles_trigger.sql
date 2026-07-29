-- UniPilot AI — fixes a gap where signing up never created a profiles row
-- (0001_init.sql defined the table but no trigger populated it), which
-- silently broke weekly-availability-gated features (AI Planner, Workload
-- Risk) and made updateTargetGpa's .update() a no-op on a missing row.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Backfill: give every existing user a profile row too.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
