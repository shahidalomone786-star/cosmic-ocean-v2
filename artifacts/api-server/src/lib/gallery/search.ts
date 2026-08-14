import { galleryProviderById, galleryProviders } from "./providers";
import { isImageUrl, matchesGalleryFilters } from "./shared";
import type { GalleryItem, GalleryProvider, GalleryProviderId, GalleryProviderStatus, GallerySearchContext } from "./types";

const FALLBACK_PROVIDERS: GalleryProviderId[] = ["openverse", "wikimedia"];
const PROVIDER_AUTHORITY: Record<GalleryProviderId, number> = {
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
  unsplash: 0.65,
};

const ROUTES: Array<{ test: RegExp; providers: GalleryProviderId[] }> = [
  { test: /galaxy|nebula|space|astronom|planet|star|cosmos/i, providers: ["nasa", "smithsonian", "openverse", "wikimedia"] },
  { test: /ocean|sea|coral|whale|marine|fish/i, providers: ["inaturalist", "gbif", "smithsonian", "openverse", "wikimedia"] },
  { test: /cat|dog|bird|elephant|tiger|animal|wildlife/i, providers: ["inaturalist", "gbif", "smithsonian", "openverse", "wikimedia"] },
  { test: /plant|flower|tree|botan|forest/i, providers: ["inaturalist", "gbif", "smithsonian", "openverse", "wikimedia"] },
  { test: /painting|sculpture|van gogh|art|portrait|museum/i, providers: ["met", "artic", "rijksmuseum", "europeana", "smithsonian", "wikimedia", "openverse"] },
  { test: /architect|building|house|design/i, providers: ["met", "artic", "rijksmuseum", "europeana", "loc", "smithsonian", "wikimedia", "openverse"] },
  { test: /history|ancient|egypt|culture|heritage/i, providers: ["loc", "smithsonian", "europeana", "wikimedia", "openverse"] },
  { test: /microscop|cell|medicine|medical|disease|health/i, providers: ["open-i", "smithsonian", "openverse", "wikimedia"] },
  { test: /protein|molecule|molecular|pdb|chemistry/i, providers: ["rcsb-pdb", "openverse", "wikimedia"] },
  { test: /volcano|earth|geolog|climate|landscape|satellite|landsat/i, providers: ["usgs-landsat", "nasa", "smithsonian", "wikimedia", "openverse"] },
  { test: /map|cartograph|atlas/i, providers: ["loc", "usgs-landsat", "europeana", "wikimedia", "openverse"] },
];

function routeProviders(query: string): GalleryProvider[] {
  const route = ROUTES.find((candidate) => candidate.test.test(query));
  const ids = route ? route.providers : FALLBACK_PROVIDERS;
  const uniqueIds = [...new Set(ids)];
  return uniqueIds.flatMap((id) => {
    const provider = galleryProviderById.get(id);
    return provider ? [provider] : [];
  });
}

function normalizeKey(item: GalleryItem): string[] {
  const normalize = (value: string) => value.toLowerCase().replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/\s+/g, " ").trim();
  const titleCreator = `${normalize(item.title)}|${normalize(item.creator ?? "")}`;
  return [normalize(item.imageUrl), normalize(item.thumbnailUrl), item.id.toLowerCase(), titleCreator];
}

function scoreItem(item: GalleryItem, query: string): number {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2);
  const text = [item.title, item.description ?? "", item.category, ...item.tags].join(" ").toLowerCase();
  const relevance = terms.reduce((score, term) => score + (text.includes(term) ? 12 : 0), 0);
  const dimensions = item.width && item.height ? Math.min(20, Math.log10(item.width * item.height) * 3) : 0;
  const metadata = [item.description, item.creator, item.date, item.licenseUrl, item.attribution].filter(Boolean).length * 1.5;
  const providerId = item.id.split(":", 1)[0] as GalleryProviderId;
  // Specialist/authoritative archives should win over aggregator copies when
  // both match, while relevance and image quality still decide within a source.
  return relevance + dimensions + metadata + (PROVIDER_AUTHORITY[providerId] ?? 0.5) * 80;
}

export async function searchGallery(
  context: GallerySearchContext,
  requestedProviderIds?: string[],
): Promise<{ items: Awaited<ReturnType<typeof galleryProviders[number]["search"]>>; providerStatus: GalleryProviderStatus[]; hasMore: boolean }> {
  const providers = requestedProviderIds?.length
    ? [...new Set(requestedProviderIds)].flatMap((id) => {
        const provider = galleryProviderById.get(id as GalleryProviderId);
        return provider ? [provider] : [];
      })
    : routeProviders(context.query);

  const settled = await Promise.allSettled(providers.map((provider) => provider.search(context)));
  const providerItems = settled.map((result) => result.status === "fulfilled" ? result.value.filter((item) => isImageUrl(item.imageUrl) && isImageUrl(item.thumbnailUrl)) : []);
  const providerStatus = settled.map((result, index): GalleryProviderStatus => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      return { provider: provider.id, status: "ready", count: providerItems[index].length, message: null };
    }
    return { provider: provider.id, status: "unavailable", count: 0, message: "Provider temporarily unavailable" };
  });

  const seen = new Set<string>();
  const uniqueItems: GalleryItem[] = [];
  for (const item of providerItems.flat()) {
    if (!matchesGalleryFilters(item, context) || normalizeKey(item).some((key) => seen.has(key))) continue;
    normalizeKey(item).forEach((key) => seen.add(key));
    uniqueItems.push(item);
  }
  uniqueItems.sort((a, b) => scoreItem(b, context.query) - scoreItem(a, context.query));
  const items = uniqueItems.slice(0, context.limit);
  const hasMore = providerItems.some((providerItemsForPage) => providerItemsForPage.length >= Math.min(context.limit, 20));
  return { items, providerStatus, hasMore };
}