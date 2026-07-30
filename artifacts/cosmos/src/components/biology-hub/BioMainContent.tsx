import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers3, Heart, Network, Activity, Zap, Brain, Microscope,
  GitBranch, FlaskConical, Atom, TreePine, BookOpen, Play, Gauge,
  Dna, ArrowRight, Clock, Users, Star, Lock,
  ChevronDown, Loader2, Award, Unlock, AlertCircle, ExternalLink,
} from 'lucide-react';
import { BIO_NAV_ITEMS, type BioSectionId } from './types';
import BioDNAIcon from './BioDNAIcon';
import Anatomy3DViewer from './anatomy3d/Anatomy3DViewer';
import ResearchSection from './sections/ResearchSection';
import SimulationsSection from './sections/SimulationsSection';
import VideosSection from './sections/VideosSection';
import TopicSection from './sections/TopicSection';
import BioSearchResults from './sections/BioSearchResults';
import MicroscopeSection from './sections/MicroscopeSection';
import FeelNatureSection from './sections/FeelNatureSection';
import { useBiologySearch, getBiologySearchQueryKey } from '@workspace/api-client-react';
import type { BiologySearchItem } from '@workspace/api-client-react';

// ─── Biology Hub — Main Content Area ─────────────────────────────────────────

interface BioMainContentProps {
  lm: boolean;
  activeSection: BioSectionId;
  searchQuery: string;
  onClearSearch?: () => void;
}

const glassCard = (lm: boolean) => ({
  background: lm ? `rgba(240,253,244,0.85)` : `rgba(3,12,8,0.75)`,
  border: lm ? `1px solid rgba(52,211,153,0.2)` : `1px solid rgba(52,211,153,0.12)`,
  backdropFilter: 'blur(18px)',
});

// ── Placeholder card ──────────────────────────────────────────────────────────
function PlaceholderCard({
  lm, title, subtitle, tag, delay = 0, icon: Icon, color,
}: {
  lm: boolean; title: string; subtitle: string; tag?: string; delay?: number;
  icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }>; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.015 }}
      className="rounded-2xl p-4 cursor-pointer transition-shadow duration-300"
      style={{ ...glassCard(lm), boxShadow: lm ? '0 2px 16px rgba(52,211,153,0.06)' : '0 2px 16px rgba(0,0,0,0.3)' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: lm ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <Icon size={15} strokeWidth={1.8} className={color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-semibold truncate"
              style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.9)' }}>
              {title}
            </p>
            {tag && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
                {tag}
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed"
            style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}>
            {subtitle}
          </p>
        </div>
        <ArrowRight size={13} style={{ color: lm ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.35)' }}
          className="flex-shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ lm, title, subtitle, badge }: {
  lm: boolean; title: string; subtitle?: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-[15px] font-semibold tracking-tight"
        style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}>
        {title}
      </h2>
      {subtitle && (
        <span className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}>
          {subtitle}
        </span>
      )}
      {badge}
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ lm, icon: Icon, value, label }: {
  lm: boolean; icon: React.FC<{ size?: number; className?: string }>; value: string; label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: lm ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)' }}>
      <Icon size={11} className="text-emerald-400" />
      <span className="text-emerald-400 font-semibold text-[11px]">{value}</span>
      <span className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}>{label}</span>
    </div>
  );
}

// ── Live results feed ─────────────────────────────────────────────────────────
// Shared component used by DNA, Cells, Brain sections for inline live data
function LiveResultsFeed({
  lm, searchQuery, showKind, accentColor = 'text-emerald-400',
}: {
  lm: boolean; searchQuery: string; showKind?: 'article' | 'research'; accentColor?: string;
}) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<BiologySearchItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const queryParams = { q: searchQuery, page };
  const { data, isLoading, isError, isFetching } = useBiologySearch(
    queryParams,
    { query: { enabled: searchQuery.length >= 2, staleTime: 5 * 60 * 1000, queryKey: getBiologySearchQueryKey(queryParams) } }
  );

  useEffect(() => {
    if (!data?.items) return;
    const items = showKind ? data.items.filter((i: BiologySearchItem) => i.kind === showKind) : data.items;
    if (page === 1) {
      setAllItems(items);
    } else {
      setAllItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...items.filter((i: BiologySearchItem) => !ids.has(i.id))];
      });
    }
  }, [data, page, showKind]);

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

  if (isLoading && allItems.length === 0) return (
    <div className="space-y-2.5 mt-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl animate-pulse" style={glassCard(lm)} />
      ))}
    </div>
  );

  if (isError && allItems.length === 0) return (
    <div className="flex items-center gap-2 mt-3 text-rose-400 text-[11px]">
      <AlertCircle size={12} /> Could not load results.
    </div>
  );

  return (
    <div className="space-y-2 mt-3">
      {allItems.map((item, i) => (
        <motion.a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.035, 0.28), duration: 0.4 }} whileHover={{ y: -2 }}
          className="block rounded-xl p-3.5 no-underline"
          style={{ ...glassCard(lm), boxShadow: lm ? '0 1px 10px rgba(52,211,153,0.04)' : '0 1px 10px rgba(0,0,0,0.2)' }}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {item.kind === 'article'
                ? <BookOpen size={11} className="text-sky-400" />
                : <FlaskConical size={11} className="text-emerald-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold mb-0.5 line-clamp-2"
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
            <ExternalLink size={10} className="flex-shrink-0 mt-0.5"
              style={{ color: lm ? 'rgba(52,211,153,0.35)' : 'rgba(52,211,153,0.28)' }} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5 mt-1.5 ml-[19px]">
            {item.citationCount != null && item.citationCount > 0 && (
              <div className="flex items-center gap-1">
                <Award size={8} className="text-amber-400" />
                <span className="text-[9px] text-amber-400">{item.citationCount.toLocaleString()}</span>
              </div>
            )}
            {item.date && (
              <div className="flex items-center gap-1">
                <Clock size={8} style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }} />
                <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }}>
                  {item.date.slice(0, 7)}
                </span>
              </div>
            )}
            {item.openAccess && (
              <div className="flex items-center gap-1 ml-auto">
                <Unlock size={8} className="text-emerald-400" />
                <span className="text-[9px] text-emerald-400">Open</span>
              </div>
            )}
          </div>
        </motion.a>
      ))}

      <div ref={loadMoreRef} className="flex justify-center pt-2">
        {isFetching ? (
          <Loader2 size={12} className="animate-spin text-emerald-400" />
        ) : data?.hasMore ? (
          <button onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-medium"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: lm ? '#065f46' : '#34d399' }}>
            <ChevronDown size={11} /> Load more
          </button>
        ) : allItems.length > 0 ? (
          <p className="text-[9px] py-1.5" style={{ color: lm ? 'rgba(6,78,59,0.25)' : 'rgba(255,255,255,0.18)' }}>
            {allItems.length} results
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Sub-section divider ───────────────────────────────────────────────────────
function SubDivider({ lm, label }: { lm: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px" style={{ background: lm ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)' }} />
      <span className="text-[9px] uppercase tracking-[0.2em] font-semibold flex-shrink-0"
        style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(52,211,153,0.3)' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: lm ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────────────────────

function OverviewSection({ lm }: { lm: boolean }) {
  const quickCards = [
    { title: 'Human Anatomy 3D', subtitle: 'Explore all 78 organs in interactive 3D', icon: Layers3, color: 'text-emerald-400', tag: 'Interactive', delay: 0.05 },
    { title: 'Cell Biology', subtitle: 'Mitochondria, nucleus, ER and 20+ organelles', icon: Microscope, color: 'text-teal-400', tag: undefined, delay: 0.1 },
    { title: 'DNA & Genetics', subtitle: 'Base pairs, replication, mutation mechanisms', icon: Dna, color: 'text-lime-400', tag: 'New', delay: 0.15 },
    { title: 'Brain & Neuroscience', subtitle: 'Neural pathways, consciousness, cognition', icon: Brain, color: 'text-violet-400', tag: 'Popular', delay: 0.2 },
    { title: 'Evolution', subtitle: 'Natural selection, adaptation, phylogeny', icon: TreePine, color: 'text-yellow-400', tag: undefined, delay: 0.25 },
    { title: 'Biochemistry', subtitle: 'Enzymes, ATP, metabolic pathways', icon: FlaskConical, color: 'text-indigo-400', tag: undefined, delay: 0.3 },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl mb-6 p-6"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(236,253,245,0.98) 0%, rgba(224,252,255,0.98) 60%, rgba(240,236,255,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(2,14,10,0.98) 0%, rgba(2,12,20,0.98) 60%, rgba(8,4,22,0.98) 100%)',
          border: lm ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(52,211,153,0.15)',
          boxShadow: lm ? '0 8px 32px rgba(52,211,153,0.1)' : '0 8px 32px rgba(52,211,153,0.06)',
        }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)', filter: 'blur(20px)' }} />
        <div className="absolute -bottom-6 left-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)', filter: 'blur(16px)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] uppercase tracking-[0.25em] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                Biology Hub
              </span>
              <span style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }} className="text-[9px]">
                v3.0 — Intelligence Layer
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1.5"
              style={{
                fontFamily: 'var(--app-font-heading)',
                background: lm ? 'linear-gradient(135deg, #065f46 0%, #0e7490 60%, #4338ca 100%)' : 'linear-gradient(135deg, #34d399 0%, #06b6d4 60%, #a78bfa 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              Explore Life Sciences
            </h1>
            <p className="text-[12px] leading-relaxed mb-4 max-w-sm"
              style={{ color: lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.45)' }}>
              From the double helix of DNA to the vast neural networks of the human brain — Biology Hub brings life's complexity to your screen, powered by Wikipedia, OpenAlex, and PhET simulations.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatChip lm={lm} icon={BookOpen} value="16" label="sections" />
              <StatChip lm={lm} icon={Users} value="50K+" label="learners" />
              <StatChip lm={lm} icon={Star} value="4.9★" label="rated" />
            </div>
          </div>
          <div className="flex-shrink-0 hidden sm:block">
            <motion.div animate={{ y: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <BioDNAIcon size={110} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <SectionHeader lm={lm} title="Quick Access" subtitle="All Sections" />
      <div className="grid grid-cols-1 gap-3">
        {quickCards.map((card) => (
          <PlaceholderCard key={card.title} lm={lm} {...card} />
        ))}
      </div>
    </div>
  );
}

function AnatomySection({ lm }: { lm: boolean }) {
  return (
    <div>
      <Anatomy3DViewer lm={lm} />
      <div className="mt-12"><FeelNatureSection lm={lm} /></div>
    </div>
  );
}

// ── DNA Section — enhanced with live API data ─────────────────────────────────
function DNASection({ lm }: { lm: boolean }) {
  const [activeTab, setActiveTab] = useState<'topics' | 'articles' | 'research'>('topics');

  const topics = [
    { title: 'Double Helix Structure', subtitle: 'Watson & Crick model, base pairing rules', tag: 'Foundational' },
    { title: 'DNA Replication', subtitle: 'Semi-conservative replication, polymerase chain', tag: undefined },
    { title: 'Transcription & Translation', subtitle: 'mRNA synthesis, ribosome assembly, codon table', tag: undefined },
    { title: 'Gene Expression', subtitle: 'Promoters, operators, regulatory sequences', tag: undefined },
    { title: 'Mutations & Repair', subtitle: 'Point mutations, frame shifts, DNA damage response', tag: undefined },
    { title: 'CRISPR-Cas9', subtitle: 'Gene editing, guide RNA, molecular scissors', tag: 'Cutting Edge' },
  ];

  const TABS = [
    { id: 'topics' as const,   label: 'Topics'   },
    { id: 'articles' as const, label: 'Articles' },
    { id: 'research' as const, label: 'Papers'   },
  ];

  return (
    <div>
      <SectionHeader lm={lm} title="DNA & Genomics" subtitle="Molecular Blueprint" />

      {/* DNA feature card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl mb-5 p-5 flex items-center gap-5"
        style={{
          background: lm ? 'linear-gradient(135deg, rgba(240,253,244,0.95), rgba(240,253,254,0.95))' : 'linear-gradient(135deg, rgba(2,14,8,0.96), rgba(2,10,16,0.96))',
          border: lm ? '1px solid rgba(163,230,53,0.3)' : '1px solid rgba(163,230,53,0.18)',
        }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 50%, rgba(163,230,53,0.06) 0%, transparent 60%)' }} />
        <div className="flex-1 relative z-10">
          <p className="text-[11px] uppercase tracking-[0.2em] mb-1"
            style={{ color: lm ? 'rgba(101,163,13,0.7)' : 'rgba(163,230,53,0.5)' }}>Featured Topic</p>
          <p className="text-[17px] font-bold mb-1.5 tracking-tight"
            style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#3f6212' : '#a3e635' }}>
            The Human Genome
          </p>
          <p className="text-[11px] mb-3" style={{ color: lm ? 'rgba(63,98,18,0.6)' : 'rgba(255,255,255,0.4)' }}>
            3.2 billion base pairs · 20,000 protein-coding genes · 23 chromosome pairs
          </p>
          <div className="flex items-center gap-2">
            <Clock size={11} className="text-lime-400" />
            <span className="text-[10px]" style={{ color: lm ? 'rgba(63,98,18,0.5)' : 'rgba(255,255,255,0.3)' }}>~45 min deep dive</span>
          </div>
        </div>
        <BioDNAIcon size={80} />
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-4"
        style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-200"
            style={{
              background: activeTab === t.id ? (lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent',
              color: activeTab === t.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)'),
              border: activeTab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'topics' && (
          <motion.div key="topics" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 gap-2.5">
              {topics.map((t, i) => (
                <PlaceholderCard key={t.title} lm={lm} title={t.title} subtitle={t.subtitle}
                  tag={t.tag} icon={Dna} color="text-lime-400" delay={i * 0.05} />
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'articles' && (
          <motion.div key="articles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="DNA replication transcription mutation genes chromosome RNA protein synthesis" showKind="article" />
          </motion.div>
        )}
        {activeTab === 'research' && (
          <motion.div key="research" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="DNA replication transcription mutation genes chromosome RNA protein synthesis" showKind="research" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Cells Section — enhanced with live API data ───────────────────────────────
function CellsSection({ lm }: { lm: boolean }) {
  const [activeTab, setActiveTab] = useState<'organelles' | 'articles' | 'research'>('organelles');

  const organelles = [
    { name: 'Nucleus', role: 'DNA storage & gene expression control', color: 'bg-violet-400' },
    { name: 'Mitochondria', role: 'ATP production via cellular respiration', color: 'bg-red-400' },
    { name: 'Ribosome', role: 'Protein synthesis from mRNA templates', color: 'bg-blue-400' },
    { name: 'Endoplasmic Reticulum', role: 'Protein folding and lipid synthesis', color: 'bg-sky-400' },
    { name: 'Golgi Apparatus', role: 'Protein sorting, packaging and secretion', color: 'bg-orange-400' },
    { name: 'Lysosome', role: 'Cellular digestion and waste removal', color: 'bg-pink-400' },
    { name: 'Chloroplast', role: 'Photosynthesis in plant cells', color: 'bg-green-400' },
    { name: 'Cell Membrane', role: 'Selective permeability and cell boundary', color: 'bg-teal-400' },
    { name: 'Cytoskeleton', role: 'Cell shape, movement, and internal transport', color: 'bg-cyan-400' },
    { name: 'Vacuole', role: 'Storage, waste disposal, and turgor pressure', color: 'bg-purple-400' },
  ];

  const TABS = [
    { id: 'organelles' as const, label: 'Organelles' },
    { id: 'articles' as const,   label: 'Articles'   },
    { id: 'research' as const,   label: 'Papers'     },
  ];

  return (
    <div>
      <SectionHeader lm={lm} title="Cell Biology" subtitle="Building Blocks of Life" />

      <div className="flex gap-1 p-1 rounded-xl mb-4"
        style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-200"
            style={{
              background: activeTab === t.id ? (lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent',
              color: activeTab === t.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)'),
              border: activeTab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'organelles' && (
          <motion.div key="organelles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 gap-2.5">
              {organelles.map((org, i) => (
                <motion.div key={org.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.045 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                  style={{ ...glassCard(lm), boxShadow: lm ? '0 1px 10px rgba(52,211,153,0.04)' : '0 1px 10px rgba(0,0,0,0.2)' }}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${org.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.88)' }}>{org.name}</p>
                    <p className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.32)' }}>{org.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'articles' && (
          <motion.div key="articles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="animal cell plant cell cell membrane nucleus mitochondria mitosis meiosis cell division" showKind="article" />
          </motion.div>
        )}
        {activeTab === 'research' && (
          <motion.div key="research" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="animal cell plant cell cell membrane nucleus mitochondria mitosis meiosis cell division" showKind="research" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Brain Section — enhanced with live API data ───────────────────────────────
function BrainSection({ lm }: { lm: boolean }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'research'>('overview');

  const topics = [
    { title: 'Cerebral Cortex', subtitle: 'Higher cognition, language, consciousness', icon: Brain, color: 'text-violet-400' },
    { title: 'Neurons & Synapses', subtitle: 'Electrical signals, neurotransmitters, plasticity', icon: Zap, color: 'text-amber-400' },
    { title: 'Memory Formation', subtitle: 'Hippocampus, LTP, short & long-term memory', icon: Brain, color: 'text-indigo-400' },
    { title: 'Nervous System Divisions', subtitle: 'CNS vs PNS, autonomic, somatic', icon: Network, color: 'text-sky-400' },
    { title: 'Neurological Disorders', subtitle: 'Alzheimer, Parkinson, epilepsy', icon: Activity, color: 'text-rose-400' },
    { title: 'Brain Plasticity', subtitle: 'Neurogenesis, learning-induced remodeling', icon: Brain, color: 'text-purple-400' },
  ];

  const TABS = [
    { id: 'overview' as const,  label: 'Overview'  },
    { id: 'articles' as const,  label: 'Articles'  },
    { id: 'research' as const,  label: 'Papers'    },
  ];

  return (
    <div>
      <SectionHeader lm={lm} title="Brain & Neuroscience" subtitle="The Command Center" />

      <div className="flex gap-1 p-1 rounded-xl mb-4"
        style={{ background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.12)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-200"
            style={{
              background: activeTab === t.id ? (lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.15)') : 'transparent',
              color: activeTab === t.id ? (lm ? '#065f46' : '#34d399') : (lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)'),
              border: activeTab === t.id ? '1px solid rgba(52,211,153,0.3)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 gap-3">
              {topics.map((t, i) => (
                <PlaceholderCard key={t.title} lm={lm} {...t} delay={i * 0.06} />
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === 'articles' && (
          <motion.div key="articles" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="neuron synapse cortex hippocampus cerebellum brainstem nervous system cognition brain disease" showKind="article" />
          </motion.div>
        )}
        {activeTab === 'research' && (
          <motion.div key="research" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <LiveResultsFeed lm={lm} searchQuery="neuron synapse cortex hippocampus cerebellum brainstem nervous system cognition brain disease" showKind="research" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sections that use TopicSection (Wikipedia + OpenAlex multi-article) ───────
const TOPIC_SECTION_IDS: BioSectionId[] = [
  'organs', 'body-systems', 'skeleton', 'muscles',
  'genetics', 'microbiology', 'viruses', 'evolution', 'biochemistry',
];

// ─── Main switcher ────────────────────────────────────────────────────────────

const BioMainContent = memo(({ lm, activeSection, searchQuery, onClearSearch }: BioMainContentProps) => {
  const renderSection = () => {
    // ── Global search results (≥ 2 chars) ──
    if (searchQuery.trim().length >= 2) {
      return <BioSearchResults lm={lm} searchQuery={searchQuery} onClearSearch={onClearSearch} />;
    }

    switch (activeSection) {
      case '3d-anatomy':   return <AnatomySection lm={lm} />;
      case 'microscope':   return <MicroscopeSection lm={lm} />;
      case 'feel-nature':  return <FeelNatureSection lm={lm} />;
      case 'cells':       return <CellsSection lm={lm} />;
      case 'dna':         return <DNASection lm={lm} />;
      case 'brain':       return <BrainSection lm={lm} />;
      case 'research':    return <ResearchSection lm={lm} searchQuery={searchQuery} />;
      case 'videos':      return <VideosSection lm={lm} />;
      case 'simulations': return <SimulationsSection lm={lm} />;
      default:
        if ((TOPIC_SECTION_IDS as string[]).includes(activeSection)) {
          return <TopicSection lm={lm} sectionId={activeSection} />;
        }
        return <OverviewSection lm={lm} />;
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-5 px-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={searchQuery || activeSection}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          {renderSection()}
        </motion.div>
      </AnimatePresence>
      <div className="h-8" />
    </motion.main>
  );
});

BioMainContent.displayName = 'BioMainContent';
export default BioMainContent;
