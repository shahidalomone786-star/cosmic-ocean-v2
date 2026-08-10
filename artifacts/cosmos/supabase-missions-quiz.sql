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

-- A completed Atelier purchase is a meaningful exploration event. Track it at
-- the ownership table boundary so the client cannot manufacture progress and
-- the existing Store RPC does not need to be rewritten.
create or replace function public.track_atelier_mission_progress()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.apply_mission_progress(new.user_id, 'atelier_purchase', 1);
  return new;
end;
$$;

revoke all on function public.track_atelier_mission_progress() from public, anon, authenticated;

drop trigger if exists cosmic_avatar_ownership_mission_progress on public.cosmic_avatar_ownerships;
create trigger cosmic_avatar_ownership_mission_progress
  after insert on public.cosmic_avatar_ownerships
  for each row execute function public.track_atelier_mission_progress();

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

-- Seed exactly 100 conceptual physics questions. The browser never receives
-- correct_index because quiz_questions is not readable by authenticated users;
-- get/submit RPCs expose only the current prompt and options.
insert into public.quiz_questions (question_key, prompt, options, correct_index)
values
  ('physics-001', 'What does inertia describe?', jsonb_build_array('An object’s resistance to a change in motion', 'The energy stored in a spring', 'The speed of light', 'The force of gravity', 'The temperature of an object'), 0),
  ('physics-002', 'If the net force on a moving object is zero, what happens?', jsonb_build_array('It must stop immediately', 'Its velocity remains constant', 'Its mass becomes zero', 'Its acceleration increases', 'Its temperature doubles'), 1),
  ('physics-003', 'A passenger leans forward when a bus stops suddenly mainly because of:', jsonb_build_array('Inertia', 'Magnetism', 'Buoyancy', 'Radiation', 'Evaporation'), 0),
  ('physics-004', 'What is the SI unit of force?', jsonb_build_array('Joule', 'Watt', 'Newton', 'Pascal', 'Coulomb'), 2),
  ('physics-005', 'For the same net force, increasing an object’s mass causes its acceleration to:', jsonb_build_array('Increase', 'Decrease', 'Stay exactly the same', 'Reverse direction automatically', 'Become infinite'), 1),
  ('physics-006', 'Action and reaction forces in Newton’s third law:', jsonb_build_array('Act on the same object', 'Always cancel the motion of one object', 'Act on different objects', 'Have different magnitudes', 'Occur only during collisions'), 2),
  ('physics-007', 'Why do astronauts appear weightless while orbiting Earth?', jsonb_build_array('There is no gravity in orbit', 'They and their spacecraft are continuously falling together', 'Their mass disappears', 'Air pressure holds them up', 'The Moon cancels gravity'), 1),
  ('physics-008', 'A force perpendicular to an object’s velocity changes its:', jsonb_build_array('Direction of motion', 'Mass only', 'Chemical composition', 'Temperature only', 'Charge only'), 0),
  ('physics-009', 'Momentum is best described as:', jsonb_build_array('Mass multiplied by velocity', 'Force multiplied by distance', 'Energy divided by time', 'Mass divided by acceleration', 'Pressure multiplied by area'), 0),
  ('physics-010', 'In an isolated collision, total momentum is:', jsonb_build_array('Always destroyed', 'Conserved', 'Equal to the kinetic energy', 'Zero after impact', 'Created by friction'), 1),
  ('physics-011', 'Impulse is equal to the change in:', jsonb_build_array('Temperature', 'Momentum', 'Mass', 'Density', 'Electric charge'), 1),
  ('physics-012', 'Airbags reduce injury primarily by:', jsonb_build_array('Increasing stopping time', 'Increasing the passenger’s mass', 'Removing inertia', 'Making the car weightless', 'Eliminating momentum before impact'), 0),
  ('physics-013', 'When a figure skater pulls in their arms while spinning, angular speed usually:', jsonb_build_array('Decreases', 'Increases', 'Becomes zero', 'Changes only if friction increases', 'Is unrelated to angular momentum'), 1),
  ('physics-014', 'Angular momentum is conserved when external torque is:', jsonb_build_array('Large', 'Zero', 'Constantly increasing', 'Opposite to the spin', 'Produced by friction'), 1),
  ('physics-015', 'Torque measures an ability to cause:', jsonb_build_array('Rotation', 'Heating', 'Ionisation', 'Reflection', 'Buoyancy'), 0),
  ('physics-016', 'Centripetal acceleration points:', jsonb_build_array('Away from the circle’s centre', 'Toward the circle’s centre', 'Along the tangent only', 'Opposite to gravity always', 'Nowhere during circular motion'), 1),
  ('physics-017', 'A satellite stays in orbit because its forward motion combines with:', jsonb_build_array('A lack of mass', 'Earth’s gravitational attraction', 'Solar wind only', 'Magnetic repulsion', 'Atmospheric lift'), 1),
  ('physics-018', 'Static friction acts to:', jsonb_build_array('Prevent relative sliding up to a limit', 'Always speed an object up', 'Remove all normal force', 'Convert mass into energy', 'Make surfaces perfectly smooth'), 0),
  ('physics-019', 'The normal force from a level floor is usually perpendicular to the:', jsonb_build_array('Surface', 'Object’s velocity', 'Earth’s orbit', 'Direction of friction', 'Magnetic field'), 0),
  ('physics-020', 'A car turning on a flat road needs friction mainly to provide:', jsonb_build_array('Centripetal force', 'Buoyant force', 'Radiant heat', 'Electric current', 'Gravitational mass'), 0),
  ('physics-021', 'Work is done by a force when it causes:', jsonb_build_array('Displacement in its direction or against it', 'Only a temperature change', 'Only a change in mass', 'No displacement at all', 'A change in colour'), 0),
  ('physics-022', 'If a force is perpendicular to displacement, the work it does is:', jsonb_build_array('Maximum', 'Zero', 'Always negative', 'Equal to the mass', 'Infinite'), 1),
  ('physics-023', 'Kinetic energy is the energy of:', jsonb_build_array('Position', 'Motion', 'Temperature only', 'Electric charge only', 'A vacuum'), 1),
  ('physics-024', 'Gravitational potential energy increases when an object is moved:', jsonb_build_array('Higher in a gravitational field', 'Faster on a level surface', 'Into a vacuum only', 'Closer to the ground', 'Without changing height'), 0),
  ('physics-025', 'Power describes how quickly:', jsonb_build_array('Work is done', 'Mass is created', 'Gravity disappears', 'Momentum is conserved', 'A wave changes colour'), 0),
  ('physics-026', 'In the absence of non-conservative forces, mechanical energy is:', jsonb_build_array('Conserved', 'Always increasing', 'Always zero', 'Converted only to charge', 'Lost instantly'), 0),
  ('physics-027', 'A stretched spring stores:', jsonb_build_array('Elastic potential energy', 'Only kinetic energy', 'Nuclear charge', 'Angular momentum only', 'No energy'), 0),
  ('physics-028', 'A machine cannot deliver more useful energy than it receives because of:', jsonb_build_array('Conservation of energy', 'Newton’s third law alone', 'The speed of sound', 'Buoyancy', 'Wave interference'), 0),
  ('physics-029', 'Efficiency is less than 100 percent in a real machine mainly because energy becomes:', jsonb_build_array('Unusable heat and sound', 'Massless light only', 'New matter', 'Negative gravity', 'Perfect work'), 0),
  ('physics-030', 'When a pendulum swings, energy continually changes between:', jsonb_build_array('Kinetic and gravitational potential forms', 'Charge and mass only', 'Sound and colour only', 'Pressure and density only', 'Nuclear and chemical forms only'), 0),
  ('physics-031', 'Temperature is most closely related to the average:', jsonb_build_array('Random kinetic energy of particles', 'Mass of a container', 'Number of neutrons only', 'Gravitational potential of a planet', 'Wavelength of visible light only'), 0),
  ('physics-032', 'Heat naturally flows from:', jsonb_build_array('Colder objects to hotter objects', 'Hotter objects to colder objects', 'Lower mass to higher mass', 'Vacuum to matter only', 'Larger objects to smaller objects'), 1),
  ('physics-033', 'Thermal equilibrium means two objects have the same:', jsonb_build_array('Temperature', 'Mass', 'Volume', 'Electric charge', 'Pressure in every situation'), 0),
  ('physics-034', 'Why does a metal spoon feel colder than a wooden spoon in the same room?', jsonb_build_array('Metal conducts heat away from your hand faster', 'Metal has no thermal energy', 'Wood is always hotter', 'Metal creates cold', 'Wood has no atoms'), 0),
  ('physics-035', 'During melting, added heat is primarily used to:', jsonb_build_array('Change the phase', 'Increase temperature immediately', 'Reduce mass', 'Create gravity', 'Stop all molecular motion'), 0),
  ('physics-036', 'A gas expands when heated at constant pressure because its particles:', jsonb_build_array('Move faster and spread farther apart', 'Lose all kinetic energy', 'Become heavier', 'Stop colliding', 'Turn into photons'), 0),
  ('physics-037', 'The first law of thermodynamics expresses conservation of:', jsonb_build_array('Energy', 'Electric charge only', 'Momentum only', 'Temperature only', 'Volume only'), 0),
  ('physics-038', 'Evaporation cools a liquid because the escaping molecules tend to have:', jsonb_build_array('Higher-than-average kinetic energy', 'No kinetic energy', 'More mass than the liquid', 'A negative charge always', 'Lower temperature than the surface'), 0),
  ('physics-039', 'Pressure in a gas is caused by particle:', jsonb_build_array('Collisions with container walls', 'Colour', 'Mass disappearing', 'Gravitational waves only', 'Nuclear fusion'), 0),
  ('physics-040', 'A refrigerator moves heat from its cold interior to the room by using:', jsonb_build_array('Work supplied to a cycle', 'A violation of energy conservation', 'Only gravity', 'A permanent vacuum', 'A colder external surface'), 0),
  ('physics-041', 'A wave transfers energy while the medium’s particles generally:', jsonb_build_array('Oscillate around equilibrium positions', 'Travel with the wave forever', 'Disappear', 'Become permanently displaced in every wave', 'Gain mass'), 0),
  ('physics-042', 'The distance from one crest to the next is the:', jsonb_build_array('Wavelength', 'Amplitude', 'Period', 'Frequency', 'Phase speed'), 0),
  ('physics-043', 'Frequency is the number of complete cycles per:', jsonb_build_array('Second', 'Metre', 'Newton', 'Joule', 'Coulomb'), 0),
  ('physics-044', 'For a wave traveling at fixed speed, increasing frequency makes wavelength:', jsonb_build_array('Longer', 'Shorter', 'Unchanged for all waves', 'Equal to amplitude', 'Infinite'), 1),
  ('physics-045', 'Amplitude is most closely associated with a wave’s:', jsonb_build_array('Energy or intensity', 'Direction only', 'Frequency unit', 'Wavelength unit', 'Medium’s mass'), 0),
  ('physics-046', 'Sound cannot travel through a vacuum because it requires:', jsonb_build_array('A material medium', 'Gravity', 'Visible light', 'An electric circuit', 'A magnetic pole'), 0),
  ('physics-047', 'The pitch of a sound is determined mainly by its:', jsonb_build_array('Frequency', 'Amplitude', 'Speed in air', 'Energy loss only', 'Wavelength in every medium'), 0),
  ('physics-048', 'The loudness of a sound is related most directly to its:', jsonb_build_array('Amplitude', 'Frequency only', 'Period only', 'Speed of light', 'Wavelength in vacuum'), 0),
  ('physics-049', 'A siren’s pitch changes as it passes you because of the:', jsonb_build_array('Doppler effect', 'Photoelectric effect', 'Tunnelling effect', 'Archimedes principle', 'Hall effect'), 0),
  ('physics-050', 'When two waves overlap, the resulting displacement is found by:', jsonb_build_array('Adding their displacements', 'Multiplying their masses', 'Removing the lower frequency', 'Converting them to particles', 'Using only the larger amplitude'), 0),
  ('physics-051', 'Constructive interference occurs when waves combine to produce:', jsonb_build_array('A larger amplitude', 'No displacement always', 'A slower photon', 'Less energy by definition', 'A vacuum'), 0),
  ('physics-052', 'Diffraction is most noticeable when an opening is comparable to the wave’s:', jsonb_build_array('Wavelength', 'Mass', 'Temperature', 'Charge', 'Speed squared'), 0),
  ('physics-053', 'Polarisation shows that a wave has:', jsonb_build_array('A preferred oscillation direction', 'No energy', 'Only a longitudinal motion', 'No wavelength', 'A negative mass'), 0),
  ('physics-054', 'Light travels fastest in:', jsonb_build_array('Vacuum', 'Glass', 'Water', 'Diamond', 'A dense metal'), 0),
  ('physics-055', 'Refraction occurs because a wave changes speed when it enters a different:', jsonb_build_array('Medium', 'Colour only', 'Source mass', 'Electric charge', 'Vacuum state'), 0),
  ('physics-056', 'The bending of light around edges is called:', jsonb_build_array('Diffraction', 'Induction', 'Conduction', 'Convection', 'Ionisation'), 0),
  ('physics-057', 'A convex lens makes parallel rays converge toward its:', jsonb_build_array('Focal point', 'Nodal mass', 'Magnetic pole', 'Wavelength', 'Electric terminal'), 0),
  ('physics-058', 'A plane mirror forms an image that is:', jsonb_build_array('Virtual and upright', 'Always real and inverted', 'Smaller because light slows', 'Inside the mirror material', 'Made of sound'), 0),
  ('physics-059', 'The colour of visible light is determined by its:', jsonb_build_array('Frequency', 'Mass', 'Temperature of the observer', 'Amplitude only', 'Gravitational field'), 0),
  ('physics-060', 'The photoelectric effect demonstrates that light can transfer energy in:', jsonb_build_array('Discrete quanta', 'Only continuous fluid motion', 'Massless sound waves', 'Static pressure packets', 'Permanent magnetic loops'), 0),
  ('physics-061', 'Electric current is the rate of flow of:', jsonb_build_array('Electric charge', 'Mass', 'Heat only', 'Momentum in a vacuum', 'Light wavelength'), 0),
  ('physics-062', 'Voltage is best understood as electric:', jsonb_build_array('Potential difference', 'Current per second', 'Resistance multiplied by mass', 'Charge stored in a proton only', 'Magnetic flux density'), 0),
  ('physics-063', 'Resistance in a circuit opposes the flow of:', jsonb_build_array('Electric current', 'Gravity', 'Light in vacuum', 'Mass through space', 'Sound in air'), 0),
  ('physics-064', 'A battery maintains current in a circuit by providing:', jsonb_build_array('Potential difference', 'A frictionless wire', 'A permanent short circuit', 'Only heat', 'Zero electric field'), 0),
  ('physics-065', 'In a series circuit, the current through each component is:', jsonb_build_array('The same', 'Always zero', 'Different because charge is used up', 'Equal to voltage', 'Greater after every resistor'), 0),
  ('physics-066', 'In a parallel circuit, each branch has the same:', jsonb_build_array('Potential difference', 'Current in all cases', 'Resistance', 'Length', 'Power regardless of load'), 0),
  ('physics-067', 'Ohm’s law relates voltage, current, and:', jsonb_build_array('Resistance', 'Mass', 'Wavelength', 'Buoyancy', 'Temperature only'), 0),
  ('physics-068', 'A fuse protects a circuit by melting when current becomes too:', jsonb_build_array('Large', 'Small', 'Slow', 'Cold', 'Negative'), 0),
  ('physics-069', 'A charged particle at rest creates an electric field but not a steady:', jsonb_build_array('Magnetic field from its motion', 'Gravitational field', 'Mass field', 'Temperature field', 'Pressure field'), 0),
  ('physics-070', 'A magnetic field exerts a force on a moving charge that is generally:', jsonb_build_array('Perpendicular to its motion', 'Always parallel to its motion', 'Independent of velocity', 'Directed only downward', 'Equal to its mass'), 0),
  ('physics-071', 'Electromagnetic induction occurs when magnetic flux through a circuit:', jsonb_build_array('Changes', 'Is permanently zero', 'Has no field', 'Becomes a temperature', 'Stops all charge motion'), 0),
  ('physics-072', 'A transformer changes AC voltage using:', jsonb_build_array('Changing magnetic flux between coils', 'A chemical reaction in glass', 'A one-way fuse', 'Gravity alone', 'A vacuum pump'), 0),
  ('physics-073', 'A compass needle aligns approximately with:', jsonb_build_array('Earth’s magnetic field', 'The direction of sound', 'The nearest electric socket', 'The Sun’s temperature', 'A gravitational wave'), 0),
  ('physics-074', 'Electromagnetic waves consist of oscillating:', jsonb_build_array('Electric and magnetic fields', 'Pressure and density only', 'Mass and volume only', 'Sound and heat only', 'Atoms moving through vacuum'), 0),
  ('physics-075', 'An electron has:', jsonb_build_array('Negative electric charge', 'Positive electric charge', 'No mass and positive charge', 'Only a magnetic charge', 'The same charge as a neutron'), 0),
  ('physics-076', 'The nucleus of an atom contains:', jsonb_build_array('Protons and neutrons', 'Only electrons', 'Only photons', 'Electrons and photons only', 'Sound waves'), 0),
  ('physics-077', 'Isotopes of an element have the same number of protons but different numbers of:', jsonb_build_array('Neutrons', 'Electrons in every ion', 'Nuclei', 'Charges of protons', 'Chemical elements'), 0),
  ('physics-078', 'Radioactive half-life is the time for half of a sample’s unstable nuclei to:', jsonb_build_array('Decay', 'Double in mass', 'Reach absolute zero', 'Become electrons', 'Leave the planet'), 0),
  ('physics-079', 'Nuclear fission is the process of:', jsonb_build_array('Splitting a heavy nucleus', 'Joining two light nuclei', 'Removing all electrons', 'Reflecting a photon', 'Freezing a gas'), 0),
  ('physics-080', 'Nuclear fusion is the process of:', jsonb_build_array('Joining light nuclei', 'Splitting every atom', 'Stopping gravity', 'Separating electric charge', 'Converting sound to heat'), 0),
  ('physics-081', 'A photon is a quantum of:', jsonb_build_array('Electromagnetic radiation', 'Gravitational mass', 'Sound pressure', 'Chemical potential only', 'Fluid flow'), 0),
  ('physics-082', 'According to special relativity, moving clocks are observed to run:', jsonb_build_array('Slower relative to the observer', 'Faster in every frame', 'At infinite speed', 'Without time', 'Only when gravity is absent'), 0),
  ('physics-083', 'The speed of light in vacuum is the same for:', jsonb_build_array('All inertial observers', 'Only observers on Earth', 'Only charged observers', 'Only stationary photons', 'No observers'), 0),
  ('physics-084', 'Mass and energy are related by the idea that:', jsonb_build_array('Mass can be converted to energy', 'Mass is never energy-related', 'Energy has no physical effect', 'Only sound has mass', 'Gravity destroys energy'), 0),
  ('physics-085', 'The equivalence principle connects gravity locally with:', jsonb_build_array('Acceleration', 'Temperature', 'Colour', 'Electric resistance', 'Sound frequency'), 0),
  ('physics-086', 'An event horizon is associated with a region from which:', jsonb_build_array('Light cannot escape to distant observers', 'Gravity is absent', 'Sound travels fastest', 'Atoms cannot exist anywhere', 'Time stops for every observer'), 0),
  ('physics-087', 'A black hole’s mass strongly affects its:', jsonb_build_array('Gravitational influence', 'Electric charge of every star', 'Speed of light in vacuum', 'Colour of all galaxies', 'Nuclear half-life everywhere'), 0),
  ('physics-088', 'The uncertainty principle limits simultaneous knowledge of a particle’s position and:', jsonb_build_array('Momentum', 'Colour', 'Chemical name', 'Temperature of the room', 'Number of planets'), 0),
  ('physics-089', 'A quantum measurement generally changes the state of the:', jsonb_build_array('Measured system', 'Entire universe into a vacuum', 'Detector’s mass to zero', 'Speed of light', 'Gravitational constant'), 0),
  ('physics-090', 'The ground state of a quantum system is its:', jsonb_build_array('Lowest allowed energy state', 'Fastest possible state', 'Highest temperature state', 'Largest orbit only', 'State with no probability'), 0),
  ('physics-091', 'Archimedes’ principle says buoyant force equals the weight of:', jsonb_build_array('Displaced fluid', 'The entire planet', 'The object’s air only', 'The container', 'The object’s temperature'), 0),
  ('physics-092', 'An object floats when its average density is:', jsonb_build_array('Less than the fluid’s density', 'Greater than the fluid’s density', 'Always zero', 'Equal to its mass', 'Independent of the fluid'), 0),
  ('physics-093', 'Fluid pressure at a given depth generally increases with:', jsonb_build_array('Fluid density and depth', 'Colour and volume only', 'Surface area only', 'Sound frequency', 'Object temperature only'), 0),
  ('physics-094', 'Bernoulli’s principle links higher fluid speed with lower:', jsonb_build_array('Pressure along a streamline', 'Mass of the fluid', 'Speed of light', 'Gravitational constant', 'Number of atoms'), 0),
  ('physics-095', 'A hydraulic system transmits force using pressure in a:', jsonb_build_array('Confined fluid', 'Vacuum only', 'Solid crystal only', 'Beam of light', 'Magnetic field only'), 0),
  ('physics-096', 'The centre of mass is the point where an object’s mass can be treated as:', jsonb_build_array('Concentrated for translational motion', 'Destroyed for rotation', 'Converted to charge', 'Always at its geometric centre', 'Absent from gravity'), 0),
  ('physics-097', 'Simple harmonic motion has a restoring force that is directed:', jsonb_build_array('Toward equilibrium', 'Away from equilibrium always', 'Only upward', 'Along the velocity always', 'Toward the Sun'), 0),
  ('physics-098', 'Resonance occurs when a driving frequency is close to a system’s:', jsonb_build_array('Natural frequency', 'Mass density only', 'Wavelength of light', 'Electric charge', 'Boiling point'), 0),
  ('physics-099', 'A material that deforms and returns to its original shape after the load is removed shows:', jsonb_build_array('Elastic behaviour', 'Nuclear fission', 'Permanent plasticity', 'Zero stiffness', 'Radioactive decay'), 0),
  ('physics-100', 'The scientific value of a physical model is strongest when it:', jsonb_build_array('Makes testable predictions', 'Cannot be measured', 'Explains every topic without evidence', 'Uses the most complicated language', 'Avoids comparison with observations'), 0)
on conflict (question_key) do update
set prompt = excluded.prompt,
    options = excluded.options,
    correct_index = excluded.correct_index,
    active = true,
    updated_at = timezone('utc', now());

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