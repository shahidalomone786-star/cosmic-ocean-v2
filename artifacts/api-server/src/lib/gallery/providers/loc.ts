import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type LocResponse = { results?: Array<Record<string, unknown>> };

const loc: GalleryProvider = {
  id: "loc",
  label: "Library of Congress",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://www.loc.gov/pictures/");
    url.searchParams.set("q", context.query);
    url.searchParams.set("fo", "json");
    url.searchParams.set("c", String(Math.min(context.limit, 20)));
    url.searchParams.set("sp", String(context.page));
    const data = await fetchJson<LocResponse>(url.toString());
    return (data.results ?? []).flatMap((item) => {
      const imageUrls = Array.isArray(item.image_url) ? item.image_url : [];
      const imageUrl = firstText(imageUrls.at(-1), imageUrls[0]);
      const rights = usableLicense(item.rights, item.rights_url);
      if (!rights || !imageUrl) return [];
      return [{
        id: `loc:${String(item.id ?? imageUrl)}`,
        title: firstText(item.title) ?? "Untitled Library of Congress image",
        description: firstText(item.description, item.notes),
        imageUrl,
        thumbnailUrl: firstText(imageUrls[0], imageUrl) ?? imageUrl,
        source: "Library of Congress",
        sourceUrl: firstText(item.id) ?? "https://www.loc.gov/pictures/",
        creator: firstText(item.contributor, item.creator),
        date: firstText(item.date, item.created_published),
        category: categoryFromQuery(context.query, "history"),
        tags: list(item.subject),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.credit, item.repository),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    });
  },
};

export default loc;