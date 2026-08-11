-- Cosmic Ocean — Global Game Store ownership
-- Run after supabase-royalty.sql in the existing Supabase project.
--
-- Only purchase metadata is persisted here. Game files, thumbnails, and
-- gameplay remain in the application catalog and are never stored in Supabase.

create table if not exists public.global_game_catalog (
  game_id       text primary key,
  price         bigint not null check (price > 0),
  currency      text not null check (currency = 'planetary_coins'),
  active        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

alter table public.global_game_catalog enable row level security;

-- The browser cannot read or write the server-owned price catalog. The
-- security-definer purchase function is its only public operation.
revoke all on table public.global_game_catalog from anon, authenticated;

-- The 90 paid entries from src/data/gameCatalog.ts. Titles and other display
-- metadata stay in that existing catalog; the database stores only what the
-- transaction must validate.
insert into public.global_game_catalog (game_id, price, currency)
select
  'paid-placeholder-' || lpad(slot::text, 3, '0'),
  100 + ((slot - 1) * 25),
  'planetary_coins'
from generate_series(1, 90) as slots(slot)
on conflict (game_id) do update
set price = excluded.price,
    currency = excluded.currency,
    active = true,
    updated_at = timezone('utc', now());

create table if not exists public.global_game_ownerships (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  game_id        text not null references public.global_game_catalog(game_id),
  price_paid     bigint not null check (price_paid > 0),
  currency       text not null check (currency = 'planetary_coins'),
  purchased_at   timestamptz not null default timezone('utc', now()),
  unique (user_id, game_id)
);

alter table public.global_game_ownerships enable row level security;

drop policy if exists "Users can view their own game ownerships" on public.global_game_ownerships;
create policy "Users can view their own game ownerships"
  on public.global_game_ownerships for select
  using (auth.uid() = user_id);

-- Ownership is created only inside the atomic purchase function.
revoke all on table public.global_game_ownerships from anon, authenticated;
grant select on table public.global_game_ownerships to authenticated;

create index if not exists global_game_ownerships_user_idx
  on public.global_game_ownerships (user_id, purchased_at desc);

create or replace function public.purchase_global_game(p_game_id text)
returns table (
  status            text,
  game_id           text,
  ownership_id      uuid,
  price             bigint,
  currency          text,
  planetary_coins   bigint,
  star_tokens       bigint,
  universal_coins   bigint,
  purchased_at      timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  buyer_id uuid := auth.uid();
  item public.global_game_catalog%rowtype;
  buyer_wallet public.wallets%rowtype;
  existing_ownership public.global_game_ownerships%rowtype;
  new_ownership public.global_game_ownerships%rowtype;
begin
  if buyer_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_game_id is null or length(trim(p_game_id)) = 0 then
    raise exception 'GAME_NOT_FOUND';
  end if;

  select *
  into item
  from public.global_game_catalog
  where global_game_catalog.game_id = trim(p_game_id)
    and global_game_catalog.active = true;

  if not found then
    raise exception 'GAME_NOT_FOUND';
  end if;

  -- The wallet row serializes all purchases for this user, including
  -- duplicate requests from double-clicks and multiple browser tabs.
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
  from public.global_game_ownerships
  where global_game_ownerships.user_id = buyer_id
    and global_game_ownerships.game_id = item.game_id;

  if found then
    return query
    select
      'already_owned'::text,
      item.game_id,
      existing_ownership.id,
      existing_ownership.price_paid,
      existing_ownership.currency,
      buyer_wallet.planetary_coins,
      buyer_wallet.star_tokens,
      buyer_wallet.universal_coins,
      existing_ownership.purchased_at;
    return;
  end if;

  if buyer_wallet.planetary_coins < item.price then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  update public.wallets
  set planetary_coins = planetary_coins - item.price
  where wallets.user_id = buyer_id
    and planetary_coins >= item.price
  returning * into buyer_wallet;

  if not found then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.global_game_ownerships (user_id, game_id, price_paid, currency)
  values (buyer_id, item.game_id, item.price, item.currency)
  returning * into new_ownership;

  return query
  select
    'purchased'::text,
    item.game_id,
    new_ownership.id,
    item.price,
    item.currency,
    buyer_wallet.planetary_coins,
    buyer_wallet.star_tokens,
    buyer_wallet.universal_coins,
    new_ownership.purchased_at;
end;
$$;

revoke all on function public.purchase_global_game(text) from public, anon;
grant execute on function public.purchase_global_game(text) to authenticated;
