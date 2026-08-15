import { categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type CidResponse = { IdentifierList?: { CID?: number[] } };
type PropertyResponse = { PropertyTable?: { Properties?: Array<Record<string, unknown>> } };

const pubchem: GalleryProvider = {
  id: "pubchem",
  label: "PubChem",
  async search(context): Promise<GalleryItem[]> {
    let cidData: CidResponse;
    try {
      cidData = await fetchJson<CidResponse>(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(context.query)}/cids/JSON`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("HTTP 404")) return [];
      throw error;
    }
    const cids = (cidData.IdentifierList?.CID ?? []).slice((context.page - 1) * context.limit, (context.page - 1) * context.limit + Math.min(context.limit, 12));
    if (cids.length === 0) return [];
    const properties = await fetchJson<PropertyResponse>(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cids.join(",")}/property/Title,IUPACName/JSON`,
    );
    const byCid = new Map((properties.PropertyTable?.Properties ?? []).map((property) => [String(property.CID), property]));
    const rights = usableLicense("Unknown / Verify source", null);
    return cids.map((cid): GalleryItem => {
      const property = byCid.get(String(cid));
      const imageUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;
      return {
        id: `pubchem:${cid}`,
        title: firstText(property?.Title, property?.IUPACName) ?? `PubChem compound ${cid}`,
        description: firstText(property?.IUPACName),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "PubChem",
        sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
        creator: "National Center for Biotechnology Information",
        date: null,
        category: categoryFromQuery(context.query, "science"),
        tags: list("chemical compound", property?.IUPACName),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: "PubChem, National Center for Biotechnology Information",
        width: null,
        height: null,
      };
    });
  },
};

export default pubchem;