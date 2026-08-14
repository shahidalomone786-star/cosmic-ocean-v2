import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type UsgsResponse = { results?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };

const usgsLandsat: GalleryProvider = {
  id: "usgs-landsat",
  label: "USGS Landsat / Earth imagery",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer/query");
    url.searchParams.set("where", `1=1 AND (lower(Name) LIKE '%${context.query.replace(/'/g, "''").toLowerCase()}%')`);
    url.searchParams.set("outFields", "*");
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("f", "json");
    url.searchParams.set("resultRecordCount", String(Math.min(context.limit, 20)));
    const data = await fetchJson<UsgsResponse>(url.toString());
    return (data.results ?? data.data ?? []).flatMap((item) => {
      const rights = usableLicense(item.license, item.rights);
      const imageUrl = firstText(item.imageUrl, item.thumbnailUrl, item.url);
      if (!rights || !imageUrl) return [];
      return [{
        id: `usgs-landsat:${String(item.objectId ?? item.id ?? imageUrl)}`,
        title: firstText(item.name, item.title) ?? "Landsat Earth image",
        description: firstText(item.description),
        imageUrl,
        thumbnailUrl: firstText(item.thumbnailUrl, imageUrl) ?? imageUrl,
        source: "USGS Landsat / Earth imagery",
        sourceUrl: firstText(item.url) ?? "https://landsatlook.usgs.gov/",
        creator: firstText(item.creator, item.author),
        date: firstText(item.acquisitionDate, item.date),
        category: categoryFromQuery(context.query, "earth"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        attribution: firstText(item.attribution),
        width: asNumber(item.width),
        height: asNumber(item.height),
      }];
    });
  },
};

export default usgsLandsat;