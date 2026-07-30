import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ExternalLink, ChevronDown, Loader2,
  Award, Users, Clock, Unlock, AlertCircle, FlaskConical,
} from 'lucide-react';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';
import type { BioSectionId } from '../types';

// ─── Topic Section ────────────────────────────────────────────────────────────
// Shows: Wikipedia summary + multiple related articles + OpenAlex research papers.

interface TopicSectionProps {
  lm: boolean;
  sectionId: BioSectionId;
}

type TopicTab = 'overview' | 'articles' | 'research';

interface TopicConfig {
  wikiTitle: string;
  searchQuery: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  relatedTopics?: string[];
}

const TOPIC_CONFIG: Partial<Record<BioSectionId, TopicConfig>> = {
  organs: {
    wikiTitle: 'Organ_(anatomy)',
    searchQuery: 'human organ anatomy physiology heart lung kidney liver',
    accentColor: 'text-rose-400',
    accentBg: 'rgba(251,113,133,0.1)',
    accentBorder: 'rgba(251,113,133,0.2)',
    relatedTopics: ['Heart anatomy', 'Liver function', 'Kidney physiology', 'Lung structure', 'Digestive system'],
  },
  'body-systems': {
    wikiTitle: 'Human_body',
    searchQuery: 'human body systems physiology circulatory respiratory nervous',
    accentColor: 'text-sky-400',
    accentBg: 'rgba(56,189,248,0.1)',
    accentBorder: 'rgba(56,189,248,0.2)',
    relatedTopics: ['Circulatory system', 'Respiratory system', 'Nervous system', 'Endocrine system'],
  },
  skeleton: {
    wikiTitle: 'Human_skeleton',
    searchQuery: 'human skeleton bone anatomy skeletal system calcium',
    accentColor: 'text-slate-300',
    accentBg: 'rgba(203,213,225,0.1)',
    accentBorder: 'rgba(203,213,225,0.2)',
    relatedTopics: ['Bone remodeling', 'Osteoporosis', 'Axial skeleton', 'Appendicular skeleton'],
  },
  muscles: {
    wikiTitle: 'Muscle',
    searchQuery: 'muscle anatomy skeletal cardiac smooth fiber contraction',
    accentColor: 'text-amber-400',
    accentBg: 'rgba(251,191,36,0.1)',
    accentBorder: 'rgba(251,191,36,0.2)',
    relatedTopics: ['Skeletal muscle', 'Smooth muscle', 'Cardiac muscle', 'Muscle contraction'],
  },
  genetics: {
    wikiTitle: 'Genetics',
    searchQuery: 'genetics heredity gene expression DNA mutation inheritance',
    accentColor: 'text-cyan-400',
    accentBg: 'rgba(34,211,238,0.1)',
    accentBorder: 'rgba(34,211,238,0.2)',
    relatedTopics: ['Mendelian genetics', 'Epigenetics', 'Gene expression', 'Chromosomal inheritance'],
  },
  microbiology: {
    wikiTitle: 'Microbiology',
    searchQuery: 'microbiology bacteria microorganism prokaryote pathogen infection',
    accentColor: 'text-green-400',
    accentBg: 'rgba(74,222,128,0.1)',
    accentBorder: 'rgba(74,222,128,0.2)',
    relatedTopics: ['Bacterial cell', 'Antibiotic resistance', 'Microbiome', 'Fungi biology'],
  },
  viruses: {
    wikiTitle: 'Virus',
    searchQuery: 'virus virology viral replication infection immune response',
    accentColor: 'text-orange-400',
    accentBg: 'rgba(251,146,60,0.1)',
    accentBorder: 'rgba(251,146,60,0.2)',
    relatedTopics: ['RNA viruses', 'DNA viruses', 'Viral immunity', 'Bacteriophage'],
  },
  evolution: {
    wikiTitle: 'Evolution',
    searchQuery: 'evolution natural selection adaptation speciation phylogeny Darwin',
    accentColor: 'text-yellow-400',
    accentBg: 'rgba(250,204,21,0.1)',
    accentBorder: 'rgba(250,204,21,0.2)',
    relatedTopics: ['Natural selection', 'Genetic drift', 'Speciation', 'Phylogenetics'],
  },
  biochemistry: {
    wikiTitle: 'Biochemistry',
    searchQuery: 'biochemistry enzyme metabolism protein ATP cellular',
    accentColor: 'text-indigo-400',
    accentBg: 'rgba(129,140,248,0.1)',
    accentBorder: 'rgba(129,140,248,0.2)',
    relatedTopics: ['Enzyme kinetics', 'Metabolic pathways', 'Protein structure', 'ATP synthesis'],
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

// ── Highlight helper ──────────────────────────────────────────────────────────
function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

// ── Multi-item organs grid ────────────────────────────────────────────────────
// Fetches individual Wikipedia summaries for multiple organs in parallel and
// displays them as a visually-rich 2-column card grid with thumbnails.

interface OrganCard {
  wikiTitle: string;
  label: string;
  emoji: string;
}

const ORGAN_ITEMS: OrganCard[] = [
  { wikiTitle: 'Heart', label: 'Heart', emoji: '❤️' },
  { wikiTitle: 'Lung', label: 'Lungs', emoji: '🫁' },
  { wikiTitle: 'Liver', label: 'Liver', emoji: '🩺' },
  { wikiTitle: 'Kidney', label: 'Kidneys', emoji: '🫘' },
  { wikiTitle: 'Brain', label: 'Brain', emoji: '🧠' },
  { wikiTitle: 'Skin', label: 'Skin', emoji: '🦠' },
  { wikiTitle: 'Stomach', label: 'Stomach', emoji: '🫃' },
  { wikiTitle: 'Pancreas', label: 'Pancreas', emoji: '🔬' },
  { wikiTitle: 'Spleen', label: 'Spleen', emoji: '🫀' },
  { wikiTitle: 'Intestine', label: 'Intestines', emoji: '🧬' },
];

interface OrganData {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

function SingleOrganCard({
  lm, organ, accentBg, accentBorder, delay,
}: {
  lm: boolean; organ: OrganCard; accentBg: string; accentBorder: string; delay: number;
}) {
  const [data, setData] = useState<OrganData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(organ.wikiTitle)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } }
    )
      .then((r) => r.ok ? r.json() as Promise<OrganData> : Promise.reject(r.status))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
    return () => ctrl.abort();
  }, [organ.wikiTitle]);

  const wikiUrl = data?.content_urls?.desktop?.page
    ?? `https://en.wikipedia.org/wiki/${organ.wikiTitle}`;

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden animate-pulse"
        style={{ background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', height: 180 }} />
    );
  }

  return (
    <motion.a
      href={wikiUrl} target="_blank" rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="block rounded-2xl overflow-hidden no-underline"
      style={{
        ...glassCard(lm),
        boxShadow: lm ? '0 2px 14px rgba(52,211,153,0.07)' : '0 2px 14px rgba(0,0,0,0.3)',
      }}
    >
      {/* Thumbnail */}
      {data?.thumbnail?.source ? (
        <div className="relative h-28 overflow-hidden">
          <img
            src={data.thumbnail.source} alt={organ.label}
            className="w-full h-full object-cover"
            style={{ filter: lm ? 'none' : 'brightness(0.72) saturate(0.85)' }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)',
          }} />
          <span className="absolute bottom-2 left-2.5 text-[13px] font-bold text-white drop-shadow">
            {organ.label}
          </span>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-3xl"
          style={{ background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.07)' }}>
          {organ.emoji}
        </div>
      )}

      {/* Body */}
      <div className="p-3">
        {!data?.thumbnail?.source && (
          <p className="text-[12px] font-semibold mb-1"
            style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}>
            {organ.label}
          </p>
        )}
        <p className="text-[10px] leading-relaxed line-clamp-3"
          style={{ color: lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.4)' }}>
          {data?.extract ? data.extract.slice(0, 160) + (data.extract.length > 160 ? '…' : '') : 'Loading…'}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: lm ? '#065f46' : '#f87171' }}>
            Wikipedia
          </span>
        </div>
      </div>
    </motion.a>
  );
}

function OrgansOverviewGrid({ lm, accentBg, accentBorder }: {
  lm: boolean; accentBg: string; accentBorder: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold"
        style={{ color: lm ? 'rgba(6,78,59,0.38)' : 'rgba(255,255,255,0.28)' }}>
        Human Organs — Click any card to explore on Wikipedia
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ORGAN_ITEMS.map((organ, i) => (
          <SingleOrganCard
            key={organ.wikiTitle}
            lm={lm} organ={organ}
            accentBg={accentBg} accentBorder={accentBorder}
            delay={i * 0.06}
          />
        ))}
      </div>
    </div>
  );
}

// ── Wikipedia overview ────────────────────────────────────────────────────────
function WikiOverview({
  lm, wikiTitle, accentColor, accentBg, accentBorder,
}: {
  lm: boolean; wikiTitle: string; accentColor: string; accentBg: string; accentBorder: string;
}) {
  const [data, setData] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setError(false);
    fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
      { signal: ctrl.signal, headers: { Accept: 'application/json' } }
    )
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<WikiSummary>; })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (e instanceof Error && e.name === 'AbortError') return; setError(true); setLoading(false); });
    return () => ctrl.abort();
  }, [wikiTitle]);

  if (loading) return (
    <div className="space-y-3">
      <div className="h-36 rounded-2xl animate-pulse" style={{ background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)' }} />
      <div className="space-y-2">{[0.8, 1, 0.7].map((w, i) => (
        <div key={i} className="h-3 rounded animate-pulse" style={{ width: `${w * 100}%`, background: lm ? 'rgba(52,211,153,0.07)' : 'rgba(255,255,255,0.04)' }} />
      ))}</div>
    </div>
  );

  if (error || !data) return (
    <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={glassCard(lm)}>
      <AlertCircle size={22} className="text-rose-400 mb-2" />
      <p className="text-[12px]" style={{ color: lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.4)' }}>Could not load Wikipedia content.</p>
    </div>
  );

  const wikiUrl = data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${wikiTitle}`;
  const paragraphs = data.extract.split('\n').filter(Boolean).slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="relative overflow-hidden rounded-2xl mb-4" style={{
        background: lm ? 'linear-gradient(135deg, rgba(240,253,244,0.95), rgba(240,253,254,0.95))' : 'linear-gradient(135deg, rgba(2,14,8,0.96), rgba(2,10,16,0.96))',
        border: lm ? `1px solid ${accentBorder}` : `1px solid ${accentBorder.replace('0.2', '0.12')}`,
      }}>
        {data.thumbnail && (
          <div className="relative h-36 overflow-hidden">
            <img src={data.thumbnail.source} alt={data.title} className="w-full h-full object-cover"
              style={{ filter: lm ? 'none' : 'brightness(0.7) saturate(0.8)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(2,14,8,0.8) 100%)' }} />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-[16px] font-bold tracking-tight"
              style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}>
              {data.title}
            </h3>
            <a href={wikiUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: lm ? '#065f46' : '#34d399' }}>
              <ExternalLink size={10} /> Wikipedia
            </a>
          </div>
          {data.description && (
            <p className="text-[11px] italic mb-2" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}>{data.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {paragraphs.map((para, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }} className="rounded-xl px-4 py-3"
            style={{ ...glassCard(lm), boxShadow: lm ? '0 1px 8px rgba(52,211,153,0.04)' : '0 1px 8px rgba(0,0,0,0.2)' }}>
            <p className="text-[12px] leading-[1.7]" style={{ color: lm ? 'rgba(6,78,59,0.72)' : 'rgba(255,255,255,0.55)' }}>{para}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.22)' }}>
        <BookOpen size={11} />
        Content from Wikipedia under{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"
          style={{ color: lm ? 'rgba(52,211,153,0.7)' : 'rgba(52,211,153,0.5)' }}>CC BY-SA 4.0</a>
      </div>
    </motion.div>
  );
}

// ── Articles panel — multiple Wikipedia results ───────────────────────────────
function ArticlesPanel({ lm, searchQuery, accentBg, accentBorder }: {
  lm: boolean; searchQuery: string; accentBg: string; accentBorder: string;
}) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<BiologySearchItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryParams = { q: searchQuery, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: searchQuery.length >= 2, staleTime: 5 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  // Accumulate results across pages
  useEffect(() => {
    if (!data?.items) return;
    const articles = data.items.filter((i: BiologySearchItem) => i.kind === 'article');
    if (page === 1) {
      setAllItems(articles);
    } else {
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = articles.filter((a: BiologySearchItem) => !existingIds.has(a.id));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

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

  if (isLoading && page === 1) return (
    <div className="space-y-3 mt-3">{Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-20 rounded-2xl animate-pulse" style={glassCard(lm)} />
    ))}</div>
  );

  if (isError && allItems.length === 0) return (
    <div className="flex items-center gap-2 mt-4 text-rose-400 text-[12px]">
      <AlertCircle size={14} /> Could not load articles.
    </div>
  );

  if (!isLoading && allItems.length === 0) return (
    <p className="text-center py-8 text-[12px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>No articles found.</p>
  );

  return (
    <div className="space-y-2.5 mt-2">
      {allItems.map((item, i) => (
        <motion.a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }} whileHover={{ y: -2 }}
          className="block rounded-2xl p-3.5 no-underline"
          style={{ ...glassCard(lm), boxShadow: lm ? '0 1px 10px rgba(52,211,153,0.04)' : '0 1px 10px rgba(0,0,0,0.22)' }}>
          <div className="flex items-start gap-2">
            <BookOpen size={12} className="text-sky-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold mb-1 line-clamp-2"
                style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.88)' }}>
                {item.title}
              </p>
              {item.description && (
                <p className="text-[10px] leading-relaxed line-clamp-2"
                  style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.32)' }}>
                  {item.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: lm ? '#065f46' : '#34d399' }}>
                Wikipedia
              </span>
              <ExternalLink size={9} style={{ color: lm ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.3)' }} />
            </div>
          </div>
          {item.date && (
            <div className="flex items-center gap-1 mt-1.5 ml-[22px]">
              <Clock size={9} style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }} />
              <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }}>
                {item.date.slice(0, 7)}
              </span>
            </div>
          )}
        </motion.a>
      ))}

      <div ref={loadMoreRef} className="flex justify-center pt-2">
        {isFetching ? (
          <Loader2 size={14} className="animate-spin text-emerald-400" />
        ) : data?.hasMore ? (
          <button onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: lm ? '#065f46' : '#34d399' }}>
            <ChevronDown size={12} /> Load more
          </button>
        ) : allItems.length > 0 ? (
          <p className="text-[9px] py-2" style={{ color: lm ? 'rgba(6,78,59,0.28)' : 'rgba(255,255,255,0.18)' }}>
            {allItems.length} articles loaded
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Research panel — OpenAlex papers ─────────────────────────────────────────
type SortMode = 'cited' | 'date' | 'relevance';

function ResearchPanel({ lm, searchQuery }: { lm: boolean; searchQuery: string }) {
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('cited');
  const [allPapers, setAllPapers] = useState<BiologySearchItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryParams = { q: searchQuery, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: searchQuery.length >= 2, staleTime: 5 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  const papers = (data?.items ?? []).filter((i: BiologySearchItem) => i.kind === 'research');

  useEffect(() => {
    if (!data?.items) return;
    const newPapers = data.items.filter((i: BiologySearchItem) => i.kind === 'research');
    if (page === 1) {
      setAllPapers(newPapers);
    } else {
      setAllPapers((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...newPapers.filter((p: BiologySearchItem) => !ids.has(p.id))];
      });
    }
  }, [data, page]);

  // Reset when sort changes
  useEffect(() => { setPage(1); setAllPapers([]); }, [sortMode, searchQuery]);

  const sortedPapers = [...allPapers].sort((a, b) => {
    if (sortMode === 'date') return (b.date ?? '').localeCompare(a.date ?? '');
    if (sortMode === 'relevance') return 0;
    return (b.citationCount ?? 0) - (a.citationCount ?? 0);
  });

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

  const SORT_OPTIONS: { id: SortMode; label: string }[] = [
    { id: 'cited',     label: 'Most Cited'  },
    { id: 'date',      label: 'Newest'      },
    { id: 'relevance', label: 'Relevant'    },
  ];

  if (isLoading && page === 1) return (
    <div className="space-y-3 mt-3">{Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="h-20 rounded-2xl animate-pulse" style={glassCard(lm)} />
    ))}</div>
  );

  if (isError && sortedPapers.length === 0) return (
    <div className="flex items-center gap-2 mt-4 text-rose-400 text-[12px]">
      <AlertCircle size={14} /> Could not load research papers.
    </div>
  );

  return (
    <div className="mt-2">
      {/* Sort controls */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="text-[9px] uppercase tracking-[0.16em]" style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }}>
          Sort:
        </span>
        {SORT_OPTIONS.map((s) => (
          <button key={s.id} onClick={() => setSortMode(s.id)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150"
            style={{
              background: sortMode === s.id ? 'rgba(52,211,153,0.15)' : 'transparent',
              border: sortMode === s.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(52,211,153,0.1)',
              color: sortMode === s.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)'),
            }}>
            {s.label}
          </button>
        ))}
        {(isLoading || isFetching) && <Loader2 size={11} className="animate-spin text-emerald-400 ml-1" />}
      </div>

      {sortedPapers.length === 0 && !isLoading ? (
        <p className="text-center py-8 text-[12px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>
          No research papers found.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedPapers.map((item, i) => (
            <motion.a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.4 }} whileHover={{ y: -2 }}
              className="block rounded-2xl p-4 no-underline"
              style={{ ...glassCard(lm), boxShadow: lm ? '0 1px 12px rgba(52,211,153,0.05)' : '0 1px 12px rgba(0,0,0,0.25)' }}>
              <div className="flex items-start gap-2 mb-1.5">
                <FlaskConical size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] font-semibold line-clamp-2"
                  style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.88)' }}>
                  {item.title}
                </p>
              </div>
              {item.description && (
                <p className="text-[10px] leading-relaxed mb-2 line-clamp-2 ml-[19px]"
                  style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}>
                  {item.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 ml-[19px]">
                {item.authors.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users size={9} style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }} />
                    <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.28)' }}>
                      {item.authors.slice(0, 2).join(', ')}
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
                    <span className="text-[9px] text-emerald-400 font-medium">Open Access</span>
                  </div>
                )}
              </div>
            </motion.a>
          ))}
        </div>
      )}

      <div ref={loadMoreRef} className="flex justify-center pt-3">
        {isFetching ? (
          <Loader2 size={14} className="animate-spin text-emerald-400" />
        ) : data?.hasMore ? (
          <button onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: lm ? '#065f46' : '#34d399' }}>
            <ChevronDown size={12} /> Load more papers
          </button>
        ) : sortedPapers.length > 0 ? (
          <p className="text-[9px] py-2" style={{ color: lm ? 'rgba(6,78,59,0.28)' : 'rgba(255,255,255,0.18)' }}>
            {sortedPapers.length} papers loaded
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Related Topics chip row ───────────────────────────────────────────────────
function RelatedTopics({
  lm, topics, accentBg, accentBorder, accentColor,
  onTopicClick,
}: {
  lm: boolean; topics: string[]; accentBg: string; accentBorder: string; accentColor: string;
  onTopicClick: (t: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-[9px] uppercase tracking-[0.2em] mb-2 font-semibold"
        style={{ color: lm ? 'rgba(6,78,59,0.38)' : 'rgba(255,255,255,0.25)' }}>
        Related Topics
      </p>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <button key={t} onClick={() => onTopicClick(t)}
            className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150 hover:scale-105"
            style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: lm ? '#065f46' : accentColor.replace('text-', '') }}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TopicSection({ lm, sectionId }: TopicSectionProps) {
  const [tab, setTab] = useState<TopicTab>('overview');
  const [relatedQuery, setRelatedQuery] = useState<string | null>(null);
  const config = TOPIC_CONFIG[sectionId];

  const cfg: TopicConfig = config ?? {
    wikiTitle: sectionId.replace(/-/g, '_'),
    searchQuery: sectionId.replace(/-/g, ' ') + ' biology',
    accentColor: 'text-emerald-400',
    accentBg: 'rgba(52,211,153,0.1)',
    accentBorder: 'rgba(52,211,153,0.2)',
  };

  const activeQuery = relatedQuery ?? cfg.searchQuery;

  const TABS: { id: TopicTab; label: string }[] = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'articles',  label: 'Articles'  },
    { id: 'research',  label: 'Papers'    },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-5">
        <div className="flex gap-1 p-1 rounded-xl w-full"
          style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2 px-3 rounded-lg text-[11px] font-medium transition-all duration-200"
              style={{
                background: tab === t.id ? (lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent',
                color: tab === t.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)'),
                border: tab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            {/* Organs gets a rich multi-card gallery instead of a single article */}
            {sectionId === 'organs' ? (
              <OrgansOverviewGrid lm={lm} accentBg={cfg.accentBg} accentBorder={cfg.accentBorder} />
            ) : (
              <WikiOverview lm={lm} wikiTitle={cfg.wikiTitle}
                accentColor={cfg.accentColor} accentBg={cfg.accentBg} accentBorder={cfg.accentBorder} />
            )}
            {cfg.relatedTopics && (
              <RelatedTopics
                lm={lm} topics={cfg.relatedTopics}
                accentBg={cfg.accentBg} accentBorder={cfg.accentBorder} accentColor={cfg.accentColor}
                onTopicClick={(t) => {
                  setRelatedQuery(t);
                  setTab('articles');
                }}
              />
            )}
          </motion.div>
        ) : tab === 'articles' ? (
          <motion.div key="articles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            {relatedQuery && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: cfg.accentBg, border: `1px solid ${cfg.accentBorder}`, color: lm ? '#065f46' : '#34d399' }}>
                  {relatedQuery}
                </span>
                <button onClick={() => setRelatedQuery(null)}
                  className="text-[9px] underline"
                  style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(255,255,255,0.3)' }}>
                  Reset
                </button>
              </div>
            )}
            <ArticlesPanel lm={lm} searchQuery={activeQuery}
              accentBg={cfg.accentBg} accentBorder={cfg.accentBorder} />
          </motion.div>
        ) : (
          <motion.div key="research" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
            <ResearchPanel lm={lm} searchQuery={activeQuery} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
