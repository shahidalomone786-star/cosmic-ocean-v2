import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FlaskConical, ExternalLink, Loader2,
  Award, Users, Clock, Unlock, AlertCircle, ChevronDown, Search,
  SlidersHorizontal, ArrowUpDown, ArrowLeft,
} from 'lucide-react';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';

// ─── Global Biology Search Results ───────────────────────────────────────────
// Shown when the user has typed ≥ 2 chars in the Biology Hub search bar.

interface BioSearchResultsProps {
  lm: boolean;
  searchQuery: string;
  onClearSearch?: () => void;
}

type FilterMode = 'all' | 'articles' | 'research' | 'most-cited' | 'open-access' | 'newest';
type SortMode   = 'relevant' | 'newest' | 'most-cited' | 'alphabetical';

const FILTER_TABS: { id: FilterMode; label: string }[] = [
  { id: 'all',         label: 'All'         },
  { id: 'articles',    label: 'Wikipedia'   },
  { id: 'research',    label: 'Papers'      },
  { id: 'open-access', label: 'Open Access' },
  { id: 'most-cited',  label: 'Most Cited'  },
  { id: 'newest',      label: 'Newest'      },
];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'relevant',    label: 'Most Relevant' },
  { id: 'newest',      label: 'Newest'        },
  { id: 'most-cited',  label: 'Most Cited'    },
  { id: 'alphabetical',label: 'Alphabetical'  },
];

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

// ── Text highlight helper ─────────────────────────────────────────────────────
function HighlightText({ text, query, lm }: { text: string; query: string; lm: boolean }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{
            background: lm ? 'rgba(52,211,153,0.25)' : 'rgba(52,211,153,0.2)',
            color: 'inherit',
            borderRadius: '2px',
            padding: '0 1px',
          }}>{part}</mark>
        ) : part
      )}
    </>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────
const SOURCE_META: Record<string, { label: string; emoji: string; bg: string; border: string; color: string; colorLm: string }> = {
  wikipedia:  { label: 'Wikipedia',   emoji: '📖', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.22)',  color: 'rgba(56,189,248,0.75)',  colorLm: '#0369a1' },
  wikidata:   { label: 'Wikidata',    emoji: '🔗', bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.22)',  color: 'rgba(20,184,166,0.75)',  colorLm: '#0f766e' },
  pubmed:     { label: 'PubMed',      emoji: '🔬', bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.22)',   color: 'rgba(244,63,94,0.75)',   colorLm: '#be123c' },
  europepmc:  { label: 'Europe PMC',  emoji: '📄', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.22)',  color: 'rgba(251,146,60,0.75)',  colorLm: '#c2410c' },
  openalex:   { label: 'OpenAlex',    emoji: '🌿', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.22)',  color: 'rgba(52,211,153,0.75)',  colorLm: '#065f46' },
};

function SourceBadge({ source, lm }: { source: string; lm: boolean }) {
  const meta = SOURCE_META[source] ?? {
    label: source, emoji: '📄',
    bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.18)',
    color: 'rgba(255,255,255,0.3)', colorLm: 'rgba(6,78,59,0.5)',
  };
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        color: lm ? meta.colorLm : meta.color,
      }}>
      {meta.emoji} {meta.label}
    </span>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({ item, lm, delay, searchQuery }: {
  item: BiologySearchItem; lm: boolean; delay: number; searchQuery: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <AnimatePresence>
        {visible && (
          <motion.a href={item.url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, scale: 1.007 }}
            className="block rounded-2xl p-4 no-underline"
            style={{ ...glassCard(lm), boxShadow: lm ? '0 2px 14px rgba(52,211,153,0.05)' : '0 2px 14px rgba(0,0,0,0.25)' }}>

            <div className="flex gap-3">
              {/* Thumbnail (Wikipedia articles may have images) */}
              {item.imageUrl && (
                <ResultCardImage src={item.imageUrl} alt={item.title} />
              )}

              <div className="flex-1 min-w-0">
                {/* Top row */}
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {item.kind === 'article'
                      ? <BookOpen size={13} className="text-sky-400" />
                      : <FlaskConical size={13} className="text-emerald-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-snug line-clamp-2"
                      style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}>
                      <HighlightText text={item.title} query={searchQuery} lm={lm} />
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <SourceBadge source={item.source} lm={lm} />
                    <ExternalLink size={11} style={{ color: lm ? 'rgba(52,211,153,0.45)' : 'rgba(52,211,153,0.35)' }} />
                  </div>
                </div>

                {/* Description with highlight */}
                {item.description && (
                  <p className="text-[11px] leading-relaxed mb-2 line-clamp-2 ml-[19px]"
                    style={{ color: lm ? 'rgba(6,78,59,0.52)' : 'rgba(255,255,255,0.35)' }}>
                    <HighlightText text={item.description} query={searchQuery} lm={lm} />
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 ml-[19px]">
                  {item.authors.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users size={9} style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }} />
                      <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.28)' }}>
                        {item.authors.slice(0, 2).join(', ')}
                        {item.authors.length > 2 ? ` +${item.authors.length - 2}` : ''}
                      </span>
                    </div>
                  )}
                  {item.citationCount != null && item.citationCount > 0 && (
                    <div className="flex items-center gap-1">
                      <Award size={9} className="text-amber-400" />
                      <span className="text-[9px] text-amber-400">{item.citationCount.toLocaleString()}</span>
                    </div>
                  )}
                  {item.date && (
                    <div className="flex items-center gap-1">
                      <Clock size={9} style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.22)' }} />
                      <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.22)' }}>
                        {item.date.slice(0, 7)}
                      </span>
                    </div>
                  )}
                  {item.openAccess && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Unlock size={9} className="text-emerald-400" />
                      <span className="text-[9px] text-emerald-400">Open</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.a>
        )}
      </AnimatePresence>
      {!visible && <div className="h-20 rounded-2xl" style={glassCard(lm)} />}
    </div>
  );
}

// ── Result card with optional image ──────────────────────────────────────────
function ResultCardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(52,211,153,0.12)' }}>
      <img src={src} alt={alt} className="w-full h-full object-cover"
        onError={() => setFailed(true)} loading="lazy" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BioSearchResults({ lm, searchQuery, onClearSearch }: BioSearchResultsProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort]   = useState<SortMode>('relevant');
  const [showSort, setShowSort] = useState(false);
  const [page, setPage]   = useState(1);
  const [allItems, setAllItems] = useState<BiologySearchItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const q = searchQuery.trim();

  const queryParams = { q, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: q.length >= 2, staleTime: 3 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  // Accumulate items across pages
  useEffect(() => {
    if (!data?.items) return;
    if (page === 1) {
      setAllItems(data.items);
    } else {
      setAllItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...data.items.filter((i: BiologySearchItem) => !ids.has(i.id))];
      });
    }
  }, [data, page]);

  // Reset when query or filter changes
  useEffect(() => { setPage(1); setAllItems([]); setFilter('all'); setSort('relevant'); }, [q]);

  // Apply filter
  const filtered = allItems.filter((i: BiologySearchItem) => {
    switch (filter) {
      case 'articles':    return i.kind === 'article';
      case 'research':    return i.kind === 'research';
      case 'open-access': return i.openAccess === true;
      case 'most-cited':  return (i.citationCount ?? 0) > 0;
      case 'newest':      return !!i.date;
      default:            return true;
    }
  });

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'newest':      return (b.date ?? '').localeCompare(a.date ?? '');
      case 'most-cited':  return (b.citationCount ?? 0) - (a.citationCount ?? 0);
      case 'alphabetical':return a.title.localeCompare(b.title);
      default:            return 0; // server order = relevance
    }
  });

  const articleCount  = allItems.filter((i: BiologySearchItem) => i.kind === 'article').length;
  const researchCount = allItems.filter((i: BiologySearchItem) => i.kind === 'research').length;

  const loadMore = useCallback(() => {
    if (data?.hasMore && !isFetching) setPage((p) => p + 1);
  }, [data?.hasMore, isFetching]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label ?? 'Sort';

  return (
    <div>
      {/* Back button */}
      {onClearSearch && (
        <button
          onClick={onClearSearch}
          className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95"
          style={{
            background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.22)',
            color: lm ? '#065f46' : '#34d399',
          }}
        >
          <ArrowLeft size={12} />
          Back to Biology Hub
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <Search size={13} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-semibold"
            style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}>
            Results for <span className="text-emerald-400">"{q}"</span>
          </h2>
          {allItems.length > 0 && (
            <p className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>
              {articleCount} articles · {researchCount} papers
            </p>
          )}
        </div>
        {(isLoading || isFetching) && <Loader2 size={14} className="animate-spin text-emerald-400 flex-shrink-0" />}

        {/* Sort dropdown trigger */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowSort((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all duration-150"
            style={{
              background: showSort ? 'rgba(52,211,153,0.15)' : (lm ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.07)'),
              border: '1px solid rgba(52,211,153,0.18)',
              color: lm ? '#065f46' : 'rgba(255,255,255,0.6)',
            }}>
            <ArrowUpDown size={10} />
            <span className="hidden sm:inline">{currentSortLabel}</span>
          </button>
          <AnimatePresence>
            {showSort && (
              <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-30 w-40"
                style={{
                  background: lm ? 'rgba(240,253,244,0.97)' : 'rgba(3,12,8,0.97)',
                  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                }}>
                {SORT_OPTIONS.map((s) => (
                  <button key={s.id} onClick={() => { setSort(s.id); setShowSort(false); }}
                    className="w-full text-left px-3.5 py-2.5 text-[11px] font-medium transition-colors duration-100"
                    style={{
                      background: sort === s.id ? 'rgba(52,211,153,0.12)' : 'transparent',
                      color: sort === s.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.65)' : 'rgba(255,255,255,0.55)'),
                    }}>
                    {s.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Source status pills */}
      {data?.sourceStatus && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {data.sourceStatus.map((s) => (
            <div key={s.source}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px]"
              style={{
                background: s.status === 'ready' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                border: s.status === 'ready' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(239,68,68,0.2)',
                color: s.status === 'ready' ? '#34d399' : '#f87171',
              }}>
              <span className="font-semibold capitalize">{s.source}</span>
              <span>{s.status === 'ready' ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <SlidersHorizontal size={11} className="self-center flex-shrink-0"
          style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }} />
        {FILTER_TABS.map((f) => {
          const count = f.id === 'all' ? allItems.length
            : f.id === 'articles' ? articleCount
            : f.id === 'research' ? researchCount
            : f.id === 'open-access' ? allItems.filter((i) => i.openAccess).length
            : f.id === 'most-cited' ? allItems.filter((i) => (i.citationCount ?? 0) > 0).length
            : allItems.filter((i) => !!i.date).length;
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150"
              style={{
                background: active ? (lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent',
                border: active ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(52,211,153,0.1)',
                color: active ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.32)'),
              }}>
              {f.label}
              {count > 0 && (
                <span className="ml-1 font-bold"
                  style={{ color: active ? undefined : (lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.22)') }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {isLoading && allItems.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={glassCard(lm)} />
          ))}
        </div>
      ) : isError && allItems.length === 0 ? (
        <div className="rounded-2xl p-8 flex flex-col items-center text-center" style={glassCard(lm)}>
          <AlertCircle size={26} className="text-rose-400 mb-3" />
          <p className="text-[13px] font-medium mb-1" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.8)' }}>
            Search unavailable
          </p>
          <p className="text-[11px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
            Could not reach biology data sources. Try again shortly.
          </p>
        </div>
      ) : sorted.length === 0 && !isLoading ? (
        <div className="rounded-2xl p-8 flex flex-col items-center text-center" style={glassCard(lm)}>
          <Search size={26} className="text-emerald-400 mb-3 opacity-50" />
          <p className="text-[13px]" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}>
            No {filter === 'all' ? 'results' : filter.replace('-', ' ')} found for "{q}".
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sorted.map((item: BiologySearchItem, i: number) => (
              <ResultCard key={item.id} item={item} lm={lm}
                delay={Math.min(i * 0.03, 0.25)} searchQuery={q} />
            ))}
          </div>

          {/* Load more */}
          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            {isFetching ? (
              <div className="flex items-center gap-2 py-3 text-[11px]"
                style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={13} className="animate-spin text-emerald-400" />
                Loading more results…
              </div>
            ) : data?.hasMore ? (
              <button onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-medium"
                style={{
                  background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: lm ? '#065f46' : '#34d399',
                }}>
                <ChevronDown size={13} /> Load more
              </button>
            ) : allItems.length > 0 ? (
              <p className="text-[10px] py-3" style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }}>
                All {allItems.length} results loaded
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
