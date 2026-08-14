import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type OpenIResponse = { list?: Array<Record<string, unknown>>; results?: Array<Record<string, unknown>>; response?: Array<Record<string, unknown>> };

const openI: GalleryProvider = {
  id: "open-i",
  label: "Open-i / NIH",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://openi.nlm.nih.gov/api/search");
    url.searchParams.set("query", context.query);
    url.searchParams.set("coll", "pmc");
    url.searchParams.set("n", String(Math.min(context.limit, 20)));
    url.searchParams.set("p", String(context.page));
    const data = await fetchJson<OpenIResponse>(url.toString());
    const rows = data.list ?? data.results ?? data.response ?? [];
    return rows.flatMap((item) => {
      const rights = usableLicense(item.license, item.license_url ?? item.rights);
      const imageUrl = firstText(item.image_url, item.image, item.img);
      if (!rights || !imageUrl) return [];
      return [{
        id: `open-i:${String(item.id ?? item.uid ?? imageUrl)}`,
        title: firstText(item.title, item.caption) ?? "Biomedical image",
        description: firstText(item.description, item.caption),
        imageUrl,
        thumbnailUrl: firstText(item.thumbnail_url, imageUrl) ?? imageUrl,
        source: "Open-i / NIH",
        sourceUrl: firstText(item.url, item.source_url) ?? "https://openi.nlm.nih.gov/",
        creator: firstText(item.author, item.creator),
        date: firstText(item.date),
        category: categoryFromQuery(context.query, "medicine"),
        tags: list(item.mesh_terms, item.keywords),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        attribution: firstText(item.attribution),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    });
  },
};

export default openI;