-- ─────────────────────────────────────────────────────────────────────────────
-- Cosmic Ocean — Supabase schema setup
-- Run this once in the Supabase SQL editor: Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table (extends auth.users)
create table if not exists profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text,
  username      text        not null default 'Explorer',
  avatar        text        not null default 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg',
  join_date     timestamptz not null default now(),
  chess_wins    integer     not null default 0,
  chess_losses  integer     not null default 0
);

-- 2. Row-level security
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- 3. Auto-create a profile row on every new sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      'Explorer'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 4. Google OAuth — enable in Supabase Dashboard:
--    Authentication → Providers → Google → enable
--    Add your Google OAuth Client ID + Secret from console.cloud.google.com
--    Set Authorized redirect URI in Google Console to:
--    https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
