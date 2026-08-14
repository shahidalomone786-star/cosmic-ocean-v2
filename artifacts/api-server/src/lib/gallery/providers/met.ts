import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type MetSearch = { objectIDs?: number[] };
type MetObject = Record<string, unknown>;

const met: GalleryProvider = {
  id: "met",
  label: "Metropolitan Museum of Art",
  async search(context): Promise<GalleryItem[]> {
    const searchUrl = new URL("https://collectionapi.metmuseum.org/public/collection/v1/search");
    searchUrl.searchParams.set("q", context.query);
    searchUrl.searchParams.set("hasImages", "true");
    searchUrl.searchParams.set("isPublicDomain", "true");
    const search = await fetchJson<MetSearch>(searchUrl.toString());
    const ids = (search.objectIDs ?? []).slice((context.page - 1) * 6, (context.page - 1) * 6 + Math.min(context.limit, 6));
    const objects = await Promise.all(ids.map((id) => fetchJson<MetObject>(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)));
    return objects.flatMap((item) => {
      const imageUrl = firstText(item.primaryImage);
      const thumbnailUrl = firstText(item.primaryImageSmall, item.primaryImage);
      const rights = item.isPublicDomain === true ? usableLicense("Public Domain", "https://www.metmuseum.org/policies/termsofuse") : null;
      if (!rights || !imageUrl || !thumbnailUrl) return [];
      return [{
        id: `met:${String(item.objectID)}`,
        title: firstText(item.title) ?? "Untitled work",
        description: firstText(item.creditLine, item.medium),
        imageUrl,
        thumbnailUrl,
        source: "Metropolitan Museum of Art",
        sourceUrl: firstText(item.objectURL) ?? `https://www.metmuseum.org/art/collection/search/${String(item.objectID)}`,
        creator: firstText(item.artistDisplayName, item.artistDisplayBio),
        date: firstText(item.objectDate),
        category: firstText(item.classification) ?? categoryFromQuery(context.query, "art"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        attribution: firstText(item.creditLine),
        width: asNumber(item.measurementsWidth),
        height: asNumber(item.measurementsHeight),
      }];
    });
  },
};

export default met;