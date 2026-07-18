import { Router } from "express";

const router = Router();

// ── GET /api/search/arxiv?q=...&max_results=10&start=0 ───────────────────────
// arXiv's Atom XML feed doesn't reliably support browser CORS, so we proxy it.
// Returns { items: ArxivItem[], total: number }
router.get("/search/arxiv", async (req, res) => {
  const q          = ((req.query.q as string) ?? "").trim();
  const maxResults = Math.min(Math.max(Number(req.query.max_results ?? 5), 1), 25);
  const start      = Math.max(Number(req.query.start ?? 0), 0);

  if (!q) { res.json({ items: [], total: 0 }); return; }

  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=${maxResults}&start=${start}&sortBy=relevance`;
    const resp = await fetch(url, {
      headers: { Accept: "application/atom+xml" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) { res.json({ items: [], total: 0 }); return; }
    const xml   = await resp.text();
    const total = parseTotalResults(xml);
    const items = parseArxivAtom(xml);
    res.json({ items, total });
  } catch {
    res.json({ items: [], total: 0 });
  }
});

// ── GET /api/search/spacex?q=TERM&everything=0&offset=0&limit=4 ──────────────
// SpaceX public API doesn't set CORS headers the browser accepts, so we proxy.
router.get("/search/spacex", async (req, res) => {
  const q          = ((req.query.q as string) ?? "").trim();
  const everything = req.query.everything === "1" || req.query.everything === "true";
  const limit      = Math.min(Number(req.query.limit ?? 4), 10);
  const offset     = Number(req.query.offset ?? 0);

  try {
    const body = {
      query: everything || !q ? {} : { name: { $regex: q, $options: "i" } },
      options: {
        limit,
        sort: { date_utc: -1 },
        ...(offset > 0 ? { offset } : {}),
        select: ["name", "details", "date_utc", "success", "links"],
      },
    };

    const resp = await fetch("https://api.spacexdata.com/v4/launches/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });

    if (!resp.ok) { res.json({ docs: [] }); return; }
    const data = await resp.json() as { docs?: unknown[] };
    res.json({ docs: data.docs ?? [] });
  } catch {
    res.json({ docs: [] });
  }
});

// ── GET /api/search/cern?q=TERM ──────────────────────────────────────────────
// CERN Open Data portal has inconsistent CORS headers; proxy server-side.
router.get("/search/cern", async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) { res.json({ items: [] }); return; }

  try {
    const url = `https://opendata.cern.ch/api/records/?q=${encodeURIComponent(q)}&size=4`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!resp.ok) { res.json({ items: [] }); return; }

    type CernHit = {
      id: number;
      metadata?: {
        title?: string;
        abstract?: { description?: string };
      };
    };
    const raw = await resp.json() as {
      hits?: { hits?: CernHit[] };
    };

    const items = (raw.hits?.hits ?? []).map(h => ({
      id:          h.id,
      title:       h.metadata?.title ?? "CERN Dataset",
      description: h.metadata?.abstract?.description ?? "",
    }));

    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseTotalResults(xml: string): number {
  const m = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
  return m ? parseInt(m[1], 10) : 0;
}

function text(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`));
  return m ? m[1].replace(/\n+/g, " ").trim() : "";
}

function parseArxivAtom(xml: string) {
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const items: {
    id: string; title: string; summary: string;
    authors: string[]; published: string; link: string;
  }[] = [];

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const e         = m[1];
    const id        = text(e, "id");
    const title     = text(e, "title");
    const summary   = text(e, "summary").slice(0, 400);
    const published = text(e, "published").slice(0, 10);
    const authors   = [...e.matchAll(/<name>\s*(.*?)\s*<\/name>/g)].map(a => a[1]);
    items.push({ id, title, summary, authors, published, link: id });
  }
  return items;
}

export default router;
