-- MVP schema (PRD "Data model", DESIGN.md §9.4). Only the API touches these tables, with the
-- secret key (bypasses RLS). RLS is on with zero policies, so the public keys can do nothing.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  core_shards integer not null default 0 check (core_shards >= 0),
  imported_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.unlocks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null check (item_type in ('runner', 'weapon', 'mod')),
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, item_type, item_id)
);

create table public.vault_logs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  log_id text not null,
  found_at timestamptz not null default now(),
  primary key (profile_id, log_id)
);

create table public.saves (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  slot integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, slot)
);

create table public.runs (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  runner_id text not null,
  seed text not null,
  sector_reached integer not null check (sector_reached between 1 and 3),
  rooms_cleared integer not null check (rooms_cleared >= 0),
  bosses_killed integer not null check (bosses_killed between 0 and 3),
  duration_sec integer not null check (duration_sec >= 0),
  kills integer not null check (kills >= 0),
  victory boolean not null,
  shards_awarded integer not null check (shards_awarded >= 0),
  created_at timestamptz not null default now()
);

-- Rate limit lookups and per-profile history.
create index runs_profile_created_idx on public.runs (profile_id, created_at desc);
-- Fastest-victory leaderboard.
create index runs_victory_duration_idx on public.runs (victory, duration_sec) where victory;

alter table public.profiles enable row level security;
alter table public.unlocks enable row level security;
alter table public.vault_logs enable row level security;
alter table public.saves enable row level security;
alter table public.runs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;
