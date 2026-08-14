import { fetchJson, firstText } from "../shared";
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
    // PDB image endpoints are intentionally not emitted without per-entry rights metadata.
    // The adapter remains isolated and reports no displayable assets until the archive returns rights.
    return (data.result_set ?? []).flatMap((entry): GalleryItem[] => {
      const id = firstText(entry.identifier);
      return id ? [] : [];
    });
  },
};

export default rcsbPdb;