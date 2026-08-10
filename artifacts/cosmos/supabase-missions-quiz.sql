-- Cosmic Ocean — Mission Center + Physics Quiz
-- Run after supabase-royalty.sql in the Supabase SQL Editor.
-- All rewards, progress, question order, and answer validation are server-owned.

create table if not exists public.reward_claims (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  reward_type   text not null,
  reward_key    text not null,
  currency      text not null check (currency in ('planetary_coins', 'star_tokens', 'universal_coins')),
  amount        bigint not null check (amount > 0),
  created_at    timestamptz not null default timezone('utc', now()),
  unique (user_id, reward_type, reward_key)
);

alter table public.reward_claims enable row level security;
drop policy if exists "Users can view their own reward claims" on public.reward_claims;
create policy "Users can view their own reward claims"
  on public.reward_claims for select
  using (auth.uid() = user_id);
revoke all on table public.reward_claims from anon, authenticated;
grant select on table public.reward_claims to authenticated;

-- The trigger is the only path that grants the welcome balance. Existing
-- accounts are never backfilled with this reward.
create or replace function public.create_wallet_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.wallets (user_id, planetary_coins)
  values (new.id, 50000)
  on conflict (user_id) do nothing;

  insert into public.reward_claims (user_id, reward_type, reward_key, currency, amount)
  values (new.id, 'welcome', 'account-created', 'planetary_coins', 50000)
  on conflict (user_id, reward_type, reward_key) do nothing;

  return new;
end;
$$;

-- Mission catalog and per-period progress.
create table if not exists public.missions (
  mission_id      text primary key,
  category        text not null check (category in ('daily', 'weekly', 'exploration', 'science', 'special')),
  objective       text not null,
  event_key       text not null,
  target_count    integer not null check (target_count > 0),
  reward_currency text not null check (reward_currency in ('planetary_coins', 'star_tokens')),
  reward_amount   bigint not null check (reward_amount > 0),
  active          boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

alter table public.missions enable row level security;
revoke all on table public.missions from anon, authenticated;

create table if not exists public.mission_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  mission_id    text not null references public.missions(mission_id) on delete cascade,
  period_key    date not null,
  progress      integer not null default 0 check (progress >= 0),
  completed_at  timestamptz,
  claimed_at    timestamptz,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  unique (user_id, mission_id, period_key)
);

alter table public.mission_progress enable row level security;
revoke all on table public.mission_progress from anon, authenticated;

insert into public.missions
  (mission_id, category, objective, event_key, target_count, reward_currency, reward_amount, sort_order)
values
  ('daily-login', 'daily', 'Claim today''s arrival grant', 'daily_login', 1, 'planetary_coins', 1000, 10),
  ('daily-physics', 'daily', 'Answer 3 physics questions correctly', 'physics_correct', 3, 'planetary_coins', 1500, 20),
  ('weekly-physics', 'weekly', 'Answer 10 physics questions correctly', 'physics_correct', 10, 'planetary_coins', 5000, 10),
  ('exploration-atelier', 'exploration', 'Add one Cosmic Atelier study to your collection', 'atelier_purchase', 1, 'star_tokens', 2, 10),
  ('science-cycle', 'science', 'Complete one full 100-level physics cycle', 'quiz_cycle_complete', 1, 'star_tokens', 10, 10),
  ('special-welcome', 'special', 'Begin your first expedition with the welcome grant', 'welcome_reward', 1, 'planetary_coins', 2500, 10)
on conflict (mission_id) do update
set category = excluded.category,
    objective = excluded.objective,
    event_key = excluded.event_key,
    target_count = excluded.target_count,
    reward_currency = excluded.reward_currency,
    reward_amount = excluded.reward_amount,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now());

create or replace function public.mission_period_key(p_category text)
returns date
language sql
stable
set search_path = public
as $$
  select case
    when p_category = 'daily' then timezone('utc', now())::date
    when p_category = 'weekly' then date_trunc('week', timezone('utc', now()))::date
    else date '2000-01-01'
  end;
$$;

create or replace function public.apply_mission_progress(
  p_user_id uuid,
  p_event_key text,
  p_amount integer default 1
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mission_row public.missions%rowtype;
  current_period date;
begin
  if p_amount <= 0 then return; end if;

  for mission_row in
    select *
    from public.missions
    where active = true
      and event_key = p_event_key
  loop
    current_period := public.mission_period_key(mission_row.category);
    insert into public.mission_progress (user_id, mission_id, period_key, progress)
    values (p_user_id, mission_row.mission_id, current_period, least(mission_row.target_count, p_amount))
    on conflict (user_id, mission_id, period_key) do update
      set progress = least(mission_row.target_count, public.mission_progress.progress + excluded.progress),
          updated_at = timezone('utc', now());
  end loop;
end;
$$;

revoke all on function public.apply_mission_progress(uuid, text, integer) from public, anon, authenticated;

-- Daily login reward. UTC is the canonical calendar used by the server.
create or replace function public.claim_daily_reward()
returns table (
  status           text,
  reward_date      date,
  planetary_coins  bigint,
  star_tokens      bigint,
  universal_coins  bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  today_utc date := timezone('utc', now())::date;
  claim_id uuid;
  wallet_row public.wallets%rowtype;
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  insert into public.wallets (user_id)
  values (claimant)
  on conflict (user_id) do nothing;

  insert into public.reward_claims (user_id, reward_type, reward_key, currency, amount)
  values (claimant, 'daily-login', today_utc::text, 'planetary_coins', 3000)
  on conflict (user_id, reward_type, reward_key) do nothing
  returning id into claim_id;

  select * into wallet_row
  from public.wallets
  where user_id = claimant
  for update;

  if claim_id is not null then
    update public.wallets
    set planetary_coins = planetary_coins + 3000
    where user_id = claimant
    returning * into wallet_row;
    perform public.apply_mission_progress(claimant, 'daily_login', 1);
    return query select 'claimed'::text, today_utc, wallet_row.planetary_coins, wallet_row.star_tokens, wallet_row.universal_coins;
  else
    return query select 'already_claimed'::text, today_utc, wallet_row.planetary_coins, wallet_row.star_tokens, wallet_row.universal_coins;
  end if;
end;
$$;

revoke all on function public.claim_daily_reward() from public, anon;
grant execute on function public.claim_daily_reward() to authenticated;

create or replace function public.get_daily_reward_state()
returns table (
  reward_date      date,
  claimed          boolean,
  planetary_coins  bigint,
  star_tokens      bigint,
  universal_coins  bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  today_utc date := timezone('utc', now())::date;
  wallet_row public.wallets%rowtype;
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  insert into public.wallets (user_id) values (claimant) on conflict (user_id) do nothing;
  select * into wallet_row from public.wallets where user_id = claimant;
  return query
  select today_utc,
    exists (
      select 1 from public.reward_claims
      where user_id = claimant and reward_type = 'daily-login' and reward_key = today_utc::text
    ),
    wallet_row.planetary_coins, wallet_row.star_tokens, wallet_row.universal_coins;
end;
$$;

revoke all on function public.get_daily_reward_state() from public, anon;
grant execute on function public.get_daily_reward_state() to authenticated;

create or replace function public.get_mission_center()
returns table (
  mission_id      text,
  category        text,
  objective       text,
  progress        integer,
  target_count    integer,
  reward_currency text,
  reward_amount   bigint,
  status          text,
  period_key      date,
  claimed_at      timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with current_missions as (
    select
      m.mission_id,
      m.category,
      m.objective,
      coalesce(mp.progress, 0)::integer as progress,
      m.target_count,
      m.reward_currency,
      m.reward_amount,
      case
        when mp.claimed_at is not null then 'claimed'
        when coalesce(mp.progress, 0) >= m.target_count then 'complete'
        else 'in_progress'
      end as status,
      public.mission_period_key(m.category) as period_key,
      mp.claimed_at
    from public.missions m
    left join public.mission_progress mp
      on mp.mission_id = m.mission_id
     and mp.user_id = auth.uid()
     and mp.period_key = public.mission_period_key(m.category)
    where m.active = true
  )
  select * from current_missions
  union all
  select
    m.mission_id, m.category, m.objective, mp.progress, m.target_count,
    m.reward_currency, m.reward_amount, 'claimed'::text, mp.period_key, mp.claimed_at
  from public.mission_progress mp
  join public.missions m on m.mission_id = mp.mission_id
  where mp.user_id = auth.uid()
    and mp.claimed_at is not null
    and not exists (
      select 1 from current_missions cm
      where cm.mission_id = m.mission_id and cm.period_key = mp.period_key
    )
  order by category, mission_id, period_key desc;
$$;

revoke all on function public.get_mission_center() from public, anon;
grant execute on function public.get_mission_center() to authenticated;

create or replace function public.claim_mission(p_mission_id text)
returns table (
  status           text,
  mission_id       text,
  planetary_coins  bigint,
  star_tokens      bigint,
  universal_coins  bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  mission_row public.missions%rowtype;
  progress_row public.mission_progress%rowtype;
  wallet_row public.wallets%rowtype;
  current_period date;
  claim_id uuid;
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into mission_row from public.missions where missions.mission_id = p_mission_id and active = true;
  if not found then raise exception 'MISSION_NOT_FOUND'; end if;
  current_period := public.mission_period_key(mission_row.category);

  insert into public.mission_progress (user_id, mission_id, period_key, progress)
  values (claimant, mission_row.mission_id, current_period, 0)
  on conflict (user_id, mission_id, period_key) do nothing;

  select * into progress_row
  from public.mission_progress
  where user_id = claimant and mission_id = mission_row.mission_id and period_key = current_period
  for update;

  if progress_row.claimed_at is not null then
    select * into wallet_row from public.wallets where user_id = claimant;
    return query select 'already_claimed'::text, mission_row.mission_id, wallet_row.planetary_coins, wallet_row.star_tokens, wallet_row.universal_coins;
    return;
  end if;
  if progress_row.progress < mission_row.target_count then raise exception 'MISSION_INCOMPLETE'; end if;

  insert into public.reward_claims (user_id, reward_type, reward_key, currency, amount)
  values (claimant, 'mission', mission_row.mission_id || ':' || current_period::text, mission_row.reward_currency, mission_row.reward_amount)
  on conflict (user_id, reward_type, reward_key) do nothing
  returning id into claim_id;

  insert into public.wallets (user_id) values (claimant) on conflict (user_id) do nothing;
  select * into wallet_row from public.wallets where user_id = claimant for update;

  if claim_id is not null then
    update public.wallets
    set planetary_coins = case when mission_row.reward_currency = 'planetary_coins' then planetary_coins + mission_row.reward_amount else planetary_coins end,
        star_tokens = case when mission_row.reward_currency = 'star_tokens' then star_tokens + mission_row.reward_amount else star_tokens end
    where user_id = claimant
    returning * into wallet_row;
  end if;

  update public.mission_progress
  set claimed_at = coalesce(claimed_at, timezone('utc', now())),
      completed_at = coalesce(completed_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where id = progress_row.id;

  return query select case when claim_id is null then 'already_claimed' else 'claimed' end,
    mission_row.mission_id, wallet_row.planetary_coins, wallet_row.star_tokens, wallet_row.universal_coins;
end;
$$;

revoke all on function public.claim_mission(text) from public, anon;
grant execute on function public.claim_mission(text) to authenticated;

-- Physics question bank. Questions are never readable directly by browser
-- sessions; the quiz RPC returns only the current question and omits answers.
create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  question_key  text not null unique,
  prompt        text not null,
  options       jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 5 and 6),
  correct_index smallint not null check (correct_index >= 0 and correct_index < 6),
  active        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

alter table public.quiz_questions enable row level security;
revoke all on table public.quiz_questions from anon, authenticated;

create table if not exists public.quiz_cycles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  cycle_number      integer not null default 1 check (cycle_number > 0),
  status             text not null default 'active' check (status in ('active', 'cooldown')),
  level             integer not null default 1 check (level between 1 and 100),
  question_order    uuid[] not null,
  run_id            uuid not null default gen_random_uuid(),
  run_started_at    timestamptz not null default timezone('utc', now()),
  cooldown_until    timestamptz,
  cycle_completed_at timestamptz,
  updated_at        timestamptz not null default timezone('utc', now())
);

alter table public.quiz_cycles enable row level security;
revoke all on table public.quiz_cycles from anon, authenticated;

create or replace function public.quiz_question_order()
returns uuid[]
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select array_agg(id order by random())
  from public.quiz_questions
  where active = true;
$$;

revoke all on function public.quiz_question_order() from public, anon, authenticated;

create or replace function public.get_physics_quiz_state()
returns table (
  status           text,
  cycle_number     integer,
  level            integer,
  question_id      uuid,
  prompt           text,
  options          jsonb,
  cooldown_until   timestamptz,
  run_id           uuid,
  question_count   integer,
  planetary_coins  bigint,
  star_tokens      bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  cycle_row public.quiz_cycles%rowtype;
  next_order uuid[];
  wallet_row public.wallets%rowtype;
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  next_order := public.quiz_question_order();
  if coalesce(array_length(next_order, 1), 0) <> 100 then raise exception 'QUIZ_NOT_READY'; end if;

  insert into public.quiz_cycles (user_id, question_order)
  values (claimant, next_order)
  on conflict (user_id) do nothing;

  select * into cycle_row from public.quiz_cycles where user_id = claimant for update;

  if cycle_row.status = 'cooldown' and cycle_row.cooldown_until <= timezone('utc', now()) then
    next_order := public.quiz_question_order();
    update public.quiz_cycles
    set cycle_number = cycle_number + 1,
        status = 'active',
        level = 1,
        question_order = next_order,
        run_id = gen_random_uuid(),
        run_started_at = timezone('utc', now()),
        cooldown_until = null,
        cycle_completed_at = null,
        updated_at = timezone('utc', now())
    where user_id = claimant
    returning * into cycle_row;
  end if;

  insert into public.wallets (user_id) values (claimant) on conflict (user_id) do nothing;
  select * into wallet_row from public.wallets where user_id = claimant;

  if cycle_row.status = 'cooldown' then
    return query select cycle_row.status, cycle_row.cycle_number, cycle_row.level, null::uuid, null::text, null::jsonb,
      cycle_row.cooldown_until, cycle_row.run_id, 100, wallet_row.planetary_coins, wallet_row.star_tokens;
  else
    return query
    select cycle_row.status, cycle_row.cycle_number, cycle_row.level, q.id, q.prompt, q.options,
      null::timestamptz, cycle_row.run_id, 100, wallet_row.planetary_coins, wallet_row.star_tokens
    from public.quiz_questions q
    where q.id = cycle_row.question_order[cycle_row.level];
  end if;
end;
$$;

revoke all on function public.get_physics_quiz_state() from public, anon;
grant execute on function public.get_physics_quiz_state() to authenticated;

create or replace function public.submit_physics_quiz_answer(
  p_question_id uuid,
  p_answer_index integer
)
returns table (
  status           text,
  cycle_number     integer,
  level            integer,
  question_id      uuid,
  prompt           text,
  options          jsonb,
  cooldown_until   timestamptz,
  run_id           uuid,
  reward_planetary bigint,
  reward_stars     bigint,
  planetary_coins  bigint,
  star_tokens      bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  cycle_row public.quiz_cycles%rowtype;
  question_row public.quiz_questions%rowtype;
  next_order uuid[];
  wallet_row public.wallets%rowtype;
  claim_id uuid;
  next_status text;
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into cycle_row from public.quiz_cycles where user_id = claimant for update;
  if not found then
    perform public.get_physics_quiz_state();
    select * into cycle_row from public.quiz_cycles where user_id = claimant for update;
  end if;

  if cycle_row.status = 'cooldown' then
    if cycle_row.cooldown_until > timezone('utc', now()) then
      insert into public.wallets (user_id) values (claimant) on conflict (user_id) do nothing;
      select * into wallet_row from public.wallets where user_id = claimant;
      return query select 'cooldown'::text, cycle_row.cycle_number, cycle_row.level, null::uuid, null::text, null::jsonb,
        cycle_row.cooldown_until, cycle_row.run_id, 0::bigint, 0::bigint, wallet_row.planetary_coins, wallet_row.star_tokens;
      return;
    end if;
    next_order := public.quiz_question_order();
    update public.quiz_cycles
    set cycle_number = cycle_number + 1, status = 'active', level = 1, question_order = next_order,
        run_id = gen_random_uuid(), run_started_at = timezone('utc', now()), cooldown_until = null,
        cycle_completed_at = null, updated_at = timezone('utc', now())
    where user_id = claimant
    returning * into cycle_row;
  end if;

  if p_answer_index < 0 or p_answer_index >= 6 then raise exception 'INVALID_QUIZ_ANSWER'; end if;
  if cycle_row.question_order[cycle_row.level] is distinct from p_question_id then raise exception 'STALE_QUIZ_QUESTION'; end if;

  select * into question_row from public.quiz_questions where id = p_question_id and active = true;
  if not found or p_answer_index >= jsonb_array_length(question_row.options) then raise exception 'INVALID_QUIZ_ANSWER'; end if;

  insert into public.wallets (user_id) values (claimant) on conflict (user_id) do nothing;
  select * into wallet_row from public.wallets where user_id = claimant for update;

  if p_answer_index <> question_row.correct_index then
    next_order := public.quiz_question_order();
    update public.quiz_cycles
    set level = 1, question_order = next_order, run_id = gen_random_uuid(),
        run_started_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where user_id = claimant
    returning * into cycle_row;
    select * into question_row from public.quiz_questions where id = cycle_row.question_order[1];
    return query select 'wrong'::text, cycle_row.cycle_number, 1, question_row.id, question_row.prompt, question_row.options,
      null::timestamptz, cycle_row.run_id, 0::bigint, 0::bigint, wallet_row.planetary_coins, wallet_row.star_tokens;
    return;
  end if;

  update public.wallets
  set planetary_coins = planetary_coins + 500
  where user_id = claimant
  returning * into wallet_row;
  perform public.apply_mission_progress(claimant, 'physics_correct', 1);

  if cycle_row.level = 100 then
    insert into public.reward_claims (user_id, reward_type, reward_key, currency, amount)
    values (claimant, 'quiz-cycle-completion', cycle_row.cycle_number::text, 'star_tokens', 50)
    on conflict (user_id, reward_type, reward_key) do nothing
    returning id into claim_id;

    if claim_id is not null then
      update public.wallets
      set star_tokens = star_tokens + 50
      where user_id = claimant
      returning * into wallet_row;
      perform public.apply_mission_progress(claimant, 'quiz_cycle_complete', 1);
    end if;

    update public.quiz_cycles
    set status = 'cooldown', cooldown_until = timezone('utc', now()) + interval '4 days',
        cycle_completed_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where user_id = claimant
    returning * into cycle_row;

    return query select 'cycle_completed'::text, cycle_row.cycle_number, 100, null::uuid, null::text, null::jsonb,
      cycle_row.cooldown_until, cycle_row.run_id, 500::bigint, 50::bigint, wallet_row.planetary_coins, wallet_row.star_tokens;
    return;
  end if;

  update public.quiz_cycles
  set level = level + 1, updated_at = timezone('utc', now())
  where user_id = claimant
  returning * into cycle_row;
  select * into question_row from public.quiz_questions where id = cycle_row.question_order[cycle_row.level];
  return query select 'correct'::text, cycle_row.cycle_number, cycle_row.level, question_row.id, question_row.prompt, question_row.options,
    null::timestamptz, cycle_row.run_id, 500::bigint, 0::bigint, wallet_row.planetary_coins, wallet_row.star_tokens;
end;
$$;

revoke all on function public.submit_physics_quiz_answer(uuid, integer) from public, anon;
grant execute on function public.submit_physics_quiz_answer(uuid, integer) to authenticated;

create or replace function public.invalidate_physics_quiz_run()
returns table (status text, cycle_number integer, level integer, question_id uuid, prompt text, options jsonb, run_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimant uuid := auth.uid();
  cycle_row public.quiz_cycles%rowtype;
  question_row public.quiz_questions%rowtype;
  next_order uuid[];
begin
  if claimant is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into cycle_row from public.quiz_cycles where user_id = claimant for update;
  if not found or cycle_row.status <> 'active' then
    return query select coalesce(cycle_row.status, 'cooldown'), coalesce(cycle_row.cycle_number, 1), coalesce(cycle_row.level, 1),
      null::uuid, null::text, null::jsonb, coalesce(cycle_row.run_id, gen_random_uuid());
    return;
  end if;
  next_order := public.quiz_question_order();
  update public.quiz_cycles
  set level = 1, question_order = next_order, run_id = gen_random_uuid(),
      run_started_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where user_id = claimant
  returning * into cycle_row;
  select * into question_row from public.quiz_questions where id = cycle_row.question_order[1];
  return query select 'invalidated'::text, cycle_row.cycle_number, 1, question_row.id, question_row.prompt, question_row.options, cycle_row.run_id;
end;
$$;

revoke all on function public.invalidate_physics_quiz_run() from public, anon;
grant execute on function public.invalidate_physics_quiz_run() to authenticated;

-- Reapply the welcome function after all supporting tables exist.
-- This keeps the existing auth trigger and makes the grant exactly-once.
create or replace function public.create_wallet_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.wallets (user_id, planetary_coins)
  values (new.id, 50000)
  on conflict (user_id) do nothing;
  insert into public.reward_claims (user_id, reward_type, reward_key, currency, amount)
  values (new.id, 'welcome', 'account-created', 'planetary_coins', 50000)
  on conflict (user_id, reward_type, reward_key) do nothing;
  perform public.apply_mission_progress(new.id, 'welcome_reward', 1);
  return new;
end;
$$;