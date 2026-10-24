-- Balance-changing work happens in one function call each, under a row lock on the profile,
-- so concurrent requests can neither double-spend nor dodge the run rate limit.
-- Called only by the API with the secret key; the public roles cannot execute them.

-- Guest import keeps the guest's run counts without inventing run rows (DESIGN.md §13).
alter table public.profiles
  add column imported_runs integer not null default 0 check (imported_runs >= 0),
  add column imported_victories integer not null default 0 check (imported_victories >= 0),
  add column imported_best_victory_sec integer check (imported_best_victory_sec >= 0);

create function public.award_run(p_profile uuid, p_run jsonb, p_shards integer, p_logs text[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  balance integer;
begin
  perform 1 from public.profiles where id = p_profile for update;
  if not found then
    raise exception 'UNKNOWN_PROFILE';
  end if;
  if exists (
    select 1 from public.runs
    where profile_id = p_profile and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'RATE_LIMITED';
  end if;
  insert into public.runs (
    profile_id, runner_id, seed, sector_reached, rooms_cleared, bosses_killed,
    duration_sec, kills, victory, shards_awarded
  ) values (
    p_profile,
    p_run ->> 'runnerId',
    p_run ->> 'seed',
    (p_run ->> 'sectorReached')::integer,
    (p_run ->> 'roomsCleared')::integer,
    (p_run ->> 'bossesKilled')::integer,
    (p_run ->> 'durationSec')::integer,
    (p_run ->> 'kills')::integer,
    (p_run ->> 'victory')::boolean,
    p_shards
  );
  insert into public.vault_logs (profile_id, log_id)
  select p_profile, l from unnest(p_logs) as l
  on conflict do nothing;
  update public.profiles set core_shards = core_shards + p_shards
  where id = p_profile
  returning core_shards into balance;
  return balance;
end;
$$;

create function public.purchase_unlock(p_profile uuid, p_type text, p_id text, p_cost integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  balance integer;
begin
  select core_shards into balance from public.profiles where id = p_profile for update;
  if not found then
    raise exception 'UNKNOWN_PROFILE';
  end if;
  if exists (
    select 1 from public.unlocks
    where profile_id = p_profile and item_type = p_type and item_id = p_id
  ) then
    raise exception 'ALREADY_OWNED';
  end if;
  if balance < p_cost then
    raise exception 'INSUFFICIENT_SHARDS';
  end if;
  insert into public.unlocks (profile_id, item_type, item_id) values (p_profile, p_type, p_id);
  update public.profiles set core_shards = core_shards - p_cost
  where id = p_profile
  returning core_shards into balance;
  return balance;
end;
$$;

-- p_unlocks: [{ "itemType": "...", "itemId": "..." }], already filtered to known items by the API.
create function public.import_guest(
  p_profile uuid, p_shards integer, p_unlocks jsonb, p_logs text[],
  p_runs integer, p_victories integer, p_best_sec integer
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  used boolean;
  have_runs integer;
  have_victories integer;
begin
  select imported_guest into used from public.profiles where id = p_profile for update;
  if not found then
    raise exception 'UNKNOWN_PROFILE';
  end if;
  if used then
    raise exception 'IMPORT_USED';
  end if;
  select count(*), count(*) filter (where victory) into have_runs, have_victories
  from public.runs where profile_id = p_profile;
  insert into public.unlocks (profile_id, item_type, item_id)
  select p_profile, u ->> 'itemType', u ->> 'itemId' from jsonb_array_elements(p_unlocks) as u
  on conflict do nothing;
  insert into public.vault_logs (profile_id, log_id)
  select p_profile, l from unnest(p_logs) as l
  on conflict do nothing;
  -- Counts become max(guest, account): the difference is stored, never a decrease.
  update public.profiles set
    imported_guest = true,
    core_shards = core_shards + p_shards,
    imported_runs = greatest(0, p_runs - have_runs),
    imported_victories = greatest(0, p_victories - have_victories),
    imported_best_victory_sec = p_best_sec
  where id = p_profile;
end;
$$;

create function public.profile_stats(p_profile uuid)
returns table (total_runs integer, total_victories integer, best_victory_sec integer)
language sql
stable
set search_path = ''
as $$
  select
    (count(r.id) + p.imported_runs)::integer,
    (count(r.id) filter (where r.victory) + p.imported_victories)::integer,
    least(min(r.duration_sec) filter (where r.victory), p.imported_best_victory_sec)::integer
  from public.profiles p
  left join public.runs r on r.profile_id = p.id
  where p.id = p_profile
  group by p.id;
$$;

-- One best row per profile. Weekly = since Monday 00:00 UTC.
create function public.leaderboard(p_period text, p_kind text, p_limit integer)
returns table (
  username text, runner_id text, duration_sec integer, sector_reached integer,
  rooms_cleared integer, created_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with eligible as (
    select r.* from public.runs r
    where (p_period = 'all' or r.created_at >= date_trunc('week', now() at time zone 'utc') at time zone 'utc')
      and (p_kind = 'deepest' or r.victory)
  ),
  best as (
    select distinct on (e.profile_id) e.* from eligible e
    order by e.profile_id,
      case when p_kind = 'deepest' then -e.sector_reached else 0 end,
      case when p_kind = 'deepest' then -e.rooms_cleared else 0 end,
      e.duration_sec,
      e.created_at
  )
  select p.username, b.runner_id, b.duration_sec, b.sector_reached, b.rooms_cleared, b.created_at
  from best b
  join public.profiles p on p.id = b.profile_id
  order by
    case when p_kind = 'deepest' then -b.sector_reached else 0 end,
    case when p_kind = 'deepest' then -b.rooms_cleared else 0 end,
    b.duration_sec,
    b.created_at
  limit p_limit;
$$;

revoke execute on function public.award_run(uuid, jsonb, integer, text[]) from public, anon, authenticated;
revoke execute on function public.purchase_unlock(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.import_guest(uuid, integer, jsonb, text[], integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.profile_stats(uuid) from public, anon, authenticated;
revoke execute on function public.leaderboard(text, text, integer) from public, anon, authenticated;
