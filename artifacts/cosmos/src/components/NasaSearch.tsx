import { RefObject, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, BookOpen, FileText, Rocket, Atom,
  Film, LayoutGrid, Telescope, X, Sparkles,
  FlaskConical, Database, Library, Tags, Satellite,
  ExternalLink, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import type { VideoItem } from './VideoPlayerModal';

// ─── Legacy types (unchanged — keep backward compat) ──────────────────────────
export type { VideoItem };

export interface SharedContext {
  title: string;
  description: string;
  source: 'nasa' | 'wiki' | 'arxiv' | 'spacex' | 'cern';
}

export interface NasaItem {
  data:  { title: string; description?: string; date_created?: string }[];
  links?: { href: string; rel: string }[];
}

export interface WikiItem {
  pageid:    number;
  title:     string;
  extract?:  string;
  thumbnail?: { source: string; width: number; height: number };
}

export interface ArxivItem {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  link: string;
}

export interface SpaceXItem {
  id: string;
  name: string;
  details: string | null;
  date_utc: string;
  success: boolean | null;
  links?: { patch?: { small?: string } };
}

export interface CernItem {
  id: number;
  title: string;
  description: string;
}

export type UnifiedItem =
  | { source: 'nasa';   item: NasaItem   }
  | { source: 'wiki';   item: WikiItem   }
  | { source: 'arxiv';  item: ArxivItem  }
  | { source: 'spacex'; item: SpaceXItem }
  | { source: 'cern';   item: CernItem   };

export type NasaStatus = 'idle' | 'loading' | 'done' | 'error';

// ─── New unified-search types ─────────────────────────────────────────────────
export interface SectionItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  source: string;
  date?: string;
  authors?: string[];
  citationCount?: number;
}

export interface SearchSections {
  query: string;
  page: number;
  aiSummary?: { text: string };
  videos: VideoItem[];
  wikipedia: SectionItem[];
  research: SectionItem[];
  nasa: SectionItem[];
  esa: SectionItem[];
  books: SectionItem[];
  relatedTopics: string[];
  hasMore: boolean;
}

// ─── Source config for legacy sources ────────────────────────────────────────
const LEGACY_SOURCE_CONFIG: Record<UnifiedItem['source'], {
  icon: LucideIcon; label: string; darkCls: string; lightCls: string;
}> = {
  nasa:   { icon: Globe,     label: 'NASA',      darkCls: 'bg-sky-500/20 border-sky-400/25 text-sky-300/90',       lightCls: 'bg-sky-50 border-sky-200 text-sky-700' },
  wiki:   { icon: BookOpen,  label: 'Wikipedia', darkCls: 'bg-amber-400/15 border-amber-300/20 text-amber-200/90', lightCls: 'bg-amber-50 border-amber-200 text-amber-700' },
  arxiv:  { icon: FileText,  label: 'arXiv',     darkCls: 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300/90', lightCls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  spacex: { icon: Rocket,    label: 'SpaceX',    darkCls: 'bg-slate-400/15 border-slate-300/20 text-slate-200/90', lightCls: 'bg-slate-50 border-slate-200 text-slate-700' },
  cern:   { icon: Atom,      label: 'CERN',      darkCls: 'bg-purple-500/15 border-purple-400/20 text-purple-300/90', lightCls: 'bg-purple-50 border-purple-200 text-purple-700' },
};

// ─── Extended source config for new section items ─────────────────────────────
const EXT_SOURCE_CONFIG: Record<string, {
  icon: LucideIcon; label: string; darkCls: string; lightCls: string;
}> = {
  nasa:            { icon: Globe,         label: 'NASA',             darkCls: 'bg-sky-500/20 border-sky-400/25 text-sky-300/90',         lightCls: 'bg-sky-50 border-sky-200 text-sky-700' },
  wiki:            { icon: BookOpen,      label: 'Wikipedia',        darkCls: 'bg-amber-400/15 border-amber-300/20 text-amber-200/90',   lightCls: 'bg-amber-50 border-amber-200 text-amber-700' },
  esa:             { icon: Satellite,     label: 'ESA Hubble',       darkCls: 'bg-blue-500/15 border-blue-400/20 text-blue-300/90',     lightCls: 'bg-blue-50 border-blue-200 text-blue-700' },
  arxiv:           { icon: FileText,      label: 'arXiv',            darkCls: 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300/90', lightCls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  openalex:        { icon: Database,      label: 'OpenAlex',         darkCls: 'bg-violet-500/15 border-violet-400/20 text-violet-300/90', lightCls: 'bg-violet-50 border-violet-200 text-violet-700' },
  semanticscholar: { icon: FlaskConical,  label: 'Semantic Scholar', darkCls: 'bg-teal-500/15 border-teal-400/20 text-teal-300/90',     lightCls: 'bg-teal-50 border-teal-200 text-teal-700' },
  inspirehep:      { icon: Atom,          label: 'INSPIRE-HEP',      darkCls: 'bg-orange-500/15 border-orange-400/20 text-orange-300/90', lightCls: 'bg-orange-50 border-orange-200 text-orange-700' },
  book:            { icon: Library,       label: 'Book',             darkCls: 'bg-rose-500/15 border-rose-400/20 text-rose-300/90',     lightCls: 'bg-rose-50 border-rose-200 text-rose-700' },
  cern:            { icon: Atom,          label: 'CERN',             darkCls: 'bg-purple-500/15 border-purple-400/20 text-purple-300/90', lightCls: 'bg-purple-50 border-purple-200 text-purple-700' },
};

function extSourceCfg(source: string) {
  return EXT_SOURCE_CONFIG[source] ?? {
    icon: Globe, label: source,
    darkCls: 'bg-white/[0.07] border-white/[0.12] text-white/60',
    lightCls: 'bg-gray-50 border-gray-200 text-gray-600',
  };
}

// ─── SourceBadge (legacy) ─────────────────────────────────────────────────────
export function SourceBadge({ source, lm }: { source: UnifiedItem['source']; lm?: boolean }) {
  const { icon: Icon, label, darkCls, lightCls } = LEGACY_SOURCE_CONFIG[source];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border backdrop-blur-md ${lm ? lightCls : darkCls}`}>
      <Icon size={9} strokeWidth={2.5} />
      {label}
    </span>
  );
}

// ─── ExtSourceBadge (new) ─────────────────────────────────────────────────────
function ExtSourceBadge({ source, lm }: { source: string; lm?: boolean }) {
  const { icon: Icon, label, darkCls, lightCls } = extSourceCfg(source);
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border backdrop-blur-md ${lm ? lightCls : darkCls}`}>
      <Icon size={9} strokeWidth={2.5} />
      {label}
    </span>
  );
}

// ─── Extract display data (legacy) ───────────────────────────────────────────
function extractDisplay(unified: UnifiedItem): { imgUrl?: string; title: string; desc: string; date: string } {
  switch (unified.source) {
    case 'nasa':   return { imgUrl: unified.item.links?.find(l => l.rel === 'preview')?.href ?? unified.item.links?.[0]?.href, title: unified.item.data?.[0]?.title ?? 'Untitled', desc: unified.item.data?.[0]?.description ?? '', date: unified.item.data?.[0]?.date_created?.slice(0, 10) ?? '' };
    case 'wiki':   return { imgUrl: unified.item.thumbnail?.source, title: unified.item.title, desc: unified.item.extract ?? '', date: '' };
    case 'arxiv':  return { imgUrl: undefined, title: unified.item.title, desc: unified.item.summary, date: unified.item.published };
    case 'spacex': return { imgUrl: unified.item.links?.patch?.small, title: unified.item.name, desc: unified.item.details ?? '', date: unified.item.date_utc?.slice(0, 10) ?? '' };
    case 'cern':   return { imgUrl: undefined, title: unified.item.title, desc: unified.item.description, date: '' };
  }
}

// ─── NoImagePlaceholder (legacy) ─────────────────────────────────────────────
function NoImagePlaceholder({ source, lm }: { source: UnifiedItem['source']; lm?: boolean }) {
  const cfg: Record<UnifiedItem['source'], { Icon: LucideIcon; gradDark: string; gradLight: string; colorDark: string; colorLight: string }> = {
    nasa:   { Icon: Globe,    gradDark: 'from-sky-950/80 to-black/60',     gradLight: 'from-sky-50 to-sky-100/80',     colorDark: '#38bdf8', colorLight: '#0ea5e9' },
    wiki:   { Icon: BookOpen, gradDark: 'from-amber-950/70 to-black/60',   gradLight: 'from-amber-50 to-amber-100/80', colorDark: '#fbbf24', colorLight: '#d97706' },
    arxiv:  { Icon: FileText, gradDark: 'from-emerald-950/70 to-black/60', gradLight: 'from-emerald-50 to-emerald-100/80', colorDark: '#34d399', colorLight: '#059669' },
    spacex: { Icon: Rocket,   gradDark: 'from-slate-900/80 to-black/60',   gradLight: 'from-slate-50 to-slate-100/80', colorDark: '#94a3b8', colorLight: '#475569' },
    cern:   { Icon: Atom,     gradDark: 'from-purple-950/70 to-black/60',  gradLight: 'from-purple-50 to-purple-100/80', colorDark: '#c084fc', colorLight: '#9333ea' },
  };
  const { Icon, gradDark, gradLight, colorDark, colorLight } = cfg[source];
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${lm ? gradLight : gradDark}`}>
      <Icon size={40} strokeWidth={1} style={{ color: lm ? colorLight : colorDark, opacity: 0.25 }} />
    </div>
  );
}

// ─── ExtNoImagePlaceholder (new) ─────────────────────────────────────────────
function ExtNoImagePlaceholder({ source, lm }: { source: string; lm?: boolean }) {
  const { icon: Icon } = extSourceCfg(source);
  return (
    <div className={`w-full h-full flex items-center justify-center ${lm ? 'bg-gradient-to-br from-gray-50 to-gray-100' : 'bg-gradient-to-br from-white/[0.03] to-black/20'}`}>
      <Icon size={38} strokeWidth={1} className={lm ? 'text-gray-300' : 'text-white/15'} />
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ idx, lm }: { idx: number; lm?: boolean }) {
  const delay = idx * 0.08;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl overflow-hidden border ${lm ? 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'border-white/[0.07] bg-white/[0.03]'}`}
    >
      <div className={`w-full aspect-[16/9] relative overflow-hidden ${lm ? 'bg-gray-100' : 'bg-white/[0.05]'}`}>
        <motion.div
          className="absolute inset-0"
          style={{ background: lm ? 'linear-gradient(90deg,transparent,rgba(0,0,0,0.04),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.5 }}
        />
      </div>
      <div className="px-5 py-5 flex flex-col gap-2.5">
        <motion.div className={`h-3.5 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} style={{ width: `${62 + (idx % 3) * 8}%` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay * 0.3 }} />
        <motion.div className={`h-2.5 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: '92%' }} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay * 0.3 + 0.15 }} />
        <motion.div className={`h-2.5 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: `${55 + (idx % 2) * 15}%` }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay * 0.3 + 0.3 }} />
      </div>
    </motion.div>
  );
}

// ─── Skeleton video card ──────────────────────────────────────────────────────
function SkeletonVideoCard({ idx, lm }: { idx: number; lm?: boolean }) {
  const delay = idx * 0.1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl overflow-hidden border ${lm ? 'bg-white border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)]' : 'border-white/[0.07] bg-white/[0.03]'}`}
    >
      <div className={`w-full aspect-[16/9] relative overflow-hidden ${lm ? 'bg-gray-100' : 'bg-white/[0.05]'}`}>
        <motion.div className="absolute inset-0" style={{ background: lm ? 'linear-gradient(90deg,transparent,rgba(0,0,0,0.04),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.4 }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-12 h-12 rounded-full border ${lm ? 'border-gray-200 bg-gray-50' : 'border-white/[0.08] bg-white/[0.04]'}`} />
        </div>
      </div>
      <div className="px-4 py-3.5 flex flex-col gap-2">
        <motion.div className={`h-3 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} style={{ width: '78%' }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, delay }} />
        <motion.div className={`h-2.5 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: '45%' }} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay + 0.2 }} />
      </div>
    </motion.div>
  );
}

// ─── Skeleton text row (for research / books) ─────────────────────────────────
function SkeletonTextRow({ idx, lm }: { idx: number; lm?: boolean }) {
  const delay = idx * 0.06;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-xl border px-5 py-4 flex flex-col gap-2.5 relative overflow-hidden ${lm ? 'bg-white border-gray-200' : 'bg-white/[0.025] border-white/[0.06]'}`}
    >
      <motion.div className="absolute inset-0" style={{ background: lm ? 'linear-gradient(90deg,transparent,rgba(0,0,0,0.025),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.4 }} />
      <motion.div className={`h-3 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} style={{ width: `${55 + (idx % 4) * 8}%` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity, delay }} />
      <motion.div className={`h-2 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: '90%' }} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay + 0.12 }} />
      <motion.div className={`h-2 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: `${40 + (idx % 3) * 10}%` }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: delay + 0.24 }} />
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, sub, count, lm }: {
  icon: LucideIcon; label: string; sub: string; count?: number; lm?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-5 px-0.5">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.07] border border-white/[0.10]'}`}>
        <Icon size={13} strokeWidth={2} className={lm ? 'text-gray-500' : 'text-white/60'} />
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`text-[13px] font-semibold tracking-wide flex-shrink-0 ${lm ? 'text-gray-800' : 'text-white/85'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{label}</span>
        <span className={`text-[10px] uppercase tracking-[0.2em] truncate ${lm ? 'text-gray-400' : 'text-white/28'}`}>{sub}</span>
      </div>
      {count !== undefined && (
        <span className={`flex-shrink-0 text-[9px] font-semibold tabular-nums px-2 py-0.5 rounded-full border ${lm ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/[0.06] border-white/[0.09] text-white/35'}`}>{count}</span>
      )}
      <div className="flex-1 h-px min-w-0" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
    </div>
  );
}

// ─── AI Summary card ──────────────────────────────────────────────────────────
function AISummaryCard({ text, lm }: { text: string; lm?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border px-6 py-5 mb-8 overflow-hidden ${
        lm
          ? 'bg-gradient-to-br from-violet-50/80 to-indigo-50/60 border-violet-200/60 shadow-[0_4px_24px_rgba(124,58,237,0.08)]'
          : 'bg-gradient-to-br from-violet-950/40 to-indigo-950/30 border-violet-500/20 shadow-[0_4px_32px_rgba(124,58,237,0.12)]'
      }`}
    >
      {/* Subtle glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: lm ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.15), transparent 60%)' : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.12), transparent 60%)' }} />
      <div className="relative flex gap-4 items-start">
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/20 border border-violet-400/25'}`}>
          <Sparkles size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] uppercase tracking-[0.22em] mb-2 ${lm ? 'text-violet-500' : 'text-violet-300/70'}`}>AI Overview</p>
          <p className={`text-[13.5px] leading-relaxed tracking-wide ${lm ? 'text-gray-700' : 'text-white/72'}`}>{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section item card (image + text, for Wikipedia / NASA / ESA) ─────────────
function SectionItemCard({ item, idx, onOpen, lm }: {
  item: SectionItem; idx: number; onOpen: () => void; lm?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min((idx % 6) * 0.05, 0.35), ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      className={`group relative w-full rounded-2xl overflow-hidden border transition-all duration-300 ease-out cursor-pointer transform-gpu ${
        lm
          ? 'bg-white border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:border-gray-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.13)]'
          : 'bg-white/[0.035] border-white/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.45)] hover:border-white/[0.16] hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]'
      }`}
    >
      {/* Image */}
      <div className={`relative w-full aspect-[16/9] overflow-hidden ${lm ? 'bg-gray-100' : 'bg-black/25'}`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <ExtNoImagePlaceholder source={item.source} lm={lm} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5"><ExtSourceBadge source={item.source} lm={lm} /></div>
        {item.date && <span className="absolute top-2.5 right-2.5 text-[9px] text-white/65 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-full tracking-widest font-medium">{item.date.length === 4 ? item.date : item.date.slice(0, 10)}</span>}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="text-[9px] text-white/80 bg-black/65 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest uppercase font-semibold">View details</span>
        </div>
      </div>
      {/* Text */}
      <div className="px-4 py-4">
        <p className={`text-[13.5px] font-semibold leading-snug tracking-[-0.01em] mb-1.5 line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/92'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{item.title}</p>
        {item.description && <p className={`text-[12px] leading-relaxed tracking-wide line-clamp-2 ${lm ? 'text-gray-500' : 'text-white/42'}`}>{item.description}</p>}
      </div>
    </motion.div>
  );
}

// ─── Research / Book row card (text-only, dense list) ─────────────────────────
function ResearchRowCard({ item, idx, onOpen, lm }: {
  item: SectionItem; idx: number; onOpen: () => void; lm?: boolean;
}) {
  const { icon: Icon } = extSourceCfg(item.source);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      className={`group flex items-start gap-4 rounded-xl border px-5 py-4 cursor-pointer transition-all duration-200 ${
        lm
          ? 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
          : 'bg-white/[0.025] border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.045]'
      }`}
    >
      {/* Icon chip */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${lm ? 'bg-gray-50 border border-gray-200' : 'bg-white/[0.05] border border-white/[0.09]'}`}>
        <Icon size={15} strokeWidth={1.8} className={lm ? 'text-gray-400' : 'text-white/40'} />
      </div>
      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold leading-snug tracking-[-0.01em] mb-1 line-clamp-2 group-hover:opacity-80 transition-opacity ${lm ? 'text-gray-900' : 'text-white/90'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{item.title}</p>
        {item.description && <p className={`text-[11.5px] leading-relaxed line-clamp-2 ${lm ? 'text-gray-500' : 'text-white/38'}`}>{item.description}</p>}
        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {item.authors && item.authors.length > 0 && (
            <span className={`text-[10px] tracking-wide ${lm ? 'text-gray-400' : 'text-white/28'}`}>{item.authors.slice(0, 2).join(', ')}{item.authors.length > 2 ? ' et al.' : ''}</span>
          )}
          {item.date && <span className={`text-[10px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>{item.date.length === 4 ? item.date : item.date.slice(0, 7)}</span>}
          {item.citationCount !== undefined && item.citationCount > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${lm ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white/[0.04] border-white/[0.08] text-white/25'}`}>
              {item.citationCount.toLocaleString()} citations
            </span>
          )}
        </div>
      </div>
      {/* Arrow */}
      <ChevronRight size={14} strokeWidth={1.8} className={`flex-shrink-0 mt-1 transition-all duration-200 group-hover:translate-x-0.5 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/15 group-hover:text-white/40'}`} />
    </motion.div>
  );
}

// ─── Related Topics row ───────────────────────────────────────────────────────
function RelatedTopics({ topics, onSearch, lm }: {
  topics: string[]; onSearch?: (t: string) => void; lm?: boolean;
}) {
  if (topics.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="mt-8 mb-2"
    >
      <SectionHeader icon={Tags} label="Related Topics" sub="from OpenAlex" count={topics.length} lm={lm} />
      <div className="flex flex-wrap gap-2">
        {topics.map((t, i) => (
          <motion.button
            key={t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, delay: i * 0.04 }}
            onClick={() => onSearch?.(t)}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
              lm
                ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                : 'bg-white/[0.04] border-white/[0.09] text-white/50 hover:border-white/[0.22] hover:text-white/80 hover:bg-white/[0.08]'
            }`}
          >
            <Tags size={9} strokeWidth={2} />
            {t}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────
function VideoCard({ video, idx, onClick, lm }: { video: VideoItem; idx: number; onClick: () => void; lm?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(idx * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`group relative w-full rounded-2xl overflow-hidden border transition-all duration-300 ease-out cursor-pointer transform-gpu ${lm ? 'bg-white border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:border-gray-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.13)]' : 'bg-white/[0.035] border-white/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.45)] hover:border-white/[0.20] hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]'}`}
    >
      <div className={`relative w-full aspect-[16/9] overflow-hidden ${lm ? 'bg-gray-100' : 'bg-black/35'}`}>
        <img src={video.thumbnail} alt={video.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/18 backdrop-blur-sm border border-white/28 flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.55)] group-hover:bg-white/32 group-hover:scale-110 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-all duration-300">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5 fill-white drop-shadow"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border bg-red-500/25 border-red-400/30 text-red-200/90">
            <svg viewBox="0 0 24 24" className="w-2 h-2 fill-current"><polygon points="5,3 19,12 5,21" /></svg>
            Video
          </span>
        </div>
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="text-[9px] text-white/80 bg-black/65 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest uppercase font-semibold">Watch now</span>
        </div>
      </div>
      <div className="px-4 py-3.5">
        <p className={`text-[13px] font-semibold leading-snug tracking-[-0.01em] mb-1 line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/92'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{video.title}</p>
        {video.channelTitle && <p className={`text-[10.5px] tracking-wide ${lm ? 'text-gray-400' : 'text-white/38'}`}>{video.channelTitle}</p>}
      </div>
    </motion.div>
  );
}

// ─── Result card (legacy flat view) ──────────────────────────────────────────
function ResultCard({ unified, idx, onClick, lm }: { unified: UnifiedItem; idx: number; onClick: () => void; lm?: boolean }) {
  const { imgUrl, title, desc, date } = extractDisplay(unified);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min((idx % 8) * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`group relative w-full rounded-2xl overflow-hidden border transition-all duration-300 ease-out cursor-pointer transform-gpu ${lm ? 'bg-white border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:border-gray-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(0,0,0,0.13)]' : 'bg-white/[0.035] border-white/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.45)] hover:border-white/[0.16] hover:-translate-y-1 hover:shadow-[0_16px_44px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]'}`}
    >
      <div className={`relative w-full aspect-[16/9] overflow-hidden ${lm ? 'bg-gray-100' : 'bg-black/25'}`}>
        {imgUrl ? (<img src={imgUrl} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.replaceChildren(); }} />) : (<NoImagePlaceholder source={unified.source} lm={lm} />)}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5"><SourceBadge source={unified.source} lm={lm} /></div>
        {date && <span className="absolute top-2.5 right-2.5 text-[9px] text-white/65 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-full tracking-widest font-medium">{date}</span>}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"><span className="text-[9px] text-white/80 bg-black/65 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest uppercase font-semibold">View details</span></div>
      </div>
      <div className="px-4 py-4">
        <p className={`text-[13.5px] font-semibold leading-snug tracking-[-0.01em] mb-1.5 line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/92'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</p>
        {desc && <p className={`text-[12px] leading-relaxed tracking-wide line-clamp-2 ${lm ? 'text-gray-500' : 'text-white/42'}`}>{desc}</p>}
      </div>
    </motion.div>
  );
}

// ─── Detail modal (legacy) ────────────────────────────────────────────────────
export function DetailModal({ item: unified, onClose, chatAvatars, onShareToChat, lm }: {
  item: UnifiedItem; onClose: () => void;
  chatAvatars?: { name: string; image?: string }[];
  onShareToChat?: (avatarName: string) => void;
  lm?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const { imgUrl, title, desc, date } = extractDisplay(unified);

  return (
    <motion.div key="detail-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
      className={`fixed inset-0 z-[200] flex items-center justify-center px-4 backdrop-blur-xl ${lm ? 'bg-black/40' : 'bg-black/80'}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 28 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] overflow-hidden transform-gpu ${lm ? 'bg-white/97 border border-gray-200 shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)]' : 'border border-white/[0.09] bg-[rgba(7,7,12,0.92)] backdrop-blur-xl shadow-[0_40px_80px_-16px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]'}`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-200 text-lg leading-none ${lm ? 'border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'border-white/15 bg-black/50 text-white/60 hover:text-white hover:bg-white/10'}`}>×</button>
        {imgUrl ? (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30"><img src={imgUrl} alt={title} className="w-full h-full object-cover" /></div>
        ) : (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30"><NoImagePlaceholder source={unified.source} lm={lm} /></div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          <div className="flex items-center gap-2.5 mb-3">
            <SourceBadge source={unified.source} lm={lm} />
            {date && <span className="text-[10px] text-white/35 uppercase tracking-[0.22em]">{date}</span>}
          </div>
          <h2 className={`text-[17px] font-semibold leading-snug tracking-[-0.01em] mb-3 ${lm ? 'text-gray-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</h2>
          {desc && <p className={`text-[13px] leading-relaxed tracking-wide ${lm ? 'text-gray-600' : 'text-white/55'}`}>{desc}</p>}
          {unified.source === 'arxiv' && unified.item.authors.length > 0 && (
            <p className={`mt-3 text-[11px] tracking-wide ${lm ? 'text-gray-400' : 'text-white/30'}`}>{unified.item.authors.slice(0, 3).join(', ')}{unified.item.authors.length > 3 ? ' et al.' : ''}</p>
          )}
          {unified.source === 'spacex' && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${unified.item.success === true ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300' : unified.item.success === false ? 'bg-red-500/15 border-red-400/20 text-red-300' : 'bg-white/5 border-white/10 text-white/35'}`}>
                {unified.item.success === true ? '✓ SUCCESS' : unified.item.success === false ? '✗ FAILED' : '— UNKNOWN'}
              </span>
            </div>
          )}
          {chatAvatars && onShareToChat && (
            <div className={`mt-6 pt-5 border-t ${lm ? 'border-gray-100' : 'border-white/10'}`}>
              <p className={`text-[9px] uppercase tracking-[0.22em] mb-3 ${lm ? 'text-gray-400' : 'text-white/35'}`}>Discuss with a Scientist</p>
              <div className="flex gap-4">
                {chatAvatars.map(av => (
                  <button key={av.name} onClick={() => { onShareToChat(av.name); onClose(); }} className="flex flex-col items-center gap-1.5 group focus:outline-none" title={`Chat with ${av.name}`}>
                    {av.image ? (<img src={av.image} alt={av.name} className={`w-11 h-11 rounded-full object-cover border group-hover:scale-105 transition-all duration-200 shadow-lg ${lm ? 'border-gray-200 group-hover:border-gray-400' : 'border-white/15 group-hover:border-white/50'}`} />) : (<div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm group-hover:scale-105 transition-all duration-200 ${lm ? 'bg-gray-100 border border-gray-200 text-gray-500 group-hover:border-gray-400' : 'bg-white/10 border border-white/15 text-white/60 group-hover:border-white/40'}`}>{av.name.charAt(0)}</div>)}
                    <span className={`text-[9px] transition-colors duration-200 w-12 text-center truncate leading-tight ${lm ? 'text-gray-400 group-hover:text-gray-700' : 'text-white/40 group-hover:text-white/70'}`}>{av.name.split(' ').slice(-1)[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Section item detail modal (new sources) ──────────────────────────────────
function SectionItemDetailModal({ item, onClose, chatAvatars, onShareToChat, lm }: {
  item: SectionItem; onClose: () => void;
  chatAvatars?: { name: string; image?: string }[];
  onShareToChat?: (avatarName: string, title: string, desc: string, source: string) => void;
  lm?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <motion.div key="section-detail-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
      className={`fixed inset-0 z-[200] flex items-center justify-center px-4 backdrop-blur-xl ${lm ? 'bg-black/40' : 'bg-black/80'}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 28 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] overflow-hidden transform-gpu ${lm ? 'bg-white/97 border border-gray-200 shadow-[0_40px_80px_-16px_rgba(0,0,0,0.25)]' : 'border border-white/[0.09] bg-[rgba(7,7,12,0.92)] backdrop-blur-xl shadow-[0_40px_80px_-16px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]'}`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border backdrop-blur-sm transition-colors duration-200 text-lg leading-none ${lm ? 'border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'border-white/15 bg-black/50 text-white/60 hover:text-white hover:bg-white/10'}`}>×</button>

        {/* Image or placeholder */}
        <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30">
          {item.imageUrl
            ? <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            : <ExtNoImagePlaceholder source={item.source} lm={lm} />
          }
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          <div className="flex items-center gap-2.5 mb-3">
            <ExtSourceBadge source={item.source} lm={lm} />
            {item.date && <span className={`text-[10px] uppercase tracking-[0.22em] ${lm ? 'text-gray-400' : 'text-white/35'}`}>{item.date.length === 4 ? item.date : item.date.slice(0, 10)}</span>}
            {item.citationCount !== undefined && item.citationCount > 0 && (
              <span className={`text-[10px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{item.citationCount.toLocaleString()} citations</span>
            )}
          </div>
          <h2 className={`text-[17px] font-semibold leading-snug tracking-[-0.01em] mb-3 ${lm ? 'text-gray-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>{item.title}</h2>
          {item.description && <p className={`text-[13px] leading-relaxed tracking-wide ${lm ? 'text-gray-600' : 'text-white/55'}`}>{item.description}</p>}
          {item.authors && item.authors.length > 0 && (
            <p className={`mt-3 text-[11px] tracking-wide ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              {item.authors.slice(0, 3).join(', ')}{item.authors.length > 3 ? ' et al.' : ''}
            </p>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className={`inline-flex items-center gap-1.5 mt-4 text-[11px] font-medium transition-colors duration-200 ${lm ? 'text-blue-600 hover:text-blue-800' : 'text-sky-400/80 hover:text-sky-300'}`}
            >
              <ExternalLink size={11} strokeWidth={2} />
              Open source
            </a>
          )}
          {chatAvatars && onShareToChat && (
            <div className={`mt-6 pt-5 border-t ${lm ? 'border-gray-100' : 'border-white/10'}`}>
              <p className={`text-[9px] uppercase tracking-[0.22em] mb-3 ${lm ? 'text-gray-400' : 'text-white/35'}`}>Discuss with a Scientist</p>
              <div className="flex gap-4">
                {chatAvatars.map(av => (
                  <button key={av.name} onClick={() => { onShareToChat(av.name, item.title, item.description, item.source); onClose(); }} className="flex flex-col items-center gap-1.5 group focus:outline-none" title={`Chat with ${av.name}`}>
                    {av.image ? (<img src={av.image} alt={av.name} className={`w-11 h-11 rounded-full object-cover border group-hover:scale-105 transition-all duration-200 shadow-lg ${lm ? 'border-gray-200 group-hover:border-gray-400' : 'border-white/15 group-hover:border-white/50'}`} />) : (<div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm group-hover:scale-105 transition-all duration-200 ${lm ? 'bg-gray-100 border border-gray-200 text-gray-500 group-hover:border-gray-400' : 'bg-white/10 border border-white/15 text-white/60 group-hover:border-white/40'}`}>{av.name.charAt(0)}</div>)}
                    <span className={`text-[9px] transition-colors duration-200 w-12 text-center truncate leading-tight ${lm ? 'text-gray-400 group-hover:text-gray-700' : 'text-white/40 group-hover:text-white/70'}`}>{av.name.split(' ').slice(-1)[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Loading skeleton for sections view ───────────────────────────────────────
function SectionsLoadingSkeleton({ lm }: { lm?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {/* AI summary skeleton */}
      <div className={`rounded-2xl border px-6 py-5 mb-8 ${lm ? 'bg-violet-50/60 border-violet-200/40' : 'bg-violet-950/20 border-violet-500/15'}`}>
        <div className="flex gap-4 items-start">
          <div className={`flex-shrink-0 w-8 h-8 rounded-xl ${lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/15 border border-violet-400/20'}`} />
          <div className="flex-1 flex flex-col gap-2.5 pt-1">
            <motion.div className={`h-2 w-16 rounded-full ${lm ? 'bg-violet-200' : 'bg-violet-400/20'}`} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} />
            <motion.div className={`h-3 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} style={{ width: '95%' }} animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.1 }} />
            <motion.div className={`h-3 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} style={{ width: '80%' }} animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }} />
            <motion.div className={`h-3 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.04]'}`} style={{ width: '60%' }} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
          </div>
        </div>
      </div>
      {/* Videos skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-5 px-0.5">
          <div className={`w-7 h-7 rounded-lg ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.06] border border-white/[0.08]'}`} />
          <div className={`h-3 w-28 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} />
          <div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[0, 1].map(i => <SkeletonVideoCard key={i} idx={i} lm={lm} />)}</div>
      </div>
      {/* Wikipedia skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-5 px-0.5">
          <div className={`w-7 h-7 rounded-lg ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.06] border border-white/[0.08]'}`} />
          <div className={`h-3 w-24 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} />
          <div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map(i => <SkeletonCard key={i} idx={i} lm={lm} />)}</div>
      </div>
      {/* Research skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-5 px-0.5">
          <div className={`w-7 h-7 rounded-lg ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.06] border border-white/[0.08]'}`} />
          <div className={`h-3 w-32 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} />
          <div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} />
        </div>
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map(i => <SkeletonTextRow key={i} idx={i} lm={lm} />)}</div>
      </div>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  results:          UnifiedItem[];
  status:           NasaStatus;
  errMsg:           string;
  onClear:          () => void;
  onCardClick:      (item: UnifiedItem) => void;
  sentinelRef:      RefObject<HTMLDivElement | null>;
  isEverythingMode: boolean;
  isLoadingMore:    boolean;
  videoResults?:    VideoItem[];
  videoStatus?:     'idle' | 'loading' | 'done' | 'error';
  onVideoClick?:    (video: VideoItem) => void;
  lm?:              boolean;
  // ── New props for unified sections ──
  sections?:             SearchSections | null;
  chatAvatars?:          { name: string; image?: string }[];
  onSectionItemShare?:   (avatarName: string, title: string, description: string, source: string) => void;
  onRelatedTopicSearch?: (topic: string) => void;
}

// ─── Main NasaSearch component ────────────────────────────────────────────────
export default function NasaSearch({
  results, status, errMsg, onClear, onCardClick, sentinelRef,
  isEverythingMode, isLoadingMore,
  videoResults = [], videoStatus = 'idle', onVideoClick,
  lm,
  sections, chatAvatars, onSectionItemShare, onRelatedTopicSearch,
}: Props) {
  const [selectedSectionItem, setSelectedSectionItem] = useState<SectionItem | null>(null);

  if (status === 'idle') return null;

  const isLoading = status === 'loading';

  // ── SECTIONED VIEW (new unified endpoint) ─────────────────────────────────
  if (sections !== undefined && sections !== null) {
    const hasAny =
      (sections.videos?.length ?? 0) > 0 ||
      (sections.wikipedia?.length ?? 0) > 0 ||
      (sections.research?.length ?? 0) > 0 ||
      (sections.nasa?.length ?? 0) > 0 ||
      (sections.esa?.length ?? 0) > 0 ||
      (sections.books?.length ?? 0) > 0;

    const totalCount =
      (sections.wikipedia?.length ?? 0) +
      (sections.research?.length ?? 0) +
      (sections.nasa?.length ?? 0) +
      (sections.esa?.length ?? 0) +
      (sections.books?.length ?? 0);

    return (
      <>
        <AnimatePresence>
          <motion.div
            key="sections-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-2xl pointer-events-auto"
          >
            {/* Status bar */}
            <div className="flex items-center justify-between mb-5 px-0.5">
              <div className="flex items-center gap-2 min-w-0">
                {isLoading && <motion.div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-400" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />}
                <span className={`text-[10.5px] uppercase tracking-[0.2em] truncate ${lm ? 'text-gray-400' : 'text-white/38'}`}>
                  {isLoading
                    ? 'Scanning NASA · Wikipedia · ESA · arXiv · OpenAlex · Semantic Scholar · INSPIRE-HEP · YouTube'
                    : status === 'error'
                      ? 'Transmission error'
                      : !hasAny
                        ? 'No signals found'
                        : `${totalCount} results · scroll to explore`}
                </span>
              </div>
              <button onClick={onClear} className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] uppercase tracking-widest ml-4 transition-colors duration-200 ${lm ? 'text-gray-400 hover:text-gray-700' : 'text-white/28 hover:text-white/65'}`}>
                <X size={10} strokeWidth={2.5} />
                Clear
              </button>
            </div>

            {/* Loading skeleton */}
            {isLoading && <SectionsLoadingSkeleton lm={lm} />}

            {/* Error */}
            {status === 'error' && (
              <div className={`flex flex-col items-center gap-3 py-14 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/10 border-red-500/20'}`}><X size={18} strokeWidth={1.5} className={lm ? 'text-red-400' : 'text-red-400/70'} /></div>
                <p className={`text-[11px] uppercase tracking-[0.22em]`}>Transmission interrupted</p>
                <p className={`text-[12px]`}>{errMsg}</p>
              </div>
            )}

            {/* Empty */}
            {status === 'done' && !hasAny && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col items-center gap-4 py-16 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.04] border-white/[0.08]'}`}><Telescope size={24} strokeWidth={1.2} className={lm ? 'text-gray-400' : 'text-white/35'} /></div>
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <p className={`text-[13px] font-medium ${lm ? 'text-gray-600' : 'text-white/50'}`}>No signals detected</p>
                  <p className={`text-[11px] uppercase tracking-[0.22em]`}>Try a different search term</p>
                </div>
              </motion.div>
            )}

            {/* ── Sections (only when done and has content) ── */}
            {status === 'done' && hasAny && (
              <>
                {/* 1. AI Summary */}
                {sections.aiSummary?.text && <AISummaryCard text={sections.aiSummary.text} lm={lm} />}

                {/* 2. YouTube Videos */}
                {sections.videos.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={Film} label="Cosmic Cinema" sub="YouTube Videos" count={sections.videos.length} lm={lm} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sections.videos.map((v, i) => <VideoCard key={v.videoId} video={v} idx={i} lm={lm} onClick={() => onVideoClick?.(v)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 3. Wikipedia */}
                {sections.wikipedia.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={BookOpen} label="Wikipedia" sub="Encyclopedia Articles" count={sections.wikipedia.length} lm={lm} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sections.wikipedia.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} onOpen={() => setSelectedSectionItem(item)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 4. Research Papers */}
                {sections.research.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={FileText} label="Research Papers" sub="arXiv · OpenAlex · Semantic Scholar · INSPIRE-HEP" count={sections.research.length} lm={lm} />
                    <div className="flex flex-col gap-3">
                      {sections.research.map((item, i) => <ResearchRowCard key={item.id} item={item} idx={i} lm={lm} onOpen={() => setSelectedSectionItem(item)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 5. NASA */}
                {sections.nasa.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={Globe} label="NASA Images" sub="Image & Video Library" count={sections.nasa.length} lm={lm} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sections.nasa.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} onOpen={() => setSelectedSectionItem(item)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 6. ESA */}
                {sections.esa.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={Satellite} label="ESA Hubble" sub="European Space Agency" count={sections.esa.length} lm={lm} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sections.esa.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} onOpen={() => setSelectedSectionItem(item)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 7. Books */}
                {sections.books.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                    <SectionHeader icon={Library} label="Books" sub="OpenAlex Academic Books" count={sections.books.length} lm={lm} />
                    <div className="flex flex-col gap-3">
                      {sections.books.map((item, i) => <ResearchRowCard key={item.id} item={item} idx={i} lm={lm} onOpen={() => setSelectedSectionItem(item)} />)}
                    </div>
                  </motion.div>
                )}

                {/* 8. Related Topics */}
                <RelatedTopics topics={sections.relatedTopics} onSearch={onRelatedTopicSearch} lm={lm} />

                {/* Infinite scroll sentinel */}
                {(isEverythingMode || sections.hasMore) && (
                  <div ref={sentinelRef} className="w-full flex flex-col items-center py-8 gap-3">
                    {isLoadingMore ? (
                      <>
                        <div className="relative w-8 h-8">
                          <motion.div className={`absolute inset-0 rounded-full border ${lm ? 'border-gray-300' : 'border-white/20'}`} animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
                          <motion.div className={`absolute inset-1 rounded-full border ${lm ? 'border-gray-300' : 'border-white/30'}`} animate={{ scale: [1, 1.3, 1], opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.15 }} />
                          <div className={`absolute inset-2.5 rounded-full ${lm ? 'bg-gray-400' : 'bg-white/50'}`} />
                        </div>
                        <span className={`text-[10px] uppercase tracking-[0.25em] ${lm ? 'text-gray-400' : 'text-white/25'}`}>Loading more results</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full max-w-xs">
                        <div className={`flex-1 h-px ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} />
                        <span className={`text-[9px] uppercase tracking-[0.22em] flex-shrink-0 ${lm ? 'text-gray-300' : 'text-white/15'}`}>Scroll to explore</span>
                        <div className={`flex-1 h-px ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Section item detail modal */}
        <AnimatePresence>
          {selectedSectionItem && (
            <SectionItemDetailModal
              item={selectedSectionItem}
              onClose={() => setSelectedSectionItem(null)}
              chatAvatars={chatAvatars}
              onShareToChat={onSectionItemShare}
              lm={lm}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── LEGACY FLAT VIEW (fallback when sections is undefined) ─────────────────
  const sourceCounts = results.reduce<Partial<Record<UnifiedItem['source'], number>>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1; return acc;
  }, {});
  const sourceLabel = (Object.entries(sourceCounts) as [UnifiedItem['source'], number][])
    .map(([s, n]) => `${n} ${LEGACY_SOURCE_CONFIG[s].label}`).join(' · ');
  const showVideos = videoStatus !== 'idle' && (videoResults.length > 0 || videoStatus === 'loading');

  return (
    <AnimatePresence>
      <motion.div key="search-results" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="w-full max-w-2xl pointer-events-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between mb-5 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {isLoading && <motion.div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-400" animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />}
            <span className={`text-[10.5px] uppercase tracking-[0.2em] truncate ${lm ? 'text-gray-400' : 'text-white/38'}`}>
              {isLoading ? 'Scanning sources' : status === 'error' ? 'Transmission error' : results.length === 0 && videoResults.length === 0 ? 'No signals found' : isEverythingMode ? `${results.length} results · scroll to explore` : sourceLabel}
            </span>
          </div>
          <button onClick={onClear} className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] uppercase tracking-widest ml-4 transition-colors duration-200 ${lm ? 'text-gray-400 hover:text-gray-700' : 'text-white/28 hover:text-white/65'}`}><X size={10} strokeWidth={2.5} />Clear</button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
            <div className="mb-8">
              <div className="flex items-center gap-2.5 mb-5 px-0.5"><div className={`w-7 h-7 rounded-lg ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.06] border border-white/[0.08]'}`} /><div className={`h-3 w-28 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} /><div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[0, 1].map(i => <SkeletonVideoCard key={i} idx={i} lm={lm} />)}</div>
            </div>
            <div><div className="flex items-center gap-2.5 mb-5 px-0.5"><div className={`w-7 h-7 rounded-lg ${lm ? 'bg-gray-100 border border-gray-200' : 'bg-white/[0.06] border border-white/[0.08]'}`} /><div className={`h-3 w-32 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.07]'}`} /><div className="flex-1 h-px" style={{ background: lm ? 'linear-gradient(90deg,#e5e7eb,transparent)' : 'linear-gradient(90deg,rgba(255,255,255,0.07),transparent)' }} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map(i => <SkeletonCard key={i} idx={i} lm={lm} />)}</div>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col items-center gap-3 py-14 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/10 border-red-500/20'}`}><X size={18} strokeWidth={1.5} className={lm ? 'text-red-400' : 'text-red-400/70'} /></div>
            <p className="text-[11px] uppercase tracking-[0.22em]">Transmission interrupted</p>
            <p className="text-[12px]">{errMsg}</p>
          </motion.div>
        )}

        {status === 'done' && results.length === 0 && videoResults.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col items-center gap-4 py-16 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.04] border-white/[0.08]'}`}><Telescope size={24} strokeWidth={1.2} className={lm ? 'text-gray-400' : 'text-white/35'} /></div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p className={`text-[13px] font-medium ${lm ? 'text-gray-600' : 'text-white/50'}`}>No signals detected</p>
              <p className="text-[11px] uppercase tracking-[0.22em]">Try a different search term</p>
            </div>
          </motion.div>
        )}

        {!isLoading && showVideos && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
            <SectionHeader icon={Film} label="Cosmic Cinema" sub="YouTube Videos" count={videoStatus === 'done' ? videoResults.length : undefined} lm={lm} />
            {videoStatus === 'loading' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[0, 1].map(i => <SkeletonVideoCard key={i} idx={i} lm={lm} />)}</div>}
            {videoStatus === 'done' && videoResults.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{videoResults.slice(0, 8).map((v, i) => <VideoCard key={v.videoId} video={v} idx={i} lm={lm} onClick={() => onVideoClick?.(v)} />)}</div>}
            {videoStatus === 'done' && videoResults.length === 0 && <p className={`text-[11px] tracking-wide px-0.5 pb-2 ${lm ? 'text-gray-400' : 'text-white/25'}`}>No videos found for this topic.</p>}
          </motion.div>
        )}

        {!isLoading && status === 'done' && results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: showVideos ? 0.05 : 0, ease: [0.16, 1, 0.3, 1] }}>
            {showVideos && <SectionHeader icon={LayoutGrid} label="Articles & Data" sub={sourceLabel} count={results.length} lm={lm} />}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((unified, idx) => {
                const key = unified.source === 'nasa' ? `nasa-${unified.item.data?.[0]?.title}-${idx}` : unified.source === 'wiki' ? `wiki-${unified.item.pageid}-${idx}` : unified.source === 'arxiv' ? `arxiv-${unified.item.id}-${idx}` : unified.source === 'spacex' ? `spacex-${unified.item.id}-${idx}` : `cern-${unified.item.id}-${idx}`;
                return <ResultCard key={key} unified={unified} idx={idx} lm={lm} onClick={() => onCardClick(unified)} />;
              })}
            </div>
            {isEverythingMode && (
              <div ref={sentinelRef} className="w-full flex flex-col items-center py-8 gap-3">
                {isLoadingMore ? (
                  <>
                    <div className="relative w-8 h-8">
                      <motion.div className={`absolute inset-0 rounded-full border ${lm ? 'border-gray-300' : 'border-white/20'}`} animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }} />
                      <motion.div className={`absolute inset-1 rounded-full border ${lm ? 'border-gray-300' : 'border-white/30'}`} animate={{ scale: [1, 1.3, 1], opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.15 }} />
                      <div className={`absolute inset-2.5 rounded-full ${lm ? 'bg-gray-400' : 'bg-white/50'}`} />
                    </div>
                    <span className={`text-[10px] uppercase tracking-[0.25em] ${lm ? 'text-gray-400' : 'text-white/25'}`}>Loading more results</span>
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <div className={`flex-1 h-px ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} />
                    <span className={`text-[9px] uppercase tracking-[0.22em] flex-shrink-0 ${lm ? 'text-gray-300' : 'text-white/15'}`}>Scroll to explore</span>
                    <div className={`flex-1 h-px ${lm ? 'bg-gray-200' : 'bg-white/[0.06]'}`} />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
