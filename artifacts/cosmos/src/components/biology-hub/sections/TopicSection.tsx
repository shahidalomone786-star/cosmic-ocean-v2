import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ExternalLink, ChevronDown, Loader2,
  Award, Users, Clock, Unlock, AlertCircle,
} from 'lucide-react';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';
import type { BioSectionId } from '../types';

// ─── Topic Section ────────────────────────────────────────────────────────────
// Shows Wikipedia summary + OpenAlex research for any biology topic.

interface TopicSectionProps {
  lm: boolean;
  sectionId: BioSectionId;
}

type TopicTab = 'overview' | 'research';

// ── Topic configuration ───────────────────────────────────────────────────────
interface TopicConfig {
  wikiTitle: string;
  searchQuery: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

const TOPIC_CONFIG: Partial<Record<BioSectionId, TopicConfig>> = {
  organs: {
    wikiTitle: 'Organ_(anatomy)',
    searchQuery: 'human organ anatomy physiology',
    accentColor: 'text-rose-400',
    accentBg: 'rgba(251,113,133,0.1)',
    accentBorder: 'rgba(251,113,133,0.2)',
  },
  'body-systems': {
    wikiTitle: 'Human_body',
    searchQuery: 'human body systems physiology',
    accentColor: 'text-sky-400',
    accentBg: 'rgba(56,189,248,0.1)',
    accentBorder: 'rgba(56,189,248,0.2)',
  },
  skeleton: {
    wikiTitle: 'Human_skeleton',
    searchQuery: 'human skeleton bone anatomy',
    accentColor: 'text-slate-300',
    accentBg: 'rgba(203,213,225,0.1)',
    accentBorder: 'rgba(203,213,225,0.2)',
  },
  muscles: {
    wikiTitle: 'Muscle',
    searchQuery: 'muscle anatomy skeletal cardiac',
    accentColor: 'text-amber-400',
    accentBg: 'rgba(251,191,36,0.1)',
    accentBorder: 'rgba(251,191,36,0.2)',
  },
  genetics: {
    wikiTitle: 'Genetics',
    searchQuery: 'genetics heredity gene expression DNA',
    accentColor: 'text-cyan-400',
    accentBg: 'rgba(34,211,238,0.1)',
    accentBorder: 'rgba(34,211,238,0.2)',
  },
  microbiology: {
    wikiTitle: 'Microbiology',
    searchQuery: 'microbiology bacteria microorganism cell',
    accentColor: 'text-green-400',
    accentBg: 'rgba(74,222,128,0.1)',
    accentBorder: 'rgba(74,222,128,0.2)',
  },
  viruses: {
    wikiTitle: 'Virus',
    searchQuery: 'virus virology viral replication infection',
    accentColor: 'text-orange-400',
    accentBg: 'rgba(251,146,60,0.1)',
    accentBorder: 'rgba(251,146,60,0.2)',
  },
  evolution: {
    wikiTitle: 'Evolution',
    searchQuery: 'evolution natural selection adaptation species',
    accentColor: 'text-yellow-400',
    accentBg: 'rgba(250,204,21,0.1)',
    accentBorder: 'rgba(250,204,21,0.2)',
  },
  biochemistry: {
    wikiTitle: 'Biochemistry',
    searchQuery: 'biochemistry enzyme metabolism protein',
    accentColor: 'text-indigo-400',
    accentBg: 'rgba(129,140,248,0.1)',
    accentBorder: 'rgba(129,140,248,0.2)',
  },
};

// ── Wikipedia summary type ────────────────────────────────────────────────────
interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
}

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

// ── Wikipedia section ─────────────────────────────────────────────────────────
function WikiOverview({
  lm, wikiTitle, accentColor, accentBg, accentBorder,
}: {
  lm: boolean;
  wikiTitle: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}) {
  const [data, setData] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);

    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } }
    )
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<WikiSummary>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(true);
        setLoading(false);
      });

    return () => ctrl.abort();
  }, [wikiTitle]);

  if (loading) {
    return (
      <div className="space-y-3">
        {/* image skeleton */}
        <div className="h-36 rounded-2xl animate-pulse" style={{ background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)' }} />
        <div className="space-y-2">
          {[0.8, 1, 0.7].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{
              width: `${w * 100}%`,
              background: lm ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)',
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center"
        style={glassCard(lm)}
      >
        <AlertCircle size={22} className="text-rose-400 mb-2" />
        <p className="text-[12px]" style={{ color: lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.4)' }}>
          Could not load Wikipedia content.
        </p>
      </div>
    );
  }

  const wikiUrl = data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${wikiTitle}`;
  const paragraphs = data.extract.split('\n').filter(Boolean).slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Thumbnail + description card */}
      <div
        className="relative overflow-hidden rounded-2xl mb-4"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(240,253,244,0.95), rgba(240,253,254,0.95))'
            : 'linear-gradient(135deg, rgba(2,14,8,0.96), rgba(2,10,16,0.96))',
          border: lm ? `1px solid ${accentBorder}` : `1px solid ${accentBorder.replace('0.2', '0.12')}`,
        }}
      >
        {data.thumbnail && (
          <div className="relative h-36 overflow-hidden">
            <img
              src={data.thumbnail.source}
              alt={data.title}
              className="w-full h-full object-cover"
              style={{ filter: lm ? 'none' : 'brightness(0.7) saturate(0.8)' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(2,14,8,0.8) 100%)' }}
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3
              className="text-[16px] font-bold tracking-tight"
              style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}
            >
              {data.title}
            </h3>
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: lm ? '#065f46' : '#34d399' }}
            >
              <ExternalLink size={10} />
              Wikipedia
            </a>
          </div>
          {data.description && (
            <p
              className="text-[11px] italic mb-2"
              style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}
            >
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Extract paragraphs */}
      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            className="rounded-xl px-4 py-3"
            style={{
              ...glassCard(lm),
              boxShadow: lm ? '0 1px 8px rgba(52,211,153,0.04)' : '0 1px 8px rgba(0,0,0,0.2)',
            }}
          >
            <p
              className="text-[12px] leading-[1.7]"
              style={{ color: lm ? 'rgba(6,78,59,0.72)' : 'rgba(255,255,255,0.55)' }}
            >
              {para}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Wikipedia attribution */}
      <div
        className="mt-4 flex items-center gap-2 text-[10px]"
        style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.22)' }}
      >
        <BookOpen size={11} />
        Content from Wikipedia under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"
          style={{ color: lm ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.5)' }}>
          CC BY-SA 4.0
        </a>
      </div>
    </motion.div>
  );
}

// ── Research sub-panel ────────────────────────────────────────────────────────
function ResearchPanel({ lm, searchQuery }: { lm: boolean; searchQuery: string }) {
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryParams = { q: searchQuery, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: searchQuery.length >= 2, staleTime: 5 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  const papers = (data?.items ?? []).filter((i: BiologySearchItem) => i.kind === 'research');

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

  if (isLoading) {
    return (
      <div className="space-y-3 mt-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={glassCard(lm)} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 mt-4 text-rose-400 text-[12px]">
        <AlertCircle size={14} />
        Could not load research papers.
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <p className="text-center py-8 text-[12px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>
        No research papers found.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {papers.map((item: BiologySearchItem, i: number) => (
        <motion.a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.4 }}
          whileHover={{ y: -2 }}
          className="block rounded-2xl p-4 no-underline"
          style={{
            ...glassCard(lm),
            boxShadow: lm ? '0 1px 12px rgba(52,211,153,0.05)' : '0 1px 12px rgba(0,0,0,0.25)',
          }}
        >
          <p
            className="text-[12px] font-semibold mb-1.5 line-clamp-2"
            style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.88)' }}
          >
            {item.title}
          </p>
          {item.description && (
            <p
              className="text-[10px] leading-relaxed mb-2 line-clamp-2"
              style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}
            >
              {item.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {item.authors.length > 0 && (
              <div className="flex items-center gap-1">
                <Users size={9} style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }} />
                <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.28)' }}>
                  {item.authors.slice(0, 2).join(', ')}
                </span>
              </div>
            )}
            {item.citationCount != null && (
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
                <span className="text-[9px] text-emerald-400 font-medium">Open Access</span>
              </div>
            )}
          </div>
        </motion.a>
      ))}

      <div ref={loadMoreRef} className="flex justify-center pt-2">
        {isFetching ? (
          <Loader2 size={14} className="animate-spin text-emerald-400" />
        ) : data?.hasMore ? (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
              color: lm ? '#065f46' : '#34d399',
            }}
          >
            <ChevronDown size={12} />
            Load more
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TopicSection({ lm, sectionId }: TopicSectionProps) {
  const [tab, setTab] = useState<TopicTab>('overview');
  const config = TOPIC_CONFIG[sectionId];

  // Fallback config for unrecognized sections
  const cfg: TopicConfig = config ?? {
    wikiTitle: sectionId.replace(/-/g, '_'),
    searchQuery: sectionId.replace(/-/g, ' ') + ' biology',
    accentColor: 'text-emerald-400',
    accentBg: 'rgba(52,211,153,0.1)',
    accentBorder: 'rgba(52,211,153,0.2)',
  };

  const TABS: { id: TopicTab; label: string }[] = [
    { id: 'overview',  label: 'Overview'        },
    { id: 'research',  label: 'Research Papers' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5">
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
              className="flex-1 py-2 px-3 rounded-lg text-[11px] font-medium transition-all duration-200"
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <WikiOverview
              lm={lm}
              wikiTitle={cfg.wikiTitle}
              accentColor={cfg.accentColor}
              accentBg={cfg.accentBg}
              accentBorder={cfg.accentBorder}
            />
          </motion.div>
        ) : (
          <motion.div
            key="research"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <ResearchPanel lm={lm} searchQuery={cfg.searchQuery} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
