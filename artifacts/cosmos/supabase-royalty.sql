-- Cosmic Ocean — Royalty wallet
-- Run this migration in Supabase SQL Editor.
-- Balances are intentionally immutable from the browser. Future earning,
-- purchase, conversion, and transaction flows should use server-owned
-- security-definer functions or a trusted server, not client updates.

create table if not exists public.wallets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  planetary_coins   bigint not null default 0 check (planetary_coins >= 0),
  star_tokens       bigint not null default 0 check (star_tokens >= 0),
  universal_coins   bigint not null default 0 check (universal_coins >= 0),
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

alter table public.wallets enable row level security;

drop policy if exists "Users can view their own wallet" on public.wallets;
create policy "Users can view their own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own wallet" on public.wallets;

-- No insert/update/delete policies are intentional: no browser session may
-- manufacture, remove, or alter Royalty balances. Creation happens through
-- the narrowly-scoped function below, which always inserts zero balances.

create or replace function public.set_wallet_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_wallet_updated_at();

create or replace function public.create_wallet_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_wallet on auth.users;
create trigger on_auth_user_created_create_wallet
  after insert on auth.users
  for each row execute function public.create_wallet_for_new_user();

create or replace function public.ensure_wallet(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.wallets;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into result
  from public.wallets
  where user_id = p_user_id;

  return result;
end;
$$;

revoke all on function public.ensure_wallet(uuid) from public, anon;
grant execute on function public.ensure_wallet(uuid) to authenticated;

-- Backfill accounts created before this migration.
insert into public.wallets (user_id)
select id from auth.users
on conflict (user_id) do nothing;