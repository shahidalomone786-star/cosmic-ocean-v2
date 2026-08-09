export type RoyaltyCurrencyKey =
  | 'planetary_coins'
  | 'star_tokens'
  | 'universal_coins';

export type RoyaltyCurrencyDefinition = {
  key: RoyaltyCurrencyKey;
  name: string;
  singularName: string;
  rarity: string;
  description: string;
  accent: string;
  accentSoft: string;
};

/**
 * The single source of truth for Royalty currencies.
 *
 * Balances deliberately are not stored here. They belong to the authenticated
 * user's Supabase wallet and are fetched on every wallet screen mount.
 */
export const ROYALTY_CURRENCIES: readonly RoyaltyCurrencyDefinition[] = [
  {
    key: 'planetary_coins',
    name: 'Planetary Coins',
    singularName: 'Planetary Coin',
    rarity: 'Common',
    description: 'The everyday currency of the worlds you explore.',
    accent: '#64c9d7',
    accentSoft: 'rgba(100, 201, 215, 0.14)',
  },
  {
    key: 'star_tokens',
    name: 'Star Tokens',
    singularName: 'Star Token',
    rarity: 'Rare',
    description: 'A rarer mark earned beyond the familiar orbit.',
    accent: '#d8b675',
    accentSoft: 'rgba(216, 182, 117, 0.14)',
  },
  {
    key: 'universal_coins',
    name: 'Universal Coins',
    singularName: 'Universal Coin',
    rarity: 'Extremely Rare',
    description: 'The highest distinction in the Cosmic Ocean.',
    accent: '#c2b9ed',
    accentSoft: 'rgba(194, 185, 237, 0.17)',
  },
] as const;

export type WalletBalance = Record<RoyaltyCurrencyKey, number>;

export const EMPTY_WALLET: WalletBalance = {
  planetary_coins: 0,
  star_tokens: 0,
  universal_coins: 0,
};