import { asNumber, fetchJson, firstText, list } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type EpornerRecord = Record<string, unknown>;

function record(value: unknown): EpornerRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as EpornerRecord
    : null;
}

function imageCandidate(value: unknown): { src: string; width: number | null; height: number | null; rank: number } | null {
  const thumb = record(value);
  if (!thumb) return null;
  const src = firstText(thumb.src, thumb.url, thumb.href);
  if (!src) return null;
  const width = asNumber(thumb.width ?? thumb.w);
  const height = asNumber(thumb.height ?? thumb.h);
  return { src, width, height, rank: 0 };
}

function selectMaximumQualityImage(item: EpornerRecord): { src: string; width: number | null; height: number | null } | null {
  const thumbs = Array.isArray(item.thumbs) ? item.thumbs : [];
  const candidates = thumbs
    .map(imageCandidate)
    .filter((candidate): candidate is NonNullable<ReturnType<typeof imageCandidate>> => Boolean(candidate))
    .map((candidate, index) => ({ ...candidate, rank: index }));

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      const aArea = (a.width ?? 0) * (a.height ?? 0);
      const bArea = (b.width ?? 0) * (b.height ?? 0);
      if (aArea !== bArea) return bArea - aArea;
      return b.rank - a.rank;
    });
    const selected = candidates[0];
    return { src: selected.src, width: selected.width, height: selected.height };
  }

  const fallback = imageCandidate(item.default_thumb);
  return fallback
    ? { src: fallback.src, width: fallback.width, height: fallback.height }
    : null;
}

function responseRecords(payload: unknown): EpornerRecord[] {
  if (Array.isArray(payload)) return payload.flatMap((item) => {
    const parsed = record(item);
    return parsed ? [parsed] : [];
  });
  const response = record(payload);
  if (!response) return [];
  for (const key of ["videos", "results", "items"]) {
    if (!Array.isArray(response[key])) continue;
    return response[key].flatMap((item) => {
      const parsed = record(item);
      return parsed ? [parsed] : [];
    });
  }
  return [];
}

const eporner: GalleryProvider = {
  id: "eporner",
  label: "Eporner",
  async search(context): Promise<GalleryItem[]> {
    if (context.safeSearch) return [];
    const url = `https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(context.query)}&per_page=30&format=json`;
    const payload = await fetchJson<unknown>(url, undefined, 5000);

    return responseRecords(payload).flatMap((item) => {
      const selectedImage = selectMaximumQualityImage(item);
      if (!selectedImage) return [];

      const id = firstText(item.id, item.video_id, selectedImage.src) ?? selectedImage.src;
      const sourceUrl = firstText(item.url, item.video_url) ?? `https://www.eporner.com/video/${id}`;
      const tags = list(item.tags, item.keywords, item.categories);
      return [{
        id: `eporner:${id}`,
        title: firstText(item.title, item.name) ?? "Eporner archival video",
        description: firstText(item.description, item.title) ?? "Mature media record from Eporner. Verify source before reuse.",
        imageUrl: selectedImage.src,
        thumbnailUrl: selectedImage.src,
        source: "Eporner",
        sourceUrl,
        creator: firstText(item.uploader, item.user, item.author),
        date: firstText(item.created_at, item.date, item.uploaded_at),
        category: "adult",
        tags,
        license: "Unknown / Verify source",
        licenseUrl: null,
        licenseClass: "UNKNOWN" as const,
        attribution: "Verify source",
        width: selectedImage.width ?? asNumber(item.width),
        height: selectedImage.height ?? asNumber(item.height),
      }];
    });
  },
  getNextPage: () => null,
};

export default eporner;