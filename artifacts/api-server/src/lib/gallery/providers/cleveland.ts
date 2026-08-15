import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type ClevelandResponse = { data?: Array<Record<string, unknown>> };

const cleveland: GalleryProvider = {
  id: "cleveland",
  label: "Cleveland Museum of Art",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://openaccess-api.clevelandart.org/api/artworks/");
    url.searchParams.set("q", context.query);
    url.searchParams.set("has_image", "1");
    url.searchParams.set("limit", String(Math.min(context.limit, 20)));
    url.searchParams.set("skip", String((context.page - 1) * context.limit));
    const data = await fetchJson<ClevelandResponse>(url.toString());
    return (data.data ?? []).flatMap((item) => {
      const images = (item.images ?? {}) as Record<string, unknown>;
      const web = (images.web ?? {}) as Record<string, unknown>;
      const imageUrl = firstText(web.url);
      if (!imageUrl) return [];
      const rights = usableLicense(item.license, item.license_url ?? item.rights_type);
      return [{
        id: `cleveland:${String(item.id ?? imageUrl)}`,
        title: firstText(item.title) ?? "Untitled Cleveland Museum record",
        description: firstText(item.description, item.tombstone),
        imageUrl,
        thumbnailUrl: firstText(web.url) ?? imageUrl,
        source: "Cleveland Museum of Art",
        sourceUrl: firstText(item.url) ?? `https://www.clevelandart.org/art/${String(item.id ?? "")}`,
        creator: firstText((item.creators as unknown[] | undefined)?.map((creator) => (creator as Record<string, unknown>).description)),
        date: firstText(item.creation_date),
        category: firstText(item.type, item.department) ?? categoryFromQuery(context.query, "art"),
        tags: list(item.culture, item.technique, item.type),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.creditline, item.credit_line),
        width: asNumber(web.width),
        height: asNumber(web.height),
      }];
    });
  },
};

export default cleveland;