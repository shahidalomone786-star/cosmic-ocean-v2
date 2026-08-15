import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type VamResponse = { records?: Array<Record<string, unknown>> };

const vam: GalleryProvider = {
  id: "vam",
  label: "Victoria and Albert Museum",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.vam.ac.uk/v2/objects/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("images", "true");
    url.searchParams.set("page_size", String(Math.min(context.limit, 20)));
    url.searchParams.set("page", String(context.page));
    const data = await fetchJson<VamResponse>(url.toString());
    return (data.records ?? []).flatMap((item) => {
      const images = (item._images ?? {}) as Record<string, unknown>;
      const imageId = firstText(item._primaryImageId);
      const thumbnailUrl = firstText(images._primary_thumbnail);
      if (!imageId || !thumbnailUrl) return [];
      const imageUrl = `${firstText(images._iiif_image_base_url) ?? thumbnailUrl}full/2000,/0/default.jpg`;
      const rights = usableLicense(firstText(item.rights, item.license), item.licenseUrl);
      return [{
        id: `vam:${String(item.systemNumber ?? imageId)}`,
        title: firstText(item._primaryTitle) ?? "Victoria and Albert Museum object",
        description: firstText(item.objectType),
        imageUrl,
        thumbnailUrl,
        source: "Victoria and Albert Museum",
        sourceUrl: `https://collections.vam.ac.uk/item/${String(item.systemNumber ?? "")}/`,
        creator: firstText((item._primaryMaker as Record<string, unknown> | undefined)?.name),
        date: firstText(item._primaryDate),
        category: categoryFromQuery(context.query, "art"),
        tags: list(item.objectType, item._primaryPlace),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.creditLine, item._primaryMaker),
        width: null,
        height: null,
      }];
    });
  },
};

export default vam;