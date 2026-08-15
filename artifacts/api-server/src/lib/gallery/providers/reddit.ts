import { asNumber, fetchJson, firstText, providerUnavailable } from "../shared";
import type { GalleryItem, GalleryProvider } from "../types";

type RedditChild = {
  data?: Record<string, unknown>;
};

type RedditResponse = {
  data?: {
    children?: RedditChild[];
  };
};

function decodeRedditUrl(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function normalizePreviewUrl(...values: unknown[]): string | null {
  const candidate = firstText(...values);
  if (!candidate) return null;
  const decoded = decodeRedditUrl(candidate);
  try {
    const url = new URL(decoded);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function subredditFromQuery(query: string): string {
  const requested = query.match(/\br\/([a-z0-9_]{2,21})\b/i)?.[1];
  return requested ?? "nsfw";
}

const reddit: GalleryProvider = {
  id: "reddit",
  label: "Reddit Images",
  async search(context): Promise<GalleryItem[]> {
    if (context.safeSearch) return [];
    const subreddit = subredditFromQuery(context.query);
    const url = new URL(`https://www.reddit.com/r/${subreddit}/hot.json`);
    url.searchParams.set("limit", String(Math.min(context.limit, 50)));
    url.searchParams.set("raw_json", "1");
    let data: RedditResponse;
    try {
      data = await fetchJson<RedditResponse>(url.toString(), {
        headers: { "User-Agent": "Cosmic-Ocean-Universal-Gallery/1.0" },
      });
    } catch (error) {
      providerUnavailable("Reddit Images", error instanceof Error ? error.message : "Reddit public feed unavailable");
    }

    return (data.data?.children ?? []).flatMap(({ data: post }) => {
      if (!post || post.stickied || post.is_video) return [];
      const preview = post.preview as Record<string, unknown> | undefined;
      const images = preview?.images as Array<Record<string, unknown>> | undefined;
      const firstImage = images?.[0];
      const source = firstImage?.source as Record<string, unknown> | undefined;
      const resolutions = firstImage?.resolutions as Array<Record<string, unknown>> | undefined;
      const imageUrl = normalizePreviewUrl(source?.url, post.url_overridden_by_dest, post.url);
      const thumbnailUrl = normalizePreviewUrl(
        resolutions?.[Math.min((resolutions?.length ?? 1) - 1, 2)]?.url,
        post.thumbnail,
        source?.url,
      );
      if (!imageUrl || !thumbnailUrl || !/^https?:\/\//i.test(imageUrl)) return [];
      const id = String(post.id ?? imageUrl);
      const permalink = firstText(post.permalink);
      return [{
        id: `reddit:${id}`,
        title: firstText(post.title) ?? "Reddit image",
        description: "Image preview from a public Reddit feed. Verify source before reuse.",
        imageUrl,
        thumbnailUrl,
        source: "Reddit",
        sourceUrl: permalink ? `https://www.reddit.com${permalink}` : `https://www.reddit.com/r/${subreddit}`,
        creator: firstText(post.author),
        date: firstText(post.created_utc),
        category: "adult",
        tags: ["adult", "reddit", subreddit],
        license: "Unknown / Verify source",
        licenseUrl: null,
        licenseClass: "UNKNOWN" as const,
        attribution: "Verify source",
        width: asNumber(source?.width),
        height: asNumber(source?.height),
      }];
    });
  },
};

export default reddit;