-- Aivora AI - Stage 2
-- Supabase Auth + Profiles + Credits + Projects
-- شغّل هذا الملف في Supabase SQL Editor.
-- لا يحتوي على مفاتيح سرية.

create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text default '',
  credits integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  input text not null,
  result jsonb not null default '{}'::jsonb,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects
for delete
to authenticated
using (auth.uid() = user_id);

-- Create profile automatically after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    100
  )
  on conflict (id) do update set
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Existing users: create missing profiles
insert into public.profiles (id, email, display_name, credits)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'display_name', ''),
  100
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

-- Atomic credit deduction
create or replace function public.consume_credits(p_cost integer)
returns table(remaining_credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Invalid credit cost';
  end if;

  update public.profiles
  set credits = credits - p_cost
  where id = auth.uid()
    and credits >= p_cost
  returning credits into new_balance;

  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return query select new_balance;
end;
$$;

revoke all on function public.consume_credits(integer) from public;
grant execute on function public.consume_credits(integer) to authenticated;

-- Refund credits when an AI generation fails
create or replace function public.refund_credits(p_cost integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Invalid credit cost';
  end if;

  update public.profiles
  set credits = credits + p_cost
  where id = auth.uid()
  returning credits into new_balance;

  return coalesce(new_balance, 0);
end;
$$;

revoke all on function public.refund_credits(integer) from public;
grant execute on function public.refund_credits(integer) to authenticated;

-- Make sure the API roles can use the tables
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, delete on public.projects to authenticated;
