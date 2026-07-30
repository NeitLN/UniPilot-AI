-- Phase 4.1 (docs/IMPLEMENTATION_PLAN.md, docs/PRODUCT_REVIEW.md): deleting
-- an assignment currently cascade-deletes every focus_sessions row logged
-- against it — including completed Pomodoro cycles that already
-- contributed to the user's streak. That's achievement history, not
-- derived data, and it should survive the assignment it was originally
-- logged against being deleted. Re-pointing the FK to ON DELETE SET NULL
-- requires the column to allow null first, which the original NOT NULL
-- constraint blocks.
--
-- The FK is dropped by discovering its actual name rather than assuming
-- the default `focus_sessions_assignment_id_fkey` naming convention, since
-- getting a hardcoded name wrong would fail this migration outright against
-- the live database.
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'focus_sessions'::regclass
    and contype = 'f'
    and conkey = (
      select array_agg(attnum)
      from pg_attribute
      where attrelid = 'focus_sessions'::regclass and attname = 'assignment_id'
    );

  if fk_name is not null then
    execute format('alter table focus_sessions drop constraint %I', fk_name);
  end if;
end $$;

alter table focus_sessions
  alter column assignment_id drop not null;

alter table focus_sessions
  add constraint focus_sessions_assignment_id_fkey
    foreign key (assignment_id) references assignments (id) on delete set null;

-- Phase 4.2 (FR-22): distinguishes a session logged live via the Pomodoro
-- timer from one entered by hand after the fact. Bundled into this same
-- migration rather than a separate one, per the plan's note to avoid two
-- schema changes to the same table back to back.
create type focus_session_source as enum ('timer', 'manual');

alter table focus_sessions
  add column source focus_session_source not null default 'timer';
