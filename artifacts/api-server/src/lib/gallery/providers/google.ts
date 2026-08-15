import {
  asNumber,
  categoryFromQuery,
  fetchJson,
  firstText,
  list,
  providerNotConfigured,
  providerUnavailable,
  usableLicense,
} from "../shared";
import type { GalleryItem, GalleryProvider, GallerySearchContext } from "../types";

type GoogleImageResult = {
  kind?: string;
  title?: string;
  htmlSnippet?: string;
  displayLink?: string;
  link?: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
    width?: number;
    height?: number;
    byteSize?: number;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
  };
  pagemap?: {
    metatags?: Array<Record<string, unknown>>;
  };
};

type GoogleSearchResponse = {
  items?: GoogleImageResult[];
  queries?: {
    nextPage?: Array<{ startIndex?: number }>;
  };
};

function firstPageMeta(item: GoogleImageResult): Record<string, unknown> {
  return item.pagemap?.metatags?.[0] ?? {};
}

function googleRights(item: GoogleImageResult) {
  const meta = firstPageMeta(item);
  return usableLicense(
    firstText(meta.license, meta.license_url, meta.licenseurl, meta.rights),
    firstText(meta.license_url, meta.licenseurl, meta.rights_url, meta.rightsurl),
  );
}

const google: GalleryProvider = {
  id: "google",
  label: "Google Image Search",
  async search(context): Promise<GalleryItem[]> {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CSE_ID ?? process.env.GOOGLE_PROGRAMMABLE_SEARCH_ENGINE_ID;
    if (!apiKey || !searchEngineId) {
      providerNotConfigured("Google Image Search", "GOOGLE_API_KEY + GOOGLE_CSE_ID");
    }

    const pageSize = Math.min(context.limit, 10);
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", context.query);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", String(pageSize));
    url.searchParams.set("start", String((context.page - 1) * pageSize + 1));
    url.searchParams.set("safe", "active");
    if (context.quality === "hd" || context.quality === "2k" || context.quality === "4k") {
      url.searchParams.set("imgSize", context.quality === "hd" ? "large" : "xlarge");
    }

    let data: GoogleSearchResponse;
    try {
      data = await fetchJson<GoogleSearchResponse>(url.toString());
    } catch (error) {
      providerUnavailable(
        "Google Image Search",
        error instanceof Error ? error.message : "Google Custom Search request failed",
      );
    }
    return (data.items ?? []).flatMap((item, index) => {
      const imageUrl = firstText(item.link);
      const thumbnailUrl = firstText(item.image?.thumbnailLink, item.link);
      if (!imageUrl || !thumbnailUrl) return [];

      const meta = firstPageMeta(item);
      const rights = googleRights(item);
      const sourceUrl = firstText(item.image?.contextLink, item.link);
      if (!sourceUrl) return [];

      return [{
        id: `google:${String(item.link ?? `${context.page}:${index}`)}`,
        title: firstText(item.title) ?? "Untitled image",
        description: firstText(item.htmlSnippet),
        imageUrl,
        thumbnailUrl,
        source: firstText(item.displayLink) ?? "Google Image Search",
        sourceUrl,
        creator: firstText(meta.author, meta.creator),
        date: firstText(meta.datepublished, meta.datecreated, meta.datemodified),
        category: categoryFromQuery(context.query, "web image"),
        tags: list(meta.keywords),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(meta.attribution, meta.credit, meta.copyright),
        width: asNumber(item.image?.width),
        height: asNumber(item.image?.height),
      }];
    });
  },
  getNextPage(context: GallerySearchContext, results: GalleryItem[]): number | null {
    const pageSize = Math.min(context.limit, 10);
    return results.length >= pageSize && context.page < 10 ? context.page + 1 : null;
  },
};

export default google;