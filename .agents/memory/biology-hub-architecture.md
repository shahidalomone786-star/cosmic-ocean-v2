---
name: Biology Hub Architecture
description: Multi-source biology search backend and frontend component structure
---

## Data sources (5 total, run in parallel via Promise.allSettled)
- **Wikipedia** — search API, 10 results, expanded query via SYNONYM_MAP
- **Wikidata** — wbsearchentities, 8 entity concepts as `kind: "article"`, no expansion
- **PubMed** — 2-step (esearch → esummary), 8 per page. Uses PUBMED_QUERY_MAP with OR boolean syntax per section — NOT SYNONYM_MAP. Using the SYNONYM_MAP (multi-word AND query) returns 0 results.
- **Europe PMC** — REST search, cursor-based pagination (cursorMark=*), resultType=lite (no abstractText), 8 per page. Page param not supported; only first page fetched, hasMore via hitCount > pageSize.
- **OpenAlex** — standard page-based, 8 per page, sort by cited/date/relevance

**Why PubMed needs its own expansion map:**
PubMed AND-searches all whitespace-separated terms. A long expanded string like "genetics inheritance mutation alleles genome..." returns 0 results. Must use `OR` boolean syntax: `genetics inheritance[tiab] OR genome[tiab] OR CRISPR[tiab]`.

## Frontend sections
- **TopicSection** (organs, body-systems, skeleton, muscles, genetics, microbiology, viruses, evolution, biochemistry): 3 tabs Overview/Articles/Papers, each backed by useBiologySearch hook
- **DNASection, CellsSection, BrainSection**: 3 tabs, Articles + Papers tabs use LiveResultsFeed with section-specific multi-term search queries matching the biology spec sub-topics
- **BioSearchResults**: global search results with 6 filter chips (All/Articles/Papers/Open Access/Most Cited/Newest), sort dropdown, HighlightText, accumulated pagination
- **SourceBadge**: distinct color per source (Wikipedia=sky, Wikidata=teal, PubMed=rose, EuropePMC=orange, OpenAlex=emerald)

## Query expansion
- SYNONYM_MAP: short section key → rich multi-word string (used by Wikipedia, Wikidata, EuropePMC, OpenAlex)
- PUBMED_QUERY_MAP: short section key → PubMed OR-boolean syntax (used only by fetchPubMed)
- expandQuery(q) and expandQueryPubMed(q) — both check lowercase key, fall back to raw q

## Debounce
350ms debounce at BiologyHub level. Two states: inputQuery (raw) and debouncedQuery (sent to API).
