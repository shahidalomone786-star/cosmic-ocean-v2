import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type RijksResponse = { artObjects?: Array<Record<string, unknown>> };

const rijksmuseum: GalleryProvider = {
  id: "rijksmuseum",
  label: "Rijksmuseum",
  async search(context): Promise<GalleryItem[]> {
    const key = process.env.RIJKSMUSEUM_API_KEY;
    if (!key) throw new Error("RIJKSMUSEUM_API_KEY is not configured");
    const url = new URL("https://www.rijksmuseum.nl/api/en/collection");
    url.searchParams.set("key", key);
    url.searchParams.set("q", context.query);
    url.searchParams.set("imgonly", "true");
    url.searchParams.set("ps", String(Math.min(context.limit, 20)));
    url.searchParams.set("p", String(context.page));
    const data = await fetchJson<RijksResponse>(url.toString());
    return (data.artObjects ?? []).flatMap((item) => {
      const rights = usableLicense(item.license, item.licenseUrl);
      const webImage = item.webImage as Record<string, unknown> | undefined;
      const imageUrl = firstText(webImage?.url);
      if (!rights || !imageUrl) return [];
      return [{
        id: `rijksmuseum:${String(item.objectNumber ?? imageUrl)}`,
        title: firstText(item.title) ?? "Rijksmuseum object",
        description: firstText(item.longTitle),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "Rijksmuseum",
        sourceUrl: firstText(item.links && (item.links as Record<string, unknown>).web) ?? "https://www.rijksmuseum.nl/en",
        creator: firstText(item.principalOrFirstMaker),
        date: firstText(item.dating && (item.dating as Record<string, unknown>).presentingDate),
        category: categoryFromQuery(context.query, "art"),
        tags: list(item.materials, item.objectTypes),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.principalOrFirstMaker),
        width: asNumber(webImage?.width),
        height: asNumber(webImage?.height),
      }];
    });
  },
};

export default rijksmuseum;