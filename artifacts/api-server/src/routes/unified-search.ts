/**
 * GET /api/search/unified?q=TERM&page=1
 *
 * Parallel search across: NASA · Wikipedia · ESA · arXiv · OpenAlex ·
 *   Semantic Scholar · INSPIRE-HEP · YouTube  +  Groq AI summary.
 *
 * - Promise.allSettled → one failure never breaks the others
 * - In-memory LRU cache (15-min TTL, max 200 keys)
 * - Title-based dedup across research sources
 * - Returns structured sections in display order
 */

import { Router } from "express";
import { fetchGroq } from "../lib/groq";

const router = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectionItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  source: string;
  date?: string;
  authors?: string[];
  citationCount?: number;
}

interface VideoItem {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
  isShort?: boolean;
}

export interface SearchResponse {
  query: string;
  page: number;
  aiSummary?: { text: string };
  videos: VideoItem[];
  wikipedia: SectionItem[];
  research: SectionItem[];
  nasa: SectionItem[];
  esa: SectionItem[];
  books: SectionItem[];
  relatedTopics: string[];
  hasMore: boolean;
}

// ── In-memory LRU cache ───────────────────────────────────────────────────────

const cache = new Map<string, { data: SearchResponse; expiresAt: number }>();
const CACHE_TTL = 15 * 60 * 1_000; // 15 min

function getCached(key: string): SearchResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: SearchResponse): void {
  if (cache.size >= 200) {
    const now = Date.now();
    for (const [k, v] of cache) if (now > v.expiresAt) cache.delete(k);
    // Force-evict oldest if still too large
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function safe(fn: () => Promise<SectionItem[] | VideoItem[] | string | null>) {
  return fn().catch(() => null);
}

function timeout(ms: number) { return AbortSignal.timeout(ms); }

// ── Groq AI Summary ───────────────────────────────────────────────────────────

async function fetchAISummary(query: string): Promise<string | null> {
  try {
    const resp = await fetchGroq({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a concise scientific communicator. Write a single paragraph of 2–3 sentences " +
              "giving an accurate, engaging overview of the topic. Be precise and factual. " +
              "No markdown, no bullet points, no headers — plain prose only.",
          },
          { role: "user", content: `Give a 2–3 sentence scientific overview of: ${query}` },
        ],
        max_tokens: 4000,
        temperature: 0.35,
      }),
      signal: timeout(9_000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch { return null; }
}

// ── NASA Images API ───────────────────────────────────────────────────────────

async function fetchNASA(query: string, page: number): Promise<SectionItem[]> {
  const url =
    `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}` +
    `&media_type=image&page=${page}&page_size=15`;
  const resp = await fetch(url, { signal: timeout(9_000) });
  if (!resp.ok) return [];

  type NasaHit = {
    data?: { nasa_id?: string; title?: string; description?: string; date_created?: string }[];
    links?: { href?: string; rel?: string }[];
  };
  const data = await resp.json() as { collection?: { items?: NasaHit[] } };

  return (data.collection?.items ?? []).slice(0, 15).map(item => {
    const d = item.data?.[0] ?? {};
    return {
      id: `nasa-${d.nasa_id ?? Math.random().toString(36).slice(2)}`,
      title: d.title ?? "NASA Image",
      description: (d.description ?? "").slice(0, 300),
      imageUrl:
        item.links?.find(l => l.rel === "preview")?.href ??
        item.links?.[0]?.href,
      url: d.nasa_id
        ? `https://images.nasa.gov/details/${d.nasa_id}`
        : "https://images.nasa.gov",
      source: "nasa",
      date: d.date_created?.slice(0, 10),
    };
  });
}

// ── Wikipedia API ─────────────────────────────────────────────────────────────

async function fetchWikipedia(query: string, page: number): Promise<SectionItem[]> {
  const offset = (page - 1) * 15;
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=15&gsroffset=${offset}` +
    `&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=600` +
    `&format=json&origin=*`;
  const resp = await fetch(url, { signal: timeout(9_000) });
  if (!resp.ok) return [];

  type WikiPage = {
    pageid?: number;
    title?: string;
    extract?: string;
    thumbnail?: { source?: string };
  };
  const data = await resp.json() as { query?: { pages?: Record<string, WikiPage> } };

  return Object.values(data.query?.pages ?? {}).map(p => ({
    id: `wiki-${p.pageid ?? Math.random()}`,
    title: p.title ?? "Wikipedia Article",
    description: (p.extract ?? "").slice(0, 300),
    imageUrl: p.thumbnail?.source,
    url: p.title
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`
      : undefined,
    source: "wiki",
  }));
}

// ── ESA Hubble API ────────────────────────────────────────────────────────────

async function fetchESA(query: string, page: number): Promise<SectionItem[]> {
  const url =
    `https://esahubble.org/api/v2/images/?search=${encodeURIComponent(query)}` +
    `&format=json&page=${page}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: timeout(9_000),
  });
  if (!resp.ok) return [];

  type EsaItem = {
    id?: string;
    title?: string;
    description?: string;
    published?: string;
    image_url?: string;
    wallpapers?: { url?: string }[];
  };
  const data = await resp.json() as { results?: EsaItem[] };

  return (data.results ?? []).slice(0, 15).map(item => {
    const imageUrl =
      item.image_url ??
      item.wallpapers?.[0]?.url ??
      (item.id ? `https://esahubble.org/media/archives/images/screen/${item.id}.jpg` : undefined);
    return {
      id: `esa-${item.id ?? Math.random().toString(36).slice(2)}`,
      title: item.title ?? "ESA Hubble Image",
      description: (item.description ?? "").replace(/<[^>]+>/g, "").slice(0, 300),
      imageUrl,
      url: item.id
        ? `https://esahubble.org/images/${item.id}/`
        : "https://esahubble.org",
      source: "esa",
      date: item.published?.slice(0, 10),
    };
  });
}

// ── arXiv API ─────────────────────────────────────────────────────────────────

async function fetchArXiv(query: string, page: number): Promise<SectionItem[]> {
  const start = (page - 1) * 15;
  const url =
    `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}` +
    `&max_results=15&start=${start}&sortBy=relevance`;
  const resp = await fetch(url, {
    headers: { Accept: "application/atom+xml" },
    signal: timeout(8_000), // cap at 8 s to prevent proxy-level 502
  });
  if (!resp.ok) return [];

  const xml = await resp.text();
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const items: SectionItem[] = [];
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(xml)) !== null) {
    const e = m[1];
    const rawId = /<id>(.*?)<\/id>/.exec(e)?.[1] ?? "";
    const arxivId = rawId.replace(/^.*\/abs\//, "").replace(/v\d+$/, "").trim();
    if (!arxivId) continue;
    const title =
      /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/.exec(e)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
    const summary =
      /<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/.exec(e)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
    const published = /<published>(.*?)<\/published>/.exec(e)?.[1]?.slice(0, 10) ?? "";
    const authors = [...e.matchAll(/<name>(.*?)<\/name>/g)].map(a => a[1].trim());
    if (title && arxivId) {
      items.push({
        id: `arxiv-${arxivId}`,
        title,
        description: summary.slice(0, 300),
        url: `https://arxiv.org/abs/${arxivId}`,
        source: "arxiv",
        date: published,
        authors: authors.slice(0, 4),
      });
    }
  }
  return items;
}

// ── OpenAlex API — papers ─────────────────────────────────────────────────────

function reconstructAbstract(idx: Record<string, number[]> | undefined): string {
  if (!idx) return "";
  const positions: [number, string][] = [];
  for (const [word, pos] of Object.entries(idx)) {
    for (const p of pos) positions.push([p, word]);
  }
  return positions
    .sort((a, b) => a[0] - b[0])
    .map(p => p[1])
    .join(" ")
    .slice(0, 300);
}

type OpenAlexWork = {
  id?: string;
  title?: string;
  abstract_inverted_index?: Record<string, number[]>;
  publication_date?: string;
  authorships?: { author?: { display_name?: string } }[];
  cited_by_count?: number;
  doi?: string;
  concepts?: { display_name?: string; score?: number }[];
};

async function fetchOpenAlex(
  query: string,
  page: number,
  filter: string,
  sourcePrefix: string,
): Promise<{ items: SectionItem[]; concepts: string[] }> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
    `&per-page=15&page=${page}&filter=${encodeURIComponent(filter)}` +
    `&sort=relevance_score:desc&mailto=cosmos%40biohub.app`;
  const resp = await fetch(url, { signal: timeout(9_000) });
  if (!resp.ok) return { items: [], concepts: [] };

  const data = await resp.json() as { results?: OpenAlexWork[] };
  const concepts: string[] = [];

  const items = (data.results ?? []).map(w => {
    // collect high-score concepts for related topics
    for (const c of w.concepts ?? []) {
      if ((c.score ?? 0) > 0.4 && c.display_name) concepts.push(c.display_name);
    }
    return {
      id: `${sourcePrefix}-${w.id?.split("/").pop() ?? Math.random().toString(36).slice(2)}`,
      title: w.title ?? "Paper",
      description: reconstructAbstract(w.abstract_inverted_index),
      url: w.doi ? `https://doi.org/${w.doi}` : w.id ?? undefined,
      source: sourcePrefix,
      date: w.publication_date?.slice(0, 10),
      authors: (w.authorships ?? [])
        .slice(0, 3)
        .map(a => a.author?.display_name ?? "")
        .filter(Boolean),
      citationCount: w.cited_by_count,
    } satisfies SectionItem;
  });

  return { items, concepts };
}

// ── Semantic Scholar API ──────────────────────────────────────────────────────

async function fetchSemanticScholar(query: string, page: number): Promise<SectionItem[]> {
  const offset = (page - 1) * 15;
  const url =
    `https://api.semanticscholar.org/graph/v1/paper/search` +
    `?query=${encodeURIComponent(query)}&limit=15&offset=${offset}` +
    `&fields=title,abstract,authors,year,citationCount,externalIds`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "CosmosScience/1.0" },
    signal: timeout(9_000),
  });
  if (!resp.ok) return [];

  type SSPaper = {
    paperId?: string;
    title?: string;
    abstract?: string;
    authors?: { name?: string }[];
    year?: number;
    citationCount?: number;
    externalIds?: { DOI?: string; ArXiv?: string };
  };
  const data = await resp.json() as { data?: SSPaper[] };

  return (data.data ?? []).map(p => ({
    id: `ss-${p.paperId ?? Math.random().toString(36).slice(2)}`,
    title: p.title ?? "Semantic Scholar Paper",
    description: (p.abstract ?? "").slice(0, 300),
    url: p.externalIds?.DOI
      ? `https://doi.org/${p.externalIds.DOI}`
      : p.externalIds?.ArXiv
        ? `https://arxiv.org/abs/${p.externalIds.ArXiv}`
        : `https://www.semanticscholar.org/paper/${p.paperId}`,
    source: "semanticscholar",
    date: p.year ? String(p.year) : undefined,
    authors: (p.authors ?? []).slice(0, 3).map(a => a.name ?? "").filter(Boolean),
    citationCount: p.citationCount,
  }));
}

// ── INSPIRE-HEP API ───────────────────────────────────────────────────────────

async function fetchInspireHEP(query: string, page: number): Promise<SectionItem[]> {
  const url =
    `https://inspirehep.net/api/literature?sort=mostrecent&size=15&page=${page}` +
    `&q=${encodeURIComponent(query)}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: timeout(9_000),
  });
  if (!resp.ok) return [];

  type IHit = {
    id?: string;
    metadata?: {
      titles?: { title?: string }[];
      abstracts?: { value?: string }[];
      authors?: { full_name?: string }[];
      publication_info?: { year?: number }[];
      citation_count?: number;
      arxiv_eprints?: { value?: string }[];
      dois?: { value?: string }[];
    };
  };
  const data = await resp.json() as { hits?: { hits?: IHit[] } };

  return (data.hits?.hits ?? []).map(h => {
    const m = h.metadata ?? {};
    const arxivId = m.arxiv_eprints?.[0]?.value;
    const doi = m.dois?.[0]?.value;
    return {
      id: `inspire-${h.id ?? Math.random().toString(36).slice(2)}`,
      title: m.titles?.[0]?.title ?? "INSPIRE-HEP Paper",
      description: (m.abstracts?.[0]?.value ?? "").slice(0, 300),
      url: doi
        ? `https://doi.org/${doi}`
        : arxivId
          ? `https://arxiv.org/abs/${arxivId}`
          : `https://inspirehep.net/literature/${h.id}`,
      source: "inspirehep",
      date: m.publication_info?.[0]?.year ? String(m.publication_info[0].year) : undefined,
      authors: (m.authors ?? []).slice(0, 3).map(a => a.full_name ?? "").filter(Boolean),
      citationCount: m.citation_count,
    };
  });
}

// ── YouTube (internal web client — no API key needed) ─────────────────────────

type YTRenderer = {
  videoRenderer?: {
    videoId?: string;
    title?: { runs?: { text: string }[] };
    longBylineText?: { runs?: { text: string }[] };
    descriptionSnippet?: { runs?: { text: string }[] };
  };
};
type YTSection = { itemSectionRenderer?: { contents?: YTRenderer[] } };
type YTResponse = {
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents?: {
        sectionListRenderer?: { contents?: YTSection[] };
      };
    };
  };
};

async function ytSearch(query: string, isShort: boolean): Promise<VideoItem[]> {
  const YT_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
  const resp = await fetch(
    `https://www.youtube.com/youtubei/v1/search?key=${YT_KEY}&prettyPrint=false`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
        Origin: "https://www.youtube.com",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        query: isShort ? `${query} #shorts` : query,
        params: "EgIQAQ%3D%3D", // videos only
      }),
      signal: timeout(12_000),
    },
  );
  if (!resp.ok) return [];

  const data = await resp.json() as YTResponse;
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];

  const renderers: YTRenderer[] = sections.flatMap(s => s?.itemSectionRenderer?.contents ?? []);

  return renderers
    .filter(r => r.videoRenderer?.videoId)
    .slice(0, isShort ? 12 : 8)
    .map(r => {
      const vr = r.videoRenderer!;
      const videoId = vr.videoId ?? "";
      return {
        videoId,
        title: vr.title?.runs?.map(r => r.text).join("") ?? "Untitled",
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        channelTitle: vr.longBylineText?.runs?.map(r => r.text).join("") ?? "",
        description: vr.descriptionSnippet?.runs?.map(r => r.text).join("") ?? "",
        isShort,
      };
    })
    .filter(v => v.videoId.length > 0);
}

async function fetchYouTube(query: string): Promise<VideoItem[]> {
  // Run regular videos + shorts-specific query in parallel
  const [regular, shorts] = await Promise.all([
    ytSearch(query, false).catch(() => [] as VideoItem[]),
    ytSearch(query, true).catch(()  => [] as VideoItem[]),
  ]);

  // Merge: shorts first (so they appear in results), dedup by videoId
  const seen = new Set<string>();
  const merged: VideoItem[] = [];
  for (const v of [...shorts, ...regular]) {
    if (!v.videoId || seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    merged.push(v);
  }
  return merged.slice(0, 16);
}

// ── Main route ────────────────────────────────────────────────────────────────

router.get("/search/unified", async (req, res) => {
  const q    = ((req.query.q as string) ?? "").trim();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));

  if (!q) {
    res.json({
      query: "", page: 1,
      videos: [], wikipedia: [], research: [], nasa: [], esa: [], books: [],
      relatedTopics: [], hasMore: false,
    } satisfies SearchResponse);
    return;
  }

  const cacheKey = `${q.toLowerCase()}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  // ── Fire all sources simultaneously ─────────────────────────────────────────
  const [
    aiResult,
    ytResult,
    wikiResult,
    nasaResult,
    esaResult,
    arxivResult,
    openalexResult,
    booksResult,
    ssResult,
    inspireResult,
  ] = await Promise.allSettled([
    fetchAISummary(q),
    fetchYouTube(q),
    fetchWikipedia(q, page),
    fetchNASA(q, page),
    fetchESA(q, page),
    fetchArXiv(q, page),
    fetchOpenAlex(q, page, "type:article", "openalex"),
    fetchOpenAlex(q, page, "type:book", "book"),
    fetchSemanticScholar(q, page),
    fetchInspireHEP(q, page),
  ]);

  const settled = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const aiText = settled(aiResult, null as string | null);
  const videos = settled(ytResult, [] as VideoItem[]);
  const wikipedia = settled(wikiResult, [] as SectionItem[]);
  const nasa = settled(nasaResult, [] as SectionItem[]);
  const esa = settled(esaResult, [] as SectionItem[]);
  const arxiv = settled(arxivResult, [] as SectionItem[]);
  const { items: openalexItems, concepts: oaConcepts } = settled(openalexResult, { items: [] as SectionItem[], concepts: [] as string[] });
  const { items: bookItems } = settled(booksResult, { items: [] as SectionItem[], concepts: [] as string[] });
  const ssItems = settled(ssResult, [] as SectionItem[]);
  const inspireItems = settled(inspireResult, [] as SectionItem[]);

  // ── Merge & dedup research papers (arXiv + OpenAlex + SS + INSPIRE) ───────
  const seenTitles = new Set<string>();
  const research: SectionItem[] = [];

  for (const item of [...arxiv, ...openalexItems, ...ssItems, ...inspireItems]) {
    const key = normalizeTitle(item.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    research.push(item);
    if (research.length >= 50) break;
  }

  // Sort by citation count (desc) where available, keep others in insertion order
  research.sort((a, b) => {
    if (a.citationCount !== undefined && b.citationCount !== undefined) {
      return b.citationCount - a.citationCount;
    }
    return 0;
  });

  // ── Related topics from OpenAlex concepts ─────────────────────────────────
  const topicCounts = new Map<string, number>();
  for (const c of oaConcepts) {
    topicCounts.set(c, (topicCounts.get(c) ?? 0) + 1);
  }
  const relatedTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  // ── hasMore: true if any source returned a full page ─────────────────────
  // Thresholds are set at ~2/3 of the per-page limit (15) so a slightly
  // sparse result still triggers pagination rather than stopping too early.
  const hasMore =
    nasa.length >= 10 ||
    wikipedia.length >= 10 ||
    research.length >= 25 ||
    esa.length >= 10 ||
    bookItems.length >= 10;

  const response: SearchResponse = {
    query: q,
    page,
    aiSummary: aiText ? { text: aiText } : undefined,
    videos: (videos as VideoItem[]),
    wikipedia,
    research,
    nasa,
    esa,
    books: bookItems,
    relatedTopics,
    hasMore,
  };

  setCache(cacheKey, response);
  res.json(response);
});

export default router;
