/**
 * Shared advanced-search parsing and local persistence helpers.
 *
 * The visible query remains unchanged. Operators are extracted into structured
 * filters so the existing search results surface can keep its current layout.
 */

export type AdvancedArticleType = '' | 'article' | 'paper';

export interface AdvancedSearchFilters {
  yearFrom: string;
  yearTo: string;
  source: string;
  openAccess: boolean;
  type: AdvancedArticleType;
  language: string;
  author?: string;
  title?: string;
}

export interface ParsedSearchQuery {
  text: string;
  filters: Partial<AdvancedSearchFilters>;
  operators: string[];
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters: AdvancedSearchFilters;
  timestamp: number;
  pinned: boolean;
}

export interface SavedSearch {
  id: string;
  query: string;
  filters: AdvancedSearchFilters;
  timestamp: number;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedSearchFilters = {
  yearFrom: '',
  yearTo: '',
  source: '',
  openAccess: false,
  type: '',
  language: '',
};

const OPERATOR_PATTERN = /\b(author|year|source|type|title):(?:"([^"]+)"|'([^']+)'|([^\s]+))/gi;

function cleanValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function parseYear(value: string): Partial<Pick<AdvancedSearchFilters, 'yearFrom' | 'yearTo'>> {
  const match = value.match(/^(\d{4})(?:[-:](\d{4}))?$/);
  if (!match) return {};
  return {
    yearFrom: match[1],
    yearTo: match[2] ?? match[1],
  };
}

function normalizeSource(value: string): string {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');
  const aliases: Record<string, string> = {
    europepmc: 'europepmc',
    europepmcsource: 'europepmc',
    wiki: 'wikipedia',
    wikidata: 'wikidata',
    pubmed: 'pubmed',
    openalex: 'openalex',
  };
  return aliases[normalized] ?? value.toLowerCase().trim();
}

function normalizeType(value: string): AdvancedArticleType {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'article') return 'article';
  if (normalized === 'paper' || normalized === 'research') return 'paper';
  return '';
}

/**
 * Parses author:, year:, source:, type:, and title: operators.
 * Unknown or malformed operators remain in the visible/free-text query.
 */
export function parseAdvancedQuery(query: string): ParsedSearchQuery {
  const filters: Partial<AdvancedSearchFilters> = {};
  const operators: string[] = [];
  const consumed: Array<{ start: number; end: number }> = [];

  for (const match of query.matchAll(OPERATOR_PATTERN)) {
    const [, operator, quotedValue, singleQuotedValue, bareValue] = match;
    const value = cleanValue(quotedValue ?? singleQuotedValue ?? bareValue ?? '');
    if (!value) continue;

    const normalizedOperator = operator.toLowerCase();
    if (normalizedOperator === 'author') filters.author = value;
    if (normalizedOperator === 'title') filters.title = value;
    if (normalizedOperator === 'year') Object.assign(filters, parseYear(value));
    if (normalizedOperator === 'source') filters.source = normalizeSource(value);
    if (normalizedOperator === 'type') filters.type = normalizeType(value);

    if (
      normalizedOperator === 'author' ||
      normalizedOperator === 'title' ||
      normalizedOperator === 'year' ||
      normalizedOperator === 'source' ||
      normalizedOperator === 'type'
    ) {
      operators.push(`${normalizedOperator}:${value}`);
      consumed.push({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
    }
  }

  let cursor = 0;
  const freeText = consumed
    .sort((a, b) => a.start - b.start)
    .map(({ start, end }) => {
      const segment = query.slice(cursor, start);
      cursor = end;
      return segment;
    })
    .concat(query.slice(cursor))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { text: freeText, filters, operators };
}

export function mergeAdvancedFilters(
  parsed: Partial<AdvancedSearchFilters>,
  panel: AdvancedSearchFilters,
): AdvancedSearchFilters {
  return {
    ...DEFAULT_ADVANCED_FILTERS,
    ...panel,
    ...parsed,
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse<SearchHistoryEntry[]>(window.localStorage.getItem('cosmos.search.history'), [])
    .filter((entry) => entry && typeof entry.query === 'string')
    .slice(0, 20);
}

export function saveSearchHistory(entries: SearchHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('cosmos.search.history', JSON.stringify(entries.slice(0, 20)));
}

export function loadSavedSearches(): SavedSearch[] {
  if (typeof window === 'undefined') return [];
  return safeParse<SavedSearch[]>(window.localStorage.getItem('cosmos.search.saved'), [])
    .filter((entry) => entry && typeof entry.query === 'string')
    .slice(0, 20);
}

export function saveSavedSearches(entries: SavedSearch[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('cosmos.search.saved', JSON.stringify(entries.slice(0, 20)));
}