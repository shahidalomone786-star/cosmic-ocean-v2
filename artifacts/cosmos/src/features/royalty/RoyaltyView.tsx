import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EMPTY_WALLET,
  ROYALTY_CURRENCIES,
  type WalletBalance,
  type RoyaltyCurrencyKey,
} from './royalty';
import { RoyaltyCurrencyIcon, RoyaltyCrown } from './RoyaltyIcons';
import { fetchOrCreateWallet } from './wallet';

function formatBalance(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function WalletRowCard({
  currency,
  balance,
  index,
  lm,
}: {
  currency: (typeof ROYALTY_CURRENCIES)[number];
  balance: number;
  index: number;
  lm?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`royalty-balance-card ${lm ? 'royalty-balance-card-light' : ''}`}
      style={{ '--royalty-accent': currency.accent, '--royalty-accent-soft': currency.accentSoft } as React.CSSProperties}
    >
      <div className="royalty-balance-icon" aria-hidden="true">
        <RoyaltyCurrencyIcon currency={currency.key} size={48} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="royalty-balance-name">{currency.name}</p>
          <span className="royalty-balance-rarity">{currency.rarity}</span>
        </div>
        <p className="royalty-balance-description">{currency.description}</p>
      </div>
      <p className="royalty-balance-value" aria-label={`${formatBalance(balance)} ${currency.name}`}>
        {formatBalance(balance)}
      </p>
    </motion.article>
  );
}

export function RoyaltyView({
  userId,
  onBack,
  lm,
}: {
  userId: string;
  onBack: () => void;
  lm?: boolean;
}) {
  const [wallet, setWallet] = useState<WalletBalance>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchOrCreateWallet(userId)
      .then((nextWallet) => {
        if (active) setWallet(nextWallet);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        const message = reason instanceof Error ? reason.message : 'Unable to load your Cosmic Balance.';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <motion.div
      key="royalty"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`royalty-surface ${lm ? 'royalty-surface-light' : ''}`}
    >
      <header className="royalty-topbar">
        <button type="button" onClick={onBack} className="royalty-back-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </button>
        <div className="royalty-topbar-title">
          <RoyaltyCrown size={20} />
          <span>Royalty</span>
        </div>
        <span className="royalty-topbar-spacer" aria-hidden="true" />
      </header>

      <div className="royalty-content">
        <div className="royalty-heading">
          <div>
            <p className="royalty-eyebrow">Cosmic Ocean / Personal Treasury</p>
            <h1>Royalty</h1>
            <p className="royalty-subtitle">Your Cosmic Balance</p>
          </div>
          <div className="royalty-crown-mark" aria-hidden="true">
            <span />
            <RoyaltyCrown size={56} />
          </div>
        </div>

        <div className="royalty-rule" />

        <section aria-labelledby="royalty-balance-heading">
          <div className="royalty-section-heading">
            <p id="royalty-balance-heading" className="royalty-section-label">Currency reserve</p>
            {loading && <span className="royalty-loading-label">Syncing</span>}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="royalty-state royalty-error-state">
                <p>We couldn’t reach your wallet.</p>
                <span>{error}</span>
                <button type="button" onClick={() => window.location.reload()}>Try again</button>
              </motion.div>
            ) : (
              <motion.div key="balances" className={`royalty-balance-list ${loading ? 'royalty-balance-list-loading' : ''}`}>
                {ROYALTY_CURRENCIES.map((currency, index) => (
                  <WalletRowCard
                    key={currency.key}
                    currency={currency}
                    balance={wallet[currency.key as RoyaltyCurrencyKey]}
                    index={index}
                    lm={lm}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <p className="royalty-footnote">
          Your reserve is securely linked to your Cosmic Ocean account and follows you across devices.
        </p>
      </div>
    </motion.div>
  );
}