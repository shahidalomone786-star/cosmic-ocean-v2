import { useState, useEffect, useMemo, useRef, memo, useCallback, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, BookOpen, FileText, Rocket, Atom,
  Film, LayoutGrid, Telescope, X, Sparkles, Search,
  FlaskConical, Database, Library, Tags, Satellite,
  ExternalLink, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, Copy, Check,
  type LucideIcon,
} from 'lucide-react';
import type { VideoItem } from './VideoPlayerModal';
import { SourceLogo, SourceLogoStrip } from './SourceLogos';
import {
  KnowledgeCoverage,
  InlineRelatedTopics,
  SuggestedSearches,
  LatestResearch,
  TrendingResearch,
  FeaturedNASA,
  PopularPapers,
} from './SearchKnowledgePanel';
import AISummary from './AISummary';
import SavedPapersDrawer from './SavedPapersDrawer';
import { useSavedPapers, stableItemId } from '../hooks/useSavedPapers';
import DiscoveryPanel from './DiscoveryPanel';

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

// ─── Sort order type ──────────────────────────────────────────────────────────
type SortOrder = 'relevance' | 'recent' | 'cited';

// ─── Science terms dictionary for "Did you mean?" ────────────────────────────
const SCIENCE_TERMS: readonly string[] = [
  'astrophysics','quantum mechanics','general relativity','special relativity',
  'cosmology','particle physics','string theory','dark matter','dark energy',
  'black hole','neutron star','supernova','galaxy','nebula','pulsar',
  'quasar','gravitational waves','hawking radiation','event horizon',
  'wormhole','singularity','spacetime','antimatter','neutrino',
  'boson','fermion','lepton','quark','hadron','meson','baryon',
  'photon','electron','proton','neutron','nucleus','atom','molecule',
  'entropy','thermodynamics','quantum entanglement','superposition',
  'wave function','schrodinger','uncertainty principle','planck constant',
  'speed of light','electric field','magnetic field','electromagnetism',
  'photoelectric effect','atomic orbital','nuclear fusion','nuclear fission',
  'radioactivity','half life','isotope','periodic table','element',
  'compound','chemical bond','catalyst','polymer','protein',
  'dna','rna','chromosome','gene','evolution','natural selection',
  'cell','mitosis','meiosis','enzyme','metabolism','photosynthesis',
  'respiration','neuroscience','neuron','synapse','nervous system',
  'ecology','ecosystem','atmosphere','greenhouse effect',
  'geology','tectonic plates','volcano','earthquake','fossil',
  'paleontology','archaeology','anthropology','psychology','cognitive science',
  'artificial intelligence','machine learning','neural network','algorithm',
  'mathematics','calculus','linear algebra','statistics','probability',
  'topology','number theory','chaos theory','fractal',
  'geometry','trigonometry','differential equation',
  'fluid dynamics','aerodynamics','acoustics','optics','spectroscopy',
  'nanotechnology','semiconductor','superconductor','laser','plasma',
  'inflation','big bang','multiverse','parallel universe',
  'exoplanet','solar system','planet','star','constellation',
  'milky way','andromeda','telescope','space station',
  'mars','jupiter','saturn','moon','comet','asteroid',
  'aurora borealis','solar flare','cosmic ray','gamma ray',
  'wavelength','frequency','spectrum','interference','diffraction',
  'refraction','polarization','holography','microscopy',
  'biotechnology','pharmacology','immunology','virology','bacteriology',
  'epidemiology','pathology','anatomy','physiology','embryology',
  'schwarzschild radius','einstein ring','dark nebula','baryon asymmetry',
  'quantum chromodynamics','standard model','supersymmetry',
  'loop quantum gravity','higgs boson','large hadron collider',
  'redshift','blueshift','doppler effect','parallax','parsec',
  'lightyear','astronomical unit','solar wind','magnetosphere',
  'thermometer','barometer','spectrometer','oscilloscope',
  'magnetism','capacitor','resistor','transistor','diode',
];

/** Levenshtein edit distance (O(m·n), short strings only) */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 5) return 999;
  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Return closest SCIENCE_TERMS match if within typo threshold, else null */
function findClosestMatch(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (q.length < 4) return null;
  if (SCIENCE_TERMS.some(t => t === q)) return null; // exact match — no suggestion
  let bestTerm: string | null = null;
  let bestDist = Infinity;
  for (const term of SCIENCE_TERMS) {
    // For multi-word terms also compare individual words
    const wordDists = term.includes(' ')
      ? term.split(' ').map(w => levenshtein(q, w))
      : [];
    const dist = wordDists.length
      ? Math.min(levenshtein(q, term), ...wordDists)
      : levenshtein(q, term);
    if (dist > 0 && dist < bestDist) { bestDist = dist; bestTerm = term; }
  }
  const maxDist = q.length <= 5 ? 2 : q.length <= 9 ? 3 : 4;
  return bestDist <= maxDist ? bestTerm : null;
}

// ─── HighlightText — case-insensitive query keyword highlighting ───────────────
function HighlightText({ text, query, className }: {
  text: string; query?: string; className?: string;
}) {
  if (!query || !query.trim()) return <span className={className}>{text}</span>;

  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return <span className={className}>{text}</span>;

  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-transparent font-semibold"
            style={{ color: 'rgb(196,181,253)', textShadow: '0 0 10px rgba(167,139,250,0.55)' }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

// ─── CiteButton — BibTeX clipboard with "Copied!" micro-interaction ───────────
function CiteButton({ item, lm }: { item: SectionItem; lm?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCite = useCallback((e: { stopPropagation: () => void; preventDefault: () => void }) => {
    e.stopPropagation();
    e.preventDefault();
    const year = item.date ? item.date.slice(0, 4) : '';
    const firstAuthor = (item.authors?.[0] ?? '').split(/\s+/).pop()?.toLowerCase() ?? 'unknown';
    const titleWord = (item.title.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]/g, '') || 'paper';
    const key = `${firstAuthor}${year}${titleWord}`;
    const authorStr = item.authors && item.authors.length > 0 ? item.authors.join(' and ') : 'Unknown';
    const bibtex = `@article{${key},\n  title  = {${item.title}},\n  author = {${authorStr}},\n  year   = {${year}},\n  url    = {${item.url ?? ''}}\n}`;
    navigator.clipboard.writeText(bibtex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {/* clipboard denied — silently skip */});
  }, [item]);

  return (
    <button
      onClick={handleCite}
      aria-label="Copy BibTeX citation"
      className={`flex-shrink-0 inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border transition-all duration-200 ${
        copied
          ? lm
            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
            : 'bg-emerald-500/20 border-emerald-400/35 text-emerald-300'
          : lm
            ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
            : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:bg-violet-500/15 hover:border-violet-400/30 hover:text-violet-300'
      }`}
    >
      {copied
        ? <><Check size={7} strokeWidth={2.5} />Copied!</>
        : <><Copy size={7} strokeWidth={2.5} />Cite</>
      }
    </button>
  );
}

// ─── Topic cover illustrations (pure CSS — zero external deps) ────────────────
const TOPIC_COVERS: Record<string, { from: string; via: string; to: string; accent: string; symbol: string; label: string }> = {
  'quantum':          { from:'#010c1f', via:'#031d4a', to:'#010c1f', accent:'#60a5fa', symbol:'ψ',   label:'Quantum Mechanics' },
  'relativity':       { from:'#160600', via:'#2e1100', to:'#0a0300', accent:'#fb923c', symbol:'c²',  label:'Relativity' },
  'cosmology':        { from:'#050010', via:'#0d002a', to:'#030010', accent:'#a78bfa', symbol:'∞',   label:'Cosmology' },
  'astrophysics':     { from:'#00080f', via:'#001428', to:'#00080f', accent:'#38bdf8', symbol:'✦',   label:'Astrophysics' },
  'black hole':       { from:'#020005', via:'#070010', to:'#020005', accent:'#c084fc', symbol:'●',   label:'Black Holes' },
  'string theory':    { from:'#000e08', via:'#001e10', to:'#000e08', accent:'#34d399', symbol:'∿',   label:'String Theory' },
  'psychology':       { from:'#120008', via:'#240010', to:'#090004', accent:'#f472b6', symbol:'ψ',   label:'Psychology' },
  'philosophy':       { from:'#080800', via:'#161600', to:'#040400', accent:'#fbbf24', symbol:'φ',   label:'Philosophy' },
  'neuroscience':     { from:'#021000', via:'#042200', to:'#010a00', accent:'#4ade80', symbol:'⌁',   label:'Neuroscience' },
  'particle physics': { from:'#08000e', via:'#150020', to:'#05000a', accent:'#e879f9', symbol:'⊕',   label:'Particle Physics' },
  'dark matter':      { from:'#06000e', via:'#0f001e', to:'#04000a', accent:'#818cf8', symbol:'◌',   label:'Dark Matter' },
  'dark energy':      { from:'#08000a', via:'#140014', to:'#06000a', accent:'#d946ef', symbol:'Λ',   label:'Dark Energy' },
  'galaxy':           { from:'#030010', via:'#080020', to:'#030010', accent:'#6366f1', symbol:'⊛',   label:'Galaxy' },
  'supernova':        { from:'#140200', via:'#2a0600', to:'#080100', accent:'#f97316', symbol:'★',   label:'Supernova' },
  'neutron star':     { from:'#000814', via:'#001028', to:'#000814', accent:'#67e8f9', symbol:'◎',   label:'Neutron Star' },
  'telescope':        { from:'#000a14', via:'#001424', to:'#000810', accent:'#0ea5e9', symbol:'◎',   label:'Telescope' },
  'gravity':          { from:'#080800', via:'#161400', to:'#040400', accent:'#d97706', symbol:'g',   label:'Gravity' },
  'space':            { from:'#020208', via:'#04041a', to:'#020208', accent:'#818cf8', symbol:'✦',   label:'Space' },
};

function getTopicCover(text: string) {
  const lower = text.toLowerCase();
  for (const [key, cfg] of Object.entries(TOPIC_COVERS)) {
    if (lower.includes(key)) return cfg;
  }
  return { from:'#030310', via:'#060622', to:'#030310', accent:'#6366f1', symbol:'◈', label:'Science' };
}

// ─── Shorts detection ─────────────────────────────────────────────────────────
// Primary: trust the backend `isShort` flag (set when video came from a #shorts
// query). Fallback: scan title + description text for shorts signals.
function isShortVideo(video: VideoItem): boolean {
  if (video.isShort === true)  return true;
  if (video.isShort === false) return false;
  const text = `${video.title} ${video.description}`.toLowerCase();
  return (
    text.includes('#shorts') ||
    text.includes('#short ') ||
    /\bshorts\b/.test(text)   ||
    text.includes('short video') ||
    text.includes('60 seconds') ||
    text.includes('60s ')
  );
}

// ─── Status badges ────────────────────────────────────────────────────────────
type StatusBadgeType = 'Official' | 'Research' | 'Peer Reviewed' | 'Open Access' | 'Encyclopedia' | 'Video';

const STATUS_CFG: Record<StatusBadgeType, { dot: string; darkCls: string; lightCls: string }> = {
  'Official':      { dot:'#38bdf8', darkCls:'bg-sky-500/15 border-sky-400/25 text-sky-300',         lightCls:'bg-sky-50 border-sky-200 text-sky-700' },
  'Research':      { dot:'#34d399', darkCls:'bg-emerald-500/15 border-emerald-400/25 text-emerald-300', lightCls:'bg-emerald-50 border-emerald-200 text-emerald-700' },
  'Peer Reviewed': { dot:'#a78bfa', darkCls:'bg-violet-500/15 border-violet-400/25 text-violet-300', lightCls:'bg-violet-50 border-violet-200 text-violet-700' },
  'Open Access':   { dot:'#fbbf24', darkCls:'bg-amber-400/12 border-amber-300/20 text-amber-300',   lightCls:'bg-amber-50 border-amber-200 text-amber-700' },
  'Encyclopedia':  { dot:'#fb923c', darkCls:'bg-orange-500/12 border-orange-400/20 text-orange-300', lightCls:'bg-orange-50 border-orange-200 text-orange-700' },
  'Video':         { dot:'#f87171', darkCls:'bg-red-500/15 border-red-400/25 text-red-300',         lightCls:'bg-red-50 border-red-200 text-red-700' },
};

function getStatusBadges(source: string): StatusBadgeType[] {
  switch (source) {
    case 'nasa':            return ['Official'];
    case 'esa':             return ['Official'];
    case 'wiki':            return ['Encyclopedia'];
    case 'arxiv':           return ['Research', 'Open Access'];
    case 'openalex':        return ['Research', 'Open Access'];
    case 'semanticscholar': return ['Research', 'Peer Reviewed'];
    case 'inspirehep':      return ['Research', 'Peer Reviewed'];
    case 'book':            return ['Research'];
    default:                return ['Research'];
  }
}

function StatusBadge({ type, lm }: { type: StatusBadgeType; lm?: boolean }) {
  const { dot, darkCls, lightCls } = STATUS_CFG[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border backdrop-blur-md flex-shrink-0 ${lm ? lightCls : darkCls}`}>
      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: dot }} />
      {type}
    </span>
  );
}

// ─── Sort control bar ─────────────────────────────────────────────────────────
function SortBar({
  sort, onChange, hasCitations, lm,
}: {
  sort: SortOrder; onChange: (s: SortOrder) => void; hasCitations: boolean; lm?: boolean;
}) {
  const opts: { id: SortOrder; label: string }[] = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'recent',    label: 'Most Recent' },
    ...(hasCitations ? [{ id: 'cited' as SortOrder, label: 'Most Cited' }] : []),
  ];
  return (
    <div className="flex items-center gap-2.5 mb-4 px-0.5">
      <span className={`text-[9px] uppercase tracking-[0.22em] font-semibold flex-shrink-0 ${lm ? 'text-gray-400' : 'text-white/28'}`}>Sort</span>
      <div className="flex items-center gap-1.5">
        {opts.map(opt => {
          const active = sort === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`text-[9.5px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1 rounded-full border whitespace-nowrap transition-all duration-200 ${
                active
                  ? lm
                    ? 'bg-gray-900 border-gray-900 text-white shadow-[0_1px_6px_rgba(0,0,0,0.18)]'
                    : 'bg-violet-500/20 border-violet-400/35 text-violet-200 shadow-[0_1px_8px_rgba(139,92,246,0.2)]'
                  : lm
                    ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                    : 'bg-transparent border-white/[0.07] text-white/30 hover:border-white/[0.16] hover:text-white/55 hover:bg-white/[0.03]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CoverImage — real image only, skeleton while loading ────────────────────
// Bug #6 fix: guard against empty src — an empty string causes some browsers to
// never fire onLoad/onError, leaving the shimmer skeleton permanently visible.
function CoverImage({ src, alt, lm }: { src: string; alt: string; lm?: boolean }) {
  // Treat empty / whitespace-only src as an immediate failure so the skeleton
  // resolves right away instead of hanging.
  const hasValidSrc = src.trim().length > 0;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(!hasValidSrc);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Skeleton base — shown while loading; hidden once loaded or failed */}
      {!imgLoaded && !imgFailed && (
        <div className={`absolute inset-0 ${lm ? 'bg-gray-100' : 'bg-[#09090f]'}`}>
          <motion.div
            className="absolute inset-0"
            style={{ background: lm ? 'linear-gradient(90deg,transparent,rgba(0,0,0,0.04),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      )}
      {/* Dark placeholder when image is absent or failed */}
      {imgFailed && (
        <div className={`absolute inset-0 ${lm ? 'bg-gray-100' : 'bg-[#09090f]'}`} />
      )}
      {hasValidSrc && !imgFailed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
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

// ─── ExtNoImagePlaceholder (used in modals) — premium source logo ────────────
function ExtNoImagePlaceholder({ source, lm }: { source: string; title?: string; lm?: boolean }) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      <SourceLogo source={source} lm={lm} />
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
      className={`rounded-2xl border px-5 py-4 flex flex-col gap-2.5 relative overflow-hidden ${lm ? 'bg-white border-gray-200' : 'bg-white/[0.025] border-white/[0.06]'}`}
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

// ─── Section item card (Wikipedia / NASA / ESA) — premium Apple-quality ───────
function SectionItemCard({ item, idx, onOpen, lm, query, savedIdSet, onToggleSave }: {
  item: SectionItem; idx: number; onOpen: () => void; lm?: boolean; query?: string;
  savedIdSet?: ReadonlySet<string>; onToggleSave?: (item: SectionItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBookmarked = savedIdSet?.has(stableItemId(item)) ?? false;
  const statusBadges = getStatusBadges(item.source);
  const cfg = extSourceCfg(item.source);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min((idx % 6) * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      role="article"
      aria-label={item.title}
      className={`group relative w-full h-full flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ease-out cursor-pointer transform-gpu ${
        lm
          ? 'bg-white border-gray-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.07)] hover:border-gray-300 hover:-translate-y-1.5 hover:shadow-[0_20px_52px_rgba(0,0,0,0.15)]'
          : 'bg-[#0b0b18]/70 border-white/[0.08] shadow-[0_2px_24px_rgba(0,0,0,0.6)] hover:border-white/[0.18] hover:-translate-y-1.5 hover:shadow-[0_20px_56px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-sm'
      }`}
    >
      {/* Cover — only rendered when an image URL exists */}
      {item.imageUrl && (
        <div className="relative w-full aspect-[16/9] flex-shrink-0">
          <CoverImage src={item.imageUrl} alt={item.title ?? ''} lm={lm} />
          {/* Scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent pointer-events-none" />
          {/* Hover shimmer */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.05) 0%,transparent 55%)' }} />
          {/* Top row badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <ExtSourceBadge source={item.source} lm={lm} />
              {statusBadges.slice(0, 1).map(b => <StatusBadge key={b} type={b} lm={lm} />)}
            </div>
            {item.date && (
              <span className="flex-shrink-0 text-[8.5px] text-white/75 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full tracking-widest font-medium">
                {item.date.length === 4 ? item.date : item.date.slice(0, 10)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Body — grows to fill equal height */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        {/* Secondary status badges */}
        {statusBadges.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {statusBadges.slice(1).map(b => <StatusBadge key={b} type={b} lm={lm} />)}
          </div>
        )}
        {/* Title */}
        <p className={`text-[13.5px] font-semibold leading-snug tracking-[-0.01em] line-clamp-2 mb-1.5 ${lm ? 'text-gray-900' : 'text-white/92'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {item.title}
        </p>
        {/* Description */}
        {item.description && (
          <HighlightText
            text={item.description}
            query={query}
            className={`text-[11.5px] leading-relaxed line-clamp-3 flex-1 ${lm ? 'text-gray-500' : 'text-white/40'}`}
          />
        )}
        {/* Footer — source label + actions */}
        <div className="flex items-center justify-between mt-3 pt-2.5 gap-2"
          style={{ borderTop: lm ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <cfg.icon size={10} strokeWidth={2} className={`flex-shrink-0 ${lm ? 'text-gray-400' : 'text-white/28'}`} />
            <span className={`text-[9.5px] uppercase tracking-[0.15em] truncate ${lm ? 'text-gray-400' : 'text-white/28'}`}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Bookmark */}
            {onToggleSave && (
              <button
                onClick={e => { e.stopPropagation(); onToggleSave(item); }}
                aria-label={isBookmarked ? `Remove "${item.title}" from reading list` : `Save "${item.title}" to reading list`}
                aria-pressed={isBookmarked}
                className={`p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
                  isBookmarked
                    ? lm ? 'bg-violet-100 border-violet-300 text-violet-600' : 'bg-violet-500/[0.18] border-violet-400/35 text-violet-300'
                    : lm ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-500' : 'bg-white/[0.04] border-white/[0.09] text-white/28 hover:border-violet-400/28 hover:text-violet-300/75'
                }`}
              >
                {isBookmarked
                  ? <BookmarkCheck size={10} strokeWidth={2.5} aria-hidden="true" />
                  : <Bookmark size={10} strokeWidth={2} aria-hidden="true" />
                }
              </button>
            )}
            {/* Expand preview */}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
              aria-expanded={expanded}
              className={`p-1.5 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
                lm
                  ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700'
                  : 'bg-white/[0.04] border-white/[0.09] text-white/28 hover:border-white/[0.20] hover:text-white/65'
              }`}
            >
              {expanded
                ? <ChevronUp size={10} strokeWidth={2.5} aria-hidden="true" />
                : <ChevronDown size={10} strokeWidth={2} aria-hidden="true" />
              }
            </button>
            {/* Open link */}
            <a
              href={item.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              aria-label={`Open ${item.title}`}
              className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-all duration-200 ${
                lm
                  ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-900 hover:border-gray-900 hover:text-white'
                  : 'bg-white/[0.06] border-white/[0.12] text-white/55 hover:bg-white/[0.14] hover:border-white/[0.26] hover:text-white/90'
              }`}
            >
              Open <ExternalLink size={8} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Quick Preview panel — height-animated via CSS grid */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          aria-hidden={!expanded}
        >
          <div className="overflow-hidden min-h-0">
            <div className={`pt-3 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              <div className="pt-3" style={{ borderTop: lm ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)' }}>
                {item.description ? (
                  <p className={`text-[11.5px] leading-relaxed ${lm ? 'text-gray-600' : 'text-white/55'}`}>
                    {item.description}
                  </p>
                ) : (
                  <p className={`text-[11px] italic ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                    No preview available for this result.
                  </p>
                )}
                {item.authors && item.authors.length > 0 && (
                  <p className={`mt-2 text-[10px] ${lm ? 'text-gray-400' : 'text-white/28'}`}>
                    {item.authors.slice(0, 5).join(', ')}{item.authors.length > 5 ? ' et al.' : ''}
                  </p>
                )}
                {item.date && (
                  <p className={`mt-1 text-[9.5px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
                    {item.date.length === 4 ? item.date : item.date.slice(0, 10)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Research thumbnail strip — arXiv logo only; null for all other sources ───
// Rule: arXiv gets its premium dark logo strip.
//       Books and all other research sources get no thumbnail at all.
function ResearchThumb({ source, lm }: { source: string; lm?: boolean }) {
  if (source !== 'arxiv') return null;
  return (
    <div className="relative flex-shrink-0 w-[72px] self-stretch overflow-hidden">
      <SourceLogoStrip source="arxiv" lm={lm} />
    </div>
  );
}

// ─── Research / Book row card ──────────────────────────────────────────────────
function ResearchRowCard({ item, idx, onOpen, lm, query, savedIdSet, onToggleSave }: {
  item: SectionItem; idx: number; onOpen: () => void; lm?: boolean; query?: string;
  savedIdSet?: ReadonlySet<string>; onToggleSave?: (item: SectionItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBookmarked = savedIdSet?.has(stableItemId(item)) ?? false;
  const statusBadges = getStatusBadges(item.source);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(idx * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      role="article"
      aria-label={item.title}
      className={`group relative flex items-stretch rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${
        lm
          ? 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-[0_6px_28px_rgba(0,0,0,0.09)] hover:-translate-y-0.5'
          : 'bg-[#0b0b18]/60 border-white/[0.07] hover:border-white/[0.16] hover:bg-[#0d0d1e]/80 backdrop-blur-sm hover:-translate-y-0.5'
      }`}
    >
      {/* Left accent bar — single pixel, neutral */}
      <div className={`flex-shrink-0 w-0.5 rounded-l-2xl ${lm ? 'bg-gray-200' : 'bg-white/[0.10]'}`} />

      {/* Thumbnail strip — Wikipedia image or source logo */}
      <ResearchThumb source={item.source} lm={lm} />

      {/* Body */}
      <div className="flex-1 min-w-0 px-4 py-3.5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1 mb-1.5">
          <ExtSourceBadge source={item.source} lm={lm} />
          {statusBadges.slice(0, 2).map(b => <StatusBadge key={b} type={b} lm={lm} />)}
        </div>
        {/* Title */}
        <p className={`text-[13px] font-semibold leading-snug tracking-[-0.01em] mb-1 line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/90'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {item.title}
        </p>
        {/* Description */}
        {item.description && (
          <HighlightText
            text={item.description}
            query={query}
            className={`text-[11px] leading-relaxed line-clamp-2 ${lm ? 'text-gray-500' : 'text-white/35'}`}
          />
        )}
        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {item.authors && item.authors.length > 0 && (
            <span className={`text-[9.5px] tracking-wide ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              {item.authors.slice(0, 2).join(', ')}{item.authors.length > 2 ? ' et al.' : ''}
            </span>
          )}
          {item.date && (
            <span className={`text-[9.5px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              {item.date.length === 4 ? item.date : item.date.slice(0, 7)}
            </span>
          )}
          {item.citationCount !== undefined && item.citationCount > 0 && (
            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full border ${lm ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-white/[0.04] border-white/[0.08] text-white/28'}`}>
              {item.citationCount.toLocaleString()} citations
            </span>
          )}
          {/* Action buttons — pushed right */}
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <CiteButton item={item} lm={lm} />
            {/* Bookmark */}
            {onToggleSave && (
              <button
                onClick={e => { e.stopPropagation(); onToggleSave(item); }}
                aria-label={isBookmarked ? `Remove "${item.title}" from reading list` : `Save "${item.title}" to reading list`}
                aria-pressed={isBookmarked}
                className={`p-1 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
                  isBookmarked
                    ? lm ? 'bg-violet-100 border-violet-300 text-violet-600' : 'bg-violet-500/[0.18] border-violet-400/35 text-violet-300'
                    : lm ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-500' : 'bg-white/[0.03] border-white/[0.08] text-white/25 hover:border-violet-400/25 hover:text-violet-300/70'
                }`}
              >
                {isBookmarked
                  ? <BookmarkCheck size={9} strokeWidth={2.5} aria-hidden="true" />
                  : <Bookmark size={9} strokeWidth={2} aria-hidden="true" />
                }
              </button>
            )}
            {/* Expand preview */}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              aria-label={expanded ? 'Collapse preview' : 'Expand preview'}
              aria-expanded={expanded}
              className={`p-1 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
                lm
                  ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/25 hover:border-white/[0.18] hover:text-white/60'
              }`}
            >
              {expanded
                ? <ChevronUp size={9} strokeWidth={2.5} aria-hidden="true" />
                : <ChevronDown size={9} strokeWidth={2} aria-hidden="true" />
              }
            </button>
            <a
              href={item.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              aria-label={`Open ${item.title}`}
              className={`flex-shrink-0 inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border transition-all duration-200 ${
                lm
                  ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-900 hover:border-gray-900 hover:text-white'
                  : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:bg-white/[0.12] hover:border-white/[0.22] hover:text-white/85'
              }`}
            >
              Open <ExternalLink size={7} strokeWidth={2.5} />
            </a>
          </div>
        </div>

        {/* Quick Preview panel — height-animated via CSS grid */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          aria-hidden={!expanded}
        >
          <div className="overflow-hidden min-h-0">
            <div className={`pt-3 pb-1 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
              <div className="pt-3" style={{ borderTop: lm ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.05)' }}>
                {item.description ? (
                  <p className={`text-[11.5px] leading-relaxed ${lm ? 'text-gray-600' : 'text-white/55'}`}>
                    {item.description}
                  </p>
                ) : (
                  <p className={`text-[11px] italic ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                    No preview available for this result.
                  </p>
                )}
                {item.authors && item.authors.length > 0 && (
                  <p className={`mt-2 text-[10px] ${lm ? 'text-gray-400' : 'text-white/28'}`}>
                    {item.authors.slice(0, 5).join(', ')}{item.authors.length > 5 ? ' et al.' : ''}
                  </p>
                )}
                {item.date && (
                  <p className={`mt-1 text-[9.5px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/25'}`}>
                    {item.date.length === 4 ? item.date : item.date.slice(0, 10)}
                  </p>
                )}
                {item.citationCount !== undefined && item.citationCount > 0 && (
                  <p className={`mt-1 text-[9.5px] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
                    {item.citationCount.toLocaleString()} citations
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
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

// ─── Video card — premium with skeleton + topic-cover fallback ────────────────
function VideoCard({ video, idx, onClick, lm, isShort }: { video: VideoItem; idx: number; onClick: () => void; lm?: boolean; isShort?: boolean }) {
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const cover = getTopicCover(video.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(idx * 0.06, 0.4), ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      role="article"
      aria-label={video.title}
      className={`group relative w-full h-full flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ease-out cursor-pointer transform-gpu ${
        lm
          ? 'bg-white border-gray-200/80 shadow-[0_2px_16px_rgba(0,0,0,0.07)] hover:border-gray-300 hover:-translate-y-1.5 hover:shadow-[0_20px_52px_rgba(0,0,0,0.15)]'
          : 'bg-[#0b0b18]/70 border-white/[0.08] shadow-[0_2px_24px_rgba(0,0,0,0.6)] hover:border-white/[0.18] hover:-translate-y-1.5 hover:shadow-[0_20px_56px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-sm'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[16/9] flex-shrink-0 overflow-hidden">
        {/* Skeleton */}
        {!thumbLoaded && !thumbFailed && (
          <div className={`absolute inset-0 ${lm ? 'bg-gray-100' : 'bg-[#080818]'}`}>
            <motion.div
              className="absolute inset-0"
              style={{ background: lm ? 'linear-gradient(90deg,transparent,rgba(0,0,0,0.04),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)' }}
              animate={{ x: ['-100%','200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Center play ghost */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-12 h-12 rounded-full border ${lm ? 'border-gray-200' : 'border-white/[0.08]'}`} />
            </div>
          </div>
        )}
        {/* Topic cover fallback */}
        {thumbFailed && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${cover.from} 0%, ${cover.via} 50%, ${cover.to} 100%)` }}
          >
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 45%, ${cover.accent}25 0%, transparent 65%)` }} />
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <span className="relative text-[50px] leading-none select-none" style={{ color: cover.accent, opacity: 0.28, fontFamily: 'Georgia, serif' }}>{cover.symbol}</span>
          </div>
        )}
        {/* YouTube thumbnail */}
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          onLoad={() => setThumbLoaded(true)}
          onError={() => setThumbFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04]"
          style={{ opacity: thumbLoaded ? 1 : 0 }}
        />
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-transparent pointer-events-none" />
        {/* Hover shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 55%)' }} />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.6)] group-hover:bg-white/28 group-hover:scale-110 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.9)] transition-all duration-300">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5 fill-white drop-shadow-lg"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>
        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border bg-red-500/22 border-red-400/28 text-red-200/90 backdrop-blur-md">
            <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
            Video
          </span>
          {isShort ? (
            <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border bg-pink-500/22 border-pink-400/30 text-pink-200/90 backdrop-blur-md">
              <span className="w-1 h-1 rounded-full bg-pink-400 flex-shrink-0" />
              Shorts
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full border bg-black/35 border-white/15 text-white/60 backdrop-blur-md">
              YouTube
            </span>
          )}
        </div>
        {/* Watch now hover pill */}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="text-[8.5px] text-white/85 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full tracking-widest uppercase font-semibold">Watch now</span>
        </div>
      </div>

      {/* Text body */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        <p className={`text-[13px] font-semibold leading-snug tracking-[-0.01em] mb-1 line-clamp-2 flex-1 ${lm ? 'text-gray-900' : 'text-white/92'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {video.title}
        </p>
        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 gap-2"
          style={{ borderTop: lm ? '1px solid rgba(0,0,0,0.07)' : '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <svg viewBox="0 0 24 24" className={`w-2.5 h-2.5 flex-shrink-0 fill-current ${lm ? 'text-gray-400' : 'text-white/28'}`}><polygon points="5,3 19,12 5,21" /></svg>
            {video.channelTitle && (
              <span className={`text-[9.5px] tracking-wide truncate ${lm ? 'text-gray-400' : 'text-white/35'}`}>{video.channelTitle}</span>
            )}
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            aria-label={`Watch ${video.title} on YouTube`}
            className={`flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border transition-all duration-200 ${
              lm
                ? 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-900 hover:border-gray-900 hover:text-white'
                : 'bg-white/[0.06] border-white/[0.12] text-white/55 hover:bg-white/[0.14] hover:border-white/[0.26] hover:text-white/90'
            }`}
          >
            Open <ExternalLink size={8} strokeWidth={2.5} />
          </a>
        </div>
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
            : <ExtNoImagePlaceholder source={item.source} title={item.title} lm={lm} />
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

// ─── Filter bar ───────────────────────────────────────────────────────────────
type SearchFilter =
  | 'all' | 'videos' | 'shorts' | 'longVideos'
  | 'wikipedia' | 'research' | 'nasa' | 'esa' | 'books' | 'aiSummary';

interface FilterCounts {
  videos: number; shorts: number; longVideos: number;
  wikipedia: number; research: number; nasa: number;
  esa: number; books: number; aiSummary: number;
}

// Feature #8/9: per-source empty state with a descriptive hint line
function FilterEmptyState({ label, hint, lm }: { label: string; hint?: string; lm?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center gap-4 py-16 ${lm ? 'text-gray-400' : 'text-white/35'}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.04] border-white/[0.08]'}`}>
        <Telescope size={24} strokeWidth={1.2} className={lm ? 'text-gray-400' : 'text-white/35'} />
      </div>
      <div className="flex flex-col items-center gap-2 text-center max-w-[280px]">
        <p className={`text-[13px] font-medium ${lm ? 'text-gray-600' : 'text-white/50'}`}>No {label} found</p>
        {hint ? (
          <p className={`text-[11px] leading-relaxed ${lm ? 'text-gray-400' : 'text-white/28'}`}>{hint}</p>
        ) : (
          <p className={`text-[11px] uppercase tracking-[0.22em] ${lm ? 'text-gray-400' : 'text-white/28'}`}>Try a broader search term</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Immersive Shorts Feed (Reels / TikTok-style) ────────────────────────────
function ShortsImmersiveFeed({
  videos, onClose, onLoadMore, hasMore = true,
}: { videos: VideoItem[]; onClose: () => void; lm?: boolean; onLoadMore?: () => void; hasMore?: boolean }) {
  const [activeIdx, setActiveIdx]       = useState(0);
  const [muted, setMuted]               = useState(true);   // start muted → autoplay works everywhere
  const [showUnmuteHint, setShowUnmuteHint] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // ── IntersectionObserver — clean active-slide tracking, no scroll math ──────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!isNaN(idx)) setActiveIdx(idx);
          }
        }
      },
      { root: container, threshold: 0.55 },
    );
    container.querySelectorAll('[data-idx]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [videos.length]);

  // ── Trigger loadMore when within 3 slides of the end ────────────────────────
  useEffect(() => {
    // Bail out early — all paths explicit to satisfy noImplicitReturns
    if (!onLoadMore || !hasMore || loadingMoreRef.current) return;
    if (activeIdx < videos.length - 3) return;
    loadingMoreRef.current = true;
    onLoadMore();
    // Reset the guard after a short debounce so repeated swipes don't multi-fire
    const t = setTimeout(() => { loadingMoreRef.current = false; }, 2000);
    return () => clearTimeout(t);
  }, [activeIdx, videos.length, onLoadMore, hasMore]);

  // ── Auto-hide unmute hint after 3.5s ────────────────────────────────────────
  useEffect(() => {
    if (!showUnmuteHint) return;
    const t = setTimeout(() => setShowUnmuteHint(false), 3500);
    return () => clearTimeout(t);
  }, [showUnmuteHint]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const scrollTo = (idx: number) =>
      scrollRef.current?.scrollTo({ top: idx * (scrollRef.current.clientHeight), behavior: 'smooth' });
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape')    onClose();
      if (e.key === 'ArrowDown') scrollTo(Math.min(activeIdx + 1, videos.length - 1));
      if (e.key === 'ArrowUp')   scrollTo(Math.max(activeIdx - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeIdx, videos.length, onClose]);

  function handleUnmute() {
    setMuted(false);
    setShowUnmuteHint(false);
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (videos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] bg-black/96 backdrop-blur-2xl flex flex-col items-center justify-center gap-5"
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] border border-white/15 text-white/65 hover:text-white hover:bg-white/[0.14] transition-all duration-200 text-[12px] font-medium"
        >
          <ChevronLeft size={13} strokeWidth={2.5} /> Back
        </button>
        <Telescope size={40} strokeWidth={1} className="text-white/18" />
        <p className="text-white/40 text-[14px] font-medium">No Shorts found for this topic</p>
        <p className="text-white/22 text-[11px] uppercase tracking-[0.2em]">Try a different search term</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[400] bg-black overflow-hidden"
    >
      {/* ── HUD — Back ─────────────────────────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[410] flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-white/75 hover:text-white hover:bg-black/80 hover:border-white/30 transition-all duration-200 text-[12px] font-medium"
      >
        <ChevronLeft size={14} strokeWidth={2.5} /> Back
      </button>

      {/* ── HUD — Unmute + Counter (top-right) ─────────────────────────────── */}
      <div className="absolute top-4 right-4 z-[410] flex items-center gap-2">
        {/* Mute/Unmute toggle */}
        <button
          onClick={handleUnmute}
          title={muted ? 'Tap to unmute' : 'Sound on'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-xl transition-all duration-200 text-[11.5px] font-medium ${
            muted
              ? 'bg-white/[0.12] border-white/25 text-white/80 hover:bg-white/20 hover:text-white'
              : 'bg-white/[0.06] border-white/10 text-white/35 cursor-default'
          }`}
        >
          {muted ? (
            /* Muted icon */
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            /* Sound-on icon */
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
          {muted ? 'Unmute' : 'Live'}
        </button>

        {/* Slide counter */}
        <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-[11px] font-medium tabular-nums flex items-center gap-1.5">
          <span className="text-white/40">{activeIdx + 1} / {videos.length}</span>
          {hasMore && activeIdx >= videos.length - 3 && (
            <motion.span
              className="text-white/30"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              ···
            </motion.span>
          )}
        </div>
      </div>

      {/* ── "Tap to unmute" toast ───────────────────────────────────────────── */}
      <AnimatePresence>
        {muted && showUnmuteHint && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleUnmute}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[410] flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-white text-[13px] font-medium cursor-pointer select-none hover:bg-black/90 transition-colors duration-150"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>
            </svg>
            Tap to unmute
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right-side progress pills (plain CSS transitions — no Framer re-renders) ── */}
      <div className="absolute top-1/2 -translate-y-1/2 right-3 z-[410] flex flex-col gap-1.5 items-center">
        {videos.slice(0, 12).map((_, i) => (
          <div
            key={i}
            onClick={() => scrollRef.current?.scrollTo({ top: i * (scrollRef.current.clientHeight), behavior: 'smooth' })}
            className="rounded-full cursor-pointer"
            style={{
              width: '3px',
              height: i === activeIdx ? '22px' : '4px',
              opacity: i === activeIdx ? 1 : i < activeIdx ? 0.5 : 0.2,
              backgroundColor: i === activeIdx ? '#ffffff' : 'rgba(255,255,255,0.6)',
              transition: 'height 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.22s ease',
            }}
          />
        ))}
      </div>

      {/* ── Scroll feed ────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="w-full h-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          // Do NOT set scrollBehavior here — CSS snap already provides snapping.
          // Adding smooth here fights the snap and creates jank.
          overscrollBehavior: 'none',
          WebkitOverflowScrolling: 'touch', // momentum scrolling on iOS
        }}
      >
        {videos.map((video, i) => {
          const isActive  = i === activeIdx;
          const isPreload = i === activeIdx + 1; // preload next only
          const mounted   = isActive || isPreload;

          return (
            <div
              key={video.videoId}
              data-idx={i}
              className="relative w-full overflow-hidden"
              style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always', height: '100dvh' }}
            >
              {/* Blurred ambient background — fast paint, always rendered */}
              <img
                src={video.thumbnail}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'blur(32px) brightness(0.22) saturate(1.7)', transform: 'scale(1.1)' }}
              />

              {/* 9:16 column — fills full viewport height, correct aspect-ratio width */}
              {/* width = min(100vw, 9/16 * 100dvh) — edge-to-edge on phones, pillarboxed on desktop */}
              <div
                className="relative z-10 h-full mx-auto overflow-hidden"
                style={{ width: 'min(100%, calc(100dvh * 9 / 16))' }}
              >
                {mounted ? (
                  <iframe
                    /* key changes when muted toggled → remount with new params */
                    key={`yt-${video.videoId}-${muted ? 'm' : 'u'}`}
                    src={
                      `https://www.youtube.com/embed/${video.videoId}` +
                      `?autoplay=${isActive ? 1 : 0}` +
                      `&mute=${muted ? 1 : 0}` +
                      `&controls=0&modestbranding=1&rel=0&showinfo=0` +
                      `&loop=1&playlist=${video.videoId}`
                    }
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 'none', display: 'block' }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading={isActive ? 'eager' : 'lazy'}
                  />
                ) : (
                  /* Thumbnail stand-in for slides not yet near active */
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ opacity: 0.4 }}
                    loading="lazy"
                  />
                )}
              </div>

              {/* Bottom gradient + title — rendered for all slides for layout stability */}
              <div
                className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-10 pt-28 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.38) 55%, transparent 100%)' }}
              >
                <p
                  className="text-white font-semibold text-[15px] leading-snug tracking-[-0.01em] line-clamp-2 mb-1.5"
                  style={{ fontFamily: 'var(--app-font-heading)' }}
                >
                  {video.title}
                </p>
                {video.channelTitle && (
                  <p className="text-white/50 text-[12px] font-medium">{video.channelTitle}</p>
                )}
              </div>

              {/* Swipe-up cue — only on active non-last slide */}
              {isActive && i < videos.length - 1 && (
                <motion.div
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  animate={{ y: [0, 7, 0], opacity: [0.28, 0.58, 0.28] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ChevronDown size={22} strokeWidth={1.4} className="text-white/50" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
function SearchFilterBar({
  active, counts, lm, onChange,
}: {
  active: SearchFilter; counts: FilterCounts; lm?: boolean; onChange: (f: SearchFilter) => void;
}) {
  type Chip = { id: SearchFilter; label: string; count?: number };
  const chips: Chip[] = ([
    { id: 'all'        as SearchFilter, label: 'All' },
    { id: 'videos'     as SearchFilter, label: 'Videos',      count: counts.videos },
    { id: 'shorts'     as SearchFilter, label: 'Shorts',      count: counts.shorts },
    { id: 'longVideos' as SearchFilter, label: 'Long Videos', count: counts.longVideos },
    { id: 'wikipedia'  as SearchFilter, label: 'Wikipedia',   count: counts.wikipedia },
    { id: 'research'   as SearchFilter, label: 'Research',    count: counts.research },
    { id: 'nasa'       as SearchFilter, label: 'NASA',        count: counts.nasa },
    { id: 'esa'        as SearchFilter, label: 'ESA',         count: counts.esa },
    { id: 'books'      as SearchFilter, label: 'Books',       count: counts.books },
    { id: 'aiSummary'  as SearchFilter, label: 'AI Summary',  count: counts.aiSummary },
  ] as Chip[]).filter(c => c.count === undefined || c.count > 0);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide -mx-1 px-1 mb-5">
      <div className="flex items-center gap-1.5 min-w-max py-0.5">
        {chips.map((chip, i) => {
          const isActive = active === chip.id;
          return (
            <motion.button
              key={chip.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: i * 0.022 }}
              onClick={() => onChange(chip.id)}
              className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? lm
                    ? 'bg-gray-900 border-gray-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                    : 'bg-white/[0.14] border-white/[0.28] text-white shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
                  : lm
                    ? 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'
                    : 'bg-transparent border-white/[0.08] text-white/38 hover:border-white/[0.18] hover:text-white/65 hover:bg-white/[0.04]'
              }`}
            >
              {chip.label}
              {chip.count !== undefined && chip.count > 0 && (
                <span className={`text-[8.5px] tabular-nums leading-none ${
                  isActive
                    ? lm ? 'text-white/65' : 'text-white/50'
                    : lm ? 'text-gray-400' : 'text-white/22'
                }`}>
                  {chip.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
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
  // ── Shorts infinite scroll ──
  onLoadMore?:    () => void;
  shortsHasMore?: boolean;
}

// ─── Main NasaSearch component ────────────────────────────────────────────────
function NasaSearch({
  results, status, errMsg, onClear, onCardClick, sentinelRef,
  isEverythingMode, isLoadingMore,
  videoResults = [], videoStatus = 'idle', onVideoClick,
  lm,
  sections, chatAvatars, onSectionItemShare, onRelatedTopicSearch,
  onLoadMore, shortsHasMore = true,
}: Props) {
  const [selectedSectionItem, setSelectedSectionItem] = useState<SectionItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  // Feature #11: back-to-top — show after 2× viewport height of scrolling
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Reset filter + sort + "did you mean" dismissed state whenever query changes
  useEffect(() => {
    setActiveFilter('all');
    setSortOrder('relevance');
    setDismissedDym(false);
  }, [sections?.query]);

  // Track window scroll for back-to-top visibility
  useEffect(() => {
    const threshold = () => window.innerHeight * 2;
    const handler = () => setShowBackToTop(window.scrollY > threshold());
    window.addEventListener('scroll', handler, { passive: true });
    handler(); // evaluate immediately
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Classify videos into shorts / long for instant client-side filtering
  const classifiedVideos = useMemo(() => {
    const vids = sections?.videos ?? [];
    return { shorts: vids.filter(isShortVideo), long: vids.filter(v => !isShortVideo(v)) };
  }, [sections]);

  const filterCounts: FilterCounts = useMemo(() => ({
    videos:     sections?.videos?.length ?? 0,
    shorts:     classifiedVideos.shorts.length,
    longVideos: classifiedVideos.long.length,
    wikipedia:  sections?.wikipedia?.length ?? 0,
    research:   sections?.research?.length ?? 0,
    nasa:       sections?.nasa?.length ?? 0,
    esa:        sections?.esa?.length ?? 0,
    books:      sections?.books?.length ?? 0,
    aiSummary:  sections?.aiSummary ? 1 : 0,
  }), [sections, classifiedVideos]);

  // ── Sort state (reset when query changes via the useEffect above) ──────────
  const [sortOrder,    setSortOrder]    = useState<SortOrder>('relevance');
  const [dismissedDym, setDismissedDym] = useState(false);

  // ── Reading list (localStorage-backed) ──────────────────────────────────
  const { saved, savedIdSet, toggleSave, remove, clearAll } = useSavedPapers();
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  // True when at least one research/book item carries a citation count
  const hasAnyCitations = useMemo(
    () => [...(sections?.research ?? []), ...(sections?.books ?? [])].some(i => (i.citationCount ?? 0) > 0),
    [sections]
  );

  // Sorted copy of sections (no refetch — pure client-side)
  const sortedSections = useMemo((): SearchSections | null => {
    if (!sections) return null;
    if (sortOrder === 'relevance') return sections;
    const byDate   = (a: SectionItem, b: SectionItem) =>
      (b.date ?? '').localeCompare(a.date ?? '');
    const byCited  = (a: SectionItem, b: SectionItem) =>
      (b.citationCount ?? 0) - (a.citationCount ?? 0) || byDate(a, b);
    if (sortOrder === 'recent') {
      return {
        ...sections,
        wikipedia: [...sections.wikipedia].sort(byDate),
        research:  [...sections.research].sort(byDate),
        nasa:      [...sections.nasa].sort(byDate),
        esa:       [...sections.esa].sort(byDate),
        books:     [...sections.books].sort(byDate),
      };
    }
    // cited
    return {
      ...sections,
      research:  [...sections.research].sort(byCited),
      books:     [...sections.books].sort(byCited),
      nasa:      [...sections.nasa].sort(byDate),
      esa:       [...sections.esa].sort(byDate),
      wikipedia: [...sections.wikipedia].sort(byDate),
    };
  }, [sections, sortOrder]);

  // "Did you mean?" — only when done & query seems misspelled
  const didYouMean = useMemo(
    () => (status === 'done' && sections) ? findClosestMatch(sections.query) : null,
    [sections, status]
  );

  if (status === 'idle') return null;

  const isLoading = status === 'loading';

  // ── SECTIONED VIEW (new unified endpoint) ─────────────────────────────────
  if (sections !== undefined && sections !== null) {
    // Sorted alias — pure client-side, zero refetch
    const ss = sortedSections ?? sections;
    // Which videos to show depends on the active filter
    const videosToShow =
      activeFilter === 'shorts'     ? classifiedVideos.shorts :
      activeFilter === 'longVideos' ? classifiedVideos.long   :
      sections.videos;

    const hasAny =
      (sections.videos?.length ?? 0) > 0 ||
      (sections.wikipedia?.length ?? 0) > 0 ||
      (sections.research?.length ?? 0) > 0 ||
      (sections.nasa?.length ?? 0) > 0 ||
      (sections.esa?.length ?? 0) > 0 ||
      (sections.books?.length ?? 0) > 0;

    // Bug #1 fix: include videos in the total so the header count is accurate
    const totalCount =
      (sections.videos?.length ?? 0) +
      (sections.wikipedia?.length ?? 0) +
      (sections.research?.length ?? 0) +
      (sections.nasa?.length ?? 0) +
      (sections.esa?.length ?? 0) +
      (sections.books?.length ?? 0);

    return (
      <>
        {/* ── Immersive Shorts Feed — full-screen overlay ── */}
        <AnimatePresence>
          {activeFilter === 'shorts' && (
            <ShortsImmersiveFeed
              videos={classifiedVideos.shorts}
              onClose={() => setActiveFilter('all')}
              lm={lm}
              onLoadMore={onLoadMore}
              hasMore={shortsHasMore}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          <motion.div
            key="sections-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-2xl pointer-events-auto"
          >
            {/* AI Overview — streams independently, never blocks results */}
            {sections?.query && (
              <AISummary query={sections.query} sections={sections} lm={lm} />
            )}

            {/* Knowledge Coverage — live counts, always above everything */}
            {status === 'done' && hasAny && (
              <KnowledgeCoverage sections={sections} lm={lm} />
            )}

            {/* ── "Did you mean?" typo correction ── */}
            <AnimatePresence>
              {!dismissedDym && didYouMean && status === 'done' && (
                <motion.div
                  key="did-you-mean"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl border ${
                    lm
                      ? 'bg-amber-50 border-amber-200/80 text-amber-700'
                      : 'bg-amber-400/[0.06] border-amber-400/[0.14] text-amber-300/80'
                  }`}
                >
                  <span className="text-[11.5px] flex-shrink-0">Did you mean:</span>
                  <button
                    onClick={() => onRelatedTopicSearch?.(didYouMean)}
                    className={`text-[11.5px] font-semibold underline underline-offset-2 transition-colors duration-150 hover:opacity-80`}
                  >
                    {didYouMean}
                  </button>
                  <button
                    onClick={() => setDismissedDym(true)}
                    className="ml-auto flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-150"
                    aria-label="Dismiss"
                  >
                    <X size={11} strokeWidth={2} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
              <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                {/* Reading List button */}
                <button
                  onClick={() => setShowSavedDrawer(true)}
                  aria-label={`Open reading list — ${saved.length} saved`}
                  className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 rounded ${
                    lm ? 'text-gray-400 hover:text-violet-600' : 'text-white/28 hover:text-violet-300/80'
                  }`}
                >
                  <Bookmark size={10} strokeWidth={2} aria-hidden="true" />
                  Saved{saved.length > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-bold ${
                      lm ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-300'
                    }`}>
                      {saved.length}
                    </span>
                  )}
                </button>
                <button onClick={onClear} className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors duration-200 ${lm ? 'text-gray-400 hover:text-gray-700' : 'text-white/28 hover:text-white/65'}`}>
                  <X size={10} strokeWidth={2.5} />
                  Clear
                </button>
              </div>
            </div>

            {/* Filter bar — client-side, instant, no new API calls */}
            {!isLoading && hasAny && (
              <SearchFilterBar
                active={activeFilter}
                counts={filterCounts}
                lm={lm}
                onChange={setActiveFilter}
              />
            )}

            {/* Sort controls — client-side, no refetch */}
            {!isLoading && hasAny && (
              <SortBar
                sort={sortOrder}
                onChange={setSortOrder}
                hasCitations={hasAnyCitations}
                lm={lm}
              />
            )}

            {/* Loading skeleton */}
            {isLoading && <SectionsLoadingSkeleton lm={lm} />}

            {/* Error */}
            {status === 'error' && (
              <div className={`flex flex-col items-center gap-3 py-14 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.05] border-white/[0.10]'}`}><Search size={18} strokeWidth={1.5} className={lm ? 'text-gray-400' : 'text-white/40'} /></div>
                <p className={`text-[11px] uppercase tracking-[0.22em]`}>No results found</p>
                <p className={`text-[12px]`}>Try a different search term</p>
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
                {/* Knowledge panels — All mode only */}
                {activeFilter === 'all' && (
                  <>
                    {sections.aiSummary?.text && <AISummaryCard text={sections.aiSummary.text} lm={lm} />}
                    <InlineRelatedTopics topics={sections.relatedTopics} onSearch={onRelatedTopicSearch} lm={lm} />
                    <SuggestedSearches query={sections.query} relatedTopics={sections.relatedTopics} onSearch={onRelatedTopicSearch} lm={lm} />
                    <LatestResearch research={ss.research ?? []} lm={lm} />
                    <TrendingResearch research={ss.research ?? []} lm={lm} />
                    <FeaturedNASA nasa={ss.nasa ?? []} lm={lm} />
                    <PopularPapers research={ss.research ?? []} books={ss.books ?? []} lm={lm} />
                    <DiscoveryPanel
                      query={sections.query}
                      sections={ss}
                      onSearch={onRelatedTopicSearch}
                      lm={lm}
                    />
                  </>
                )}

                {/* AI Summary — standalone filter mode */}
                {activeFilter === 'aiSummary' && (
                  sections.aiSummary?.text
                    ? <AISummaryCard text={sections.aiSummary.text} lm={lm} />
                    : <FilterEmptyState label="AI Summary" lm={lm} />
                )}

                {/* Videos — all / videos / shorts / longVideos */}
                {(activeFilter === 'all' || activeFilter === 'videos' || activeFilter === 'shorts' || activeFilter === 'longVideos') && (
                  videosToShow.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader
                        icon={Film}
                        label={activeFilter === 'shorts' ? 'YouTube Shorts' : activeFilter === 'longVideos' ? 'Long Videos' : 'Cosmic Cinema'}
                        sub={activeFilter === 'shorts' ? 'Short-form videos' : activeFilter === 'longVideos' ? 'Long-form YouTube videos' : 'YouTube Videos'}
                        count={videosToShow.length}
                        lm={lm}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                        {videosToShow.map((v, i) => (
                          <VideoCard key={v.videoId} video={v} idx={i} lm={lm} isShort={isShortVideo(v)} onClick={() => onVideoClick?.(v)} />
                        ))}
                      </div>
                    </motion.div>
                  ) : (activeFilter === 'shorts' || activeFilter === 'longVideos') ? (
                    <FilterEmptyState label={activeFilter === 'shorts' ? 'Shorts' : 'Long Videos'} lm={lm} />
                  ) : null
                )}

                {/* 3. Wikipedia */}
                {(activeFilter === 'all' || activeFilter === 'wikipedia') && (
                  sections.wikipedia.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader icon={BookOpen} label="Wikipedia" sub="Encyclopedia Articles" count={sections.wikipedia.length} lm={lm} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                        {ss.wikipedia.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} query={sections.query} onOpen={() => setSelectedSectionItem(item)} savedIdSet={savedIdSet} onToggleSave={toggleSave} />)}
                      </div>
                    </motion.div>
                  ) : activeFilter === 'wikipedia' ? (
                    <FilterEmptyState label="Wikipedia articles" hint="This topic may be too niche for an encyclopedic entry — try a broader term." lm={lm} />
                  ) : null
                )}

                {/* 4. Research Papers */}
                {(activeFilter === 'all' || activeFilter === 'research') && (
                  sections.research.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader icon={FileText} label="Research Papers" sub="arXiv · OpenAlex · Semantic Scholar · INSPIRE-HEP" count={sections.research.length} lm={lm} />
                      <div className="flex flex-col gap-3">
                        {ss.research.map((item, i) => <ResearchRowCard key={item.id} item={item} idx={i} lm={lm} query={sections.query} onOpen={() => setSelectedSectionItem(item)} savedIdSet={savedIdSet} onToggleSave={toggleSave} />)}
                      </div>
                    </motion.div>
                  ) : activeFilter === 'research' ? (
                    <FilterEmptyState label="research papers" hint="No papers indexed for this query yet — try alternate keywords or a related concept." lm={lm} />
                  ) : null
                )}

                {/* 5. NASA */}
                {(activeFilter === 'all' || activeFilter === 'nasa') && (
                  sections.nasa.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.12, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader icon={Globe} label="NASA Images" sub="Image & Video Library" count={sections.nasa.length} lm={lm} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                        {ss.nasa.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} query={sections.query} onOpen={() => setSelectedSectionItem(item)} savedIdSet={savedIdSet} onToggleSave={toggleSave} />)}
                      </div>
                    </motion.div>
                  ) : activeFilter === 'nasa' ? (
                    <FilterEmptyState label="NASA imagery" hint="The NASA Image & Video Library doesn't have a match for this specific query." lm={lm} />
                  ) : null
                )}

                {/* 6. ESA */}
                {(activeFilter === 'all' || activeFilter === 'esa') && (
                  sections.esa.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.16, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader icon={Satellite} label="ESA Hubble" sub="European Space Agency" count={sections.esa.length} lm={lm} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                        {ss.esa.map((item, i) => <SectionItemCard key={item.id} item={item} idx={i} lm={lm} query={sections.query} onOpen={() => setSelectedSectionItem(item)} savedIdSet={savedIdSet} onToggleSave={toggleSave} />)}
                      </div>
                    </motion.div>
                  ) : activeFilter === 'esa' ? (
                    <FilterEmptyState label="ESA Hubble content" hint="ESA's Hubble image library may not have imagery for this particular subject." lm={lm} />
                  ) : null
                )}

                {/* 7. Books */}
                {(activeFilter === 'all' || activeFilter === 'books') && (
                  sections.books.length > 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="mb-8">
                      <SectionHeader icon={Library} label="Books" sub="OpenAlex Academic Books" count={sections.books.length} lm={lm} />
                      <div className="flex flex-col gap-3">
                        {ss.books.map((item, i) => <ResearchRowCard key={item.id} item={item} idx={i} lm={lm} query={sections.query} onOpen={() => setSelectedSectionItem(item)} savedIdSet={savedIdSet} onToggleSave={toggleSave} />)}
                      </div>
                    </motion.div>
                  ) : activeFilter === 'books' ? (
                    <FilterEmptyState label="books" hint="No academic books indexed for this query — the topic may be covered in journals instead." lm={lm} />
                  ) : null
                )}

                {/* 8. Related Topics — All mode only */}
                {activeFilter === 'all' && <RelatedTopics topics={sections.relatedTopics} onSearch={onRelatedTopicSearch} lm={lm} />}

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

        {/* Reading List drawer */}
        <SavedPapersDrawer
          open={showSavedDrawer}
          saved={saved}
          onClose={() => setShowSavedDrawer(false)}
          onRemove={remove}
          onClear={clearAll}
          lm={lm}
        />

        {/* Feature #11: Back to top — floating button after 2× viewport scroll */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              key="back-to-top"
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={scrollToTop}
              aria-label="Back to top"
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full border shadow-lg transition-colors duration-200 ${
                lm
                  ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-900 hover:border-gray-900 hover:text-white shadow-black/10'
                  : 'bg-[#0d0d1e]/90 border-white/[0.14] text-white/65 hover:border-white/[0.28] hover:text-white backdrop-blur-md shadow-black/30'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 10V2M6 2L2 6M6 2l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Top</span>
            </motion.button>
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.05] border-white/[0.10]'}`}><Search size={18} strokeWidth={1.5} className={lm ? 'text-gray-400' : 'text-white/40'} /></div>
            <p className="text-[11px] uppercase tracking-[0.22em]">No results found</p>
            <p className="text-[12px]">Try a different search term</p>
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

export default memo(NasaSearch);
