import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Database, Orbit, Search, Telescope, RotateCw, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getAstronomySearchQueryKey, useAstronomySearch, type AstronomyObject as ApiAstronomyObject } from '@workspace/api-client-react';
import {
  ASTRONOMY_CATEGORIES,
  getAstronomyCategory,
  type AstronomyCategory,
} from '../data/astronomy';
import { ASTRONOMY_PROVIDER_DESCRIPTORS } from '../services/astronomyProvider';

type CosmicAtlasProps = {
  lm?: boolean;
  standalone?: boolean;
  categorySlug?: string;
};

function queryFromLocation(location: string): string {
  const query = location.split('?')[1] ?? '';
  return new URLSearchParams(query).get('query') ?? '';
}

function queryFromBrowserUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('query') ?? '';
}

function categoryFromLocation(location: string): AstronomyCategory {
  const routePath = location.split('?')[0];
  const slug = routePath.startsWith('/atlas/')
    ? routePath.slice('/atlas/'.length).split('/')[0]
    : undefined;
  return getAstronomyCategory(slug);
}

export default function CosmicAtlas({ lm = false, standalone = false, categorySlug }: CosmicAtlasProps) {
  const [location, setLocation] = useLocation();
  const [searchValue, setSearchValue] = useState(() => queryFromLocation(location) || queryFromBrowserUrl());
  const [submittedQuery, setSubmittedQuery] = useState(() => queryFromLocation(location) || queryFromBrowserUrl());
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loadedItems, setLoadedItems] = useState<ApiAstronomyObject[]>([]);
  const routeCategory = categoryFromLocation(location);
  const activeCategory = categorySlug ? getAstronomyCategory(categorySlug) : routeCategory;
  const routePath = location.split('?')[0];

  useEffect(() => {
    const nextQuery = submittedQuery.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(nextQuery), 350);
    return () => window.clearTimeout(timer);
  }, [submittedQuery]);

  useEffect(() => {
    setPage(1);
    setLoadedItems([]);
  }, [debouncedQuery, activeCategory.id]);

  const astronomySearch = useAstronomySearch(
    {
      q: debouncedQuery,
      category: activeCategory.id,
      cursor: String(page),
      pageSize: 12,
    },
    {
      query: {
        queryKey: getAstronomySearchQueryKey({
          q: debouncedQuery,
          category: activeCategory.id,
          cursor: String(page),
          pageSize: 12,
        }),
        enabled: debouncedQuery.length >= 2,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
      },
    },
  );

  useEffect(() => {
    if (!astronomySearch.data) return;
    setLoadedItems(current => {
      if (page === 1) return astronomySearch.data.items;
      const known = new Set(current.map(item => item.id));
      return [...current, ...astronomySearch.data.items.filter(item => !known.has(item.id))];
    });
  }, [astronomySearch.data, page]);

  useEffect(() => {
    const syncBrowserQuery = () => {
      const nextQuery = queryFromLocation(location) || queryFromBrowserUrl();
      setSearchValue(nextQuery);
      setSubmittedQuery(nextQuery);
    };
    syncBrowserQuery();
    window.addEventListener('popstate', syncBrowserQuery);
    return () => window.removeEventListener('popstate', syncBrowserQuery);
  }, [location]);

  const availableProviderCount = useMemo(
    () => ASTRONOMY_PROVIDER_DESCRIPTORS.filter(provider => provider.status === 'available').length,
    [],
  );

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchValue.trim();
    if (!nextQuery) {
      setSubmittedQuery('');
      setLocation(activeCategory.route);
      return;
    }
    setPage(1);
    setLoadedItems([]);
    setSubmittedQuery(nextQuery);
    setLocation(`${activeCategory.route}?query=${encodeURIComponent(nextQuery)}`);
  };

  const categoryRoute = (category: AstronomyCategory) =>
    category.id === 'universe' ? '/atlas' : category.route;

  return (
    <section
      className={`cosmic-atlas-surface ${lm ? 'is-light' : ''} ${standalone ? 'is-standalone' : ''}`}
      aria-labelledby="cosmic-atlas-title"
      data-testid="section-cosmic-atlas"
    >
      <div className="cosmic-atlas-shell">
        <header className="cosmic-atlas-topbar">
          <div className="cosmic-atlas-wordmark">
            <Orbit size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Cosmic Ocean / Atlas</span>
          </div>
          <span className="cosmic-atlas-index" data-testid="text-atlas-route">
            {activeCategory.id === 'universe' ? 'Foundation / 01' : `Index / ${activeCategory.label}`}
          </span>
        </header>

        <div className="cosmic-atlas-hero">
          <div className="cosmic-atlas-hero-copy">
            <p className="cosmic-atlas-eyebrow">
              <span aria-hidden="true" />
              Part 01 / Data foundation
            </p>
            <h1 id="cosmic-atlas-title" data-testid="text-atlas-title">
              THE COSMIC{' '}<br /><em>ATLAS</em>
            </h1>
            <p className="cosmic-atlas-subtitle" data-testid="text-atlas-subtitle">
              Explore the universe, one discovery at a time.
            </p>
            <p className="cosmic-atlas-description">
              Discover stars, galaxies, exoplanets, nebulae, black holes, missions and other
              astronomical objects through real scientific data.
            </p>
          </div>

          <div className="cosmic-atlas-signal" aria-label="Atlas connection status">
            <div className="cosmic-atlas-signal-orbit" aria-hidden="true">
              <span className="cosmic-atlas-signal-core" />
              <span className="cosmic-atlas-signal-ring cosmic-atlas-signal-ring-one" />
              <span className="cosmic-atlas-signal-ring cosmic-atlas-signal-ring-two" />
            </div>
            <div className="cosmic-atlas-signal-copy">
              <span>Atlas signal</span>
              <strong>{astronomySearch.isFetching ? 'Archive query in flight' : 'Scientific archives online'}</strong>
              <small>Server-owned sources · cached 10 min</small>
            </div>
          </div>
        </div>

        <form className="cosmic-atlas-search" onSubmit={handleSearch} role="search">
          <label htmlFor="cosmic-atlas-search-input">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Search the universe...</span>
          </label>
          <input
            id="cosmic-atlas-search-input"
            type="search"
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            placeholder="Search the universe..."
            autoComplete="off"
            data-testid="input-atlas-search"
          />
          <button type="submit" data-testid="button-atlas-search">
              <span>Search archives</span>
            <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </form>

        {submittedQuery && (
          <div className="cosmic-atlas-search-status" role="status" data-testid="status-atlas-search">
            <span className="cosmic-atlas-status-dot" aria-hidden="true" />
            <span>
              {astronomySearch.isFetching
                ? <>Searching authoritative archives for <strong>“{submittedQuery}”</strong>…</>
                : <>Archive results for <strong>“{submittedQuery}”</strong></>}
            </span>
            <button
              type="button"
              onClick={() => setLocation(activeCategory.route)}
              data-testid="button-atlas-clear-search"
            >
              Clear
            </button>
          </div>
        )}

        <nav className="cosmic-atlas-category-nav" aria-label="Atlas categories">
          <div className="cosmic-atlas-section-heading">
            <p className="cosmic-atlas-eyebrow">
              <span aria-hidden="true" />
              Navigate the index
            </p>
            <span>{ASTRONOMY_CATEGORIES.length} pathways staged</span>
          </div>
          <div className="cosmic-atlas-category-scroll">
            {ASTRONOMY_CATEGORIES.map(category => {
              const isActive = activeCategory.id === category.id;
              return (
                <Link
                  key={category.id}
                  href={categoryRoute(category)}
                  className={`cosmic-atlas-category-chip ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`link-atlas-category-${category.id}`}
                >
                  <span>{category.label}</span>
                  <small>{isActive ? 'Open' : category.status === 'connecting' ? 'Live' : 'Index'}</small>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="cosmic-atlas-foundation-grid">
          <section className="cosmic-atlas-discovery-panel" aria-labelledby="atlas-discovery-title">
            <div className="cosmic-atlas-panel-icon" aria-hidden="true">
              <Telescope size={19} strokeWidth={1.4} />
            </div>
            <div>
              <p className="cosmic-atlas-eyebrow">
                <span aria-hidden="true" />
                Discovery index
              </p>
              <h2 id="atlas-discovery-title" data-testid="text-atlas-discovery-title">
                {activeCategory.label} <em>archive</em>
              </h2>
              <p data-testid="text-atlas-discovery-state">
                {debouncedQuery.length < 2
                  ? 'Ready / Awaiting a scientific query'
                  : astronomySearch.isLoading
                    ? 'Loading / Querying source archives'
                    : astronomySearch.isError
                      ? 'Unavailable / Provider retry required'
                      : loadedItems.length > 0
                        ? `${loadedItems.length} records / Source-labeled results`
                        : 'No records / Search returned empty'}
              </p>
              <span className="cosmic-atlas-panel-note">
                Results are fetched on demand from authoritative archives. Missing measurements remain
                Not available.
              </span>
            </div>
          </section>

          <aside className="cosmic-atlas-provider-panel" aria-labelledby="atlas-provider-title">
            <div className="cosmic-atlas-panel-icon" aria-hidden="true">
              <Database size={18} strokeWidth={1.4} />
            </div>
            <div>
              <p className="cosmic-atlas-eyebrow">
                <span aria-hidden="true" />
                Source architecture
              </p>
              <h2 id="atlas-provider-title" data-testid="text-atlas-provider-title">
                 {availableProviderCount} providers <em>online</em>
              </h2>
              <p className="cosmic-atlas-panel-note">
                NASA Exoplanet Archive, SIMBAD and NASA's official media archive feed the normalized
                object contract. Other provider paths remain explicitly unavailable until connected.
              </p>
              <span className="cosmic-atlas-provider-status">
                <span aria-hidden="true" />
                Provider interface ready
              </span>
            </div>
          </aside>
        </div>

        {debouncedQuery.length >= 2 && (
          <section className="cosmic-atlas-results" aria-labelledby="atlas-results-title">
            <div className="cosmic-atlas-results-heading">
              <div>
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" />Live archive response</p>
                <h2 id="atlas-results-title">Scientific <em>records</em></h2>
              </div>
              <div className="cosmic-atlas-source-list" aria-label="Sources">
                {(astronomySearch.data?.sourceStatus ?? []).map(status => (
                  <span key={status.source} className={status.status === 'ready' ? 'is-ready' : 'is-unavailable'}>
                    <i aria-hidden="true" />{status.source}
                  </span>
                ))}
              </div>
            </div>

            {astronomySearch.isLoading && (
              <div className="cosmic-atlas-result-grid" aria-label="Loading astronomical records">
                {[0, 1, 2].map(index => <div key={index} className="cosmic-atlas-result-skeleton" />)}
              </div>
            )}

            {astronomySearch.isError && !astronomySearch.isLoading && (
              <div className="cosmic-atlas-state-panel" role="alert">
                <strong>Scientific data temporarily unavailable.</strong>
                <span>The archive request did not complete.</span>
                <button type="button" onClick={() => astronomySearch.refetch()}>
                  <RotateCw size={13} aria-hidden="true" /> Retry
                </button>
              </div>
            )}

            {!astronomySearch.isLoading && !astronomySearch.isError && loadedItems.length === 0 && (
              <div className="cosmic-atlas-state-panel">
                <strong>No astronomical objects found.</strong>
                <span>Try a catalog name, object name, host star, or mission.</span>
              </div>
            )}

            {loadedItems.length > 0 && (
              <div className="cosmic-atlas-result-grid">
                {loadedItems.map(item => (
                  <Link
                    key={item.id}
                    href={`/atlas/object/${encodeURIComponent(item.id)}`}
                    className="cosmic-atlas-result-card"
                    data-testid={`link-atlas-object-${item.id}`}
                  >
                    <div className="cosmic-atlas-result-card-top">
                      <span>{item.source}</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </div>
                    <h3>{item.name}</h3>
                    <p>{item.description || 'Not available'}</p>
                    <dl>
                      <div><dt>Type</dt><dd>{item.type || 'Not available'}</dd></div>
                      <div><dt>Distance</dt><dd>{item.distance?.value != null ? `${item.distance.value} ${item.distance.unit ?? ''}` : 'Not available'}</dd></div>
                    </dl>
                  </Link>
                ))}
              </div>
            )}

            {loadedItems.length > 0 && astronomySearch.data?.hasMore && (
              <button
                type="button"
                className="cosmic-atlas-load-more"
                disabled={astronomySearch.isFetching}
                onClick={() => setPage(current => current + 1)}
              >
                {astronomySearch.isFetching ? 'Loading next archive page…' : 'Load next archive page'}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            )}
          </section>
        )}

        {standalone && (
          <Link href="/" className="cosmic-atlas-return" data-testid="link-atlas-return">
            <span>Return to Cosmic Ocean</span>
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        )}

        <p className="cosmic-atlas-route-hint" aria-live="polite">
          {routePath === '/atlas' ? 'Atlas home / foundation state' : `${activeCategory.route} / foundation state`}
        </p>
      </div>
    </section>
  );
}