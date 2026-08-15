import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type OpenverseResponse = { results?: Array<Record<string, unknown>> };

const openverse: GalleryProvider = {
  id: "openverse",
  label: "Openverse",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", context.query);
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("page_size", String(Math.min(context.limit, 20)));
    url.searchParams.set("mature", "false");
    const data = await fetchJson<OpenverseResponse>(url.toString());
    return (data.results ?? []).flatMap((item) => {
      const rights = usableLicense(item.license, item.license_url);
      const imageUrl = firstText(item.url);
      const thumbnailUrl = firstText(item.thumbnail, item.url);
      if (!rights || !imageUrl || !thumbnailUrl) return [];
      return [{
        id: `openverse:${String(item.id ?? imageUrl)}`,
        title: firstText(item.title) ?? "Untitled image",
        description: firstText(item.description),
        imageUrl,
        thumbnailUrl,
        source: "Openverse",
        sourceUrl: firstText(item.foreign_landing_url, item.url) ?? imageUrl,
        creator: firstText(item.creator),
        date: firstText(item.created_on),
        category: categoryFromQuery(context.query, "open collection"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.attribution),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    });
  },
};

export default openverse;