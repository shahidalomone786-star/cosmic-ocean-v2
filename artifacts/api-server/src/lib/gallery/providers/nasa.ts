import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type NasaResponse = { collection?: { items?: Array<{ data?: Array<Record<string, unknown>>; links?: Array<Record<string, unknown>> }> } };

const nasa: GalleryProvider = {
  id: "nasa",
  label: "NASA Image & Video Library",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://images-api.nasa.gov/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("media_type", "image");
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("page_size", String(Math.min(context.limit, 20)));
    const data = await fetchJson<NasaResponse>(url.toString());
    return (data.collection?.items ?? []).flatMap((item) => {
      const metadata = item.data?.[0] ?? {};
      // NASA records are included only when the record itself carries rights metadata.
      const rights = usableLicense(metadata.license, metadata.license_url ?? metadata.rights);
      const imageUrl = firstText(item.links?.find((link) => link.rel === "orig")?.href, item.links?.[0]?.href);
      if (!rights || !imageUrl) return [];
      return [{
        id: `nasa:${String(metadata.nasa_id ?? imageUrl)}`,
        title: firstText(metadata.title) ?? "Untitled NASA image",
        description: firstText(metadata.description),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "NASA Image & Video Library",
        sourceUrl: `https://images.nasa.gov/details-${String(metadata.nasa_id ?? "")}`,
        creator: firstText(metadata.photographer, metadata.secondary_creator),
        date: firstText(metadata.date_created),
        category: categoryFromQuery(context.query, "space"),
        tags: list(metadata.keywords),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        attribution: firstText(metadata.center, metadata.photographer),
        width: asNumber(metadata.width),
        height: asNumber(metadata.height),
      }];
    });
  },
};

export default nasa;