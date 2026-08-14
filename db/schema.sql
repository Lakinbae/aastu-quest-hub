-- db/schema.sql
-- Run this in Supabase SQL Editor if tables are missing

create extension if not exists pgcrypto;

create table if not exists public.quests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  min_team_size int default 3,
  max_team_size int default 5,
  start_at timestamptz,
  end_at timestamptz,
  reward_points int default 10,
  created_at timestamptz default now()
);

create table if not exists public.registrations (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade,
  user_student_id text,
  created_at timestamptz default now(),
  unique (quest_id, user_student_id)
);

create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade,
  member_student_ids text[],
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade,
  files jsonb,
  text_proof text,
  submitted_at timestamptz default now(),
  verification_status text default 'pending',
  verified_by text,
  verified_at timestamptz
);

-- Minimal test policy for registrations (use only for testing)
alter table public.registrations enable row level security;

drop policy if exists "Allow select for anon" on public.registrations;

create policy "Allow select for anon"
  on public.registrations
  for select
  using (true);