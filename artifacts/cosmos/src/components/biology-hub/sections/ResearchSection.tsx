import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ExternalLink, Users, Award, Unlock, Clock,
  ChevronDown, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';

// ─── Research Section ─────────────────────────────────────────────────────────
// Fetches real research papers from OpenAlex via the biology search API.

interface ResearchSectionProps {
  lm: boolean;
  searchQuery: string;
}

type ResearchTab = 'all' | 'cited' | 'open-access' | 'latest';

const TABS: { id: ResearchTab; label: string }[] = [
  { id: 'all',         label: 'All Papers'    },
  { id: 'cited',       label: 'Highly Cited'  },
  { id: 'open-access', label: 'Open Access'   },
  { id: 'latest',      label: 'Latest'        },
];

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border:     lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

// ── Research Paper Card ───────────────────────────────────────────────────────
function PaperCard({
  item, lm, delay,
}: { item: BiologySearchItem; lm: boolean; delay: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={cardRef}>
      <AnimatePresence>
        {visible && (
          <motion.a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, scale: 1.007 }}
            className="block rounded-2xl p-4 cursor-pointer transition-shadow duration-300 no-underline"
            style={{
              ...glassCard(lm),
              boxShadow: lm
                ? '0 2px 18px rgba(52,211,153,0.06)'
                : '0 2px 18px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold leading-snug line-clamp-2"
                  style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}
                >
                  {item.title}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.openAccess && (
                  <span
                    className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: 'rgba(52,211,153,0.15)',
                      border: '1px solid rgba(52,211,153,0.3)',
                      color: '#34d399',
                    }}
                  >
                    <Unlock size={8} />
                    OA
                  </span>
                )}
                <ExternalLink
                  size={12}
                  style={{ color: lm ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.4)' }}
                />
              </div>
            </div>

            {/* Abstract snippet */}
            {item.description && (
              <p
                className="text-[11px] leading-relaxed mb-3 line-clamp-3"
                style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}
              >
                {item.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3">
              {item.authors.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users size={10} style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.28)' }} />
                  <span
                    className="text-[10px] truncate max-w-[130px]"
                    style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {item.authors.slice(0, 2).join(', ')}
                    {item.authors.length > 2 ? ' +' + (item.authors.length - 2) : ''}
                  </span>
                </div>
              )}
              {item.citationCount != null && (
                <div className="flex items-center gap-1">
                  <Award size={10} className="text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-medium">
                    {item.citationCount.toLocaleString()} citations
                  </span>
                </div>
              )}
              {item.date && (
                <div className="flex items-center gap-1">
                  <Clock size={10} style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }} />
                  <span
                    className="text-[10px]"
                    style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }}
                  >
                    {item.date.slice(0, 7)}
                  </span>
                </div>
              )}
              <span
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: 'rgba(148,163,184,0.12)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)',
                }}
              >
                OpenAlex
              </span>
            </div>
          </motion.a>
        )}
      </AnimatePresence>
      {!visible && <div className="h-24 rounded-2xl" style={glassCard(lm)} />}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function PaperSkeleton({ lm }: { lm: boolean }) {
  return (
    <div
      className="rounded-2xl p-4 space-y-2.5 animate-pulse"
      style={glassCard(lm)}
    >
      <div className="h-4 rounded-lg w-4/5" style={{ background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.07)' }} />
      <div className="h-3 rounded-lg w-2/5" style={{ background: lm ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.05)' }} />
      <div className="space-y-1.5">
        <div className="h-2.5 rounded w-full" style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)' }} />
        <div className="h-2.5 rounded w-5/6" style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="flex gap-3">
        <div className="h-2 rounded w-20" style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)' }} />
        <div className="h-2 rounded w-16" style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

// ── Filtering logic ───────────────────────────────────────────────────────────
function applyTab(items: BiologySearchItem[], tab: ResearchTab): BiologySearchItem[] {
  const research = items.filter((i) => i.kind === 'research');
  switch (tab) {
    case 'cited':
      return [...research].sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
    case 'open-access':
      return research.filter((i) => i.openAccess === true);
    case 'latest':
      return [...research].sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '')
      );
    default:
      return research;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResearchSection({ lm, searchQuery }: ResearchSectionProps) {
  const [tab, setTab] = useState<ResearchTab>('all');
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const topic = (searchQuery.trim().length >= 2 ? searchQuery.trim() : 'human biology');

  const queryParams = { q: topic, page };
  const { data, isLoading, isError, refetch, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: true, staleTime: 5 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  const filtered = data ? applyTab(data.items, tab) : [];

  // Reset page when topic or tab changes
  useEffect(() => { setPage(1); }, [topic, tab]);

  // Intersection Observer for load-more trigger
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
      {/* ── Section header ── */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}
        >
          Research Papers
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
        >
          via OpenAlex
        </span>
        {isLoading || isFetching ? (
          <Loader2 size={13} className="ml-auto animate-spin text-emerald-400" />
        ) : (
          <button
            onClick={() => refetch()}
            className="ml-auto text-[10px] flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: lm ? '#065f46' : '#34d399' }}
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>

      {/* ── Topic pill ── */}
      <div
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium mb-4"
        style={{
          background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          color: lm ? '#065f46' : '#34d399',
        }}
      >
        <BookOpen size={11} />
        {topic}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-4 relative">
        <div
          className="flex gap-1 p-1 rounded-xl w-full"
          style={{
            background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)',
            border: '1px solid rgba(52,211,153,0.12)',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all duration-200 relative"
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
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PaperSkeleton key={i} lm={lm} />
          ))}
        </div>
      ) : isError ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center"
          style={glassCard(lm)}
        >
          <AlertCircle size={28} className="text-rose-400 mb-3" />
          <p className="text-[13px] font-medium mb-1" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.8)' }}>
            Could not load research papers
          </p>
          <p className="text-[11px] mb-4" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
            The OpenAlex API may be temporarily unavailable.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-1.5 rounded-full text-[11px] font-medium"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-8 flex flex-col items-center text-center"
          style={glassCard(lm)}
        >
          <BookOpen size={28} className="text-emerald-400 mb-3 opacity-60" />
          <p className="text-[13px]" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.4)' }}>
            No papers match this filter.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((item, i) => (
              <PaperCard key={item.id} item={item} lm={lm} delay={Math.min(i * 0.04, 0.3)} />
            ))}
          </div>

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="mt-4 flex justify-center">
            {isFetching ? (
              <div className="flex items-center gap-2 py-3 text-[11px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}>
                <Loader2 size={13} className="animate-spin text-emerald-400" />
                Loading more papers…
              </div>
            ) : data?.hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-medium transition-all"
                style={{
                  background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: lm ? '#065f46' : '#34d399',
                }}
              >
                <ChevronDown size={13} />
                Load more
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
