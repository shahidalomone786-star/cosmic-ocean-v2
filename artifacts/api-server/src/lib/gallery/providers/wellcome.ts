import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type WellcomeResponse = { results?: Array<Record<string, unknown>> };

const wellcome: GalleryProvider = {
  id: "wellcome",
  label: "Wellcome Collection",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.wellcomecollection.org/catalogue/v2/works");
    url.searchParams.set("query", context.query);
    url.searchParams.set("pageSize", String(Math.min(context.limit, 20)));
    url.searchParams.set("page", String(context.page));
    const data = await fetchJson<WellcomeResponse>(url.toString());
    return (data.results ?? []).flatMap((item) => {
      const thumbnail = (item.thumbnail ?? {}) as Record<string, unknown>;
      const license = (thumbnail.license ?? {}) as Record<string, unknown>;
      const thumbnailUrl = firstText(thumbnail.url);
      if (!thumbnailUrl) return [];
      const imageUrl = thumbnailUrl
        .replace("/thumbs/", "/image/")
        .replace(/\/!200,200\//, "/full/");
      const rights = usableLicense(license.label, license.url);
      return [{
        id: `wellcome:${String(item.id ?? thumbnailUrl)}`,
        title: firstText(item.title) ?? "Wellcome Collection image",
        description: firstText(item.description),
        imageUrl,
        thumbnailUrl,
        source: "Wellcome Collection",
        sourceUrl: `https://wellcomecollection.org/works/${String(item.id ?? "")}`,
        creator: firstText(item.primaryCollection, item.contributors),
        date: firstText(item.production),
        category: categoryFromQuery(context.query, "medical"),
        tags: list((item.workType as Record<string, unknown> | undefined)?.label, item.subjects),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.provider, item.contributors),
        width: asNumber(thumbnail.width),
        height: asNumber(thumbnail.height),
      }];
    });
  },
};

export default wellcome;