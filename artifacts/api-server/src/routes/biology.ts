import { Router } from "express";

const router = Router();

const TIMEOUT_MS = 9_000;

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
  maxLen = 500
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

// ── PubMed-specific expansion ─────────────────────────────────────────────────
// PubMed AND-searches all terms; use OR logic for section breadth.
// Keys are the original query lowercased. Values use PubMed boolean syntax.

const PUBMED_QUERY_MAP: Record<string, string> = {
  organs:
    "heart[tiab] OR lungs[tiab] OR liver[tiab] OR kidney[tiab] OR stomach[tiab] OR pancreas[tiab] OR spleen[tiab] OR intestines[tiab]",
  organ:
    "organ anatomy[tiab] OR organ physiology[tiab] OR organ function[tiab]",
  brain:
    "brain neuron[tiab] OR synapse[tiab] OR cortex[tiab] OR hippocampus[tiab] OR cerebellum[tiab] OR brainstem[tiab] OR nervous system[tiab]",
  neurons:
    "neuron[tiab] OR synapse[tiab] OR neurotransmitter[tiab] OR neural signaling[tiab]",
  neuron:
    "neuron[tiab] OR synapse[tiab] OR action potential[tiab] OR neurotransmitter[tiab]",
  cells:
    "cell biology[tiab] OR cell membrane[tiab] OR mitochondria[tiab] OR mitosis[tiab] OR meiosis[tiab] OR cell division[tiab]",
  cell:
    "cell biology[tiab] OR organelle[tiab] OR membrane[tiab] OR mitochondria[tiab]",
  dna:
    "DNA replication[tiab] OR transcription[tiab] OR gene mutation[tiab] OR chromosome[tiab] OR RNA[tiab] OR protein synthesis[tiab]",
  genetics:
    "genetics inheritance[tiab] OR genome[tiab] OR CRISPR[tiab] OR epigenetics[tiab] OR heredity[tiab] OR alleles[tiab]",
  microbiology:
    "bacteria[tiab] OR virus infection[tiab] OR fungi biology[tiab] OR immune response[tiab] OR pathogen[tiab]",
  evolution:
    "natural selection[tiab] OR adaptation[tiab] OR speciation[tiab] OR phylogeny[tiab] OR Darwin[tiab] OR fossils[tiab]",
  "body-systems":
    "circulatory system[tiab] OR respiratory system[tiab] OR nervous system[tiab] OR endocrine system[tiab]",
  "body systems":
    "circulatory system[tiab] OR respiratory system[tiab] OR nervous system[tiab]",
  skeleton:
    "human skeleton[tiab] OR bone anatomy[tiab] OR skeletal system[tiab] OR osteoporosis[tiab]",
  muscles:
    "skeletal muscle[tiab] OR cardiac muscle[tiab] OR smooth muscle[tiab] OR muscle contraction[tiab]",
  muscle:
    "muscle fiber[tiab] OR muscle contraction[tiab] OR myosin[tiab] OR actin[tiab]",
  biochemistry:
    "enzyme[tiab] OR metabolism[tiab] OR protein structure[tiab] OR ATP synthesis[tiab]",
  viruses:
    "virus replication[tiab] OR viral infection[tiab] OR immune response[tiab] OR bacteriophage[tiab]",
  virus:
    "virus[tiab] OR viral replication[tiab] OR pathogen[tiab] OR capsid[tiab]",
};

function expandQueryPubMed(q: string): string {
  const lower = q.toLowerCase().trim();
  return PUBMED_QUERY_MAP[lower] ?? q;
}

// ── Section-specific expansion map ───────────────────────────────────────────
// Each key maps to a rich multi-term query string matching the biology spec.

const SYNONYM_MAP: Record<string, string> = {
  // Anatomy
  organs:
    "human organ anatomy heart lungs liver kidney stomach pancreas spleen intestines eye ear skin",
  organ:
    "human organ anatomy physiology function cardiovascular digestive respiratory",

  // Brain / neuroscience
  brain:
    "brain neuron synapse cortex hippocampus cerebellum brainstem nervous system cognition",
  neurons:
    "neuron synapse neurotransmitter action potential synaptic plasticity axon dendrite",
  neuron:
    "neuron synapse action potential neurotransmitter axon dendrite membrane potential",

  // Cells
  cells:
    "cell biology animal cell plant cell cell membrane nucleus mitochondria mitosis meiosis cell division",
  cell:
    "cell biology organelle membrane mitochondria nucleus ribosome eukaryotic prokaryotic",

  // DNA / genomics
  dna:
    "DNA replication transcription translation mutation genes chromosome RNA protein synthesis",

  // Genetics
  genetics:
    "genetics inheritance mutation alleles genome CRISPR heredity epigenetics Mendelian",

  // Microbiology
  microbiology:
    "microbiology bacteria virus fungi immune response microbes pathogens infection prokaryote",

  // Evolution
  evolution:
    "evolution natural selection adaptation species fossils Darwin phylogeny speciation genetic drift",

  // Body systems
  "body-systems":
    "human body systems physiology homeostasis circulatory respiratory nervous endocrine",
  "body systems":
    "human body systems physiology circulatory respiratory nervous digestive immune endocrine",

  // Skeleton / muscles
  skeleton:
    "human skeleton bone anatomy skeletal system calcium osteoporosis axial appendicular",
  muscles:
    "muscle anatomy skeletal smooth cardiac myocyte contraction actin myosin fiber",
  muscle:
    "muscle fiber contraction myosin actin sarcomere skeletal cardiac smooth",

  // Biochemistry
  biochemistry:
    "biochemistry enzyme metabolism protein ATP cellular respiration metabolic pathway",

  // Viruses
  viruses:
    "virology virus infection replication immune response RNA virus DNA virus bacteriophage",
  virus:
    "virus virology viral replication pathogen RNA DNA capsid host cell infection",
};

function expandQuery(q: string): string {
  const lower = q.toLowerCase().trim();
  return SYNONYM_MAP[lower] ?? q;
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
  language: string | null;
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
  const expanded = expandQuery(q);
  const searchUrl =
    `https://en.wikipedia.org/w/api.php` +
    `?action=query&list=search&srsearch=${encodeURIComponent(expanded)}` +
    `&format=json&srlimit=${limit}&srprop=snippet|titlesnippet|sectiontitle&origin=*`;

  const resp = await fetch(searchUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`Wikipedia ${resp.status}`);

  type WikiHit = {
    pageid: number;
    title: string;
    snippet: string;
    timestamp: string;
  };
  const data = (await resp.json()) as { query?: { search?: WikiHit[] } };
  const hits = data.query?.search ?? [];

  if (hits.length === 0) return { items: [] };

  // Batch-fetch page thumbnails for all returned pageids in a single request
  const pageids = hits.map((h) => h.pageid).join("|");
  const thumbUrl =
    `https://en.wikipedia.org/w/api.php` +
    `?action=query&pageids=${pageids}&prop=pageimages&pithumbsize=400` +
    `&format=json&origin=*`;

  type ThumbPage = { thumbnail?: { source: string } };
  type ThumbData = { query?: { pages?: Record<string, ThumbPage> } };
  let thumbMap: Record<string, string> = {};
  try {
    const thumbResp = await fetch(thumbUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (thumbResp.ok) {
      const td = (await thumbResp.json()) as ThumbData;
      const pages = td.query?.pages ?? {};
      for (const [id, page] of Object.entries(pages)) {
        if (page.thumbnail?.source) thumbMap[id] = page.thumbnail.source;
      }
    }
  } catch {
    // Thumbnail fetch is non-critical — continue without images
  }

  const items: BioItem[] = hits.map((h) => ({
    id: `wiki-${h.pageid}`,
    title: h.title,
    description: stripHtml(h.snippet) || `Wikipedia article about ${h.title}.`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`,
    imageUrl: thumbMap[String(h.pageid)] ?? null,
    source: "wikipedia",
    kind: "article",
    date: h.timestamp?.slice(0, 10) ?? null,
    authors: ["Wikipedia Contributors"],
    citationCount: null,
    openAccess: true,
    language: "en",
  }));

  return { items };
}

// ── Wikidata ──────────────────────────────────────────────────────────────────
// Returns biological entity concepts (anatomy, organisms, processes) as articles.

async function fetchWikidata(q: string): Promise<{ items: BioItem[] }> {
  const url =
    `https://www.wikidata.org/w/api.php` +
    `?action=wbsearchentities&search=${encodeURIComponent(q)}` +
    `&language=en&format=json&type=item&limit=8&origin=*`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!resp.ok) throw new Error(`Wikidata ${resp.status}`);

  type WDHit = {
    id: string;
    label?: string;
    description?: string;
    concepturi?: string;
    url?: string;
  };
  const data = (await resp.json()) as { search?: WDHit[] };
  const hits = (data.search ?? []).filter(
    (h) => h.label && h.description
  );

  const items: BioItem[] = hits.map((h) => ({
    id: `wd-${h.id}`,
    title: h.label ?? h.id,
    description: h.description ?? `Wikidata entity: ${h.id}`,
    url: `https://www.wikidata.org/wiki/${h.id}`,
    imageUrl: null,
    source: "wikidata",
    kind: "article",
    date: null,
    authors: ["Wikidata Contributors"],
    citationCount: null,
    openAccess: true,
    language: "en",
  }));

  return { items };
}

// ── PubMed ────────────────────────────────────────────────────────────────────
// Two-step: esearch (get IDs) → esummary (get metadata).

async function fetchPubMed(
  q: string,
  limit: number,
  page: number
): Promise<{ items: BioItem[]; hasMore: boolean }> {
  // Use PubMed-specific OR-logic expansion to avoid zero results from AND-ing many terms
  const expanded = expandQueryPubMed(q);
  const retstart = (page - 1) * limit;

  // Step 1: esearch
  const searchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
    `?db=pubmed&term=${encodeURIComponent(expanded)}` +
    `&retmax=${limit}&retstart=${retstart}&retmode=json&sort=relevance` +
    `&tool=cosmos-biohub&email=cosmos@biohub.app`;

  const searchResp = await fetch(searchUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!searchResp.ok) throw new Error(`PubMed esearch ${searchResp.status}`);

  type ESearchResult = {
    esearchresult: {
      idlist: string[];
      count: string;
    };
  };
  const searchData = (await searchResp.json()) as ESearchResult;
  const ids = searchData.esearchresult?.idlist ?? [];
  const totalCount = parseInt(searchData.esearchresult?.count ?? "0", 10);

  if (ids.length === 0) return { items: [], hasMore: false };

  // Step 2: esummary
  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
    `?db=pubmed&id=${ids.join(",")}&retmode=json` +
    `&tool=cosmos-biohub&email=cosmos@biohub.app`;

  const summaryResp = await fetch(summaryUrl, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!summaryResp.ok)
    throw new Error(`PubMed esummary ${summaryResp.status}`);

  type PubMedAuthor = { name: string; authtype: string };
  type PubMedArticleId = { idtype: string; value: string };
  type PubMedSummary = {
    uid: string;
    title: string;
    authors: PubMedAuthor[];
    pubdate: string;
    fulljournalname: string;
    elocationid: string;
    articleids: PubMedArticleId[];
    pmcrefcount?: number;
    source: string;
  };
  type ESummaryResult = {
    result: Record<string, PubMedSummary>;
  };

  const summaryData = (await summaryResp.json()) as ESummaryResult;
  const result = summaryData.result ?? {};

  const items: BioItem[] = ids
    .filter((id) => result[id] && result[id].title)
    .map((id) => {
      const s = result[id];
      const doiEntry = (s.articleids ?? []).find((a) => a.idtype === "doi");
      const doi = doiEntry?.value ?? null;
      const url = doi
        ? `https://doi.org/${doi}`
        : `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
      const year = s.pubdate?.slice(0, 4) ?? null;
      const authors = (s.authors ?? [])
        .filter((a) => a.authtype === "Author")
        .slice(0, 4)
        .map((a) => a.name);
      const journal = s.fulljournalname || s.source || null;
      const description = journal
        ? `Published in ${journal}. ${year ? `Year: ${year}.` : ""}`
        : year
        ? `Published ${year}.`
        : "Research article from PubMed.";

      return {
        id: `pubmed-${id}`,
        title: stripHtml(s.title),
        description,
        url,
        imageUrl: null,
        source: "pubmed",
        kind: "research" as const,
        date: year ? `${year}-01-01` : null,
        authors,
        citationCount:
          typeof s.pmcrefcount === "number" && s.pmcrefcount > 0
            ? s.pmcrefcount
            : null,
        openAccess: null,
        language: "en",
      };
    });

  const hasMore = retstart + limit < totalCount;
  return { items, hasMore };
}

// ── Europe PMC ────────────────────────────────────────────────────────────────
// Uses cursor-based pagination. We always start at cursorMark=* (first page).
// Lite resultType (default) has no abstractText; description is built from journal/year.

type OASort = "relevance" | "date" | "cited";

async function fetchEuropePMC(
  q: string,
  perPage: number,
  sortBy: OASort = "cited"
): Promise<{ items: BioItem[]; hasMore: boolean }> {
  const expanded = expandQuery(q);
  // EPMC sort: "CITED desc" | "FIRST_PDATE desc" | "" (relevance)
  const sort =
    sortBy === "date"
      ? "FIRST_PDATE desc"
      : sortBy === "relevance"
      ? ""
      : "CITED desc";

  const params = new URLSearchParams({
    query: expanded,
    format: "json",
    pageSize: String(perPage),
    cursorMark: "*",
  });
  if (sort) params.set("sort", sort);

  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`;

  const resp = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`EuropePMC ${resp.status}`);

  type EPMCResult = {
    id: string;
    pmid?: string;
    doi?: string;
    title?: string;
    authorString?: string;
    pubYear?: string;
    isOpenAccess?: string;
    citedByCount?: number;
    journalTitle?: string;
    pubType?: string;
  };
  type EPMCResponse = {
    hitCount?: number;
    nextCursorMark?: string;
    resultList?: { result: EPMCResult[] };
  };

  const data = (await resp.json()) as EPMCResponse;
  const results = data.resultList?.result ?? [];
  const hitCount = data.hitCount ?? 0;

  const items: BioItem[] = results
    .filter((r) => r.title)
    .map((r) => {
      const doi = r.doi ?? null;
      const pmid = r.pmid ?? r.id;
      const articleUrl = doi
        ? `https://doi.org/${doi}`
        : `https://europepmc.org/article/MED/${pmid}`;

      const journalPart = r.journalTitle ? `${r.journalTitle}. ` : "";
      const yearPart = r.pubYear ? `${r.pubYear}.` : "";
      const description =
        journalPart || yearPart
          ? `${journalPart}${yearPart}`.trim()
          : "Research article from Europe PMC.";

      const authors = r.authorString
        ? r.authorString
            .replace(/\.$/, "")
            .split(",")
            .slice(0, 4)
            .map((a) => a.trim())
        : [];

      return {
        id: `epmc-${r.id}`,
        title: stripHtml(r.title ?? "Untitled"),
        description,
        url: articleUrl,
        imageUrl: null,
        source: "europepmc",
        kind: "research" as const,
        date: r.pubYear ? `${r.pubYear}-01-01` : null,
        authors,
        citationCount:
          typeof r.citedByCount === "number" && r.citedByCount > 0
            ? r.citedByCount
            : null,
        openAccess: r.isOpenAccess === "Y",
        language: "en",
      };
    });

  // hasMore: true if there are more results than one page
  const hasMore = hitCount > perPage;
  return { items, hasMore };
}

// ── OpenAlex ──────────────────────────────────────────────────────────────────

async function fetchOpenAlex(
  q: string,
  perPage: number,
  page: number,
  sortBy: OASort = "cited"
): Promise<{ items: BioItem[]; hasMore: boolean }> {
  const sortParam =
    sortBy === "date"
      ? "publication_date:desc"
      : sortBy === "relevance"
      ? "relevance_score:desc"
      : "cited_by_count:desc";

  const expanded = expandQuery(q);
  const url =
    `https://api.openalex.org/works` +
    `?search=${encodeURIComponent(expanded)}` +
    `&filter=type:article` +
    `&per-page=${perPage}` +
    `&page=${page}` +
    `&sort=${sortParam}` +
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
      const landingUrl = w.primary_location?.landing_page_url ?? null;
      const fallbackUrl = rawId.startsWith("https://")
        ? rawId
        : `https://openalex.org/${rawId.split("/").pop() ?? ""}`;

      return {
        id: rawId,
        title: w.title ?? "Untitled",
        description:
          reconstructAbstract(w.abstract_inverted_index) ||
          "Research article. Abstract not available.",
        url: doi ? `https://doi.org/${doi}` : (landingUrl ?? fallbackUrl),
        imageUrl: null,
        source: "openalex",
        kind: "research" as const,
        date: w.publication_date,
        authors: (w.authorships ?? [])
          .slice(0, 4)
          .map((a) => a.author?.display_name ?? "Unknown"),
        citationCount: w.cited_by_count ?? null,
        openAccess: w.open_access?.is_oa ?? null,
        language: "en",
      };
    });

  const hasMore = page * perPage < totalCount;
  return { items, hasMore };
}

// ── GET /biology/search ───────────────────────────────────────────────────────

type BiologySearchFilters = {
  author?: string;
  title?: string;
  yearFrom?: number;
  yearTo?: number;
  source?: string;
  type?: string;
  openAccess?: boolean;
  language?: string;
};

function filterBiologyItems(items: BioItem[], filters: BiologySearchFilters): BioItem[] {
  const source = filters.source?.toLowerCase().trim();
  const type = filters.type?.toLowerCase().trim();
  const author = filters.author?.toLowerCase().trim();
  const title = filters.title?.toLowerCase().trim();
  const language = filters.language?.toLowerCase().trim();

  return items.filter((item) => {
    if (source && item.source.toLowerCase() !== source) return false;
    if (type && item.kind !== (type === "paper" || type === "research" ? "research" : type)) return false;
    if (filters.openAccess === true && item.openAccess !== true) return false;
    if (language && item.language?.toLowerCase() !== language) return false;
    if (author && !item.authors.some((name) => name.toLowerCase().includes(author))) return false;
    if (title && !item.title.toLowerCase().includes(title)) return false;

    const year = item.date ? Number(item.date.slice(0, 4)) : NaN;
    if (filters.yearFrom !== undefined && (!Number.isFinite(year) || year < filters.yearFrom)) return false;
    if (filters.yearTo !== undefined && (!Number.isFinite(year) || year > filters.yearTo)) return false;
    return true;
  });
}

router.get("/biology/search", async (req, res) => {
  const q = ((req.query.q as string) ?? "").trim();
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const sort = (req.query.sort as OASort | undefined) ?? "cited";
  const parseYearParam = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1000 && parsed <= 9999 ? parsed : undefined;
  };
  const openAccess = String(req.query.openAccess ?? "").toLowerCase() === "true";
  const filters: BiologySearchFilters = {
    author: typeof req.query.author === "string" ? req.query.author : undefined,
    title: typeof req.query.title === "string" ? req.query.title : undefined,
    yearFrom: parseYearParam(req.query.yearFrom),
    yearTo: parseYearParam(req.query.yearTo),
    source: typeof req.query.source === "string" ? req.query.source : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    openAccess: openAccess || undefined,
    language: typeof req.query.language === "string" ? req.query.language : undefined,
  };

  if (q.length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  // Run all 5 sources in parallel
  const [wikiResult, wikidataResult, pubmedResult, epmcResult, openAlexResult] =
    await Promise.allSettled([
      fetchWikipedia(q, 10),
      fetchWikidata(q),
      fetchPubMed(q, 8, page),
      fetchEuropePMC(q, 8, sort),
      fetchOpenAlex(q, 8, page, sort),
    ]);

  const items: BioItem[] = [];
  const sourceStatus: SourceStatus[] = [];

  const sources = [
    { key: "wikipedia",  result: wikiResult },
    { key: "wikidata",   result: wikidataResult },
    { key: "pubmed",     result: pubmedResult },
    { key: "europepmc", result: epmcResult },
    { key: "openalex",  result: openAlexResult },
  ] as const;

  for (const { key, result } of sources) {
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      sourceStatus.push({ source: key, status: "ready", message: null });
    } else {
      sourceStatus.push({
        source: key,
        status: "unavailable",
        message: String((result as PromiseRejectedResult).reason),
      });
    }
  }

  // hasMore is true if any paginated source (PubMed, EuropePMC, OpenAlex) has more
  const hasMore =
    (pubmedResult.status === "fulfilled" && pubmedResult.value.hasMore) ||
    (epmcResult.status === "fulfilled" && epmcResult.value.hasMore) ||
    (openAlexResult.status === "fulfilled" && openAlexResult.value.hasMore);

  const filteredItems = filterBiologyItems(items, filters);
  res.json({ query: q, page, items: filteredItems, sourceStatus, hasMore: hasMore && filteredItems.length > 0 });
});

export default router;
