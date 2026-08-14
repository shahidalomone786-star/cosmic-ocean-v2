import { galleryProviderById, galleryProviders } from "./providers";
import type { GalleryProviderId, GalleryProviderStatus, GallerySearchContext } from "./types";

export async function searchGallery(
  context: GallerySearchContext,
  requestedProviderIds?: string[],
): Promise<{ items: Awaited<ReturnType<typeof galleryProviders[number]["search"]>>; providerStatus: GalleryProviderStatus[]; hasMore: boolean }> {
  const providers = requestedProviderIds?.length
    ? requestedProviderIds.flatMap((id) => {
        const provider = galleryProviderById.get(id as GalleryProviderId);
        return provider ? [provider] : [];
      })
    : galleryProviders;

  const settled = await Promise.allSettled(providers.map((provider) => provider.search(context)));
  const providerItems = settled.map((result) => result.status === "fulfilled" ? result.value : []);
  const providerStatus = settled.map((result, index): GalleryProviderStatus => {
    const provider = providers[index];
    if (result.status === "fulfilled") {
      return { provider: provider.id, status: "ready", count: result.value.length, message: null };
    }
    return { provider: provider.id, status: "unavailable", count: 0, message: "Provider temporarily unavailable" };
  });

  const seen = new Set<string>();
  const uniqueItems = [];
  for (let index = 0; index < context.limit; index += 1) {
    for (const items of providerItems) {
      const item = items[index];
      if (!item || (context.category && item.category !== context.category) || seen.has(item.id)) continue;
      seen.add(item.id);
      uniqueItems.push(item);
      if (uniqueItems.length >= context.limit) break;
    }
    if (uniqueItems.length >= context.limit) break;
  }
  const hasMore = providerItems.some((items) => items.length >= context.limit);
  return { items: uniqueItems, providerStatus, hasMore };
}