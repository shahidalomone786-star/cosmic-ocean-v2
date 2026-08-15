import { asNumber, categoryFromQuery, fetchJson, firstText, list, usableLicense } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type SearchResponse = { response?: { docs?: Array<Record<string, unknown>> } };
type MetadataResponse = { metadata?: Record<string, unknown>; files?: Array<Record<string, unknown>> };

const internetArchive: GalleryProvider = {
  id: "internet-archive",
  label: "Internet Archive",
  async search(context): Promise<GalleryItem[]> {
    const url = new URL("https://archive.org/advancedsearch.php");
    url.searchParams.set("q", `(${context.query}) AND mediatype:image`);
    for (const field of ["identifier", "title", "description", "creator", "date", "licenseurl", "rights"]) {
      url.searchParams.append("fl[]", field);
    }
    url.searchParams.set("rows", String(Math.min(context.limit, 12)));
    url.searchParams.set("page", String(context.page));
    url.searchParams.set("output", "json");
    const data = await fetchJson<SearchResponse>(url.toString());
    const docs = data.response?.docs ?? [];
    const records = await Promise.all(docs.map(async (doc) => {
      const identifier = firstText(doc.identifier);
      if (!identifier) return null;
      const metadata = await fetchJson<MetadataResponse>(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
      const file = (metadata.files ?? []).find((candidate) => {
        const format = firstText(candidate.format)?.toLowerCase() ?? "";
        const name = firstText(candidate.name)?.toLowerCase() ?? "";
        return /\.(jpe?g|png|webp)$/i.test(name) || /image\/|jpeg|png|webp/.test(format);
      });
      const name = firstText(file?.name);
      if (!name) return null;
      const imageUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${name.split("/").map(encodeURIComponent).join("/")}`;
      const rights = usableLicense(
        firstText(metadata.metadata?.licenseurl, doc.licenseurl, metadata.metadata?.rights, doc.rights),
        firstText(metadata.metadata?.licenseurl, doc.licenseurl),
      );
      return {
        id: `internet-archive:${identifier}`,
        title: firstText(doc.title, metadata.metadata?.title) ?? identifier,
        description: firstText(doc.description, metadata.metadata?.description),
        imageUrl,
        thumbnailUrl: imageUrl,
        source: "Internet Archive",
        sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
        creator: firstText(doc.creator, metadata.metadata?.creator),
        date: firstText(doc.date, metadata.metadata?.date),
        category: categoryFromQuery(context.query, "history"),
        tags: list(metadata.metadata?.subject, metadata.metadata?.collection),
        license: rights.license,
        licenseUrl: rights.licenseUrl,
        licenseClass: rights.licenseClass,
        attribution: firstText(metadata.metadata?.contributor, metadata.metadata?.creator, doc.creator),
        width: asNumber(file?.width),
        height: asNumber(file?.height),
      } satisfies GalleryItem;
    }));
    return records.flatMap((record) => record ? [record] : []);
  },
};

export default internetArchive;