/**
 * Discovery API — structured knowledge data from real external sources.
 * Never fabricates data. Returns empty arrays when no reliable data exists.
 *
 * GET /api/discovery/topics?q=TERM[&sources=openalex,wiki]
 * GET /api/discovery/authors?q=TERM[&sources=openalex,ss,inspire]
 * GET /api/discovery/connections?q=TERM[&sources=openalex,wiki]
 *
 * All three endpoints:
 *  - In-memory LRU cache (15-min TTL, 200 slots each)
 *  - Per-source AbortSignal timeouts (≤8 s)
 *  - Promise.all with individual .catch(() => []) — one failure never breaks others
 *  - 400 on missing / empty query; 200 with empty arrays on weak data
 */

import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class LRUCache<T> {
  private readonly map = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.map.size >= this.max) {
      const now = Date.now();
      for (const [k, v] of this.map) {
        if (now > v.expiresAt) this.map.delete(k);
      }
      // Evict oldest if still full
      if (this.map.size >= this.max) {
        this.map.delete(this.map.keys().next().value!);
      }
    }
    this.map.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }
}

const CACHE_TTL = 15 * 60 * 1_000;

const topicsCache      = new LRUCache<TopicSuggestion[]>(200, CACHE_TTL);
const authorsCache     = new LRUCache<AuthorResult[]>(200, CACHE_TTL);
const connectionsCache = new LRUCache<Connection[]>(200, CACHE_TTL);

// ─── Abort signal helper ──────────────────────────────────────────────────────

function sig(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface TopicSuggestion {
  /** Human-readable topic label */
  label: string;
  /** Suggested search query for this topic */
  query: string;
  /** Data origin: "openalex" | "wikipedia" */
  source: string;
  /** Relevance score 0–1 derived from source ranking */
  confidence: number;
}

export interface AuthorResult {
  name: string;
  /** Data origin: "openalex" | "semanticscholar" | "inspirehep" */
  source: string;
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
  profileUrl?: string;
  /** Relevance score 0–1 derived from source ranking */
  confidence: number;
}

export interface Connection {
  concept: string;
  relatedTo: string;
  /** "broader" | "narrower" | "related" */
  relationType: string;
  /** Data origin: "openalex" | "wikipedia" */
  source: string;
}

// ─── Topics — OpenAlex concepts ───────────────────────────────────────────────

type OAConcept = {
  display_name?: string;
  level?: number;
  score?: number;
  related_concepts?: { display_name?: string; score?: number }[];
};

async function topicsFromOpenAlexConcepts(
  query: string,
): Promise<TopicSuggestion[]> {
  const url =
    `https://api.openalex.org/concepts?search=${encodeURIComponent(query)}` +
    `&per-page=12&select=display_name,level,score,related_concepts` +
    `&mailto=cosmos%40replit.app`;

  const resp = await fetch(url, { signal: sig(8_000) });
  if (!resp.ok) return [];

  const data = (await resp.json()) as { results?: OAConcept[] };
  const out: TopicSuggestion[] = [];

  for (const c of data.results ?? []) {
    if (!c.display_name) continue;
    out.push({
      label:      c.display_name,
      query:      c.display_name,
      source:     "openalex",
      confidence: Math.min(1, c.score ?? 0.5),
    });
    // Surface high-confidence related concepts attached to this concept
    for (const rc of c.related_concepts ?? []) {
      if (!rc.display_name || (rc.score ?? 0) < 0.4) continue;
      out.push({
        label:      rc.display_name,
        query:      rc.display_name,
        source:     "openalex",
        confidence: Math.min(1, (rc.score ?? 0.4) * 0.85),
      });
    }
  }
  return out;
}

// ─── Topics — OpenAlex concept tags from top papers ──────────────────────────

async function topicsFromOpenAlexWorks(
  query: string,
): Promise<TopicSuggestion[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
    `&per-page=10&sort=relevance_score:desc&select=concepts` +
    `&mailto=cosmos%40replit.app`;

  const resp = await fetch(url, { signal: sig(8_000) });
  if (!resp.ok) return [];

  type Work = { concepts?: { display_name?: string; score?: number }[] };
  const data = (await resp.json()) as { results?: Work[] };

  const accumulated = new Map<string, number>();
  for (const w of data.results ?? []) {
    for (const c of w.concepts ?? []) {
      if (!c.display_name || (c.score ?? 0) < 0.35) continue;
      accumulated.set(
        c.display_name,
        (accumulated.get(c.display_name) ?? 0) + (c.score ?? 0),
      );
    }
  }

  // Normalise accumulated score: up to 10 papers each contributing ≤1 → max ≈ 10
  return [...accumulated.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, score]) => ({
      label:      name,
      query:      name,
      source:     "openalex",
      confidence: Math.min(1, score / 5),
    }));
}

// ─── Topics — Wikipedia opensearch ───────────────────────────────────────────

async function topicsFromWikipedia(query: string): Promise<TopicSuggestion[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=opensearch` +
    `&search=${encodeURIComponent(query)}&limit=8&format=json&origin=*`;

  const resp = await fetch(url, { signal: sig(7_000) });
  if (!resp.ok) return [];

  // Opensearch returns [searchTerm, [titles], [descriptions], [urls]]
  const data = (await resp.json()) as [string, string[], string[], string[]];
  const titles: string[] = data[1] ?? [];

  return titles
    .filter(t => t.toLowerCase() !== query.toLowerCase())
    .slice(0, 6)
    .map((title, i) => ({
      label:      title,
      query:      title,
      source:     "wikipedia",
      confidence: Math.max(0.3, 0.75 - i * 0.07),
    }));
}

// ─── Authors — OpenAlex ───────────────────────────────────────────────────────

type OAAuthor = {
  display_name?: string;
  works_count?: number;
  cited_by_count?: number;
  ids?: { orcid?: string; openalex?: string };
};

async function authorsFromOpenAlex(query: string): Promise<AuthorResult[]> {
  const url =
    `https://api.openalex.org/authors?search=${encodeURIComponent(query)}` +
    `&per-page=10&select=display_name,works_count,cited_by_count,ids` +
    `&mailto=cosmos%40replit.app`;

  const resp = await fetch(url, { signal: sig(8_000) });
  if (!resp.ok) return [];

  const data = (await resp.json()) as { results?: OAAuthor[] };

  return (data.results ?? [])
    .filter(a => a.display_name)
    .slice(0, 8)
    .map((a, i) => {
      const oaId = a.ids?.openalex?.split("/").pop();
      const orcid = a.ids?.orcid?.replace("https://orcid.org/", "");
      const profileUrl = oaId
        ? `https://openalex.org/authors/${oaId}`
        : orcid
          ? `https://orcid.org/${orcid}`
          : undefined;
      return {
        name:          a.display_name!,
        source:        "openalex",
        paperCount:    a.works_count,
        citationCount: a.cited_by_count,
        profileUrl,
        confidence:    Math.max(0.3, 0.9 - i * 0.07),
      };
    });
}

// ─── Authors — Semantic Scholar ───────────────────────────────────────────────

type SSAuthor = {
  authorId?: string;
  name?: string;
  paperCount?: number;
  citationCount?: number;
  hIndex?: number;
};

async function authorsFromSemanticScholar(
  query: string,
): Promise<AuthorResult[]> {
  const url =
    `https://api.semanticscholar.org/graph/v1/author/search` +
    `?query=${encodeURIComponent(query)}&limit=8` +
    `&fields=name,paperCount,citationCount,hIndex`;

  const resp = await fetch(url, {
    headers: { "User-Agent": "CosmosScience/1.0" },
    signal: sig(8_000),
  });
  if (!resp.ok) return [];

  const data = (await resp.json()) as { data?: SSAuthor[] };

  return (data.data ?? [])
    .filter(a => a.name)
    .slice(0, 8)
    .map((a, i) => ({
      name:          a.name!,
      source:        "semanticscholar",
      paperCount:    a.paperCount,
      citationCount: a.citationCount,
      hIndex:        a.hIndex,
      profileUrl:    a.authorId
        ? `https://www.semanticscholar.org/author/${a.authorId}`
        : undefined,
      confidence: Math.max(0.3, 0.88 - i * 0.06),
    }));
}

// ─── Authors — INSPIRE-HEP ────────────────────────────────────────────────────

type IAuthor = {
  id?: string;
  metadata?: {
    name?: { value?: string; preferred_name?: string };
  };
};

async function authorsFromInspireHEP(query: string): Promise<AuthorResult[]> {
  const url =
    `https://inspirehep.net/api/authors?sort=mostrecent&size=8` +
    `&q=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: sig(8_000),
  });
  if (!resp.ok) return [];

  const data = (await resp.json()) as { hits?: { hits?: IAuthor[] } };

  return (data.hits?.hits ?? [])
    .filter(h => h.metadata?.name?.value)
    .slice(0, 8)
    .map((h, i) => {
      const name =
        h.metadata!.name!.preferred_name ?? h.metadata!.name!.value ?? "";
      return {
        name,
        source:     "inspirehep",
        profileUrl: h.id
          ? `https://inspirehep.net/authors/${h.id}`
          : undefined,
        confidence: Math.max(0.3, 0.85 - i * 0.06),
      };
    });
}

// ─── Connections — OpenAlex concept hierarchy ─────────────────────────────────

type OAConceptFull = {
  display_name?: string;
  level?: number;
  ancestors?: { display_name?: string; level?: number }[];
  related_concepts?: { display_name?: string; level?: number }[];
};

async function connectionsFromOpenAlex(query: string): Promise<Connection[]> {
  const url =
    `https://api.openalex.org/concepts?search=${encodeURIComponent(query)}` +
    `&per-page=5&select=display_name,ancestors,related_concepts,level` +
    `&mailto=cosmos%40replit.app`;

  const resp = await fetch(url, { signal: sig(8_000) });
  if (!resp.ok) return [];

  const data = (await resp.json()) as { results?: OAConceptFull[] };
  const conns: Connection[] = [];

  for (const c of (data.results ?? []).slice(0, 3)) {
    if (!c.display_name) continue;

    // Ancestors are broader/parent concepts in the hierarchy
    for (const anc of (c.ancestors ?? []).slice(0, 5)) {
      if (!anc.display_name) continue;
      conns.push({
        concept:      c.display_name,
        relatedTo:    anc.display_name,
        relationType: "broader",
        source:       "openalex",
      });
    }

    // Peer concepts at the same or adjacent level
    for (const rc of (c.related_concepts ?? []).slice(0, 6)) {
      if (!rc.display_name) continue;
      const relationType =
        (rc.level ?? c.level ?? 0) < (c.level ?? 0) ? "broader" : "related";
      conns.push({
        concept:      c.display_name,
        relatedTo:    rc.display_name,
        relationType,
        source:       "openalex",
      });
    }
  }

  return conns;
}

// ─── Connections — Wikipedia linked pages ────────────────────────────────────

async function connectionsFromWikipedia(query: string): Promise<Connection[]> {
  // Step 1: resolve the best matching page title via opensearch
  const osResp = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch` +
    `&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`,
    { signal: sig(6_000) },
  );
  if (!osResp.ok) return [];

  const os = (await osResp.json()) as [string, string[]];
  const pageTitle = os[1]?.[0];
  if (!pageTitle) return [];

  // Step 2: fetch internal links from that page
  const linkUrl =
    `https://en.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(pageTitle)}` +
    `&prop=links&pllimit=25&format=json&origin=*`;

  const linkResp = await fetch(linkUrl, { signal: sig(6_000) });
  if (!linkResp.ok) return [];

  type WikiPage = { links?: { title: string }[] };
  const linkData = (await linkResp.json()) as {
    query?: { pages?: Record<string, WikiPage> };
  };

  const rawLinks =
    Object.values(linkData.query?.pages ?? {})[0]?.links ?? [];

  return rawLinks
    .filter(
      l =>
        l.title &&
        !l.title.startsWith("Wikipedia:") &&
        !l.title.startsWith("File:") &&
        !l.title.startsWith("Template:") &&
        !l.title.startsWith("Help:") &&
        !l.title.startsWith("Portal:"),
    )
    .slice(0, 10)
    .map(l => ({
      concept:      pageTitle,
      relatedTo:    l.title,
      relationType: "related",
      source:       "wikipedia",
    }));
}

// ─── Dedup + merge helpers ────────────────────────────────────────────────────

function dedupTopics(
  items: TopicSuggestion[],
  queryLower: string,
): TopicSuggestion[] {
  const seen = new Set<string>();
  return items
    .filter(t => {
      const k = t.label.toLowerCase();
      if (k === queryLower || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

function dedupAuthors(items: AuthorResult[]): AuthorResult[] {
  const seen = new Set<string>();
  return items
    .filter(a => {
      const k = a.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

function dedupConnections(items: Connection[]): Connection[] {
  const seen = new Set<string>();
  return items
    .filter(c => {
      const k = `${c.concept.toLowerCase()}::${c.relatedTo.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 24);
}

// ─── Helper: parse comma-separated source filter from query string ────────────

function parseSources(raw: unknown, defaults: string[]): string[] {
  if (typeof raw !== "string" || !raw.trim()) return defaults;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

// ─── Route: GET /api/discovery/topics ────────────────────────────────────────

router.get(
  "/discovery/topics",
  async (req, res): Promise<void> => {
    const q = ((req.query.q as string) ?? "").trim();
    if (!q) {
      res.status(400).json({ error: "Missing required query parameter: q" });
      return;
    }

    const sources = parseSources(req.query.sources, ["openalex", "wiki"]);
    const cacheKey = `topics:${q.toLowerCase()}:${[...sources].sort().join(",")}`;

    const cached = topicsCache.get(cacheKey);
    if (cached) {
      res.json({ topics: cached });
      return;
    }

    const tasks: Promise<TopicSuggestion[]>[] = [];

    if (sources.includes("openalex")) {
      tasks.push(
        topicsFromOpenAlexConcepts(q).catch(err => {
          req.log.warn({ err }, "openalex concepts fetch failed");
          return [] as TopicSuggestion[];
        }),
        topicsFromOpenAlexWorks(q).catch(err => {
          req.log.warn({ err }, "openalex works concepts fetch failed");
          return [] as TopicSuggestion[];
        }),
      );
    }
    if (sources.includes("wiki")) {
      tasks.push(
        topicsFromWikipedia(q).catch(err => {
          req.log.warn({ err }, "wikipedia opensearch fetch failed");
          return [] as TopicSuggestion[];
        }),
      );
    }

    const results = await Promise.all(tasks);
    const topics = dedupTopics(results.flat(), q.toLowerCase());

    topicsCache.set(cacheKey, topics);
    res.json({ topics });
  },
);

// ─── Route: GET /api/discovery/authors ───────────────────────────────────────

router.get(
  "/discovery/authors",
  async (req, res): Promise<void> => {
    const q = ((req.query.q as string) ?? "").trim();
    if (!q) {
      res.status(400).json({ error: "Missing required query parameter: q" });
      return;
    }

    const sources = parseSources(req.query.sources, [
      "openalex",
      "ss",
      "inspire",
    ]);
    const cacheKey = `authors:${q.toLowerCase()}:${[...sources].sort().join(",")}`;

    const cached = authorsCache.get(cacheKey);
    if (cached) {
      res.json({ authors: cached });
      return;
    }

    const tasks: Promise<AuthorResult[]>[] = [];

    if (sources.includes("openalex")) {
      tasks.push(
        authorsFromOpenAlex(q).catch(err => {
          req.log.warn({ err }, "openalex authors fetch failed");
          return [] as AuthorResult[];
        }),
      );
    }
    if (sources.includes("ss")) {
      tasks.push(
        authorsFromSemanticScholar(q).catch(err => {
          req.log.warn({ err }, "semanticscholar authors fetch failed");
          return [] as AuthorResult[];
        }),
      );
    }
    if (sources.includes("inspire")) {
      tasks.push(
        authorsFromInspireHEP(q).catch(err => {
          req.log.warn({ err }, "inspirehep authors fetch failed");
          return [] as AuthorResult[];
        }),
      );
    }

    const results = await Promise.all(tasks);
    const authors = dedupAuthors(results.flat());

    authorsCache.set(cacheKey, authors);
    res.json({ authors });
  },
);

// ─── Route: GET /api/discovery/connections ────────────────────────────────────

router.get(
  "/discovery/connections",
  async (req, res): Promise<void> => {
    const q = ((req.query.q as string) ?? "").trim();
    if (!q) {
      res.status(400).json({ error: "Missing required query parameter: q" });
      return;
    }

    const sources = parseSources(req.query.sources, ["openalex", "wiki"]);
    const cacheKey = `connections:${q.toLowerCase()}:${[...sources].sort().join(",")}`;

    const cached = connectionsCache.get(cacheKey);
    if (cached) {
      res.json({ connections: cached });
      return;
    }

    const tasks: Promise<Connection[]>[] = [];

    if (sources.includes("openalex")) {
      tasks.push(
        connectionsFromOpenAlex(q).catch(err => {
          req.log.warn({ err }, "openalex connections fetch failed");
          return [] as Connection[];
        }),
      );
    }
    if (sources.includes("wiki")) {
      tasks.push(
        connectionsFromWikipedia(q).catch(err => {
          req.log.warn({ err }, "wikipedia connections fetch failed");
          return [] as Connection[];
        }),
      );
    }

    const results = await Promise.all(tasks);
    const connections = dedupConnections(results.flat());

    connectionsCache.set(cacheKey, connections);
    res.json({ connections });
  },
);

export default router;
