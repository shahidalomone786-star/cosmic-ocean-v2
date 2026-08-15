import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type SmithsonianResponse = { response?: { rows?: Array<Record<string, unknown>> } };

const smithsonian: GalleryProvider = {
  id: "smithsonian",
  label: "Smithsonian Open Access",
  async search(context): Promise<GalleryItem[]> {
    const key = process.env.SMITHSONIAN_API_KEY;
    if (!key) throw new Error("SMITHSONIAN_API_KEY is not configured");
    const url = new URL("https://api.si.edu/openaccess/api/v1.0/search");
    url.searchParams.set("q", context.query);
    url.searchParams.set("api_key", key);
    url.searchParams.set("rows", String(Math.min(context.limit, 20)));
    url.searchParams.set("start", String((context.page - 1) * context.limit));
    const data = await fetchJson<SmithsonianResponse>(url.toString());
    return (data.response?.rows ?? []).flatMap((item) => {
      const content = (item.content ?? {}) as Record<string, unknown>;
      const online = (content.online_media ?? {}) as Record<string, unknown>;
      const media = Array.isArray(online.media) ? online.media[0] as Record<string, unknown> | undefined : undefined;
      const rights = usableLicense(item.rights, item.usage_rights ?? content.rights);
      const imageUrl = firstText(media?.content, media?.url);
      if (!rights || !imageUrl) return [];
      return [{
        id: `smithsonian:${String(item.id ?? item.url)}`,
        title: firstText(item.title, content.title) ?? "Untitled Smithsonian record",
        description: firstText(item.description, content.description),
        imageUrl,
        thumbnailUrl: firstText(media?.thumbnail, imageUrl) ?? imageUrl,
        source: "Smithsonian Open Access",
        sourceUrl: firstText(item.url) ?? "https://www.si.edu/openaccess",
        creator: firstText(item.name, content.name),
        date: firstText(item.date, content.date),
        category: categoryFromQuery(context.query, "culture"),
        tags: list(item.tags),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(item.attribution, item.credit_line),
        width: asNumber(media?.width),
        height: asNumber(media?.height),
      }];
    });
  },
};

export default smithsonian;