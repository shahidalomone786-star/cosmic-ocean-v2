import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  Orbit,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  getAstronomySearchQueryKey,
  getAstronomySuggestionsQueryKey,
  useAstronomySearch,
  useAstronomySuggestions,
  type AstronomyObject as ApiAstronomyObject,
  type AstronomySearchParams,
} from '@workspace/api-client-react';
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
  return new URLSearchParams(query).get('query') ?? new URLSearchParams(query).get('q') ?? '';
}

function queryFromBrowserUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('query') ?? '';
}

function filtersFromLocation(location: string): FilterState {
  const params = new URLSearchParams(location.split('?')[1] ?? '');
  return {
    source: (params.get('source') as FilterState['source']) ?? '',
    objectType: params.get('objectType') ?? '',
    minDistance: params.get('minDistance') ?? '',
    maxDistance: params.get('maxDistance') ?? '',
    discoveryYear: params.get('discoveryYear') ?? '',
    observationSource: params.get('observationSource') ?? '',
  };
}

function categoryFromLocation(location: string): AstronomyCategory {
  const routePath = location.split('?')[0];
  const slug = routePath.startsWith('/atlas/')
    ? routePath.slice('/atlas/'.length).split('/')[0]
    : undefined;
  return getAstronomyCategory(slug);
}

type FilterState = {
  source: AstronomySearchParams['source'] | '';
  objectType: string;
  minDistance: string;
  maxDistance: string;
  discoveryYear: string;
  observationSource: string;
};

const EMPTY_FILTERS: FilterState = {
  source: '',
  objectType: '',
  minDistance: '',
  maxDistance: '',
  discoveryYear: '',
  observationSource: '',
};

const FILTER_LABELS: Array<[keyof FilterState, string]> = [
  ['source', 'Provider'],
  ['objectType', 'Object type'],
  ['minDistance', 'Min distance'],
  ['maxDistance', 'Max distance'],
  ['discoveryYear', 'Discovery year'],
  ['observationSource', 'Observation source'],
];

function readRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem('cosmic-atlas-recent-searches') ?? '[]');
    return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

function formatDistance(item: ApiAstronomyObject): string {
  if (item.distance?.value == null) return 'Not available';
  return `${item.distance.value} ${item.distance.unit ?? ''}`.trim();
}

export default function CosmicAtlas({ lm = false, standalone = false, categorySlug }: CosmicAtlasProps) {
  const [location, setLocation] = useLocation();
  const [searchValue, setSearchValue] = useState(() => queryFromLocation(location) || queryFromBrowserUrl());
  const [submittedQuery, setSubmittedQuery] = useState(() => queryFromLocation(location) || queryFromBrowserUrl());
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debouncedSuggestionQuery, setDebouncedSuggestionQuery] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [loadedItems, setLoadedItems] = useState<ApiAstronomyObject[]>([]);
  const [filters, setFilters] = useState<FilterState>(() => filtersFromLocation(location));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const routeCategory = categoryFromLocation(location);
  const activeCategory = categorySlug ? getAstronomyCategory(categorySlug) : routeCategory;
  const routePath = location.split('?')[0];

  useEffect(() => {
    const nextQuery = submittedQuery.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(nextQuery), 350);
    return () => window.clearTimeout(timer);
  }, [submittedQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSuggestionQuery(searchValue.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    setCursor(undefined);
    setLoadedItems([]);
  }, [debouncedQuery, activeCategory.id, filters.source, filters.objectType, filters.minDistance, filters.maxDistance, filters.discoveryYear, filters.observationSource]);

  const searchParams = useMemo<AstronomySearchParams>(() => ({
    q: debouncedQuery,
    category: activeCategory.id,
    ...(cursor ? { cursor } : {}),
    pageSize: 12,
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.objectType ? { objectType: filters.objectType } : {}),
    ...(filters.minDistance ? { minDistance: Number(filters.minDistance) } : {}),
    ...(filters.maxDistance ? { maxDistance: Number(filters.maxDistance) } : {}),
    ...(filters.discoveryYear ? { discoveryYear: Number(filters.discoveryYear) } : {}),
    ...(filters.observationSource ? { observationSource: filters.observationSource } : {}),
  }), [activeCategory.id, cursor, debouncedQuery, filters]);

  const astronomySearch = useAstronomySearch(
    searchParams,
    {
      query: {
        queryKey: getAstronomySearchQueryKey(searchParams),
        enabled: debouncedQuery.length >= 2,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
      },
    },
  );

  const suggestionParams = useMemo(() => ({ q: debouncedSuggestionQuery, category: activeCategory.id }), [activeCategory.id, debouncedSuggestionQuery]);
  const astronomySuggestions = useAstronomySuggestions(
    suggestionParams,
    {
      query: {
        queryKey: getAstronomySuggestionsQueryKey(suggestionParams),
        enabled: suggestionsOpen && suggestionParams.q.length >= 2,
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  );

  useEffect(() => {
    if (!astronomySearch.data) return;
    setLoadedItems(current => {
      if (!cursor) return astronomySearch.data.items;
      const known = new Set(current.map(item => item.id));
      return [...current, ...astronomySearch.data.items.filter(item => !known.has(item.id))];
    });
  }, [astronomySearch.data, cursor]);

  useEffect(() => {
    const syncBrowserQuery = () => {
      const nextQuery = queryFromLocation(location) || queryFromBrowserUrl();
      setSearchValue(nextQuery);
      setSubmittedQuery(nextQuery);
      setFilters(filtersFromLocation(location));
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
    setSuggestionsOpen(false);
    if (!nextQuery) {
      setSubmittedQuery('');
      setSearchValue('');
      setFilters(EMPTY_FILTERS);
      setLocation(activeCategory.route);
      return;
    }
    setCursor(undefined);
    setLoadedItems([]);
    setSubmittedQuery(nextQuery);
    setRecentSearches(current => {
      const next = [nextQuery, ...current.filter(value => value.toLowerCase() !== nextQuery.toLowerCase())].slice(0, 5);
      window.localStorage.setItem('cosmic-atlas-recent-searches', JSON.stringify(next));
      return next;
    });
    setLocation(`${activeCategory.route}?query=${encodeURIComponent(nextQuery)}`);
  };

  const selectSuggestion = (value: string, objectId?: string, kind?: string) => {
    setSearchValue(value);
    setSuggestionsOpen(false);
    if (objectId && kind !== 'type') {
      const currentUrl = typeof window === 'undefined'
        ? location
        : `${window.location.pathname}${window.location.search}`;
      setLocation(`/atlas/object/${encodeURIComponent(objectId)}?returnTo=${encodeURIComponent(currentUrl)}`);
      return;
    }
    setSubmittedQuery(value);
    setCursor(undefined);
    setLocation(`${activeCategory.route}?query=${encodeURIComponent(value)}`);
  };

  const updateFilter = (key: keyof FilterState, value: string) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      Object.entries(nextFilters).forEach(([filterKey, filterValue]) => {
        if (filterValue) params.set(filterKey, filterValue);
        else params.delete(filterKey);
      });
      const queryString = params.toString();
      window.history.replaceState(window.history.state, '', `${activeCategory.route}${queryString ? `?${queryString}` : ''}`);
    }
    setCursor(undefined);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      FILTER_LABELS.forEach(([key]) => params.delete(key));
      const queryString = params.toString();
      window.history.replaceState(window.history.state, '', `${activeCategory.route}${queryString ? `?${queryString}` : ''}`);
    }
    setCursor(undefined);
  };

  const categoryRoute = (category: AstronomyCategory) =>
    category.id === 'universe' ? '/atlas' : category.route;

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const suggestions = astronomySuggestions.data?.suggestions ?? [];
  const availableSources = ASTRONOMY_PROVIDER_DESCRIPTORS.filter(provider => provider.status === 'available');
  const supportedFilters = {
    source: true,
    objectType: loadedItems.length > 0,
    distance: loadedItems.some(item => item.distance?.value != null),
    discoveryYear: loadedItems.some(item => item.metadata.discoveryYear != null),
    observationSource: loadedItems.some(item => ['discoveryFacility', 'center', 'observationSource'].some(key => item.metadata[key])),
  };

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

        <form className="cosmic-atlas-search cosmic-atlas-search-enhanced" onSubmit={handleSearch} role="search">
          <label htmlFor="cosmic-atlas-search-input">
            <Search size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Search the universe...</span>
          </label>
          <input
            id="cosmic-atlas-search-input"
            type="search"
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            onFocus={() => setSuggestionsOpen(true)}
            placeholder="Search the universe..."
            autoComplete="off"
            data-testid="input-atlas-search"
          />
          <button type="submit" data-testid="button-atlas-search">
            <span>Search archives</span>
            <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
          {suggestionsOpen && searchValue.trim().length >= 2 && (
            <div className="cosmic-atlas-suggestion-popover" role="listbox" aria-label="Archive suggestions">
              <div className="cosmic-atlas-suggestion-heading">
                <span><Sparkles size={12} aria-hidden="true" /> Provider-backed suggestions</span>
                {astronomySuggestions.isFetching && <span>Updating</span>}
              </div>
              {suggestions.length > 0 ? suggestions.map(suggestion => (
                <button
                  key={`${suggestion.source}-${suggestion.objectId}-${suggestion.value}`}
                  type="button"
                  className="cosmic-atlas-suggestion"
                  onMouseDown={event => event.preventDefault()}
                   onClick={() => selectSuggestion(suggestion.value, suggestion.objectId, suggestion.kind)}
                  role="option"
                  data-testid={`button-atlas-suggestion-${suggestion.objectId}`}
                >
                  <span className="cosmic-atlas-suggestion-kind">{suggestion.kind}</span>
                  <span><strong>{suggestion.label}</strong><small>{suggestion.source} / {suggestion.objectId}</small></span>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </button>
              )) : !astronomySuggestions.isFetching && (
                <div className="cosmic-atlas-suggestion-empty">No provider suggestions for this query.</div>
              )}
            </div>
          )}
        </form>
        {suggestionsOpen && (
          <button type="button" className="cosmic-atlas-search-dismiss" onClick={() => setSuggestionsOpen(false)} aria-label="Close suggestions" data-testid="button-atlas-close-suggestions">
            <X size={14} aria-hidden="true" /> Close suggestions
          </button>
        )}

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

        <section className="cosmic-atlas-query-tools" aria-label="Search tools">
          <div className="cosmic-atlas-recent">
            <div className="cosmic-atlas-tools-label"><Clock3 size={13} aria-hidden="true" /> Recent searches</div>
             {recentSearches.length > 0 ? recentSearches.map(value => (
               <button key={value} type="button" onClick={() => selectSuggestion(value)} data-testid={`button-atlas-recent-${value}`}>
                {value}
              </button>
            )) : <span className="cosmic-atlas-tools-empty">Your archive trail will appear here.</span>}
          </div>
          <button type="button" className={`cosmic-atlas-filter-trigger ${activeFilterCount ? 'has-filters' : ''}`} onClick={() => setFiltersOpen(current => !current)} aria-expanded={filtersOpen} data-testid="button-atlas-filters">
            <SlidersHorizontal size={14} aria-hidden="true" /> Filters {activeFilterCount ? `(${activeFilterCount})` : ''} <Filter size={12} aria-hidden="true" />
          </button>
        </section>

        {filtersOpen && (
          <section className="cosmic-atlas-filter-panel" aria-label="Supported archive filters">
            <div className="cosmic-atlas-filter-header">
              <div>
                <p className="cosmic-atlas-eyebrow"><span aria-hidden="true" /> Supported filters</p>
                <h2>Refine the <em>archive</em></h2>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" data-testid="button-atlas-close-filters"><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="cosmic-atlas-filter-grid">
              {supportedFilters.source && <label><span>{FILTER_LABELS[0][1]}</span><select value={filters.source} onChange={event => updateFilter('source', event.target.value)} data-testid="select-atlas-source"><option value="">All available providers</option>{availableSources.map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}</select></label>}
              {supportedFilters.objectType && <label><span>{FILTER_LABELS[1][1]}</span><input value={filters.objectType} onChange={event => updateFilter('objectType', event.target.value)} placeholder="Use a returned type" list="atlas-object-types" data-testid="input-atlas-object-type" /><datalist id="atlas-object-types">{[...new Set(loadedItems.map(item => item.type).filter(Boolean))].map(type => <option key={type} value={type} />)}</datalist></label>}
              {supportedFilters.distance && <><label><span>{FILTER_LABELS[2][1]}</span><input type="number" min="0" value={filters.minDistance} onChange={event => updateFilter('minDistance', event.target.value)} placeholder="Any" data-testid="input-atlas-min-distance" /></label><label><span>{FILTER_LABELS[3][1]}</span><input type="number" min="0" value={filters.maxDistance} onChange={event => updateFilter('maxDistance', event.target.value)} placeholder="Any" data-testid="input-atlas-max-distance" /></label></>}
              {supportedFilters.discoveryYear && <label><span>{FILTER_LABELS[4][1]}</span><input type="number" min="1000" max="9999" value={filters.discoveryYear} onChange={event => updateFilter('discoveryYear', event.target.value)} placeholder="Returned year" data-testid="input-atlas-discovery-year" /></label>}
              {supportedFilters.observationSource && <label><span>{FILTER_LABELS[5][1]}</span><input value={filters.observationSource} onChange={event => updateFilter('observationSource', event.target.value)} placeholder="Returned facility or archive" data-testid="input-atlas-observation-source" /></label>}
            </div>
            <div className="cosmic-atlas-filter-footer">
              <span><Database size={13} aria-hidden="true" /> Only filters supported by the archive contract are shown.</span>
              <button type="button" onClick={clearFilters} disabled={!activeFilterCount} data-testid="button-atlas-clear-filters">Clear all</button>
            </div>
          </section>
        )}

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
                    {item.imageReferences[0] && <div className="cosmic-atlas-result-card-image"><img src={item.imageReferences[0]} alt="" loading="lazy" /></div>}
                    <h3>{item.name}</h3>
                    <p>{item.description || 'Not available'}</p>
                    <dl>
                      <div><dt>Type</dt><dd>{item.type || 'Not available'}</dd></div>
                      <div><dt>Distance</dt><dd>{formatDistance(item)}</dd></div>
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
                onClick={() => setCursor(astronomySearch.data?.nextCursor ?? undefined)}
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