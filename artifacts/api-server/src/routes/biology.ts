import { Router } from "express";

const router = Router();

const TIMEOUT_MS = 8_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function reconstructAbstract(
  invIdx: Record<string, number[]> | null | undefined,
  maxLen = 450
): string {
  if (!invIdx) return "";
  const positions: [number, string][] = [];
  for (const [word, idxs] of Object.entries(invIdx)) {
    for (const pos of idxs) positions.push([pos, word]);
  }
  const abstract = positions
    .sort((a, b) => a[0] - b[0])
    .map((p) => p[1])
    .join(" ");
  return abstract.length > maxLen
    ? abstract.slice(0, maxLen) + "…"
    : abstract;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BioItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  source: string;
  kind: "article" | "research";
  date: string | null;
  authors: string[];
  citationCount: number | null;
  openAccess: boolean | null;
};

type SourceStatus = {
  source: string;
  status: "ready" | "unavailable";
  message: string | null;
};

// ── Wikipedia ─────────────────────────────────────────────────────────────────

async function fetchWikipedia(
  q: string,
  limit: number
): Promise<{ items: BioItem[] }> {
  const url =
    `https://en.wikipedia.org/w/api.php` +
    `?action=query&list=search&srsearch=${encodeURIComponent(q)}` +
    `&format=json&srlimit=${limit}&srprop=snippet&origin=*`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`Wikipedia ${resp.status}`);

  type WikiHit = {
    pageid: number;
    title: string;
    snippet: string;
    timestamp: string;
  };
  const data = (await resp.json()) as { query?: { search?: WikiHit[] } };
  const hits = data.query?.search ?? [];

  const items: BioItem[] = hits.map((h) => ({
    id: `wiki-${h.pageid}`,
    title: h.title,
    description: stripHtml(h.snippet) || `Wikipedia article about ${h.title}.`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`,
    imageUrl: null,
    source: "wikipedia",
    kind: "article",
    date: h.timestamp?.slice(0, 10) ?? null,
    authors: ["Wikipedia Contributors"],
    citationCount: null,
    openAccess: true,
  }));

  return { items };
}

// ── OpenAlex ──────────────────────────────────────────────────────────────────

async function fetchOpenAlex(
  q: string,
  perPage: number,
  page: number
): Promise<{ items: BioItem[]; hasMore: boolean }> {
  const url =
    `https://api.openalex.org/works` +
    `?search=${encodeURIComponent(q)}` +
    `&filter=type:article` +
    `&per-page=${perPage}` +
    `&page=${page}` +
    `&sort=cited_by_count:desc` +
    `&mailto=cosmos@biohub.app`;

  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`OpenAlex ${resp.status}`);

  type OAAuthorship = { author: { display_name: string } };
  type OAWork = {
    id: string;
    title: string | null;
    abstract_inverted_index: Record<string, number[]> | null;
    doi: string | null;
    publication_date: string | null;
    authorships: OAAuthorship[];
    cited_by_count: number;
    open_access: { is_oa: boolean } | null;
    primary_location?: { landing_page_url?: string | null } | null;
  };
  type OAResponse = {
    results: OAWork[];
    meta: { count: number; page: number; per_page: number };
  };

  const data = (await resp.json()) as OAResponse;
  const works = data.results ?? [];
  const totalCount = data.meta?.count ?? 0;

  const items: BioItem[] = works
    .filter((w) => w.title)
    .map((w) => {
      const rawId = w.id ?? `oa-${Math.random().toString(36).slice(2)}`;
      const doi = w.doi;
      const landingUrl =
        w.primary_location?.landing_page_url ?? null;
      const fallbackUrl = rawId.startsWith("https://")
        ? rawId
        : `https://openalex.org/${rawId.split("/").pop() ?? ""}`;

      return {
        id: rawId,
        title: w.title ?? "Untitled",
        description:
          reconstructAbstract(w.abstract_inverted_index) ||
          "Research article. Abstract not available.",
        url: doi
          ? `https://doi.org/${doi}`
          : (landingUrl ?? fallbackUrl),
        imageUrl: null,
        source: "openalex",
        kind: "research",
        date: w.publication_date,
        authors: (w.authorships ?? [])
          .slice(0, 4)
          .map((a) => a.author?.display_name ?? "Unknown"),
        citationCount: w.cited_by_count ?? null,
        openAccess: w.open_access?.is_oa ?? null,
      };
    });

  const hasMore = page * perPage < totalCount;
  return { items, hasMore };
}

// ── GET /biology/search ───────────────────────────────────────────────────────

router.get("/biology/search", async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const page = Math.max(Number(req.query.page ?? 1), 1);

  if (q.length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  const [wikiResult, openAlexResult] = await Promise.allSettled([
    fetchWikipedia(q, 5),
    fetchOpenAlex(q, 8, page),
  ]);

  const items: BioItem[] = [];
  const sourceStatus: SourceStatus[] = [];

  if (wikiResult.status === "fulfilled") {
    items.push(...wikiResult.value.items);
    sourceStatus.push({ source: "wikipedia", status: "ready", message: null });
  } else {
    sourceStatus.push({
      source: "wikipedia",
      status: "unavailable",
      message: String((wikiResult as PromiseRejectedResult).reason),
    });
  }

  if (openAlexResult.status === "fulfilled") {
    items.push(...openAlexResult.value.items);
    sourceStatus.push({ source: "openalex", status: "ready", message: null });
  } else {
    sourceStatus.push({
      source: "openalex",
      status: "unavailable",
      message: String((openAlexResult as PromiseRejectedResult).reason),
    });
  }

  const hasMore =
    openAlexResult.status === "fulfilled"
      ? openAlexResult.value.hasMore
      : false;

  res.json({ query: q, page, items, sourceStatus, hasMore });
});

export default router;
