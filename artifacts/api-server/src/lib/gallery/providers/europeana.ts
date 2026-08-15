import { asNumber, categoryFromQuery, fetchJson, firstText, list, providerNotConfigured, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type EuropeanaResponse = { items?: Array<Record<string, unknown>> };

const europeana: GalleryProvider = {
  id: "europeana",
  label: "Europeana",
  async search(context): Promise<GalleryItem[]> {
    const key = process.env.EUROPEANA_API_KEY;
    if (!key) providerNotConfigured("Europeana", "EUROPEANA_API_KEY");
    const url = new URL("https://api.europeana.eu/record/v2/search.json");
    url.searchParams.set("wskey", key);
    url.searchParams.set("query", context.query);
    url.searchParams.set("profile", "rich");
    url.searchParams.set("rows", String(Math.min(context.limit, 20)));
    url.searchParams.set("start", String((context.page - 1) * context.limit));
    const data = await fetchJson<EuropeanaResponse>(url.toString());
    return (data.items ?? []).flatMap((item) => {
      const rights = usableLicense(item.edmRights, item.rights);
      const imageUrl = firstText(item.edmPreview, item.edmIsShownBy);
      if (!rights || !imageUrl) return [];
      return [{
        id: `europeana:${String(item.id ?? imageUrl)}`,
        title: firstText(item.title) ?? "Europeana record",
        description: firstText(item.dcDescription),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "Europeana",
        sourceUrl: firstText(item.guid, item.link) ?? "https://www.europeana.eu/",
        creator: firstText(item.dcCreator),
        date: firstText(item.year, item.edmYear),
        category: categoryFromQuery(context.query, "culture"),
        tags: list(item.dcSubject, item.type),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.provider, item.dataProvider),
        width: asNumber(item.edmPhysicalSize),
        height: null,
      }];
    });
  },
};

export default europeana;