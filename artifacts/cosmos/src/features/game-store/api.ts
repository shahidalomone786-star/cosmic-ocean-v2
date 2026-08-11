import { createAuthenticatedSupabaseClient, supabase } from '../../lib/supabase';
import { normalizeWallet, type WalletRow } from '../royalty/wallet';
import type { WalletBalance } from '../royalty/royalty';

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

type OwnedGameRow = {
  game_id: string | null;
};

type PurchaseGameRow = {
  status: 'purchased' | 'already_owned' | string;
  game_id: string;
  ownership_id: string;
  price: number | string;
  currency: string;
  planetary_coins: number | string;
  star_tokens: number | string;
  universal_coins: number | string;
  purchased_at: string;
};

export type GamePurchaseResult = {
  status: 'purchased' | 'already_owned';
  gameId: string;
  ownershipId: string;
  price: number;
  currency: string;
  wallet: WalletBalance;
  purchasedAt: string;
};

function asNumber(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRpcError(error: SupabaseErrorLike | null | undefined): Error {
  const message = error?.message?.trim() || 'The purchase function did not return a message.';
  const code = error?.code?.trim();
  const suffix = error?.details?.trim() ? ` — ${error.details.trim()}` : '';
  return new Error(`RPC Error: ${code && code !== 'P0001' ? `${code} — ` : ''}${message}${suffix}`);
}

async function requireActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`RPC Error: AUTHENTICATION_REQUIRED — ${error.message}`);

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

function firstRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data;
}

export async function fetchOwnedGameIds(): Promise<Set<string>> {
  const accessToken = await requireActiveSession();
  const authenticatedSupabase = createAuthenticatedSupabaseClient(accessToken);
  const { data, error } = await authenticatedSupabase
    .from('global_game_ownerships')
    .select('game_id');

  if (error) throw error;

  return new Set(
    ((data ?? []) as OwnedGameRow[])
      .map(row => row.game_id)
      .filter((gameId): gameId is string => Boolean(gameId)),
  );
}

export async function purchaseGlobalGame(gameId: string): Promise<GamePurchaseResult> {
  const accessToken = await requireActiveSession();
  const authenticatedSupabase = createAuthenticatedSupabaseClient(accessToken);
  const { data, error } = await authenticatedSupabase.rpc('purchase_global_game', {
    p_game_id: gameId,
  });

  if (error) throw formatRpcError(error);

  const row = firstRow(data as PurchaseGameRow | PurchaseGameRow[] | null);
  if (!row) throw new Error('The purchase did not return a confirmation.');

  return {
    status: row.status === 'already_owned' ? 'already_owned' : 'purchased',
    gameId: row.game_id,
    ownershipId: row.ownership_id,
    price: asNumber(row.price),
    currency: row.currency,
    wallet: normalizeWallet({
      id: '',
      user_id: '',
      created_at: '',
      updated_at: '',
      planetary_coins: row.planetary_coins,
      star_tokens: row.star_tokens,
      universal_coins: row.universal_coins,
    } as WalletRow),
    purchasedAt: row.purchased_at,
  };
}
