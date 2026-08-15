import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type Observation = Record<string, unknown> & { photos?: Array<Record<string, unknown>> };
type InaturalistResponse = { results?: Observation[] };

const inaturalist: GalleryProvider = {
  id: "inaturalist",
  label: "iNaturalist",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://api.inaturalist.org/v1/observations");
    url.searchParams.set("q", context.query);
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("per_page", String(Math.min(context.limit, 20)));
    url.searchParams.set("photos", "true");
    url.searchParams.set("quality_grade", "research");
    url.searchParams.set("order", "desc");
    url.searchParams.set("order_by", "created_at");
    const data = await fetchJson<InaturalistResponse>(url.toString());
    return (data.results ?? []).flatMap((item) => {
      const photo = item.photos?.find((candidate) => Boolean(candidate.license_code));
      const rights = usableLicense(photo?.license_code, `https://creativecommons.org/licenses/${String(photo?.license_code ?? "").replace(/_/g, "-")}/`);
      const imageUrl = firstText(photo?.original_url, photo?.url);
      if (!rights || !imageUrl) return [];
      const taxon = item.taxon as Record<string, unknown> | undefined;
      const user = item.user as Record<string, unknown> | undefined;
      return [{
        id: `inaturalist:${String(item.id)}`,
        title: firstText(taxon?.preferred_common_name, taxon?.name, item.species_guess) ?? "Field observation",
        description: firstText(item.description, item.place_guess),
        imageUrl,
        thumbnailUrl: firstText(photo?.url, imageUrl) ?? imageUrl,
        source: "iNaturalist",
        sourceUrl: firstText(item.uri) ?? `https://www.inaturalist.org/observations/${String(item.id)}`,
        creator: firstText(user?.name, user?.login),
        date: firstText(item.observed_on, item.created_at),
        category: categoryFromQuery(context.query, "wildlife"),
        tags: [firstText(taxon?.name)].filter((tag): tag is string => Boolean(tag)),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(photo?.attribution),
        width: asNumber(photo?.width),
        height: asNumber(photo?.height),
      }];
    });
  },
};

export default inaturalist;