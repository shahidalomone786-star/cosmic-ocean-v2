import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type SearchResponse = { result_set?: Array<{ identifier?: string }> };

const rcsbPdb: GalleryProvider = {
  id: "rcsb-pdb",
  label: "RCSB Protein Data Bank",
  async search(context): Promise<GalleryItem[]> {
    const query = {
      query: {
        type: "terminal",
        service: "full_text",
        parameters: { value: context.query },
      },
      return_type: "entry",
      request_options: { paginate: { start: (context.page - 1) * context.limit, rows: Math.min(context.limit, 20) } },
    };
    const data = await fetchJson<SearchResponse>("https://search.rcsb.org/rcsbsearch/v2/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });
    return (data.result_set ?? []).flatMap((entry): GalleryItem[] => {
      const id = firstText(entry.identifier);
      if (!id) return [];
      const normalizedId = id.toLowerCase();
      const imageUrl = `https://cdn.rcsb.org/images/structures/${normalizedId}_assembly-1.jpeg`;
      const rights = usableLicense(
        "CC0 1.0 Universal Public Domain Dedication",
        "https://www.wwpdb.org/policies/usage-of-pdbx/mmcif-data",
      );
      if (!rights) return [];
      return [{
        id: `rcsb-pdb:${id}`,
        title: `Protein structure ${id}`,
        description: "A molecular structure record from the Protein Data Bank.",
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "RCSB Protein Data Bank",
        sourceUrl: `https://www.rcsb.org/structure/${id}`,
        creator: "RCSB Protein Data Bank",
        date: null,
        category: categoryFromQuery(context.query, "science"),
        tags: list("protein", "molecular structure", id),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: "RCSB Protein Data Bank",
        width: asNumber(800),
        height: asNumber(800),
      }];
    });
  },
};

export default rcsbPdb;