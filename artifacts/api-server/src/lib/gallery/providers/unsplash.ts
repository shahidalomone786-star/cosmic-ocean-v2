import { asNumber, categoryFromQuery, fetchJson, firstText, list, providerNotConfigured, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type UnsplashResponse = { results?: Array<Record<string, unknown>> };

const unsplash: GalleryProvider = {
  id: "unsplash",
  label: "Unsplash",
  async search(context): Promise<GalleryItem[]> {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) providerNotConfigured("Unsplash", "UNSPLASH_ACCESS_KEY");
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", context.query);
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("per_page", String(Math.min(context.limit, 20)));
    const data = await fetchJson<UnsplashResponse>(url.toString(), { headers: { Authorization: `Client-ID ${key}` } });
    return (data.results ?? []).flatMap((item) => {
      const rights = usableLicense(item.license, item.license_url);
      const urls = item.urls as Record<string, unknown> | undefined;
      const imageUrl = firstText(urls?.full, urls?.regular);
      const thumbnailUrl = firstText(urls?.small, urls?.thumb, imageUrl);
      if (!rights || !imageUrl || !thumbnailUrl) return [];
      const user = item.user as Record<string, unknown> | undefined;
      return [{
        id: `unsplash:${String(item.id)}`,
        title: firstText(item.alt_description, item.description) ?? "Untitled Unsplash image",
        description: firstText(item.description, item.alt_description),
        imageUrl,
        thumbnailUrl,
        source: "Unsplash",
        sourceUrl: firstText(item.links && (item.links as Record<string, unknown>).html) ?? "https://unsplash.com/",
        creator: firstText(user?.name, user?.username),
        date: firstText(item.created_at),
        category: categoryFromQuery(context.query, "photography"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(user?.name),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    });
  },
};

export default unsplash;