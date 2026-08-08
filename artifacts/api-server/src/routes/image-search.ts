import { Router } from "express";

const router = Router();
const IMAGE_SEARCH_CACHE_TTL_MS = 10 * 60_000;
const imageSearchCache = new Map<string, { expiresAt: number; images: SearchImage[] }>();

export interface SearchImage {
  id: string;
  title: string;
  imageUrl: string;
  proxyUrl: string;
  sourceUrl: string;
  source: "Wikimedia Commons";
  alt: string;
  width: number;
  height: number;
}

const REJECT_PATTERN = /\b(logo|watermark|watermarked|meme|poster|collage|screenshot|thumbnail|low[- ]?res|pinterest|blog)\b/i;

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|quot|#39|lt|gt);/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevanceScore(title: string, description: string, query: string): number {
  const haystack = `${title} ${description}`.toLowerCase();
  const tokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(token => token.length > 2)
    .slice(0, 10);
  const matches = tokens.filter(token => haystack.includes(token)).length;
  return matches * 12 + (haystack.includes(query.toLowerCase()) ? 20 : 0);
}

async function searchWikimedia(query: string): Promise<SearchImage[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "40");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|mime|size|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Cosmos-Singularity/1.0 image search",
    },
    signal: AbortSignal.timeout(7_000),
  });
  if (!response.ok) throw new Error(`Wikimedia Commons returned ${response.status}`);

  const payload = await response.json() as {
    query?: {
      pages?: Record<string, {
        pageid?: number;
        title?: string;
        canonicalurl?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          mime?: string;
          width?: number;
          height?: number;
          extmetadata?: {
            ImageDescription?: { value?: string };
            Categories?: { value?: string };
          };
        }>;
      }>;
    };
  };

  const seen = new Set<string>();
  return Object.values(payload.query?.pages ?? [])
    .flatMap(page => {
      const info = page.imageinfo?.[0];
      const imageUrl = info?.thumburl ?? info?.url;
      const title = cleanText(page.title ?? "").replace(/^File:\s*/i, "").replace(/_/g, " ");
      const description = cleanText(info?.extmetadata?.ImageDescription?.value ?? "");
      const width = info?.width ?? 0;
      const height = info?.height ?? 0;
      if (
        !page.pageid ||
        !title ||
        !imageUrl ||
        !info?.mime?.startsWith("image/") ||
        width < 640 ||
        height < 360 ||
        width / height < 1.15 ||
        REJECT_PATTERN.test(`${title} ${description} ${info?.extmetadata?.Categories?.value ?? ""}`) ||
        seen.has(imageUrl)
      ) {
        return [];
      }
      seen.add(imageUrl);
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      return [{
        id: `wikimedia-${page.pageid}`,
        title: title.slice(0, 140),
        imageUrl,
        proxyUrl,
        sourceUrl: page.canonicalurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent((page.title ?? "").replace(/ /g, "_"))}`,
        source: "Wikimedia Commons" as const,
        alt: `${title.slice(0, 140)} — image result for ${query.slice(0, 90)}`,
        width,
        height,
        score: relevanceScore(title, description, query),
      }];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ score: _score, ...image }) => image);
}

router.get("/image-search", async (req, res) => {
  const query = typeof req.query.q === "string"
    ? req.query.q.trim().replace(/\s+/g, " ").slice(0, 180)
    : "";

  if (!query) {
    res.json({ query: "", images: [] });
    return;
  }

  const key = query.toLowerCase();
  const cached = imageSearchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ query, images: cached.images });
    return;
  }

  try {
    const images = await searchWikimedia(query);
    imageSearchCache.set(key, { expiresAt: Date.now() + IMAGE_SEARCH_CACHE_TTL_MS, images });
    if (imageSearchCache.size > 200) {
      for (const [cacheKey, entry] of imageSearchCache) {
        if (entry.expiresAt <= Date.now()) imageSearchCache.delete(cacheKey);
      }
    }
    res.json({ query, images });
  } catch (error) {
    console.warn("[image-search] search unavailable", error);
    res.status(502).json({ query, images: [], error: "Image search is temporarily unavailable." });
  }
});

router.get("/image-proxy", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    res.status(400).send("Invalid image URL.");
    return;
  }

  const allowedHosts = new Set(["upload.wikimedia.org", "commons.wikimedia.org"]);
  if (target.protocol !== "https:" || !allowedHosts.has(target.hostname)) {
    res.status(403).send("Image host is not allowed.");
    return;
  }

  try {
    const response = await fetch(target, {
      headers: { Accept: "image/avif,image/webp,image/jpeg,image/png,image/*" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      res.status(response.status).send("Image could not be fetched.");
      return;
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      res.status(415).send("The resource is not an image.");
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(502).send("Image could not be fetched.");
  }
});

export default router;