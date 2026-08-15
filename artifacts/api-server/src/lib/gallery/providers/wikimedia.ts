import { asNumber, categoryFromQuery, fetchJson, filterSafeGalleryItems, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type WikimediaResponse = { query?: { pages?: Record<string, { pageid?: number; title?: string; imageinfo?: Array<Record<string, unknown>> }> } };

const wikimedia: GalleryProvider = {
  id: "wikimedia",
  label: "Wikimedia Commons",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", context.query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", String(Math.min(context.limit, 20)));
    url.searchParams.set("gsroffset", String((context.page - 1) * context.limit));
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|size|extmetadata");
    url.searchParams.set("iiurlwidth", "800");
    // Wikimedia does not consistently enforce this flag across Commons
    // search backends, so the adapter also applies the shared result filter.
    url.searchParams.set("safesearch", context.safeSearch ? "1" : "0");
    url.searchParams.set("format", "json");
    const data = await fetchJson<WikimediaResponse>(url.toString());
    return filterSafeGalleryItems(Object.values(data.query?.pages ?? {}).flatMap((item) => {
      const info = item.imageinfo?.[0] ?? {};
      const metadata = (info.extmetadata ?? {}) as Record<string, unknown>;
      const rights = usableLicense(
        (metadata.LicenseShortName as Record<string, unknown> | undefined)?.value,
        (metadata.LicenseUrl as Record<string, unknown> | undefined)?.value,
      );
      const imageUrl = firstText(info.url);
      const thumbnailUrl = firstText(info.thumburl, imageUrl);
      if (!rights || !imageUrl || !thumbnailUrl) return [];
      return [{
        id: `wikimedia:${String(item.pageid ?? imageUrl)}`,
        title: firstText(item.title)?.replace(/^File:/, "") ?? "Wikimedia Commons image",
        description: firstText((metadata.ImageDescription as Record<string, unknown> | undefined)?.value),
        imageUrl,
        thumbnailUrl,
        source: "Wikimedia Commons",
        sourceUrl: `https://commons.wikimedia.org/?curid=${String(item.pageid ?? "")}`,
        creator: firstText((metadata.Artist as Record<string, unknown> | undefined)?.value),
        date: firstText((metadata.DateTimeOriginal as Record<string, unknown> | undefined)?.value),
        category: categoryFromQuery(context.query, "open collection"),
        tags: list((metadata.Categories as Record<string, unknown> | undefined)?.value),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText((metadata.Credit as Record<string, unknown> | undefined)?.value, (metadata.Artist as Record<string, unknown> | undefined)?.value),
        width: asNumber(info.width),
        height: asNumber(info.height),
      }];
    }), context.safeSearch);
  },
};

export default wikimedia;