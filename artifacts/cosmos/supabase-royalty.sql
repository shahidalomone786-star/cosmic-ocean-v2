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

-- Cosmic Atelier purchases
-- The client sends only an avatar id. Prices and currencies live in this
-- server-owned catalog so a browser cannot discount or change a purchase.
create table if not exists public.cosmic_avatar_catalog (
  avatar_id      text primary key,
  ownership_id   text not null unique,
  price          bigint not null check (price > 0),
  currency       text not null check (currency in ('planetary_coins', 'star_tokens', 'universal_coins')),
  active         boolean not null default true,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now())
);

alter table public.cosmic_avatar_catalog enable row level security;

-- This table is intentionally not writable or readable by browser sessions.
-- The purchase function is the only public operation that uses it.
revoke all on table public.cosmic_avatar_catalog from anon, authenticated;

insert into public.cosmic_avatar_catalog (avatar_id, ownership_id, price, currency)
values
  ('marie-curie', 'atelier-marie-curie', 200, 'star_tokens'),
  ('brian-cox', 'atelier-brian-cox', 500000, 'planetary_coins'),
  ('isaac-newton', 'atelier-isaac-newton', 300000, 'planetary_coins'),
  ('srinivasa-ramanujan', 'atelier-srinivasa-ramanujan', 320, 'star_tokens'),
  ('mr-bean', 'atelier-mr-bean', 250, 'star_tokens')
on conflict (avatar_id) do update
set ownership_id = excluded.ownership_id,
    price = excluded.price,
    currency = excluded.currency,
    active = true,
    updated_at = timezone('utc', now());

create table if not exists public.cosmic_avatar_ownerships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  avatar_id      text not null references public.cosmic_avatar_catalog(avatar_id),
  ownership_id   text not null,
  price_paid     bigint not null check (price_paid > 0),
  currency       text not null check (currency in ('planetary_coins', 'star_tokens', 'universal_coins')),
  purchased_at   timestamptz not null default timezone('utc', now()),
  unique (user_id, avatar_id)
);

alter table public.cosmic_avatar_ownerships enable row level security;

drop policy if exists "Users can view their own avatar ownerships" on public.cosmic_avatar_ownerships;
create policy "Users can view their own avatar ownerships"
  on public.cosmic_avatar_ownerships for select
  using (auth.uid() = user_id);

-- There are deliberately no browser insert/update/delete policies. Ownership
-- is created only inside the atomic, security-definer purchase function.
revoke all on table public.cosmic_avatar_ownerships from anon, authenticated;
grant select on table public.cosmic_avatar_ownerships to authenticated;

create index if not exists cosmic_avatar_ownerships_user_idx
  on public.cosmic_avatar_ownerships (user_id, purchased_at desc);

create or replace function public.purchase_cosmic_avatar(p_avatar_id text)
returns table (
  status             text,
  avatar_id          text,
  ownership_id       text,
  price              bigint,
  currency           text,
  planetary_coins   bigint,
  star_tokens       bigint,
  universal_coins   bigint,
  purchased_at       timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  buyer_id uuid := auth.uid();
  item public.cosmic_avatar_catalog%rowtype;
  buyer_wallet public.wallets%rowtype;
  existing_ownership public.cosmic_avatar_ownerships%rowtype;
  new_ownership public.cosmic_avatar_ownerships%rowtype;
begin
  if buyer_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select *
  into item
  from public.cosmic_avatar_catalog
  where cosmic_avatar_catalog.avatar_id = p_avatar_id
    and cosmic_avatar_catalog.active = true;

  if not found then
    raise exception 'AVATAR_NOT_FOUND';
  end if;

  -- The wallet row is the serialization point for this user's purchases.
  -- It also makes concurrent double-clicks and tabs safe.
  insert into public.wallets (user_id)
  values (buyer_id)
  on conflict (user_id) do nothing;

  select *
  into buyer_wallet
  from public.wallets
  where wallets.user_id = buyer_id
  for update;

  select *
  into existing_ownership
  from public.cosmic_avatar_ownerships
  where cosmic_avatar_ownerships.user_id = buyer_id
    and cosmic_avatar_ownerships.avatar_id = item.avatar_id;

  if found then
    return query
    select
      'already_owned'::text,
      item.avatar_id,
      existing_ownership.ownership_id,
      existing_ownership.price_paid,
      existing_ownership.currency,
      buyer_wallet.planetary_coins,
      buyer_wallet.star_tokens,
      buyer_wallet.universal_coins,
      existing_ownership.purchased_at;
    return;
  end if;

  if (item.currency = 'planetary_coins' and buyer_wallet.planetary_coins < item.price)
    or (item.currency = 'star_tokens' and buyer_wallet.star_tokens < item.price)
    or (item.currency = 'universal_coins' and buyer_wallet.universal_coins < item.price) then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.wallets
  set planetary_coins = case when item.currency = 'planetary_coins' then planetary_coins - item.price else planetary_coins end,
      star_tokens = case when item.currency = 'star_tokens' then star_tokens - item.price else star_tokens end,
      universal_coins = case when item.currency = 'universal_coins' then universal_coins - item.price else universal_coins end
  where wallets.user_id = buyer_id
  returning * into buyer_wallet;

  insert into public.cosmic_avatar_ownerships (user_id, avatar_id, ownership_id, price_paid, currency)
  values (buyer_id, item.avatar_id, item.ownership_id, item.price, item.currency)
  returning * into new_ownership;

  return query
  select
    'purchased'::text,
    item.avatar_id,
    new_ownership.ownership_id,
    item.price,
    item.currency,
    buyer_wallet.planetary_coins,
    buyer_wallet.star_tokens,
    buyer_wallet.universal_coins,
    new_ownership.purchased_at;
end;
$$;

revoke all on function public.purchase_cosmic_avatar(text) from public, anon;
grant execute on function public.purchase_cosmic_avatar(text) to authenticated;