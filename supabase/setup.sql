-- 환승연애 시뮬레이션 데이터베이스 초기 설정
-- Supabase Dashboard > SQL Editor > New query 에 전체 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null default '우리의 첫 번째 계절',
  phase text not null default '입주 첫날',
  day integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  kind text not null default 'human' check (kind in ('human','ai')),
  gender text,
  age integer,
  job text,
  personality text,
  speech text,
  x_name text,
  secret text,
  current_feeling text,
  memory jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  content text not null,
  kind text not null default 'chat',
  created_at timestamptz not null default now()
);

create index if not exists players_room_id_idx on public.players(room_id);
create index if not exists messages_room_created_idx on public.messages(room_id, created_at);

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.messages enable row level security;

-- 테스트용 공개 접근 정책입니다. 초대코드가 유출되면 데이터 접근이 가능할 수 있습니다.
-- 실제 공개 서비스 전에 Supabase Auth와 방 멤버별 RLS 정책으로 반드시 교체하세요.
drop policy if exists "prototype rooms access" on public.rooms;
create policy "prototype rooms access" on public.rooms
for all to anon, authenticated using (true) with check (true);

drop policy if exists "prototype players access" on public.players;
create policy "prototype players access" on public.players
for all to anon, authenticated using (true) with check (true);

drop policy if exists "prototype messages access" on public.messages;
create policy "prototype messages access" on public.messages
for all to anon, authenticated using (true) with check (true);

-- Realtime 활성화
do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
