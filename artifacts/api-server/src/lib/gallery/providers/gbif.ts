import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type GbifResponse = { results?: Array<Record<string, unknown>> };

const gbif: GalleryProvider = {
  id: "gbif",
  label: "GBIF",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.gbif.org/v1/occurrence/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("media_type", "StillImage");
    url.searchParams.set("limit", String(Math.min(context.limit, 20)));
    url.searchParams.set("offset", String((context.page - 1) * context.limit));
    const data = await fetchJson<GbifResponse>(url.toString());
    return (data.results ?? []).flatMap((item) => {
      const media = Array.isArray(item.media) ? item.media.find((candidate) => typeof candidate === "object" && candidate !== null && Boolean((candidate as Record<string, unknown>).license)) as Record<string, unknown> | undefined : undefined;
      const rights = usableLicense(media?.license ?? item.license, media?.licenseUrl ?? item.licenseUrl);
      const imageUrl = firstText(media?.identifier, media?.references);
      if (!rights || !imageUrl) return [];
      return [{
        id: `gbif:${String(item.key ?? imageUrl)}`,
        title: firstText(item.species, item.verbatimScientificName) ?? "GBIF occurrence",
        description: firstText(item.locality, item.eventRemarks),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "GBIF",
        sourceUrl: `https://www.gbif.org/occurrence/${String(item.key ?? "")}`,
        creator: firstText(item.recordedBy, item.institutionCode),
        date: firstText(item.eventDate),
        category: categoryFromQuery(context.query, "wildlife"),
        tags: list(item.species, item.genus, item.family),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(media?.creator, item.recordedBy),
        width: asNumber(media?.width),
        height: asNumber(media?.height),
      }];
    });
  },
};

export default gbif;