import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Orbit,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { GameItem } from '../../data/gameCatalog';

type CatalogGame = GameItem & {
  playableUrl?: string;
};

type GameStoreProps = {
  /**
   * `catalog` is the preferred integration prop. The legacy arrays remain
   * accepted so the surrounding Cosmos shell can migrate without a breaking
   * change.
   */
  catalog?: CatalogGame[];
  games?: CatalogGame[];
  freeGames?: CatalogGame[];
  lm?: boolean;
};

const CATALOG_LIMIT = 100;

function themeClasses(lm: boolean) {
  return lm
    ? {
        ink: 'text-[#24304a]',
        muted: 'text-[#68758b]',
        faint: 'text-[#8792a4]',
        line: 'border-[#d9deea]',
        panel: 'border-[#dfe4ef] bg-[#fbfcfe]',
        panelStrong: 'border-[#cfd7e7] bg-white',
        accent: 'text-[#087f85]',
        accentSurface: 'border-[#b9e2e1] bg-[#effafa]',
        button: 'border-[#087f85] bg-[#087f85] text-white hover:bg-[#056b70]',
      }
    : {
        ink: 'text-white/[0.92]',
        muted: 'text-white/[0.56]',
        faint: 'text-white/[0.34]',
        line: 'border-white/[0.11]',
        panel: 'border-white/[0.1] bg-white/[0.045]',
        panelStrong: 'border-white/[0.15] bg-white/[0.075]',
        accent: 'text-[#83d9d4]',
        accentSurface: 'border-[#83d9d4]/20 bg-[#83d9d4]/[0.07]',
        button: 'border-[#83d9d4]/45 bg-[#83d9d4]/[0.13] text-[#c9fffa] hover:bg-[#83d9d4]/[0.22]',
      };
}

function StoreHeading({ lm, count }: { lm: boolean; count: number }) {
  const theme = themeClasses(lm);

  return (
    <header className="mb-5 flex flex-col gap-4 border-b border-current/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className={`mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] ${theme.accent}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          Cosmic Ocean · browser arcade
        </div>
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${theme.accentSurface} ${theme.accent}`}>
            <Gamepad2 size={18} strokeWidth={1.7} />
          </span>
          <div>
            <h2
              className={`text-2xl font-light tracking-[-0.055em] sm:text-[2.15rem] ${theme.ink}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}
              data-testid="heading-free-games"
            >
              Free games, ready to play
            </h2>
            <p className={`mt-1 text-[11px] leading-relaxed ${theme.muted}`}>
              Open-source browser experiments for a quiet orbit break.
            </p>
          </div>
        </div>
      </div>
      <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] ${theme.faint}`} data-testid="text-free-games-detail">
        <Orbit size={13} strokeWidth={1.5} className={theme.accent} />
        {count} games · MIT verified
      </div>
    </header>
  );
}

function GameThumbnail({ game, lm, index }: { game: CatalogGame; lm: boolean; index: number }) {
  const theme = themeClasses(lm);

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-[#111827]">
      <img
        src={game.thumbnail}
        alt=""
        loading={index < 6 ? 'eager' : 'lazy'}
        className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.045]"
        data-testid={`img-game-thumbnail-${game.id}`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          lm ? 'from-[#24304a]/55 via-transparent to-transparent' : 'from-[#070a12]/85 via-transparent to-transparent'
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${
          lm ? 'border-white/70 bg-white/85 text-[#24304a]' : 'border-white/20 bg-[#070a12]/45 text-white/80 backdrop-blur-md'
        }`}
        data-testid={`badge-free-game-${game.id}`}
      >
        <Check size={10} strokeWidth={2.2} />
        Free to play
      </span>
      <span className={`absolute bottom-3 right-3 font-mono text-[9px] tracking-[0.14em] ${lm ? 'text-white/80' : 'text-white/55'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  );
}

function GameCard({ game, index, lm, onPlay }: { game: CatalogGame; index: number; lm: boolean; onPlay: (game: CatalogGame) => void }) {
  const theme = themeClasses(lm);
  const playableUrl = game.playableUrl;
  const sourceLabel = `${game.license} verified · source linked`;

  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-[1.15rem] border transition-transform duration-300 hover:-translate-y-1 ${theme.panel}`}
      data-testid={`card-free-game-${game.id}`}
    >
      <GameThumbnail game={game} lm={lm} index={index} />
      <div className="flex min-h-[188px] flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3
            className={`min-w-0 text-[15px] font-medium leading-tight tracking-[-0.025em] ${theme.ink}`}
            data-testid={`text-game-title-${game.id}`}
          >
            {game.title}
          </h3>
          <span className={`shrink-0 pt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] ${theme.accent}`} data-testid={`text-game-category-${game.id}`}>
            {game.category}
          </span>
        </div>
        <p className={`line-clamp-3 text-[11px] leading-[1.55] ${theme.muted}`} data-testid={`text-game-description-${game.id}`}>
          {game.description}
        </p>
        <div className={`mt-auto border-t pt-3 ${theme.line}`}>
          <div className={`mb-3 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] ${theme.faint}`} data-testid={`badge-mit-source-${game.id}`}>
            <BadgeCheck size={12} strokeWidth={1.8} className={theme.accent} />
            {sourceLabel}
          </div>
          <button
            type="button"
            onClick={() => onPlay(game)}
            disabled={!playableUrl}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${theme.button}`}
            data-testid={`button-play-game-${game.id}`}
          >
            <Gamepad2 size={14} strokeWidth={1.8} />
            Play
            <ArrowUpRight size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyCatalog({ lm, query, category }: { lm: boolean; query: string; category: string }) {
  const theme = themeClasses(lm);

  return (
    <div className={`col-span-full flex min-h-[240px] flex-col items-center justify-center rounded-[1.15rem] border border-dashed px-6 py-12 text-center ${theme.line} ${theme.panel}`} data-testid="empty-game-catalog">
      <span className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl border ${theme.accentSurface} ${theme.accent}`}>
        <Search size={17} strokeWidth={1.7} />
      </span>
      <h3 className={`text-lg font-light tracking-[-0.035em] ${theme.ink}`} data-testid="text-empty-game-catalog">
        No games in this orbit
      </h3>
      <p className={`mt-1 max-w-xs text-[11px] leading-relaxed ${theme.muted}`}>
        Nothing matches {query ? `"${query}"` : 'the selected category'}. Try another signal.
      </p>
      <span className={`mt-4 font-mono text-[9px] uppercase tracking-[0.14em] ${theme.faint}`}>
        {category === 'All' ? 'Adjust your search' : 'Return to all categories'}
      </span>
    </div>
  );
}

export default function GameStore({ catalog, games: legacyGames, freeGames = [], lm = false }: GameStoreProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const theme = themeClasses(lm);

  const games = useMemo(() => {
    const sourceCatalog = catalog ?? legacyGames ?? freeGames;
    return sourceCatalog.slice(0, CATALOG_LIMIT);
  }, [catalog, freeGames, legacyGames]);
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(games.map(game => game.category))).sort((a, b) => a.localeCompare(b))],
    [games],
  );
  const visibleGames = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return games.filter(game => {
      const matchesCategory = category === 'All' || game.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${game.title} ${game.description} ${game.category}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, games, query]);

  const handlePlay = (game: CatalogGame) => {
    const playableUrl = game.playableUrl;
    if (!playableUrl) return;
    window.open(playableUrl, '_blank', 'noopener,noreferrer');
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('All');
  };

  return (
    <section className="game-store-shell mt-8" data-testid="global-game-store">
      <StoreHeading lm={lm} count={games.length} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-[420px]">
          <Search size={15} strokeWidth={1.8} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.faint}`} />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search the game constellation"
            className={`min-h-11 w-full rounded-xl border bg-transparent py-2.5 pl-10 pr-10 text-[12px] outline-none transition-colors focus:border-[#83d9d4]/55 ${
              lm ? 'placeholder:text-[#9aa5b5]' : 'placeholder:text-white/30'
            } ${theme.line} ${theme.ink}`}
            aria-label="Search games"
            data-testid="input-search-games"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={`absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg ${theme.muted}`}
              aria-label="Clear game search"
              data-testid="button-clear-game-search"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] lg:hidden ${theme.panelStrong} ${theme.muted}`}
          aria-expanded={filtersOpen}
          data-testid="button-toggle-game-filters"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={14} strokeWidth={1.7} />
            Category
          </span>
          <ChevronDown size={14} strokeWidth={1.7} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`flex-wrap gap-2 overflow-x-auto pb-1 lg:flex ${filtersOpen ? 'flex' : 'hidden'}`} data-testid="game-category-filters">
          {categories.map(item => {
            const active = category === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => {
                  setCategory(item);
                  setFiltersOpen(false);
                }}
                className={`min-h-10 shrink-0 rounded-full border px-3.5 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? `${theme.accentSurface} ${theme.accent}`
                    : `${theme.line} ${theme.muted} ${lm ? 'hover:border-[#087f85]' : 'hover:border-[#83d9d4]/45'}`
                }`}
                aria-pressed={active}
                data-testid={`button-category-${item.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`mb-4 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.12em] ${theme.faint}`}>
        <span data-testid="text-visible-game-count">
          Showing {visibleGames.length} of {games.length}
        </span>
        {(query || category !== 'All') && (
          <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 ${theme.accent}`} data-testid="button-reset-game-filters">
            <X size={11} strokeWidth={1.8} />
            Reset view
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="free-games-grid">
        {visibleGames.length ? (
          visibleGames.map((game, index) => <GameCard key={game.id} game={game} index={index} lm={lm} onPlay={handlePlay} />)
        ) : (
          <EmptyCatalog lm={lm} query={query} category={category} />
        )}
      </div>

      <footer className={`mt-7 flex flex-col gap-2 border-t pt-4 font-mono text-[9px] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between ${theme.line} ${theme.faint}`}>
        <span className="flex items-center gap-2">
          <ExternalLink size={12} strokeWidth={1.5} className={theme.accent} />
          Browser play · new tab
        </span>
        <span>Verified open-source constellation</span>
      </footer>
    </section>
  );
}