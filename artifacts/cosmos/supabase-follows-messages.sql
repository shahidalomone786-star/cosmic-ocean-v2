-- ─────────────────────────────────────────────────────────────────────────────
-- Cosmic Nexus — follows + messages migration
-- Run this in the Supabase SQL editor: Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the old "own-profile-only" SELECT policy so anyone can search profiles
drop policy if exists "Users can view own profile" on profiles;

-- Re-add a public read policy (profiles are public on this platform)
create policy "Anyone can view profiles"
  on profiles for select using (true);

-- 2. follows table (follower_id, following_id composite PK)
create table if not exists follows (
  follower_id  uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;

create policy "Anyone can read follows"
  on follows for select using (true);

create policy "Users can follow others"
  on follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete using (auth.uid() = follower_id);

-- 3. messages table (direct messages between two users)
create table if not exists messages (
  id          uuid        primary key default gen_random_uuid(),
  sender_id   uuid        references auth.users(id) on delete cascade not null,
  receiver_id uuid        references auth.users(id) on delete cascade not null,
  content     text        not null,
  created_at  timestamptz not null default now(),
  read        boolean     not null default false
);

alter table messages enable row level security;

create policy "Participants can read their messages"
  on messages for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

create policy "Users can send messages"
  on messages for insert with check (auth.uid() = sender_id);

create policy "Receiver can mark messages read"
  on messages for update using (auth.uid() = receiver_id);

-- 4. Indexes for fast conversation lookups
create index if not exists messages_sender_receiver_idx
  on messages (sender_id, receiver_id);

create index if not exists messages_receiver_sender_idx
  on messages (receiver_id, sender_id);

create index if not exists follows_following_idx
  on follows (following_id);
