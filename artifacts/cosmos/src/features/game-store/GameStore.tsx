import { LockKeyhole, Coins, Gamepad2, Orbit, Sparkles } from 'lucide-react';
import type { GameItem } from '../../data/gameCatalog';

type GameStoreProps = {
  freeGames: GameItem[];
  paidGames: GameItem[];
  lm?: boolean;
};

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
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={lm ? 'text-cyan-700' : 'text-cyan-300/90'}>{icon}</span>
        <h2
          className={`text-[13px] sm:text-[15px] font-medium tracking-[0.12em] uppercase ${
            lm ? 'text-slate-900' : 'text-white/90'
          }`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
          data-testid={`heading-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {label}
        </h2>
      </div>
      <span
        className={`text-[10px] uppercase tracking-[0.16em] ${
          lm ? 'text-slate-500' : 'text-white/35'
        }`}
        data-testid={`text-${label.toLowerCase().replace(/\s+/g, '-')}-detail`}
      >
        {detail}
      </span>
    </div>
  );
}

function GameThumbnail({ game, lm }: { game: GameItem; lm: boolean }) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
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
        className={`absolute left-3 top-3 inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-medium uppercase tracking-[0.13em] ${
          lm
            ? 'border-white/70 bg-white/80 text-slate-700'
            : 'border-white/15 bg-black/30 text-white/75 backdrop-blur-md'
        }`}
        data-testid={`status-game-${game.id}`}
      >
        <Gamepad2 size={11} strokeWidth={1.8} />
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
      <div className="min-h-[126px] p-3.5">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3
            className={`min-w-0 truncate text-[13px] font-medium ${lm ? 'text-slate-900' : 'text-white/90'}`}
            data-testid={`text-game-title-${game.id}`}
          >
            {game.title}
          </h3>
          <span className={`shrink-0 text-[10px] uppercase tracking-[0.12em] ${lm ? 'text-cyan-700' : 'text-cyan-300/75'}`}>
            {game.category}
          </span>
        </div>
        <p className={`line-clamp-2 text-[11px] leading-relaxed ${lm ? 'text-slate-500' : 'text-white/42'}`}>
          {game.description}
        </p>
        <div className={`mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] ${lm ? 'text-slate-400' : 'text-white/30'}`}>
          <Sparkles size={11} strokeWidth={1.7} />
          Verified source
        </div>
      </div>
    </article>
  );
}

function LockedGameCard({ game, lm }: { game: GameItem; lm: boolean }) {
  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border ${
        lm ? 'border-slate-200 bg-white/80' : 'border-white/[0.08] bg-white/[0.025]'
      }`}
      data-testid={`card-locked-game-${game.id}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
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
            className={`flex h-11 w-11 items-center justify-center rounded-full border ${
              lm ? 'border-white/80 bg-white/80 text-slate-700' : 'border-white/20 bg-black/30 text-white/80'
            }`}
            aria-label="Locked game"
          >
            <LockKeyhole size={17} strokeWidth={1.7} />
          </span>
        </div>
      </div>
      <div className="min-h-[108px] p-3">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`min-w-0 truncate text-[12px] font-medium ${lm ? 'text-slate-800' : 'text-white/75'}`}
            data-testid={`text-game-title-${game.id}`}
          >
            {game.title}
          </h3>
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] ${
              lm ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-violet-300/20 bg-violet-400/10 text-violet-200/75'
            }`}
            data-testid={`badge-locked-${game.id}`}
          >
            Locked
          </span>
        </div>
        <p className={`mt-1 line-clamp-2 text-[10px] leading-relaxed ${lm ? 'text-slate-500' : 'text-white/32'}`}>
          {game.description}
        </p>
        <div
          className={`mt-2.5 flex items-center gap-1.5 text-[10px] font-medium ${
            lm ? 'text-amber-700' : 'text-amber-200/80'
          }`}
          data-testid={`text-price-${game.id}`}
        >
          <Coins size={12} strokeWidth={1.8} />
          {game.price.toLocaleString()} {game.currency}
        </div>
      </div>
    </article>
  );
}

export default function GameStore({ freeGames, paidGames, lm = false }: GameStoreProps) {
  return (
    <section className="game-store-shell mt-8 space-y-9" data-testid="global-game-store">
      <div data-testid="free-games-section">
        <StoreSectionHeading
          label="Free Games"
          detail={`${freeGames.length} open catalog slots`}
          icon={<Gamepad2 size={16} strokeWidth={1.7} />}
          lm={lm}
        />
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          data-testid="free-games-grid"
        >
          {freeGames.map((game) => <FreeGameCard key={game.id} game={game} lm={lm} />)}
        </div>
      </div>

      <div data-testid="global-store-section">
        <StoreSectionHeading
          label="Global Game Store"
          detail={`${paidGames.length} locked catalog slots`}
          icon={<Orbit size={16} strokeWidth={1.7} />}
          lm={lm}
        />
        <div
          className={`mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] leading-relaxed ${
            lm
              ? 'border-violet-200 bg-violet-50/70 text-violet-800'
              : 'border-violet-300/15 bg-violet-400/[0.06] text-violet-100/65'
          }`}
          data-testid="status-global-store-locked"
        >
          <LockKeyhole size={14} className="mt-0.5 shrink-0" strokeWidth={1.7} />
          <span>Store inventory is locked for Sprint 1. Prices are catalog placeholders; no purchases or wallet changes are active.</span>
        </div>
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          data-testid="paid-games-grid"
        >
          {paidGames.map((game) => <LockedGameCard key={game.id} game={game} lm={lm} />)}
        </div>
      </div>

      <div data-testid="premium-games-section">
        <StoreSectionHeading
          label="Premium Games"
          detail="Awaiting first release"
          icon={<Sparkles size={16} strokeWidth={1.7} />}
          lm={lm}
        />
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
            Curated releases will appear here when the collection opens.
          </p>
        </div>
      </div>
    </section>
  );
}
