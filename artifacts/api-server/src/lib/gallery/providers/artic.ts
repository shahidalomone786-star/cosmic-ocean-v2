import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type ArticResponse = { data?: Array<Record<string, unknown>>; config?: { iiif_url?: string } };

const artic: GalleryProvider = {
  id: "artic",
  label: "Art Institute of Chicago",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.artic.edu/api/v1/artworks/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("limit", String(Math.min(context.limit, 20)));
    url.searchParams.set("fields", "id,title,artist_display,artist_title,date_display,image_id,thumbnail,api_link,medium_display,classification,is_public_domain,credit_line");
    const data = await fetchJson<ArticResponse>(url.toString());
    const iiif = data.config?.iiif_url ?? "https://www.artic.edu/iiif/2";
    return (data.data ?? []).flatMap((item) => {
      const imageId = firstText(item.image_id);
      const imageUrl = imageId ? `${iiif}/${imageId}/full/843,/0/default.jpg` : null;
      const rights = item.is_public_domain === true ? usableLicense("Public Domain", "https://www.artic.edu/terms") : null;
      if (!rights || !imageUrl) return [];
      const thumbnail = item.thumbnail as Record<string, unknown> | undefined;
      return [{
        id: `artic:${String(item.id)}`,
        title: firstText(item.title) ?? "Untitled work",
        description: firstText(item.medium_display, item.credit_line),
        imageUrl,
        thumbnailUrl: firstText(thumbnail?. lqip, imageUrl) ?? imageUrl,
        source: "Art Institute of Chicago",
        sourceUrl: firstText(item.api_link) ?? `https://www.artic.edu/artworks/${String(item.id)}`,
        creator: firstText(item.artist_title, item.artist_display),
        date: firstText(item.date_display),
        category: firstText(item.classification) ?? categoryFromQuery(context.query, "art"),
        tags: [],
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        attribution: firstText(item.credit_line),
        width: asNumber(thumbnail?.width),
        height: asNumber(thumbnail?.height),
      }];
    });
  },
};

export default artic;