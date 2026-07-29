-- UniPilot AI — Phase 1 schema, RLS, indexes, triggers
-- See docs/ROADMAP.md §PHASE 1

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  target_gpa numeric(3,2) check (target_gpa between 0 and 4),
  weekly_availability_hours numeric(4,1) default 0 check (weekly_availability_hours >= 0),
  created_at timestamptz default now()
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code text, name text not null,
  credits int not null check (credits > 0),
  semester text not null,
  created_at timestamptz default now()
);

create type assignment_status as enum ('not_started','in_progress','done');
create type assignment_priority as enum ('low','medium','high');

create table assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses on delete set null,
  title text not null,
  due_at timestamptz not null,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  priority assignment_priority not null,
  status assignment_status not null default 'not_started',
  progress int not null default 0 check (progress between 0 and 100),
  notes text,
  reminder_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table class_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid references courses on delete set null,
  gcal_event_id text,
  title text not null, location text,
  start_at timestamptz not null, end_at timestamptz not null,
  synced_at timestamptz default now(),
  unique (user_id, gcal_event_id)
);

create type focus_result as enum ('completed','partial');

create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assignment_id uuid not null references assignments on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds int not null check (duration_seconds > 0),
  result focus_result not null
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  course_id uuid not null references courses on delete cascade,
  semester text not null,
  grade_point numeric(3,2) not null check (grade_point between 0 and 4),
  credit_hours int not null check (credit_hours > 0),
  created_at timestamptz default now(),
  unique (user_id, course_id, semester)
);

create type plan_status as enum ('draft','active','cancelled');

create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  status plan_status not null default 'draft',
  input_snapshot jsonb not null,
  generated_at timestamptz default now(),
  confirmed_at timestamptz
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references study_plans on delete cascade,
  assignment_id uuid references assignments on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null
);

create table risk_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  score_date date not null,
  workload_factor int not null,
  overdue_factor int not null,
  focus_factor int not null,
  score int not null,
  computed_at timestamptz default now(),
  unique (user_id, score_date)
);

create type warning_status as enum ('open','handled','dismissed');

create table risk_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  risk_score_id uuid not null references risk_scores on delete cascade,
  status warning_status not null default 'open',
  action_taken text,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  title text not null, body text,
  scheduled_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  push_status text default 'pending'
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

create index assignments_user_due_idx on assignments (user_id, due_at);
create index focus_sessions_user_started_idx on focus_sessions (user_id, started_at);
create index class_blocks_user_start_idx on class_blocks (user_id, start_at);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger for assignments
-- ─────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assignments_set_updated_at
before update on assignments
for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — every table, policy user_id = auth.uid()
-- (profiles uses id = auth.uid(); study_sessions joins via study_plans)
-- ─────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table courses enable row level security;
alter table assignments enable row level security;
alter table class_blocks enable row level security;
alter table focus_sessions enable row level security;
alter table grades enable row level security;
alter table study_plans enable row level security;
alter table study_sessions enable row level security;
alter table risk_scores enable row level security;
alter table risk_warnings enable row level security;
alter table notifications enable row level security;

create policy "profiles_self" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "courses_own" on courses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "assignments_own" on assignments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "class_blocks_own" on class_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "focus_sessions_own" on focus_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "grades_own" on grades
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "study_plans_own" on study_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "study_sessions_via_plan" on study_sessions
  for all using (
    exists (
      select 1 from study_plans p
      where p.id = study_sessions.plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from study_plans p
      where p.id = study_sessions.plan_id and p.user_id = auth.uid()
    )
  );

create policy "risk_scores_own" on risk_scores
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "risk_warnings_own" on risk_warnings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "notifications_own" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
