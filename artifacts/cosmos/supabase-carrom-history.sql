-- ─────────────────────────────────────────────────────────────────────────────
-- Cosmic Carrom — carrom_history migration
-- Run this in the Supabase SQL editor: Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists carrom_history (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete cascade not null,
  mode       text        not null,       -- 'pvp' | 'pva' | 'spectate'
  opponent   text,                       -- avatar name when mode = 'pva'
  result     text        not null,       -- 'win' | 'loss' | 'draw'
  my_score   integer     not null default 0,
  opp_score  integer     not null default 0,
  profit     integer     not null default 0,  -- +1 win / -1 loss / 0 draw
  played_at  timestamptz not null default now()
);

alter table carrom_history enable row level security;

create policy "Users can read own carrom history"
  on carrom_history for select using (auth.uid() = user_id);

create policy "Users can insert own carrom history"
  on carrom_history for insert with check (auth.uid() = user_id);

-- Index for fast per-user history lookup
create index if not exists carrom_history_user_idx
  on carrom_history (user_id, played_at desc);
