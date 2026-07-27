import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FlaskConical, ExternalLink, Loader2,
  Award, Users, Clock, Unlock, AlertCircle, ChevronDown, Search,
} from 'lucide-react';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';

// ─── Global Biology Search Results ───────────────────────────────────────────
// Shown when the user has typed ≥ 2 chars in the Biology Hub search bar.

interface BioSearchResultsProps {
  lm: boolean;
  searchQuery: string;
}

type ResultsTab = 'all' | 'articles' | 'research';

const TABS: { id: ResultsTab; label: string }[] = [
  { id: 'all',      label: 'All'      },
  { id: 'articles', label: 'Articles' },
  { id: 'research', label: 'Research' },
];

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

// ── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source, lm }: { source: string; lm: boolean }) {
  const isWiki = source === 'wikipedia';
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{
        background: isWiki ? 'rgba(56,189,248,0.12)' : 'rgba(148,163,184,0.12)',
        border: isWiki ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(148,163,184,0.18)',
        color: isWiki
          ? lm ? '#0369a1' : 'rgba(56,189,248,0.7)'
          : lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)',
      }}
    >
      {isWiki ? '📖 Wikipedia' : 'OpenAlex'}
    </span>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────
function ResultCard({
  item, lm, delay,
}: { item: BiologySearchItem; lm: boolean; delay: number }) {
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
          <motion.a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, scale: 1.007 }}
            className="block rounded-2xl p-4 no-underline"
            style={{
              ...glassCard(lm),
              boxShadow: lm ? '0 2px 14px rgba(52,211,153,0.05)' : '0 2px 14px rgba(0,0,0,0.25)',
            }}
          >
            {/* Top row */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-shrink-0 mt-0.5">
                {item.kind === 'article' ? (
                  <BookOpen size={13} className="text-sky-400" />
                ) : (
                  <FlaskConical size={13} className="text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold leading-snug line-clamp-2"
                  style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}
                >
                  {item.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <SourceBadge source={item.source} lm={lm} />
                <ExternalLink
                  size={11}
                  style={{ color: lm ? 'rgba(52,211,153,0.45)' : 'rgba(52,211,153,0.35)' }}
                />
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <p
                className="text-[11px] leading-relaxed mb-2.5 line-clamp-2"
                style={{ color: lm ? 'rgba(6,78,59,0.52)' : 'rgba(255,255,255,0.35)' }}
              >
                {item.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3">
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
          </motion.a>
        )}
      </AnimatePresence>
      {!visible && <div className="h-20 rounded-2xl" style={glassCard(lm)} />}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BioSearchResults({ lm, searchQuery }: BioSearchResultsProps) {
  const [tab, setTab] = useState<ResultsTab>('all');
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const q = searchQuery.trim();

  const queryParams = { q, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: q.length >= 2, staleTime: 3 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  // Reset page when query changes
  useEffect(() => { setPage(1); setTab('all'); }, [q]);

  const allItems = data?.items ?? [];
  const filtered = tab === 'all'
    ? allItems
    : allItems.filter((i: BiologySearchItem) => i.kind === (tab === 'articles' ? 'article' : 'research'));

  const articleCount  = allItems.filter((i: BiologySearchItem) => i.kind === 'article').length;
  const researchCount = allItems.filter((i: BiologySearchItem) => i.kind === 'research').length;

  const loadMore = useCallback(() => {
    if (data?.hasMore && !isFetching) setPage((p) => p + 1);
  }, [data?.hasMore, isFetching]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <Search size={13} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            className="text-[14px] font-semibold"
            style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}
          >
            Results for <span className="text-emerald-400">"{q}"</span>
          </h2>
          {data && (
            <p className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>
              {articleCount} articles · {researchCount} papers
            </p>
          )}
        </div>
        {(isLoading || isFetching) && (
          <Loader2 size={14} className="animate-spin text-emerald-400 flex-shrink-0" />
        )}
      </div>

      {/* Source status */}
      {data?.sourceStatus && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {data.sourceStatus.map((s) => (
            <div
              key={s.source}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px]"
              style={{
                background: s.status === 'ready' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                border: s.status === 'ready' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(239,68,68,0.2)',
                color: s.status === 'ready' ? '#34d399' : '#f87171',
              }}
            >
              <span className="font-semibold capitalize">{s.source}</span>
              <span>{s.status === 'ready' ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-4">
        <div
          className="flex gap-1 p-1 rounded-xl w-full"
          style={{
            background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)',
            border: '1px solid rgba(52,211,153,0.12)',
          }}
        >
          {TABS.map((t) => {
            const count = t.id === 'all' ? allItems.length : t.id === 'articles' ? articleCount : researchCount;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all duration-200"
                style={{
                  background: tab === t.id
                    ? lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)'
                    : 'transparent',
                  color: tab === t.id
                    ? lm ? '#065f46' : '#34d399'
                    : lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)',
                  border: tab === t.id
                    ? '1px solid rgba(52,211,153,0.3)'
                    : '1px solid transparent',
                }}
              >
                {t.label}
                {count > 0 && (
                  <span
                    className="ml-1 font-bold"
                    style={{ color: tab === t.id ? undefined : lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.25)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={glassCard(lm)} />
          ))}
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center"
          style={glassCard(lm)}
        >
          <AlertCircle size={26} className="text-rose-400 mb-3" />
          <p className="text-[13px] font-medium mb-1" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.8)' }}>
            Search unavailable
          </p>
          <p className="text-[11px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
            Could not reach biology data sources. Try again shortly.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center"
          style={glassCard(lm)}
        >
          <Search size={26} className="text-emerald-400 mb-3 opacity-50" />
          <p className="text-[13px]" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}>
            No {tab === 'all' ? 'results' : tab} found for "{q}".
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((item: BiologySearchItem, i: number) => (
              <ResultCard
                key={item.id}
                item={item}
                lm={lm}
                delay={Math.min(i * 0.03, 0.25)}
              />
            ))}
          </div>

          {/* Load more */}
          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            {isFetching ? (
              <div className="flex items-center gap-2 py-3 text-[11px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={13} className="animate-spin text-emerald-400" />
                Loading more results…
              </div>
            ) : data?.hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-medium"
                style={{
                  background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: lm ? '#065f46' : '#34d399',
                }}
              >
                <ChevronDown size={13} />
                Load more
              </button>
            ) : allItems.length > 0 ? (
              <p className="text-[10px] py-3" style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }}>
                All results loaded
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
