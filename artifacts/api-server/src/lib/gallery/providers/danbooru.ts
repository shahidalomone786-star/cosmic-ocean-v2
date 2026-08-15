import { asNumber, fetchJson, firstText, list } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type DanbooruPost = Record<string, unknown>;

function queryTags(query: string): string {
  const routingTerms = new Set([
    "nsfw",
    "porn",
    "pornography",
    "hentai",
    "rule34",
    "r34",
    "explicit",
    "erotic",
    "lewd",
    "nude",
    "naked",
    "sexual",
    "sex",
  ]);
  const tags = query
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}_ -]+/gu, " ")
    .split(/\s+/)
    .filter((tag) => tag && !routingTerms.has(tag))
    .slice(0, 8);
  return [...new Set([...tags, "rating:explicit"])].join(" ");
}

const danbooru: GalleryProvider = {
  id: "danbooru",
  label: "Danbooru",
  async search(context): Promise<GalleryItem[]> {
    if (context.safeSearch) return [];
    const url = new URL("https://danbooru.donmai.us/posts.json");
    url.searchParams.set("tags", queryTags(context.query));
    url.searchParams.set("limit", String(Math.min(context.limit, 20)));
    url.searchParams.set("page", String(context.page));
    const posts = await fetchJson<DanbooruPost[]>(url.toString());

    return posts.flatMap((post) => {
      const imageUrl = firstText(post.file_url, post.large_file_url, post.preview_file_url);
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