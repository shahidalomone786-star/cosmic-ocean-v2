import type { Observatory } from '../data/observatories';

const NASA_IMAGES_API = 'https://images-api.nasa.gov/search';
const PAGE_SIZE = 24;
const CACHE_TTL_MS = 10 * 60 * 1000;

type NasaImageData = {
  nasa_id?: string;
  title?: string;
  description?: string;
  date_created?: string;
  center?: string;
  photographer?: string;
  secondary_creator?: string;
  keywords?: string[];
  instrument?: string;
  mission?: string;
  media_type?: string;
};

type NasaImageLink = {
  href?: string;
  rel?: string;
  render?: string;
};

type NasaImageItem = {
  href?: string;
  data?: NasaImageData[];
  links?: NasaImageLink[];
};

type NasaSearchResponse = {
  collection?: {
    items?: NasaImageItem[];
    metadata?: { total_hits?: number };
  };
};

export type ObservatoryArchiveImage = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  mission?: string;
  instrument?: string;
  credit?: string;
  thumbnailUrl: string;
  imageUrl: string;
  sourceUrl: string;
};

export type ObservatoryArchivePage = {
  items: ObservatoryArchiveImage[];
  page: number;
  pageSize: number;
  totalHits: number;
  hasMore: boolean;
  searchTerm: string;
};

type CachedPage = {
  expiresAt: number;
  value: ObservatoryArchivePage;
};

const pageCache = new Map<string, CachedPage>();
const pendingRequests = new Map<string, Promise<ObservatoryArchivePage>>();

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesEvidence(text: string, term: string): boolean {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return false;

  if (/^[a-z0-9]{2,8}$/i.test(term.trim())) {
    return normalizedText.split(' ').includes(normalizedTerm);
  }

  const termTokens = normalizedTerm.split(' ').filter(token => token.length > 2);
  return termTokens.length > 0 && termTokens.every(token => normalizedText.includes(token));
}

function isGenuinelyAssociated(item: NasaImageData, observatory: Observatory): boolean {
  const evidence = [
    item.title,
    item.description,
    item.center,
    item.photographer,
    item.secondary_creator,
    ...(item.keywords || []),
  ].filter(Boolean).join(' ');

  // The first two terms are the mission's proper name and short alias. The
  // broader third term is useful for search fallback but is not strong enough
  // to establish that an image belongs to this observatory.
  return observatory.apiSearchTerms.slice(0, 2).some(term => matchesEvidence(evidence, term));
}

function pickLink(item: NasaImageItem, relation: string): string | undefined {
  return item.links?.find(link => link.rel === relation && link.href)?.href;
}

function toArchiveImage(item: NasaImageItem, observatory: Observatory): ObservatoryArchiveImage | null {
  const data = item.data?.[0];
  const thumbnailUrl = pickLink(item, 'preview');
  const imageUrl = pickLink(item, 'canonical') || pickLink(item, 'alternate');
  if (!data?.nasa_id || !data.title || !thumbnailUrl || !imageUrl || !isGenuinelyAssociated(data, observatory)) {
    return null;
  }

  const credit = [data.photographer, data.secondary_creator, data.center].filter(Boolean).join(' · ');
  return {
    id: data.nasa_id,
    title: data.title,
    description: data.description?.trim() || undefined,
    date: data.date_created || undefined,
    mission: data.mission || undefined,
    instrument: data.instrument || undefined,
    credit: credit || undefined,
    thumbnailUrl,
    imageUrl,
    sourceUrl: item.href || `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
  };
}

async function requestPage(
  observatory: Observatory,
  searchTerm: string,
  page: number,
  signal?: AbortSignal,
): Promise<ObservatoryArchivePage> {
  const url = new URL(NASA_IMAGES_API);
  url.searchParams.set('q', searchTerm);
  url.searchParams.set('media_type', 'image');
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(PAGE_SIZE));

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`NASA archive request failed with ${response.status}`);
  }

  const payload = await response.json() as NasaSearchResponse;
  const rawItems = payload.collection?.items || [];
  const seen = new Set<string>();
  const items = rawItems
    .map(item => toArchiveImage(item, observatory))
    .filter((item): item is ObservatoryArchiveImage => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  const totalHits = payload.collection?.metadata?.total_hits || 0;

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    totalHits,
    hasMore: page * PAGE_SIZE < totalHits,
    searchTerm,
  };
}

export async function fetchObservatoryArchive(
  observatory: Observatory,
  page = 1,
  signal?: AbortSignal,
): Promise<ObservatoryArchivePage> {
  const searchTerms = observatory.apiSearchTerms.slice(0, 2).filter(Boolean);
  const cacheKey = `${observatory.id}:${page}:${searchTerms.join('|')}`;
  const cached = pageCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    let result = await requestPage(observatory, searchTerms[0] || observatory.name, page, signal);
    // Some mission names have a small NASA archive footprint. Try the
    // telescope's short alias on the initial page before showing an empty state.
    if (page === 1 && result.items.length === 0 && searchTerms[1]) {
      result = await requestPage(observatory, searchTerms[1], page, signal);
    }
    pageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
    return result;
  })();

  pendingRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export const observatoryArchivePageSize = PAGE_SIZE;