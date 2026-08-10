import { supabase } from '../../lib/supabase';
import type { WalletBalance } from '../royalty/royalty';
import { normalizeWallet, type WalletRow } from '../royalty/wallet';
import type { DailyReward, Mission } from './MissionCenter';
import type { PhysicsQuizOption, PhysicsQuizState } from './PhysicsQuiz';

type MissionRow = {
  mission_id: string;
  category: string;
  objective: string;
  progress: number | string | null;
  target_count: number | string;
  reward_currency: Mission['rewardCurrency'];
  reward_amount: number | string;
  status: Mission['status'];
  period_key: string;
  claimed_at?: string | null;
};

type DailyRewardRow = {
  reward_date: string;
  claimed: boolean;
  planetary_coins: number | string;
  star_tokens: number | string;
  universal_coins: number | string;
};

type QuizRow = {
  status: string;
  cycle_number: number | string;
  level: number | string;
  question_id: string | null;
  prompt: string | null;
  options: unknown;
  cooldown_until: string | null;
  run_id: string | null;
  question_count: number | string;
  planetary_coins: number | string;
  star_tokens: number | string;
};

type QuizAnswerRow = QuizRow & {
  reward_planetary?: number | string;
  reward_stars?: number | string;
};

function asNumber(value: number | string | null | undefined) {
  const numberValue = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseOptions(value: unknown): PhysicsQuizOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((option, index) => {
      if (typeof option === 'string') return option;
      if (!option || typeof option !== 'object') return null;
      const label = (option as { label?: unknown }).label;
      return typeof label === 'string' ? { id: `option-${index}`, label } : null;
    })
    .filter((option): option is PhysicsQuizOption => option !== null);
}

function normalizeMission(row: MissionRow): Mission {
  return {
    missionId: row.mission_id,
    category: row.category,
    objective: row.objective,
    progress: asNumber(row.progress),
    targetCount: asNumber(row.target_count),
    rewardCurrency: row.reward_currency,
    rewardAmount: asNumber(row.reward_amount),
    status: row.status,
    periodKey: row.period_key,
    claimedAt: row.claimed_at ?? null,
  };
}

function normalizeWalletFromRpc(row: Partial<WalletRow> & {
  planetary_coins?: number | string;
  star_tokens?: number | string;
  universal_coins?: number | string;
}): WalletBalance {
  return normalizeWallet({
    id: '',
    user_id: '',
    created_at: '',
    updated_at: '',
    planetary_coins: row.planetary_coins ?? 0,
    star_tokens: row.star_tokens ?? 0,
    universal_coins: row.universal_coins ?? 0,
  });
}

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function claimDailyReward(): Promise<{ dailyReward: DailyReward; wallet: WalletBalance }> {
  const { data, error } = await supabase.rpc('claim_daily_reward');
  if (error) throw error;
  const row = firstRow(data as DailyRewardRow | DailyRewardRow[] | null);
  if (!row) throw new Error('Daily reward response was empty.');
  return {
    dailyReward: { claimed: true, rewardDate: row.reward_date },
    wallet: normalizeWalletFromRpc(row),
  };
}

export async function fetchMissionCenter(): Promise<{
  missions: Mission[];
  dailyReward: DailyReward;
  wallet: WalletBalance;
}> {
  const [missionsResult, dailyResult, walletResult] = await Promise.all([
    supabase.rpc('get_mission_center'),
    supabase.rpc('get_daily_reward_state'),
    supabase.from('wallets').select('planetary_coins, star_tokens, universal_coins').maybeSingle(),
  ]);
  if (missionsResult.error) throw missionsResult.error;
  if (dailyResult.error) throw dailyResult.error;
  if (walletResult.error) throw walletResult.error;

  const daily = firstRow(dailyResult.data as DailyRewardRow | DailyRewardRow[] | null);
  if (!daily) throw new Error('Daily reward state was empty.');

  return {
    missions: ((missionsResult.data ?? []) as MissionRow[]).map(normalizeMission),
    dailyReward: { claimed: Boolean(daily.claimed), rewardDate: daily.reward_date },
    wallet: walletResult.data ? normalizeWallet(walletResult.data as WalletRow) : normalizeWalletFromRpc(daily),
  };
}

export async function claimMission(missionId: string): Promise<WalletBalance> {
  const { data, error } = await supabase.rpc('claim_mission', { p_mission_id: missionId });
  if (error) throw error;
  const row = firstRow(data as Record<string, unknown> | Record<string, unknown>[] | null);
  if (!row) throw new Error('Mission reward response was empty.');
  return normalizeWalletFromRpc(row as {
    planetary_coins?: number | string;
    star_tokens?: number | string;
    universal_coins?: number | string;
  });
}

function normalizeQuiz(row: QuizRow): PhysicsQuizState {
  return {
    status: row.status,
    cycleNumber: asNumber(row.cycle_number),
    level: asNumber(row.level),
    questionId: row.question_id ?? '',
    prompt: row.prompt ?? '',
    options: parseOptions(row.options),
    cooldownUntil: row.cooldown_until,
    runId: row.run_id,
    questionCount: asNumber(row.question_count),
    planetaryCoins: asNumber(row.planetary_coins),
    starTokens: asNumber(row.star_tokens),
  };
}

export async function fetchPhysicsQuiz(): Promise<PhysicsQuizState> {
  const { data, error } = await supabase.rpc('get_physics_quiz_state');
  if (error) throw error;
  const row = firstRow(data as QuizRow | QuizRow[] | null);
  if (!row) throw new Error('Physics quiz response was empty.');
  return normalizeQuiz(row);
}

export async function submitPhysicsAnswer(questionId: string, answerIndex: number): Promise<PhysicsQuizState> {
  const { data, error } = await supabase.rpc('submit_physics_quiz_answer', {
    p_question_id: questionId,
    p_answer_index: answerIndex,
  });
  if (error) throw error;
  const row = firstRow(data as QuizAnswerRow | QuizAnswerRow[] | null);
  if (!row) throw new Error('Physics answer response was empty.');
  return normalizeQuiz(row);
}

export async function invalidatePhysicsRun(): Promise<PhysicsQuizState> {
  const { data, error } = await supabase.rpc('invalidate_physics_quiz_run');
  if (error) throw error;
  const row = firstRow(data as QuizRow | QuizRow[] | null);
  if (!row) throw new Error('Physics invalidation response was empty.');
  return normalizeQuiz(row);
}