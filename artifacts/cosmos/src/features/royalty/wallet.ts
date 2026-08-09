import { supabase } from '../../lib/supabase';
import type { WalletBalance } from './royalty';

export type WalletRow = {
  id: string;
  user_id: string;
  planetary_coins: number | string | null;
  star_tokens: number | string | null;
  universal_coins: number | string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeWallet(row: WalletRow): WalletBalance {
  const safeBalance = (value: number | string | null) => {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  return {
    planetary_coins: safeBalance(row.planetary_coins),
    star_tokens: safeBalance(row.star_tokens),
    universal_coins: safeBalance(row.universal_coins),
  };
}

export async function fetchOrCreateWallet(userId: string): Promise<WalletBalance> {
  const readWallet = async () => supabase
    .from('wallets')
    .select('id, user_id, planetary_coins, star_tokens, universal_coins, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  const existing = await readWallet();
  if (existing.error) throw existing.error;
  if (existing.data) return normalizeWallet(existing.data as WalletRow);

  const created = await supabase.rpc('ensure_wallet', { p_user_id: userId });
  if (created.error) throw created.error;

  const afterRace = await readWallet();
  if (afterRace.error) throw afterRace.error;
  if (!afterRace.data) throw new Error('Wallet could not be created. Please try again.');
  return normalizeWallet(afterRace.data as WalletRow);
}