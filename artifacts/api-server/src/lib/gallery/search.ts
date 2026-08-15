import { galleryProviderById, galleryProviders } from "./providers";
import { classifyLicense, containsAdultContent, GalleryProviderError, isImageUrl, matchesGalleryFilters } from "./shared";
import type { GalleryItem, GalleryLicenseClass, GalleryProviderAdapter, GalleryProviderId, GalleryProviderStatus, GallerySearchContext } from "./types";

export const GENERAL_PROVIDERS: GalleryProviderId[] = ["openverse", "wikimedia", "flickr", "bing", "google"];
export const ADULT_PROVIDERS: GalleryProviderId[] = ["eporner", "danbooru"];
const FALLBACK_PROVIDERS: GalleryProviderId[] = GENERAL_PROVIDERS;
const PROVIDER_AUTHORITY: Partial<Record<GalleryProviderId, number>> = {
  met: 1,
  artic: 1,
  rijksmuseum: 1,
  smithsonian: 1,
  loc: 1,
  nasa: 1,
  "open-i": 1,
  "rcsb-pdb": 1,
  "usgs-landsat": 1,
  europeana: 1,
  inaturalist: 0.9,
  gbif: 0.9,
  openverse: 0.65,
  wikimedia: 0.7,
  google: 0.25,
  unsplash: 0.65,
  cleveland: 1,
  wellcome: 1,
  vam: 1,
  "internet-archive": 0.85,
  pubchem: 0.9,
  bing: 0.25,
  flickr: 0.55,
  danbooru: 0.2,
  reddit: 0.15,
};

const LICENSE_QUALITY: Record<GalleryLicenseClass, number> = {
  PUBLIC_DOMAIN: 10,
  CC0: 10,
  COMMERCIAL_USE: 8,
  OPEN_LICENSE: 7,
  ATTRIBUTION_REQUIRED: 5,
  UNKNOWN: 0,
};

const ROUTES: Array<{ test: RegExp; providers: GalleryProviderId[] }> = [
  { test: /galaxy|nebula|space|astronom|planet|star|cosmos/i, providers: ["nasa", "nasa-earthdata", "esa", "jpl", "smithsonian", "openverse", "wikimedia", "google"] },
  { test: /ocean|sea|coral|whale|marine|fish/i, providers: ["inaturalist", "gbif", "fishbase", "noaa", "smithsonian", "openverse", "wikimedia", "google"] },
  { test: /cat|dog|bird|elephant|tiger|animal|wildlife/i, providers: ["inaturalist", "gbif", "idigbio", "bioimages", "smithsonian", "openverse", "wikimedia", "google"] },
  { test: /plant|flower|tree|botan|forest/i, providers: ["inaturalist", "gbif", "plantnet", "biodiversity-heritage-library", "bioimages", "smithsonian", "openverse", "wikimedia", "google"] },
  { test: /painting|sculpture|van gogh|art|portrait|museum/i, providers: ["met", "artic", "cleveland", "vam", "harvard-art-museums", "rijksmuseum", "tate", "getty", "europeana", "smithsonian", "wikimedia", "openverse", "google"] },
  { test: /architect|building|house|design/i, providers: ["met", "artic", "cleveland", "vam", "europeana", "loc", "world-digital-library", "smithsonian", "wikimedia", "openverse", "google"] },
  { test: /history|ancient|egypt|culture|heritage/i, providers: ["loc", "national-archives", "us-national-archives", "world-digital-library", "digital-public-library", "smithsonian", "europeana", "wikimedia", "openverse", "google"] },
  { test: /microscop|cell|medicine|medical|disease|health/i, providers: ["open-i", "nlm-digital-collections", "cdc-public-health-image-library", "medlineplus", "smithsonian", "openverse", "wikimedia", "google"] },
  { test: /protein|molecule|molecular|pdb|chemistry/i, providers: ["rcsb-pdb", "pubchem", "openverse", "wikimedia", "google"] },
  { test: /volcano|earth|geolog|climate|landscape|satellite|landsat/i, providers: ["usgs-landsat", "usgs-eros", "nasa", "nasa-earthdata", "noaa", "smithsonian", "wikimedia", "openverse", "google"] },
  { test: /map|cartograph|atlas/i, providers: ["loc", "usgs-landsat", "nasa-earthdata", "europeana", "world-digital-library", "wikimedia", "openverse", "google"] },
];

const ADULT_QUERY_TERMS = [
  "nsfw",
  "porn",
  "pornography",
  "hentai",
  "rule34",
  "r34",
  "explicit",
  "erotic",
  "lewd",
  "nude",
  "naked",
  "sexual",
  "sex",
  "boobs",
  "tits",
  "penis",
  "dick",
  "vagina",
  "vulva",
  "orgasm",
  "blowjob",
  "handjob",
  "anal",
  "bdsm",
  "fetish",
];

const MINOR_SAFETY_TERMS = /\b(?:child|children|kid|kids|minor|underage|loli|lolita|shota|teen|teens|teenage|schoolgirl|schoolboy)\b/i;

export function isAdultQuery(query: string): boolean {
  const normalized = query.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || MINOR_SAFETY_TERMS.test(normalized)) return false;
  const terms = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));
  return ADULT_QUERY_TERMS.some((term) => terms.has(term));
}

function routeProviders(query: string): GalleryProviderAdapter[] {
  if (isAdultQuery(query)) {
    return ADULT_PROVIDERS.flatMap((id) => {
      const provider = galleryProviderById.get(id);
      return provider ? [provider] : [];
    });
  }
  const route = ROUTES.find((candidate) => candidate.test.test(query));
  const ids = [
    ...(route ? route.providers : FALLBACK_PROVIDERS),
    ...GENERAL_PROVIDERS,
  ];
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.flatMap((id) => {
    const provider = galleryProviderById.get(id);
    return provider ? [provider] : [];
  });
}

function normalizeKey(item: GalleryItem): string[] {
  const normalize = (value: string) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[?#].*$/, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  const titleCreator = `${normalize(item.title)}|${normalize(item.creator ?? "")}`;
  return [
    `image:${normalize(item.imageUrl)}`,
    `thumbnail:${normalize(item.thumbnailUrl)}`,
    `record:${item.id.toLowerCase()}`,
    `title-creator:${titleCreator}`,
  ];
}

function providerIdFor(item: GalleryItem): GalleryProviderId {
  return item.id.split(":", 1)[0] as GalleryProviderId;
}

function queryRelevance(item: GalleryItem, query: string): number {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
  const terms = normalizedQuery.split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const title = item.title.toLowerCase();
  const creator = (item.creator ?? "").toLowerCase();
  const description = (item.description ?? "").toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();
  const category = item.category.toLowerCase();
  let score = 0;
  if (normalizedQuery && title.includes(normalizedQuery)) score += 120;
  if (normalizedQuery && creator.includes(normalizedQuery)) score += 100;
  for (const term of terms) {
    if (title.includes(term)) score += 70;
    if (creator.includes(term)) score += 60;
    if (tags.includes(term)) score += 35;
    if (description.includes(term)) score += 25;
    if (category.includes(term)) score += 15;
  }
  return score;
}

function exactQueryMatch(item: GalleryItem, query: string): boolean {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalizedQuery) return false;
  return [item.title, item.creator ?? ""].some((value) => value.toLowerCase().replace(/\s+/g, " ").includes(normalizedQuery));
}

function resolutionScore(item: GalleryItem): number {
  if (!item.width || !item.height) return 0;
  const longestSide = Math.max(item.width, item.height);
  if (longestSide >= 3840) return 30;
  if (longestSide >= 2560) return 25;
  if (longestSide >= 1920) return 20;
  if (longestSide >= 1280) return 14;
  return Math.min(10, Math.log10(item.width * item.height) * 1.5);
}

function imageAvailabilityScore(item: GalleryItem): number {
  let score = 0;
  if (isImageUrl(item.imageUrl)) score += 14;
  if (isImageUrl(item.thumbnailUrl)) score += 8;
  if (item.imageUrl !== item.thumbnailUrl) score += 3;
  return score;
}

function metadataScore(item: GalleryItem): number {
  return [item.description, item.creator, item.date, item.licenseUrl, item.attribution].filter(Boolean).length * 2;
}

function qualityScore(item: GalleryItem): number {
  const providerId = providerIdFor(item);
  return imageAvailabilityScore(item)
    + resolutionScore(item)
    + metadataScore(item)
    + (PROVIDER_AUTHORITY[providerId] ?? 0.5) * 20
    + (LICENSE_QUALITY[item.licenseClass] ?? 0);
}

function compareItems(a: GalleryItem, b: GalleryItem, query: string): number {
  if (isAdultQuery(query)) {
    const aIsAdultSource = ADULT_PROVIDERS.includes(providerIdFor(a));
    const bIsAdultSource = ADULT_PROVIDERS.includes(providerIdFor(b));
    if (aIsAdultSource !== bIsAdultSource) return aIsAdultSource ? -1 : 1;
  }
  const aAuthority = exactQueryMatch(a, query) ? PROVIDER_AUTHORITY[providerIdFor(a)] ?? 0.5 : 0;
  const bAuthority = exactQueryMatch(b, query) ? PROVIDER_AUTHORITY[providerIdFor(b)] ?? 0.5 : 0;
  if (aAuthority !== bAuthority) return bAuthority - aAuthority;
  return scoreItem(b, query) - scoreItem(a, query);
}

function scoreItem(item: GalleryItem, query: string): number {
  // Relevance is intentionally an order of magnitude larger than quality
  // signals so a highly relevant image beats an irrelevant large image.
  // For exact query matches, authority is the first tie-breaker so a
  // museum-held record outranks an aggregator copy of the same subject.
  const authority = PROVIDER_AUTHORITY[providerIdFor(item)] ?? 0.5;
  const exactAuthority = exactQueryMatch(item, query) ? authority * 1_000_000 : 0;
  return exactAuthority + queryRelevance(item, query) * 1000 + qualityScore(item);
}

function duplicatePreferenceScore(item: GalleryItem): number {
  const providerId = providerIdFor(item);
  // Authority is the primary tie-break only after records have been grouped
  // as the same asset. Resolution and metadata choose between equal sources.
  return (PROVIDER_AUTHORITY[providerId] ?? 0.5) * 1000 + resolutionScore(item) + metadataScore(item) + LICENSE_QUALITY[item.licenseClass];
}

function deduplicateCandidates(candidates: GalleryItem[]): GalleryItem[] {
  const groups: Array<{ item: GalleryItem; keys: Set<string> }> = [];
  const keyToGroup = new Map<string, number>();

  for (const candidate of candidates) {
    const keys = normalizeKey(candidate);
    const matchingGroups = [...new Set(keys.flatMap((key) => {
      const groupIndex = keyToGroup.get(key);
      return groupIndex === undefined ? [] : [groupIndex];
    }))];

    if (matchingGroups.length === 0) {
      const groupIndex = groups.push({ item: candidate, keys: new Set(keys) }) - 1;
      keys.forEach((key) => keyToGroup.set(key, groupIndex));
      continue;
    }

    const matchingItems = matchingGroups.map((groupIndex) => groups[groupIndex].item);
    const winner = [candidate, ...matchingItems].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a))[0];
    const mergedKeys = new Set(keys);
    matchingGroups.forEach((groupIndex) => groups[groupIndex].keys.forEach((key) => mergedKeys.add(key)));

    const primaryGroup = matchingGroups[0];
    groups[primaryGroup] = { item: winner, keys: mergedKeys };
    matchingGroups.slice(1).forEach((groupIndex) => {
      groups[groupIndex].keys.forEach((key) => keyToGroup.set(key, primaryGroup));
      groups[groupIndex].item = winner;
    });
    mergedKeys.forEach((key) => keyToGroup.set(key, primaryGroup));
  }

  return groups
    .filter((group, index) => !groups.some((other, otherIndex) => otherIndex < index && other.item.id === group.item.id))
    .map((group) => group.item);
}

function normalizeGalleryItem(item: GalleryItem): GalleryItem {
  const imageUrl = isImageUrl(item.imageUrl) ? item.imageUrl : item.thumbnailUrl;
  const thumbnailUrl = isImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : imageUrl;
  return {
    ...item,
    imageUrl,
    thumbnailUrl,
    license: item.license || "Unknown / Verify source",
    licenseClass: classifyLicense(item.license, item.licenseUrl),
  };
}

export async function searchGallery(
  context: GallerySearchContext,
  requestedProviderIds?: string[],
): Promise<{ items: Awaited<ReturnType<typeof galleryProviders[number]["search"]>>; providerStatus: GalleryProviderStatus[]; hasMore: boolean }> {
  const intentContext: GallerySearchContext = {
    ...context,
    safeSearch: context.safeSearch ?? !isAdultQuery(context.query),
  };
  const providers: GalleryProviderAdapter[] = isAdultQuery(intentContext.query)
    ? ADULT_PROVIDERS.flatMap((id) => {
      const provider = galleryProviderById.get(id);
      return provider ? [provider] : [];
    })
    : requestedProviderIds?.length
    ? [...new Set(requestedProviderIds)].flatMap((id) => {
        if (intentContext.safeSearch && ADULT_PROVIDERS.includes(id as GalleryProviderId)) return [];
        const provider = galleryProviderById.get(id as GalleryProviderId);
        return provider ? [provider] : [];
      })
    : routeProviders(intentContext.query);

  const settled = await Promise.allSettled(providers.map((provider) => searchProviderWithTimeout(provider, intentContext)));
  const providerItems = settled.map((result, index) => result.status === "fulfilled"
    ? result.value
      .map((item) => {
        const normalized = providerItemsForResult(item, providers[index]);
        return normalized ? normalizeAdultResult(normalized, intentContext.safeSearch) : null;
      })
      .filter((item): item is GalleryItem => item !== null)
    : []);
  const providerStatus = settled.map((result, index): GalleryProviderStatus => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      return {
        provider: provider.id,
        status: providerItems[index].length > 0 ? "AVAILABLE" : "NO_RESULTS",
        count: providerItems[index].length,
        message: providerItems[index].length > 0 ? null : "No normalized image records returned",
      };
    }
    const error = result.reason;
    const status = error instanceof GalleryProviderError ? error.status : "ERROR";
    return {
      provider: provider.id,
      status,
      count: 0,
      message: error instanceof Error ? error.message : "Provider request failed",
    };
  });

  const filteredProviderItems = providerItems.map((items) => items
    .filter((item) => !intentContext.safeSearch || !containsAdultContent(item.title, item.description, item.category, item.tags))
    .filter((item) => matchesGalleryFilters(item, intentContext)));
  const filteredCandidates = isAdultQuery(intentContext.query)
    ? zipperInterleave(filteredProviderItems)
    : filteredProviderItems.flat();
  const uniqueItems = deduplicateCandidates(filteredCandidates);
  if (!isAdultQuery(intentContext.query)) {
    uniqueItems.sort((a, b) => compareItems(a, b, intentContext.query));
  }
  const items = uniqueItems.slice(0, intentContext.limit);
  const hasMore = providerItems.some((itemsForProvider, index) => providers[index].getNextPage(intentContext, itemsForProvider) !== null);
  return { items, providerStatus, hasMore };
}

function zipperInterleave(providerItems: GalleryItem[][]): GalleryItem[] {
  const items: GalleryItem[] = [];
  const maxLength = Math.max(...providerItems.map((provider) => provider.length), 0);
  for (let index = 0; index < maxLength; index += 1) {
    for (const provider of providerItems) {
      if (index < provider.length) items.push(provider[index]);
    }
  }
  return items;
}

function providerItemsForResult(item: GalleryItem, provider: GalleryProviderAdapter): GalleryItem | null {
  const normalized = provider.normalize(item);
  if (!normalized) return null;
  const image = provider.extractImage(normalized);
  if (!image) return null;
  return normalizeGalleryItem({ ...normalized, ...image });
}

function normalizeAdultResult(item: GalleryItem, safeSearch: boolean): GalleryItem {
  const isAdultSource = ADULT_PROVIDERS.includes(providerIdFor(item));
  const isAdultContent = containsAdultContent(item.title, item.description, item.category, item.tags);
  if (safeSearch || (!isAdultSource && !isAdultContent)) return item;
  return {
    ...item,
    license: "Unknown / Verify source",
    licenseUrl: null,
    licenseClass: "UNKNOWN",
    attribution: "Verify source",
  };
}

async function searchProviderWithTimeout(
  provider: GalleryProviderAdapter,
  context: GallerySearchContext,
): Promise<GalleryItem[]> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new GalleryProviderError(
        provider.id === "google" ? "UNAVAILABLE" : "ERROR",
        "Provider request timed out",
      )), 8500);
  });
  try {
    return await Promise.race([provider.search(context), timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}