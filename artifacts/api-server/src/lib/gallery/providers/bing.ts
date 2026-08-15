import {
  asNumber,
  categoryFromQuery,
  fetchJson,
  filterSafeGalleryItems,
  firstText,
  providerNotConfigured,
  usableLicense,
} from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type BingResponse = {
  value?: Array<Record<string, unknown>>;
};

const bing: GalleryProvider = {
  id: "bing",
  label: "Bing Images",
  async search(context): Promise<GalleryItem[]> {
    const apiKey = process.env.BING_IMAGE_SEARCH_KEY;
    if (!apiKey) providerNotConfigured("Bing Images", "BING_IMAGE_SEARCH_KEY");

    const url = new URL("https://api.bing.microsoft.com/v7.0/images/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("count", String(Math.min(context.limit, 35)));
    url.searchParams.set("offset", String((context.page - 1) * context.limit));
    url.searchParams.set("safeSearch", context.safeSearch ? "Strict" : "Off");
    const data = await fetchJson<BingResponse>(url.toString(), {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    });

    return filterSafeGalleryItems((data.value ?? []).flatMap((item, index) => {
      const imageUrl = firstText(item.contentUrl);
      const thumbnailUrl = firstText(item.thumbnailUrl, item.contentUrl);
      if (!imageUrl || !thumbnailUrl) return [];
      const rights = usableLicense(firstText(item.license, item.rights), firstText(item.licenseUrl, item.rightsUrl));
      return [{
        id: `bing:${String(item.imageId ?? item.contentUrl ?? index)}`,
        title: firstText(item.name) ?? "Untitled Bing image",
        description: firstText(item.description),
        imageUrl,
        thumbnailUrl,
        source: "Bing Images",
        sourceUrl: firstText(item.hostPageUrl, item.contentUrl) ?? imageUrl,
        creator: firstText(item.creator),
        date: firstText(item.datePublished),
        category: categoryFromQuery(context.query, "web image"),
        tags: [],
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.creator, item.provider),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    }), context.safeSearch);
  },
};

export default bing;