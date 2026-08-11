import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Coins, Gamepad2, LockKeyhole, Orbit, Sparkles, X } from 'lucide-react';
import type { GameItem } from '../../data/gameCatalog';
import { fetchOwnedGameIds, purchaseGlobalGame, type GamePurchaseResult } from './api';

const INITIAL_GLOBAL_STORE_LIMIT = 15;

type GameStoreProps = {
  freeGames: GameItem[];
  paidGames: GameItem[];
  lm?: boolean;
  isAuthenticated: boolean;
  sessionVerified: boolean;
  userId?: string;
};

type PurchaseState = 'idle' | 'processing';

function StoreSectionHeading({
  label,
  detail,
  icon,
  lm,
}: {
  label: string;
  detail: string;
  icon: React.ReactNode;
  lm: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={lm ? 'text-cyan-700' : 'text-cyan-300/90'}>{icon}</span>
        <h2
          className={`text-[13px] font-medium uppercase tracking-[0.12em] sm:text-[15px] ${
            lm ? 'text-slate-900' : 'text-white/90'
          }`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
          data-testid={`heading-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {label}
        </h2>
      </div>
      <span
        className={`text-[10px] uppercase tracking-[0.16em] ${lm ? 'text-slate-500' : 'text-white/35'}`}
        data-testid={`text-${label.toLowerCase().replace(/\s+/g, '-')}-detail`}
      >
        {detail}
      </span>
    </div>
  );
}

function GameThumbnail({ game, lm }: { game: GameItem; lm: boolean }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
      <img
        src={game.thumbnail}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
        data-testid={`img-game-thumbnail-${game.id}`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          lm ? 'from-white/40 via-transparent to-transparent' : 'from-[#070a12]/80 via-transparent to-transparent'
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-2 top-2 inline-flex min-h-6 items-center gap-1 rounded-full border px-2 text-[8px] font-medium uppercase tracking-[0.1em] ${
          lm
            ? 'border-white/70 bg-white/80 text-slate-700'
            : 'border-white/15 bg-black/30 text-white/75 backdrop-blur-md'
        }`}
        data-testid={`status-game-${game.id}`}
      >
        <Gamepad2 size={10} strokeWidth={1.8} />
        Free
      </span>
    </div>
  );
}

function FreeGameCard({ game, lm }: { game: GameItem; lm: boolean }) {
  return (
    <article
      className={`group min-w-0 overflow-hidden rounded-2xl border transition-all duration-300 ${
        lm
          ? 'border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.07)] hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_10px_28px_rgba(8,145,178,0.14)]'
          : 'border-white/[0.09] bg-white/[0.045] shadow-[0_8px_26px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.07]'
      }`}
      data-testid={`card-free-game-${game.id}`}
    >
      <GameThumbnail game={game} lm={lm} />
      <div className="min-h-[104px] p-2.5">
        <div className="mb-0.5 flex items-start justify-between gap-1">
          <h3
            className={`min-w-0 truncate text-[11px] font-medium ${lm ? 'text-slate-900' : 'text-white/90'}`}
            data-testid={`text-game-title-${game.id}`}
          >
            {game.title}
          </h3>
          <span className={`shrink-0 text-[8px] uppercase tracking-[0.08em] ${lm ? 'text-cyan-700' : 'text-cyan-300/75'}`}>
            {game.category}
          </span>
        </div>
        <p className={`line-clamp-2 text-[9px] leading-snug ${lm ? 'text-slate-500' : 'text-white/42'}`}>
          {game.description}
        </p>
        <div className={`mt-2 flex items-center gap-1 text-[8px] uppercase tracking-[0.08em] ${lm ? 'text-slate-400' : 'text-white/30'}`}>
          <Sparkles size={10} strokeWidth={1.7} />
          Verified source
        </div>
      </div>
    </article>
  );
}

function LockedGameCard({
  game,
  lm,
  onBuy,
}: {
  game: GameItem;
  lm: boolean;
  onBuy: () => void;
}) {
  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border ${
        lm ? 'border-slate-200 bg-white/80' : 'border-white/[0.08] bg-white/[0.025]'
      }`}
      data-testid={`card-locked-game-${game.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <img
          src={game.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-30 grayscale"
          data-testid={`img-game-thumbnail-${game.id}`}
        />
        <div className="absolute inset-0 bg-[#060911]/45" aria-hidden="true" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
             className={`flex h-9 w-9 items-center justify-center rounded-full border ${
              lm ? 'border-white/80 bg-white/80 text-slate-700' : 'border-white/20 bg-black/30 text-white/80'
            }`}
            aria-label="Locked game"
          >
             <LockKeyhole size={15} strokeWidth={1.7} />
          </span>
        </div>
      </div>
       <div className="min-h-[132px] p-2.5">
         <div className="flex items-start justify-between gap-1">
          <h3
             className={`min-w-0 truncate text-[11px] font-medium ${lm ? 'text-slate-800' : 'text-white/75'}`}
            data-testid={`text-game-title-${game.id}`}
          >
            {game.title}
          </h3>
          <span
             className={`shrink-0 rounded-full border px-1 py-0.5 text-[7px] uppercase tracking-[0.08em] ${
              lm ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-violet-300/20 bg-violet-400/10 text-violet-200/75'
            }`}
            data-testid={`badge-locked-${game.id}`}
          >
            Locked
          </span>
        </div>
         <p className={`mt-1 line-clamp-1 text-[9px] leading-snug ${lm ? 'text-slate-500' : 'text-white/32'}`}>
          {game.description}
        </p>
        <div
           className={`mt-2 flex items-center gap-1 text-[9px] font-medium ${lm ? 'text-amber-700' : 'text-amber-200/80'}`}
          data-testid={`text-price-${game.id}`}
        >
           <Coins size={11} strokeWidth={1.8} />
          {game.price.toLocaleString()} {game.currency}
        </div>
        <button
          type="button"
          onClick={onBuy}
           className={`mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-2 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors ${
            lm
              ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100'
              : 'border-violet-300/20 bg-violet-400/[0.10] text-violet-100 hover:border-violet-200/40 hover:bg-violet-400/[0.18]'
          }`}
          data-testid={`button-buy-game-${game.id}`}
        >
           <Coins size={12} strokeWidth={1.8} />
          Buy
        </button>
      </div>
    </article>
  );
}

function OwnedGameCard({
  game,
  lm,
  onPlay,
}: {
  game: GameItem;
  lm: boolean;
  onPlay: () => void;
}) {
  return (
    <article
      className={`group min-w-0 overflow-hidden rounded-2xl border ${
        lm
          ? 'border-emerald-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.07)]'
          : 'border-emerald-300/20 bg-emerald-400/[0.045]'
      }`}
      data-testid={`card-owned-game-${game.id}`}
    >
       <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <img
          src={game.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
          data-testid={`img-owned-game-${game.id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06100d]/75 via-transparent to-transparent" aria-hidden="true" />
        <span
           className="absolute left-2 top-2 inline-flex min-h-6 items-center gap-1 rounded-full border border-emerald-200/30 bg-emerald-950/45 px-2 text-[8px] font-medium uppercase tracking-[0.1em] text-emerald-100 backdrop-blur-md"
          data-testid={`badge-owned-${game.id}`}
        >
           <Sparkles size={10} strokeWidth={1.8} />
          Owned
        </span>
      </div>
       <div className="min-h-[116px] p-2.5">
         <div className="flex items-start justify-between gap-1">
          <h3
             className={`min-w-0 truncate text-[11px] font-medium ${lm ? 'text-slate-900' : 'text-white/90'}`}
            data-testid={`text-owned-game-title-${game.id}`}
          >
            {game.title}
          </h3>
           <span className={`shrink-0 text-[8px] uppercase tracking-[0.08em] ${lm ? 'text-emerald-700' : 'text-emerald-200/75'}`}>
            {game.category}
          </span>
        </div>
         <p className={`mt-1 line-clamp-1 text-[9px] leading-snug ${lm ? 'text-slate-500' : 'text-white/42'}`}>
          {game.description}
        </p>
        <button
          type="button"
          onClick={onPlay}
           className={`mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-2 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors ${
            lm
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100 hover:bg-emerald-400/[0.18]'
          }`}
          data-testid={`button-play-game-${game.id}`}
        >
           <Gamepad2 size={12} strokeWidth={1.8} />
          Play
        </button>
      </div>
    </article>
  );
}

function PurchaseDialog({
  game,
  lm,
  state,
  error,
  result,
  isAuthenticated,
  onCancel,
  onConfirm,
}: {
  game: GameItem;
  lm: boolean;
  state: PurchaseState;
  error: string | null;
  result: GamePurchaseResult | null;
  isAuthenticated: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const complete = result !== null;
  return (
    <div className="fixed inset-0 z-[420] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl" data-testid="game-purchase-dialog">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-purchase-title"
        className={`relative w-full max-w-md rounded-2xl border p-5 shadow-2xl ${
          lm ? 'border-slate-200 bg-white' : 'border-white/[0.13] bg-[#101522]/95'
        }`}
      >
        <button
          type="button"
          onClick={onCancel}
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border ${
            lm ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-white/10 text-white/50 hover:bg-white/10'
          }`}
          aria-label="Close purchase confirmation"
          data-testid="button-close-game-purchase"
        >
          <X size={16} />
        </button>
        <div className="pr-12">
          <p className={`mb-2 text-[10px] uppercase tracking-[0.2em] ${lm ? 'text-violet-700' : 'text-violet-200/75'}`}>
            Premium confirmation
          </p>
          <h2 id="game-purchase-title" className={`text-lg font-medium ${lm ? 'text-slate-900' : 'text-white/90'}`}>
            {complete ? 'Game added to Premium Games' : `Unlock ${game.title}`}
          </h2>
          <p className={`mt-2 text-[12px] leading-relaxed ${lm ? 'text-slate-500' : 'text-white/50'}`}>
            {complete
              ? result.status === 'already_owned'
                ? 'This game was already owned. No additional coins were charged.'
                : `Ownership is saved to your Cosmic Ocean account. ${result.wallet.planetary_coins.toLocaleString()} Planetary Coins remain.`
              : isAuthenticated
                ? 'The secure Royalty purchase service will verify your balance, resolve the catalog price, and record ownership atomically.'
                : 'Sign in before purchasing so ownership stays linked to your account across devices.'}
          </p>
        </div>
        {!complete && (
          <>
            <div className={`mt-5 flex items-center justify-between rounded-xl border px-3.5 py-3 ${lm ? 'border-slate-200 bg-slate-50' : 'border-white/[0.08] bg-white/[0.04]'}`}>
              <span className={`text-[11px] ${lm ? 'text-slate-500' : 'text-white/45'}`}>Catalog price</span>
              <span className={`flex items-center gap-1.5 text-[12px] font-medium ${lm ? 'text-amber-700' : 'text-amber-200/85'}`}>
                <Coins size={14} />
                {game.price.toLocaleString()} {game.currency}
              </span>
            </div>
            {error && (
              <p className={`mt-3 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${lm ? 'border-red-200 bg-red-50 text-red-700' : 'border-red-300/20 bg-red-400/[0.08] text-red-100/80'}`} data-testid="status-game-purchase-error">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className={`min-h-11 rounded-xl border px-4 text-[10px] uppercase tracking-[0.15em] ${lm ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-white/55 hover:bg-white/10'}`}
                data-testid="button-cancel-game-purchase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={state === 'processing' || !isAuthenticated}
                className={`min-h-11 rounded-xl border px-4 text-[10px] font-medium uppercase tracking-[0.15em] disabled:cursor-wait disabled:opacity-60 ${lm ? 'border-violet-200 bg-violet-600 text-white hover:bg-violet-700' : 'border-violet-200/20 bg-violet-400/20 text-violet-50 hover:bg-violet-400/30'}`}
                data-testid="button-confirm-game-purchase"
              >
                {state === 'processing' ? 'Checking reserve…' : isAuthenticated ? 'Confirm purchase' : 'Sign in to purchase'}
              </button>
            </div>
          </>
        )}
        {complete && (
          <button
            type="button"
            onClick={onCancel}
            className={`mt-5 min-h-11 w-full rounded-xl border px-4 text-[10px] font-medium uppercase tracking-[0.15em] ${lm ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-100 hover:bg-emerald-400/[0.2]'}`}
            data-testid="button-finish-game-purchase"
          >
            Continue to Premium Games
          </button>
        )}
      </section>
    </div>
  );
}

export default function GameStore({
  freeGames,
  paidGames,
  lm = false,
  isAuthenticated,
  sessionVerified,
  userId,
}: GameStoreProps) {
  const [ownedGameIds, setOwnedGameIds] = useState<Set<string>>(() => new Set());
  const [ownershipStatus, setOwnershipStatus] = useState<'idle' | 'syncing' | 'ready' | 'error'>('idle');
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<GamePurchaseResult | null>(null);
  const [playNotice, setPlayNotice] = useState<string | null>(null);
  const [isGlobalStoreExpanded, setIsGlobalStoreExpanded] = useState(false);
  const ownershipRequestRef = useRef(0);
  const purchaseInFlightRef = useRef(false);

  useEffect(() => {
    const requestId = ++ownershipRequestRef.current;
    if (!sessionVerified) {
      setOwnershipStatus('idle');
      setOwnedGameIds(new Set());
      return;
    }
    if (!isAuthenticated || !userId) {
      setOwnershipStatus('ready');
      setOwnedGameIds(new Set());
      return;
    }

    setOwnershipStatus('syncing');
    setOwnedGameIds(new Set());
    void fetchOwnedGameIds()
      .then(ids => {
        if (requestId !== ownershipRequestRef.current) return;
        setOwnedGameIds(ids);
        setOwnershipStatus('ready');
      })
      .catch(error => {
        if (requestId !== ownershipRequestRef.current) return;
        console.warn('[Global Game Store] Could not sync ownership:', error);
        setOwnedGameIds(new Set());
        setOwnershipStatus('error');
      });
  }, [isAuthenticated, sessionVerified, userId]);

  const openPurchase = (game: GameItem) => {
    setSelectedGame(game);
    setPurchaseState('idle');
    setPurchaseError(null);
    setPurchaseResult(null);
  };

  const closePurchase = () => {
    if (purchaseState === 'processing') return;
    setSelectedGame(null);
    setPurchaseError(null);
    setPurchaseResult(null);
  };

  const confirmPurchase = async () => {
    if (!selectedGame || purchaseInFlightRef.current || purchaseState === 'processing' || !isAuthenticated) return;
    purchaseInFlightRef.current = true;
    setPurchaseState('processing');
    setPurchaseError(null);
    try {
      const result = await purchaseGlobalGame(selectedGame.id);
      setOwnedGameIds(previous => {
        const next = new Set(previous);
        next.add(result.gameId);
        return next;
      });
      setPurchaseResult(result);
      setPurchaseState('idle');
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : String(reason);
      if (message.includes('INSUFFICIENT_BALANCE')) {
        setPurchaseError('Insufficient Planetary Coins. No balance or ownership record was changed.');
      } else if (message.includes('AUTHENTICATION_REQUIRED')) {
        setPurchaseError('Your session is no longer active. Sign in again to purchase this game.');
      } else if (message.includes('GAME_NOT_FOUND')) {
        setPurchaseError('This game is not currently available in the secure store catalog.');
      } else {
        setPurchaseError('Purchase could not be completed. No balance was changed. Please try again.');
      }
      setPurchaseState('idle');
    } finally {
      purchaseInFlightRef.current = false;
    }
  };

  const handlePlay = (game: GameItem) => {
    if (game.gameSource) {
      window.open(game.gameSource, '_blank', 'noopener,noreferrer');
      return;
    }
    setPlayNotice(`${game.title} is owned. Its gameplay source will be announced when this catalog placeholder is replaced.`);
  };

  const ownedGames = paidGames.filter(game => ownedGameIds.has(game.id));
  const lockedGames = paidGames.filter(game => !ownedGameIds.has(game.id));
  const visibleLockedGames = isGlobalStoreExpanded ? lockedGames : lockedGames.slice(0, INITIAL_GLOBAL_STORE_LIMIT);
  const hasMoreLockedGames = lockedGames.length > INITIAL_GLOBAL_STORE_LIMIT;

  return (
    <section className="game-store-shell mt-8 space-y-9" data-testid="global-game-store">
      <div data-testid="free-games-section">
        <StoreSectionHeading
          label="Free Games"
          detail={`${freeGames.length} open catalog slots`}
          icon={<Gamepad2 size={16} strokeWidth={1.7} />}
          lm={lm}
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6" data-testid="free-games-grid">
          {freeGames.map(game => <FreeGameCard key={game.id} game={game} lm={lm} />)}
        </div>
      </div>

      <div data-testid="global-store-section">
        <StoreSectionHeading
          label="Global Game Store"
          detail={`${paidGames.length} total games · ${ownedGames.length} owned`}
          icon={<Orbit size={16} strokeWidth={1.7} />}
          lm={lm}
        />
        <div
          className={`mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${
            lm ? 'border-violet-200 bg-violet-50/70 text-violet-800' : 'border-violet-300/15 bg-violet-400/[0.06] text-violet-100/65'
          }`}
          data-testid="status-global-store-locked"
        >
          <LockKeyhole size={14} className="mt-0.5 shrink-0" strokeWidth={1.7} />
          <span>
            {ownershipStatus === 'syncing'
              ? 'Syncing your collection…'
              : 'Prices are resolved by the secure Royalty catalog. Purchases are atomic and ownership is account-linked.'}
          </span>
        </div>
        {playNotice && (
          <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${lm ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-cyan-300/15 bg-cyan-400/[0.06] text-cyan-100/70'}`} data-testid="status-game-play">
            <span>{playNotice}</span>
            <button type="button" onClick={() => setPlayNotice(null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" aria-label="Dismiss play message" data-testid="button-dismiss-game-play">
              <X size={13} />
            </button>
          </div>
        )}
        {ownershipStatus === 'error' && isAuthenticated && (
          <p className={`mb-4 rounded-xl border px-3.5 py-3 text-[11px] ${lm ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-amber-300/15 bg-amber-400/[0.06] text-amber-100/70'}`} data-testid="status-game-ownership-error">
            Your saved collection could not be synced. Purchases remain server-authoritative; please refresh and try again.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6" data-testid="paid-games-grid">
          {visibleLockedGames.map(game => <LockedGameCard key={game.id} game={game} lm={lm} onBuy={() => openPurchase(game)} />)}
        </div>
        {hasMoreLockedGames && (
          <button
            type="button"
            onClick={() => setIsGlobalStoreExpanded(expanded => !expanded)}
            className={`mx-auto mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
              lm
                ? 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800'
                : 'border-white/10 bg-white/[0.04] text-white/65 hover:border-violet-300/30 hover:bg-violet-400/[0.10] hover:text-violet-100'
            }`}
            aria-expanded={isGlobalStoreExpanded}
            data-testid="button-toggle-global-games"
          >
            {isGlobalStoreExpanded ? (
              <>
                <ChevronUp size={14} strokeWidth={1.8} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} strokeWidth={1.8} />
                View All Games ({paidGames.length})
              </>
            )}
          </button>
        )}
      </div>

      <div data-testid="premium-games-section">
        <StoreSectionHeading
          label="Premium Games"
          detail={ownedGames.length ? `${ownedGames.length} owned` : 'Awaiting first release'}
          icon={<Sparkles size={16} strokeWidth={1.7} />}
          lm={lm}
        />
        {ownedGames.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6" data-testid="owned-games-grid">
            {ownedGames.map(game => <OwnedGameCard key={game.id} game={game} lm={lm} onPlay={() => handlePlay(game)} />)}
          </div>
        ) : (
          <div
            className={`flex min-h-[136px] flex-col items-center justify-center rounded-2xl border px-6 py-8 text-center ${
              lm ? 'border-slate-200 bg-white/70' : 'border-white/[0.08] bg-white/[0.025]'
            }`}
            data-testid="empty-premium-games"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border ${lm ? 'border-cyan-200 bg-cyan-50 text-cyan-700' : 'border-cyan-200/15 bg-cyan-300/[0.07] text-cyan-200/75'}`}>
              <Sparkles size={16} strokeWidth={1.6} />
            </div>
            <p className={`text-[13px] font-medium ${lm ? 'text-slate-800' : 'text-white/80'}`} data-testid="text-premium-games-empty">
              No premium games yet
            </p>
            <p className={`mt-1 text-[11px] ${lm ? 'text-slate-500' : 'text-white/35'}`}>
              Purchased games will appear here and remain linked to your account.
            </p>
          </div>
        )}
      </div>

      {selectedGame && (
        <PurchaseDialog
          game={selectedGame}
          lm={lm}
          state={purchaseState}
          error={purchaseError}
          result={purchaseResult}
          isAuthenticated={isAuthenticated}
          onCancel={closePurchase}
          onConfirm={() => void confirmPurchase()}
        />
      )}
    </section>
  );
}