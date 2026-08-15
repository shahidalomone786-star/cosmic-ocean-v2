import { asNumber, fetchJson, firstText, list } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type DanbooruPost = Record<string, unknown>;

function queryTags(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "_");
}

const danbooru: GalleryProvider = {
  id: "danbooru",
  label: "Danbooru",
  async search(context): Promise<GalleryItem[]> {
    if (context.safeSearch) return [];
    const sanitizedTag = queryTags(context.query);
    const page = context.page > 1 ? `&page=${context.page}` : "";
    const url = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(sanitizedTag)}+rating:explicit&limit=30${page}`;
    const posts = await fetchJson<DanbooruPost[]>(url, undefined, 5000);

    return posts.flatMap((post) => {
      const imageUrl = firstText(post.large_file_url, post.file_url, post.preview_file_url);
      const thumbnailUrl = firstText(post.preview_file_url, post.large_file_url, post.file_url);
      if (!imageUrl || !thumbnailUrl || String(post.rating ?? "") !== "e") return [];
      const tags = String(post.tag_string ?? "").split(/\s+/).filter(Boolean);
      const id = String(post.id ?? imageUrl);
      return [{
        id: `danbooru:${id}`,
        title: tags.slice(0, 4).join(" ") || "Danbooru explicit image",
        description: "Explicit image record from Danbooru. Verify source before reuse.",
        imageUrl,
        thumbnailUrl,
        source: "Danbooru",
        sourceUrl: `https://danbooru.donmai.us/posts/${id}`,
        creator: list(post.tag_string_artist).join(", ") || null,
        date: firstText(post.created_at),
        category: "adult",
        tags,
        license: "Unknown / Verify source",
        licenseUrl: null,
        licenseClass: "UNKNOWN" as const,
        attribution: "Verify source",
        width: asNumber(post.image_width),
        height: asNumber(post.image_height),
      }];
    });
  },
};

export default danbooru;