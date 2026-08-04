-- SEC-01 (UNIPILOT_COMPLETE_PRODUCT_AUDIT.md) — per-user rate limiting.
--
-- Every API route authenticated the caller and stopped there. Nothing
-- limited how often a signed-in user could call them, and /api/plan/generate
-- reaches a paid Gemini API on each call while /api/export walks every table
-- the user owns.
--
-- Fixed window rather than a sliding one: the point here is a ceiling on
-- cost and load, not smooth pacing, and a fixed window is one row and one
-- statement instead of a log of every request.

create table if not exists rate_limits (
  user_id uuid not null references auth.users on delete cascade,
  route text not null,
  -- Truncated to the window, so a row is reused for the whole period and
  -- the primary key is what makes the increment atomic.
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, route, window_start)
);

alter table rate_limits enable row level security;

-- No policy grants direct access on purpose. Rows are only ever touched by
-- consume_rate_limit() below, which is security definer. A client that could
-- update this table directly could raise its own ceiling.

/**
 * Atomically records one hit and reports whether it is allowed.
 *
 * user_id comes from auth.uid() inside the function, never from a parameter
 * — otherwise any caller could spend someone else's quota or dodge their own
 * by passing a different id.
 *
 * The insert..on conflict do update is what makes this safe under
 * concurrency: two simultaneous requests serialise on the primary key, so
 * neither can read a stale count and both get distinct values back. A
 * check-then-act in application code could not do that.
 */
create or replace function consume_rate_limit(
  p_route text,
  p_limit int,
  p_window_seconds int
)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'consume_rate_limit requires an authenticated caller';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into rate_limits (user_id, route, window_start, count)
  values (v_user_id, p_route, v_window_start, 1)
  on conflict (user_id, route, window_start)
  do update set count = rate_limits.count + 1
  returning rate_limits.count into v_count;

  -- Opportunistic cleanup: without it this table only ever grows. Cheap
  -- because it is keyed on the same index the insert just used.
  delete from rate_limits
  where rate_limits.user_id = v_user_id
    and rate_limits.window_start < v_window_start - make_interval(secs => p_window_seconds);

  return query select
    v_count <= p_limit,
    greatest(0, p_limit - v_count),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function consume_rate_limit(text, int, int) from public;
grant execute on function consume_rate_limit(text, int, int) to authenticated;
