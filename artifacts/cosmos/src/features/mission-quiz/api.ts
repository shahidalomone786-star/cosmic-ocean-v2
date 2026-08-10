import { createAuthenticatedSupabaseClient, supabase } from '../../lib/supabase';
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
  status?: 'claimed' | 'already_claimed' | string;
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
  // The answer/invalidation RPCs do not return question_count. The quiz
  // always contains the 100-question cycle, so normalization supplies the
  // stable total when those narrower payloads are returned.
  question_count?: number | string | null;
  planetary_coins: number | string;
  star_tokens: number | string;
};

type QuizAnswerRow = QuizRow & {
  reward_planetary?: number | string;
  reward_stars?: number | string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
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

const QUIZ_QUESTION_TOTAL = 100;

async function requireActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`RPC Error: AUTHENTICATION_REQUIRED — ${error.message}`);
  }

  let session = data.session;
  const expiresAt = session?.expires_at ?? 0;
  if (!session?.access_token || (expiresAt > 0 && expiresAt <= Math.floor(Date.now() / 1000))) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session?.access_token) {
      throw new Error('RPC Error: AUTHENTICATION_REQUIRED — Your Cosmic Ocean session has expired. Sign in again to continue.');
    }
    session = refreshed.data.session;
  }

  return session.access_token;
}

function formatRpcError(error: SupabaseErrorLike | null | undefined): Error {
  const message = error?.message?.trim() || 'The database function did not return a message.';
  const code = error?.code?.trim();
  const suffix = error?.details?.trim() ? ` — ${error.details.trim()}` : '';
  // PostgreSQL function exceptions use the exception text as the useful
  // application code (for example AUTHENTICATION_REQUIRED or MISSION_INCOMPLETE).
  // Keep it intact so the user can act on the exact failure.
  return new Error(`RPC Error: ${code && code !== 'P0001' ? `${code} — ` : ''}${message}${suffix}`);
}

async function protectedRpc<T>(
  functionName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const accessToken = await requireActiveSession();
  const authenticatedSupabase = createAuthenticatedSupabaseClient(accessToken);
  try {
    const { data, error } = await authenticatedSupabase.rpc(functionName, args);
    if (error) throw formatRpcError(error);
    return data as T;
  } catch (reason) {
    if (reason instanceof Error && reason.message.startsWith('RPC Error:')) throw reason;
    if (reason && typeof reason === 'object' && 'message' in reason
      && ('code' in reason || 'details' in reason || 'hint' in reason)) {
      throw formatRpcError(reason as SupabaseErrorLike);
    }
    throw new Error(`Network Error: ${reason instanceof Error ? reason.message : 'The request could not reach Supabase.'}`);
  }
}

export async function claimDailyReward(): Promise<{
  dailyReward: DailyReward;
  wallet: WalletBalance;
  status: 'claimed' | 'already_claimed';
}> {
  const data = await protectedRpc<DailyRewardRow | DailyRewardRow[]>('claim_daily_reward');
  const row = firstRow(data as DailyRewardRow | DailyRewardRow[] | null);
  if (!row) throw new Error('Daily reward response was empty.');
  return {
    dailyReward: { claimed: true, rewardDate: row.reward_date },
    wallet: normalizeWalletFromRpc(row),
    status: row.status === 'already_claimed' ? 'already_claimed' : 'claimed',
  };
}

export async function fetchMissionCenter(): Promise<{
  missions: Mission[];
  dailyReward: DailyReward;
  wallet: WalletBalance;
}> {
  const [missionsData, dailyData] = await Promise.all([
    protectedRpc<MissionRow[] | MissionRow>('get_mission_center'),
    protectedRpc<DailyRewardRow | DailyRewardRow[]>('get_daily_reward_state'),
  ]);

  const daily = firstRow(dailyData as DailyRewardRow | DailyRewardRow[] | null);
  if (!daily) throw new Error('Daily reward state was empty.');

  return {
    missions: (Array.isArray(missionsData) ? missionsData : [missionsData]).map(normalizeMission),
    dailyReward: { claimed: Boolean(daily.claimed), rewardDate: daily.reward_date },
    // get_daily_reward_state is security-definer and returns the authoritative
    // account wallet; avoid a second browser table read that can clobber it.
    wallet: normalizeWalletFromRpc(daily),
  };
}

export async function claimMission(missionId: string): Promise<{
  wallet: WalletBalance;
  status: 'claimed' | 'already_claimed';
}> {
  const data = await protectedRpc<Record<string, unknown> | Record<string, unknown>[]>('claim_mission', {
    p_mission_id: missionId,
  });
  const row = firstRow(data as Record<string, unknown> | Record<string, unknown>[] | null);
  if (!row) throw new Error('Mission reward response was empty.');
  const typedRow = row as {
    status?: string;
    planetary_coins?: number | string;
    star_tokens?: number | string;
    universal_coins?: number | string;
  };
  return {
    wallet: normalizeWalletFromRpc(typedRow),
    status: typedRow.status === 'already_claimed' ? 'already_claimed' : 'claimed',
  };
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
    questionTotal: asNumber(row.question_count ?? QUIZ_QUESTION_TOTAL),
    planetaryCoins: asNumber(row.planetary_coins),
    starTokens: asNumber(row.star_tokens),
  };
}

export async function fetchPhysicsQuiz(): Promise<PhysicsQuizState> {
  const data = await protectedRpc<QuizRow | QuizRow[]>('get_physics_quiz_state');
  const row = firstRow(data as QuizRow | QuizRow[] | null);
  if (!row) throw new Error('Physics quiz response was empty.');
  return normalizeQuiz(row);
}

export async function submitPhysicsAnswer(questionId: string, answerIndex: number): Promise<PhysicsQuizState> {
  const data = await protectedRpc<QuizAnswerRow | QuizAnswerRow[]>('submit_physics_quiz_answer', {
    p_question_id: questionId,
    p_answer_index: answerIndex,
  });
  const row = firstRow(data as QuizAnswerRow | QuizAnswerRow[] | null);
  if (!row) throw new Error('Physics answer response was empty.');
  return normalizeQuiz(row);
}

export async function invalidatePhysicsRun(): Promise<PhysicsQuizState> {
  await protectedRpc('invalidate_physics_quiz_run');
  // The invalidation RPC intentionally returns only the new run/question
  // identity. Re-read the full state so wallet totals and question_count
  // cannot regress to client-side zero defaults after a background reset.
  return fetchPhysicsQuiz();
}
