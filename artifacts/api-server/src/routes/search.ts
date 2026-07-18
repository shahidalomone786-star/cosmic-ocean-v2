import { Router } from "express";

const router = Router();

// ── GET /api/search/arxiv?q=quantum+physics ──────────────────────────────────
// arXiv's Atom XML feed doesn't reliably support browser CORS, so we proxy it.
router.get("/search/arxiv", async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q) { res.json({ items: [] }); return; }

  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=5&sortBy=relevance`;
    const resp = await fetch(url, {
      headers: { Accept: "application/atom+xml" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) { res.json({ items: [] }); return; }
    const xml   = await resp.text();
    const items = parseArxivAtom(xml);
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

// ── Lightweight Atom XML parser — no dependencies ───────────────────────────
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
    const e        = m[1];
    const id       = text(e, "id");
    const title    = text(e, "title");
    const summary  = text(e, "summary").slice(0, 350);
    const published = text(e, "published").slice(0, 10);
    const authors  = [...e.matchAll(/<name>\s*(.*?)\s*<\/name>/g)].map(a => a[1]);
    items.push({ id, title, summary, authors, published, link: id });
  }
  return items;
}

export default router;
