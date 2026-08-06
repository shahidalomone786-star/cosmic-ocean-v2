import { useState, useEffect, useRef, useCallback, memo, lazy, Suspense } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Globe, Orbit, Telescope, Sparkles, Satellite, BookOpen, Layers3, Sun, Moon, ChevronDown, Search, Atom, Waves, Star, Activity, Brain, Compass, Cpu, Dices, Droplets, Flame, FlaskConical, Gamepad2, Gauge, Ghost, Leaf, Magnet, Microscope, Network, Puzzle, Radio, Rocket, RotateCw, Scale, Settings2, Sigma, Target, Thermometer, Timer, Wind, Zap } from 'lucide-react';
import { useLocation } from 'wouter';
// NasaSearch has runtime named exports used throughout — keep as static import
import NasaSearch, { DetailModal, SourceBadge, type UnifiedItem, type WikiItem, type NasaItem, type ArxivItem, type SpaceXItem, type CernItem, type NasaStatus, type SearchSections } from './components/NasaSearch';
import LibraryView, { type LibrarySharedContext } from './components/LibraryView';
import WarpIntro from './components/WarpIntro';
import SingularityChat from './components/SingularityChat';
// Heavy modals — code-split so they don't bloat the initial bundle
const GrandmasterChessModal = lazy(() => import('./components/GrandmasterChess'));
const CosmicCarromModal     = lazy(() => import('./components/CosmicCarrom'));
const Cosmic3DViewerModal   = lazy(() => import('./components/Cosmic3DViewerModal'));
const CosmicNexus           = lazy(() => import('./components/CosmicNexus'));
const BiologyHub            = lazy(() => import('./components/biology-hub/BiologyHub'));
import type { MasterpieceItem } from './components/Cosmic3DViewerModal';
import VideoPlayerModal, { type VideoItem } from './components/VideoPlayerModal';
import LoginScreen from './components/LoginScreen';
import ProfileModal from './components/ProfileModal';
import SimulationSearch from './components/SimulationSearch';
import BannerCarousel from './components/BannerCarousel';
import BioHeroCard from './components/biology-hub/BioHeroCard';
import SingularityLaunchButton from './components/SingularityLaunchButton';
import { useAuthStore, PRESET_AVATARS, type UserProfile } from './store/authStore';
import { TtsPlaybackQueue } from './lib/edgeTts';
import { toast } from './hooks/use-toast';

// ─── 6 Cosmic Scenes ──────────────────────────────────────────────────────────
const cosmicScenes = [
  "https://sketchfab.com/models/e410da98b1e5445eae2acafaaa53587d/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/a64ff34315e74697b90dfb107109fc64/embed?autostart=1&preload=1",
  "https://sketchfab.com/models/c09a1970148c43ad99db134a9d6d00b5/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/81be051e683646d3922b2f6e71eafa11/embed?autostart=1&ui_infos=0",
  "https://sketchfab.com/models/25b3f6f993de4f978de290b6e755ba87/embed?autostart=1&preload=1&ui_infos=0",
];

// ─── Constants ────────────────────────────────────────────────────────────────
const TAGS        = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics', 'Everything'];

const TYPEWRITER_PHRASES = [
  'Search the cosmos…',
  'Search Quantum Mechanics…',
  'Search Black Holes…',
  'Search Neutron Stars…',
  'Search Dark Matter…',
  'Search Exoplanets…',
  'Search the Multiverse…',
  'Search String Theory…',
];

// Map each TAGS entry to its Lucide icon component
const TAG_ICON_MAP: Record<string, React.FC<{ size?: number; strokeWidth?: number; className?: string }>> = {
  'Quantum Mechanics':  Atom,
  'General Relativity': Orbit,
  'String Theory':      Waves,
  'Astrophysics':       Star,
  'Everything':         Sparkles,
};

const EVERYTHING_TERMS = [
  'nebula', 'galaxy', 'cosmos', 'supernova', 'aurora', 'jupiter', 'saturn',
  'milky way', 'black hole', 'star cluster', 'deep space', 'universe',
  'exoplanet', 'quasar', 'pulsar', 'comet', 'solar flare', 'hubble',
];

function interleave(a: UnifiedItem[], b: UnifiedItem[]): UnifiedItem[] {
  const out: UnifiedItem[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

function interleaveAll(...arrays: UnifiedItem[][]): UnifiedItem[] {
  const out: UnifiedItem[] = [];
  const max = Math.max(...arrays.map(a => a.length), 0);
  for (let i = 0; i < max; i++) {
    for (const arr of arrays) {
      if (i < arr.length) out.push(arr[i]);
    }
  }
  return out;
}

const PORTAL_TABS = ['All','Black Holes','Galaxies','String Theory','Avatars','Equations',
                     'Nebulae','Dark Matter','Wormholes','Supernovae','Cosmology','Quantum Field'];

// ─── PhET Interactive Simulations ────────────────────────────────────────────
// iframeUrl → https://phet.colorado.edu/sims/html/{slug}/latest/{slug}_en.html
// thumbnails → fetched live from Wikipedia pageimages API (origin=* → no CORS)
//              wikiQuery overrides the title when the sim name is too generic
type SimItem = {
  slug: string;
  title: string;
  subject: string;
  wikiQuery: string; // Wikipedia article title to query for the thumbnail
};

const PHET_SIMULATIONS: SimItem[] = [
  { slug: 'wave-on-a-string',            title: 'Wave on a String',         subject: 'Waves',          wikiQuery: 'Wave' },
  { slug: 'pendulum-lab',                title: 'Pendulum Lab',             subject: 'Motion',         wikiQuery: 'Pendulum' },
  { slug: 'projectile-motion',           title: 'Projectile Motion',        subject: 'Motion',         wikiQuery: 'Projectile motion' },
  { slug: 'forces-and-motion-basics',    title: 'Forces and Motion',        subject: 'Forces',         wikiQuery: "Newton's laws of motion" },
  { slug: 'gravity-and-orbits',          title: 'Gravity & Orbits',         subject: 'Gravity',        wikiQuery: 'Gravity' },
  { slug: 'my-solar-system',             title: 'My Solar System',          subject: 'Gravity',        wikiQuery: 'Solar System' },
  { slug: 'charges-and-fields',          title: 'Charges and Fields',       subject: 'Electricity',    wikiQuery: 'Electric field' },
  { slug: 'john-travoltage',             title: 'John Travoltage',          subject: 'Electricity',    wikiQuery: 'Static electricity' },
  { slug: 'faradays-law',                title: "Faraday's Law",            subject: 'Magnetism',      wikiQuery: "Faraday's law of induction" },
  { slug: 'ohms-law',                    title: "Ohm's Law",                subject: 'Electricity',    wikiQuery: "Ohm's law" },
  { slug: 'circuit-construction-kit-dc', title: 'Circuit Construction Kit', subject: 'Electricity',    wikiQuery: 'Electrical circuit' },
  { slug: 'capacitor-lab-basics',        title: 'Capacitor Lab',            subject: 'Electricity',    wikiQuery: 'Capacitor' },
  { slug: 'bending-light',               title: 'Bending Light',            subject: 'Optics',         wikiQuery: 'Refraction' },
  { slug: 'color-vision',                title: 'Color Vision',             subject: 'Optics',         wikiQuery: 'Color' },
  { slug: 'wave-interference',           title: 'Wave Interference',        subject: 'Waves',          wikiQuery: 'Wave interference' },
  { slug: 'fourier-making-waves',        title: 'Fourier: Making Waves',    subject: 'Waves',          wikiQuery: 'Fourier transform' },
  { slug: 'density',                     title: 'Density',                  subject: 'Matter',         wikiQuery: 'Density' },
  { slug: 'buoyancy',                    title: 'Buoyancy',                 subject: 'Fluids',         wikiQuery: 'Buoyancy' },
  { slug: 'balancing-act',               title: 'Balancing Act',            subject: 'Forces',         wikiQuery: 'Lever' },
  { slug: 'collision-lab',               title: 'Collision Lab',            subject: 'Motion',         wikiQuery: 'Elastic collision' },
  { slug: 'energy-forms-and-changes',    title: 'Energy Forms & Changes',   subject: 'Energy',         wikiQuery: 'Conservation of energy' },
  { slug: 'states-of-matter',            title: 'States of Matter',         subject: 'Thermodynamics', wikiQuery: 'State of matter' },
  { slug: 'gas-properties',              title: 'Gas Properties',           subject: 'Thermodynamics', wikiQuery: 'Ideal gas' },
  { slug: 'rutherford-scattering',       title: 'Rutherford Scattering',    subject: 'Nuclear',        wikiQuery: 'Rutherford scattering' },
  { slug: 'models-of-the-hydrogen-atom', title: 'Hydrogen Atom Models',     subject: 'Atomic',         wikiQuery: 'Hydrogen atom' },
  { slug: 'build-an-atom',               title: 'Build an Atom',            subject: 'Atomic',         wikiQuery: 'Atom' },
  { slug: 'build-a-molecule',            title: 'Build a Molecule',         subject: 'Chemistry',      wikiQuery: 'Molecule' },
  { slug: 'molecule-shapes',             title: 'Molecule Shapes',          subject: 'Chemistry',      wikiQuery: 'Molecular geometry' },
  { slug: 'natural-selection',           title: 'Natural Selection',        subject: 'Biology',        wikiQuery: 'Natural selection' },
  { slug: 'neuron',                      title: 'Neuron',                   subject: 'Biology',        wikiQuery: 'Neuron' },
  { slug: 'gene-expression-essentials',  title: 'Gene Expression',          subject: 'Biology',        wikiQuery: 'Gene expression' },
  { slug: 'greenhouse-effect',           title: 'Greenhouse Effect',        subject: 'Earth Science',  wikiQuery: 'Greenhouse effect' },
  { slug: 'gravity-force-lab',            title: 'Gravity Force Lab',        subject: 'Gravity',        wikiQuery: 'Gravity' },
  { slug: 'friction',                    title: 'Friction',                 subject: 'Forces',         wikiQuery: 'Friction' },
  { slug: 'vector-addition',             title: 'Vector Addition',          subject: 'Math/Physics',   wikiQuery: 'Euclidean vector' },
];

// ─── Wikipedia thumbnail cache + hook ────────────────────────────────────────
// Module-level cache: wikiQuery → resolved image URL (or '' if none found)
const wikiThumbCache = new Map<string, string>();

function useWikiThumbnail(wikiQuery: string): string {
  const [url, setUrl] = useState<string>(() => wikiThumbCache.get(wikiQuery) ?? '');

  useEffect(() => {
    // Already resolved (hit or confirmed miss) — nothing to do
    if (wikiThumbCache.has(wikiQuery)) {
      setUrl(wikiThumbCache.get(wikiQuery)!);
      return;
    }
    let cancelled = false;
    const apiUrl =
      `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages` +
      `&titles=${encodeURIComponent(wikiQuery)}&pithumbsize=400&format=json&origin=*`;
    fetch(apiUrl)
      .then(r => r.json())
      .then((data: { query?: { pages?: Record<string, { thumbnail?: { source: string } }> } }) => {
        if (cancelled) return;
        const pages = data?.query?.pages ?? {};
        let thumb = '';
        for (const page of Object.values(pages)) {
          if (page?.thumbnail?.source) { thumb = page.thumbnail.source; break; }
        }
        wikiThumbCache.set(wikiQuery, thumb);
        setUrl(thumb);
      })
      .catch(() => {
        if (!cancelled) { wikiThumbCache.set(wikiQuery, ''); setUrl(''); }
      });
    return () => { cancelled = true; };
  }, [wikiQuery]);

  return url;
}

function phetIframeUrl(slug: string) {
  return `https://phet.colorado.edu/sims/html/${slug}/latest/${slug}_en.html`;
}

// Languages + their Google Translate codes
const LANGUAGES: { label: string; gtCode: string }[] = [
  { label: 'English',    gtCode: 'en' },
  { label: 'Hindi',      gtCode: 'hi' },
  { label: 'Japanese',   gtCode: 'ja' },
  { label: 'Spanish',    gtCode: 'es' },
  { label: 'French',     gtCode: 'fr' },
  { label: 'German',     gtCode: 'de' },
  { label: 'Arabic',     gtCode: 'ar' },
  { label: 'Portuguese', gtCode: 'pt' },
  { label: 'Korean',     gtCode: 'ko' },
  { label: 'Chinese',    gtCode: 'zh-CN' },
];

// ─── Avatar data ──────────────────────────────────────────────────────────────
const AVATARS = [
  { name: 'Albert Einstein', role: 'Theoretical Physicist',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg' },
  { name: 'Richard Feynman', role: 'Quantum Pioneer',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg' },
  { name: 'Carl Sagan',      role: 'Cosmos Explorer',      image: '/carl-sagan.jpg' },
  { name: 'Nikola Tesla',    role: 'Electrical Visionary',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg' },
  { name: 'Mahera Jannat',   role: 'Ultimate Supporter & Guide', image: '/mehera.jpg' },
] as const;

function randomIndexExcluding(current: number, length: number): number {
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

// ─── Per-avatar opening greeting ─────────────────────────────────────────────
function getInitialGreeting(name: string): string {
  if (name === 'Mahera Jannat') {
    return "Hello! Main Mahera Jannat hoon. Aaj main aapki kaise madad kar sakti hoon? 💛";
  }
  return `Greetings! I am ${name}. What mysteries of the universe shall we explore today?`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatTarget    = { name: string; role: string; image: string };
type Message       = { role: 'user' | 'model'; text: string };
type SharedContext = { title: string; description: string; source: 'nasa' | 'wiki' | 'arxiv' | 'spacex' | 'cern' };

// ─── Google Translate helpers ─────────────────────────────────────────────────
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (opts: object, id: string) => void;
      };
    };
  }
}

function injectGoogleTranslate() {
  if (document.getElementById('gt-script')) return; // already injected
  const el = document.createElement('div');
  el.id = 'google_translate_element';
  el.style.display = 'none';
  document.body.appendChild(el);

  window.googleTranslateElementInit = () => {
    if (window.google?.translate?.TranslateElement) {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
    }
  };

  const script = document.createElement('script');
  script.id  = 'gt-script';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.head.appendChild(script);
}

function deleteGTranslateCookie() {
  const past = 'expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = `googtrans=; ${past}; path=/;`;
  document.cookie = `googtrans=; ${past}; domain=${location.hostname}; path=/;`;
  // Also clear sub-domain variant (e.g. www.)
  document.cookie = `googtrans=; ${past}; domain=.${location.hostname}; path=/;`;
}

function applyGTranslate(targetCode: string) {
  if (targetCode === 'en') {
    // Read the cookie state BEFORE touching anything
    const wasTranslated = document.cookie
      .split(';')
      .some(c => {
        const v = c.trim();
        return v.startsWith('googtrans=') && !v.includes('/en/en') && v !== 'googtrans=';
      });

    // Nuke the cookie unconditionally so GT doesn't re-apply on reload
    deleteGTranslateCookie();

    if (wasTranslated) {
      // Hard reload — the deleted cookie means GT will serve English
      window.location.reload();
    }
    return;
  }

  // ── Non-English: set cookie then fire the GT combo-select ──────────────────
  const cookieVal = `/en/${targetCode}`;
  document.cookie = `googtrans=${cookieVal}; path=/;`;
  document.cookie = `googtrans=${cookieVal}; domain=${location.hostname}; path=/;`;

  // Primary: trigger the hidden GT select element (no reload needed)
  const sel = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (sel) {
    sel.value = targetCode;
    sel.dispatchEvent(new Event('change'));
    return;
  }

  // Fallback: cookie is set — reload and GT will pick it up automatically
  setTimeout(() => window.location.reload(), 80);
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────
// ─── TTS Controls ────────────────────────────────────────────────────────────
function TtsControls({
  idx, playingIdx, isPlaying, playbackMode,
  onPlay, onSkip,
}: {
  idx: number;
  playingIdx: number | null;
  isPlaying: boolean;
  playbackMode: 'edge';
  onPlay: () => void;
  onSkip: (delta: number) => void;
}) {
  const isActive = playingIdx === idx;
  const showSkip = isActive;
  return (
    <div className="ml-10 flex items-center gap-1.5 pt-1 opacity-70">
      {/* Rewind 5s — Edge audio only */}
      {showSkip && (
        <button onClick={() => onSkip(-5)} title="Back 5s"
          className="w-[18px] h-[18px] flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/45 hover:text-white/75 hover:bg-white/[0.09] transition-all duration-150 text-[8px]">
          ⏪
        </button>
      )}
      {/* Play / Pause */}
      <button onClick={onPlay}
        className="w-6 h-6 flex items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.07] text-white/65 hover:text-white hover:bg-white/[0.14] hover:border-white/[0.25] transition-all duration-150">
        {isActive && isPlaying
          ? <span className="text-[10px]">⏸</span>
          : <span className="text-[9px] pl-px">▶</span>}
      </button>
      {/* Fast-forward 5s — Edge audio only */}
      {showSkip && (
        <button onClick={() => onSkip(5)} title="Forward 5s"
          className="w-[18px] h-[18px] flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/45 hover:text-white/75 hover:bg-white/[0.09] transition-all duration-150 text-[8px]">
          ⏩
        </button>
      )}
    </div>
  );
}

// ─── Usage Dashboard Modal ────────────────────────────────────────────────────
function UsageDashboard({ tokens, voiceChars, playbackMode, onClose }: {
  tokens: number;
  voiceChars: number;
  playbackMode: 'edge';
  onClose: () => void;
}) {
  const TOKEN_CAP = 30_000; // tokens ≈ 30 min

  const tokenMinsUsed = (tokens / 1000).toFixed(1);
  const tokenMinsLeft = Math.max(0, (TOKEN_CAP - tokens) / 1000).toFixed(1);
  const tokenPct      = Math.min(100, (tokens / TOKEN_CAP) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-[10] flex items-center justify-center p-6 bg-black/55 backdrop-blur-[18px] rounded-[2rem]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.91, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.91, y: 14 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[280px] rounded-[1.6rem] border border-white/[0.10] bg-[rgba(5,5,9,0.96)] backdrop-blur-[32px] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.95)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-[15px]">📊</span>
            <h3 className="text-white text-[13px] font-semibold tracking-tight">Usage</h3>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/40 hover:text-white text-[16px] leading-none transition-colors duration-150">
            ×
          </button>
        </div>

        {/* ── Voice section ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${playbackMode === 'edge' ? 'bg-violet-400' : 'bg-white/30'}`} />
              <span className="text-white/70 text-[11.5px] font-medium">Voice · Edge Neural</span>
            </div>
            <span className="text-[8.5px] px-2 py-0.5 rounded-full border uppercase tracking-[0.12em] bg-violet-500/15 border-violet-400/20 text-violet-300/90">
              Neural
            </span>
          </div>
          <div className="flex justify-between text-[10.5px] text-white/35 mb-1.5">
            <span>{voiceChars.toLocaleString()} chars synthesized</span>
            <span>Edge Neural</span>
          </div>
        </div>

        {/* ── AI Token section ── */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
            <span className="text-white/70 text-[11.5px] font-medium">AI Chat · Groq</span>
          </div>
          <div className="flex justify-between text-[10.5px] text-white/35 mb-1.5">
            <span>{tokenMinsUsed} min used</span>
            <span>{tokenMinsLeft} min left</span>
          </div>
          <div className="w-full h-[5px] rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${tokenPct}%` }}
              transition={{ duration: 0.85, ease: 'easeOut', delay: 0.1 }}
              className="h-full rounded-full bg-sky-400"
            />
          </div>
          <div className="flex justify-between text-[9.5px] text-white/20 mt-1">
            <span>~{tokens.toLocaleString()} tokens</span>
            <span>≈{TOKEN_CAP / 1000} min cap</span>
          </div>
        </div>

        <p className="text-white/18 text-[8.5px] text-center mt-5 tracking-widest uppercase">
          Session stats · resets on page reload
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Typewriter Text ──────────────────────────────────────────────────────────
function TypewriterText({ text, isTyping, onDone }: { text: string; isTyping: boolean; onDone?: () => void }) {
  const [revealed, setRevealed] = useState(isTyping ? 0 : text.length);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!isTyping) { setRevealed(text.length); return; }
    setRevealed(0);
    let count = 0;
    const id = setInterval(() => {
      count += 4; // reveal 4 chars per tick
      if (count >= text.length) {
        setRevealed(text.length);
        clearInterval(id);
        onDoneRef.current?.();
      } else {
        setRevealed(count);
      }
    }, 18);
    return () => clearInterval(id);
  }, [text, isTyping]);

  const display = text.slice(0, revealed);
  const showCursor = isTyping && revealed < text.length;
  return (
    <p className="text-white/90 text-[14.5px] leading-[1.75] tracking-[0.01em]">
      {display}
      {showCursor && (
        <span className="inline-block w-[2px] h-[1.1em] ml-[2px] align-[-0.1em] bg-white/60 animate-pulse" />
      )}
    </p>
  );
}

function ChatModal({ avatar, language, sharedContext, onClose, onInputFocus, onInputBlur }: {
  avatar: ChatTarget;
  language: string;
  sharedContext?: SharedContext;
  onClose: () => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (sharedContext) {
      return []; // will be populated by auto-analyse
    }
    return [{ role: 'model', text: getInitialGreeting(avatar.name) }];
  });
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const callingRef  = useRef(false);
  const lastSentRef = useRef(0);
  const autoAnalysedRef = useRef(false);

  // ── TTS state ──────────────────────────────────────────────────────────────
  const ttsQueueRef   = useRef<TtsPlaybackQueue | null>(null);
  const [playingIdx,   setPlayingIdx]   = useState<number | null>(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [playbackMode] = useState<'edge'>('edge');

  // ── Usage / typewriter state ────────────────────────────────────────────────
  const [sessionTokens,   setSessionTokens]   = useState(0);
  const [sessionVoiceChars, setSessionVoiceChars] = useState(0);
  // Set of message indices currently in typewriter animation
  const [typingSet, setTypingSet] = useState<Set<number>>(() => new Set());
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  useEffect(() => {
    setError('');
  }, [avatar.name]);

  // ── Token / voice tracking helpers ────────────────────────────────────────
  const addTokens = useCallback((userText: string, replyText: string) => {
    const est = Math.ceil((userText.length + replyText.length) / 4);
    setSessionTokens(prev => prev + est);
  }, []);

  const addVoiceChars = useCallback((charCount: number) => {
    setSessionVoiceChars(prev => prev + charCount);
  }, []);

  // ── Typewriter: mark new model message as typing ──────────────────────────
  const startTyping = useCallback((idx: number) => {
    setTypingSet(prev => { const next = new Set(prev); next.add(idx); return next; });
  }, []);

  const doneTyping = useCallback((idx: number) => {
    setTypingSet(prev => { const next = new Set(prev); next.delete(idx); return next; });
  }, []);

  // ── Auto-analyse shared content on mount ──────────────────────────────────
  useEffect(() => {
    if (!sharedContext || autoAnalysedRef.current) return;
    autoAnalysedRef.current = true;
    const analyse = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            history: [],
            avatarName: avatar.name,
            language,
            sharedContext,
          }),
        });
        const data = await res.json() as { reply?: string; error?: string };
        if (!res.ok || data.error) {
          setError(data.error ?? `Server error ${res.status}`);
          setMessages([{ role: 'model', text: getInitialGreeting(avatar.name) }]);
        } else {
          const reply = data.reply!;
          setMessages([{ role: 'model', text: reply }]);
          startTyping(0);
          addTokens('', reply);
        }
      } catch (err: unknown) {
        setError((err as Error)?.message ?? String(err));
        setMessages([{ role: 'model', text: getInitialGreeting(avatar.name) }]);
      } finally {
        setIsLoading(false);
      }
    };
    analyse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (callingRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < 3_000) return;
    callingRef.current  = true;
    lastSentRef.current = now;

    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const history = messages.slice(sharedContext ? 0 : 1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          avatarName: avatar.name,
          language,
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? `Server error ${res.status}`);
      } else {
        const reply = data.reply!;
        setMessages(prev => {
          const newIdx = prev.length; // index of the message we're about to add
          // Start typewriter after state update — schedule micro-task
          setTimeout(() => startTyping(newIdx), 0);
          return [...prev, { role: 'model', text: reply }];
        });
        addTokens(text, reply);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? String(err));
    } finally {
      setIsLoading(false);
      callingRef.current = false;
    }
  };

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    ttsQueueRef.current?.stop();
    ttsQueueRef.current = null;
    setIsPlaying(false);
    setPlayingIdx(null);
  }, []);

  const playTTS = useCallback(async (text: string, idx: number) => {
    if (playingIdx === idx && isPlaying) {
      stopAll();
      return;
    }

    stopAll();
    const queue = new TtsPlaybackQueue();
    ttsQueueRef.current = queue;
    setPlayingIdx(idx);
    setIsPlaying(true);

    try {
      await queue.play(text);
      addVoiceChars(text.length);
      if (ttsQueueRef.current === queue) {
        ttsQueueRef.current = null;
        setIsPlaying(false);
        setPlayingIdx(null);
      }
    } catch (error: unknown) {
      if ((error as Error)?.name !== 'AbortError') {
        toast({
          title: 'Audio unavailable',
          description: error instanceof Error ? error.message : 'Edge TTS could not synthesize this response.',
          variant: 'destructive',
        });
      }
      if (ttsQueueRef.current === queue) {
        ttsQueueRef.current = null;
        setIsPlaying(false);
        setPlayingIdx(null);
      }
    }
  }, [playingIdx, isPlaying, stopAll, addVoiceChars]);

  const skipTime = useCallback((delta: number) => {
    if (playingIdx !== null) ttsQueueRef.current?.seekBy(delta);
  }, [playingIdx]);

  // Cleanup on unmount
  useEffect(() => () => {
    ttsQueueRef.current?.stop();
  }, []);

  return (
    <motion.div
      key="chat-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl flex items-end sm:items-center justify-center px-2 sm:px-4 pb-0 sm:pb-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[95vw] h-[90vh] bg-[rgba(5,5,9,0.92)] backdrop-blur-xl border border-white/[0.09] rounded-t-[2rem] sm:rounded-[2rem] flex flex-col overflow-hidden transform-gpu will-change-transform shadow-[0_-8px_40px_rgba(0,0,0,0.55),0_40px_80px_-16px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Drag handle (mobile) ── */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-[3px] rounded-full bg-white/20" />
        </div>

        {/* ── Usage dashboard trigger ── */}
        <div className="flex justify-end px-4 pt-2 pb-0 flex-shrink-0">
          <button
            onClick={() => setShowDashboard(true)}
            title="Usage Dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/35 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/[0.14] transition-all duration-200"
          >
            <span className="text-[12px]">📊</span>
            <span className="text-[9px] uppercase tracking-[0.14em]">Usage</span>
          </button>
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 sm:px-7 py-3 sm:py-4 border-b border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex items-center gap-4">
            <img src={avatar.image} alt={avatar.name} loading="lazy" decoding="async"
              className="w-11 h-11 rounded-full object-cover border border-white/[0.18] shadow-[0_0_20px_rgba(0,0,0,0.7),0_0_0_2px_rgba(255,255,255,0.04)]" />
            <div>
              <p className="text-white text-[15px] font-semibold tracking-[-0.01em] leading-tight" style={{ fontFamily: 'var(--app-font-heading)' }}>{avatar.name}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] mt-0.5">{avatar.role}</p>
            </div>
          </div>
          {/* Shared context badge */}
          {sharedContext && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-400/20 max-w-[200px]">
              <span className="text-[9px] text-violet-300/80 uppercase tracking-wider flex-shrink-0">Analysing</span>
              <span className="text-[9px] text-white/50 truncate">{sharedContext.title}</span>
            </div>
          )}
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.18] transition-all duration-200 text-xl leading-none">
            ×
          </button>
        </div>

        {/* ── Shared context banner ── */}
        {sharedContext && (
          <div className="flex-shrink-0 px-6 py-3 bg-[rgba(124,58,237,0.08)] border-b border-violet-400/[0.12]">
            <p className="text-violet-300/50 text-[9px] uppercase tracking-[0.2em] mb-0.5">Analysing context</p>
            <p className="text-white/65 text-[12px] tracking-wide leading-snug line-clamp-1">{sharedContext.title}</p>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 scrollbar-hide flex flex-col gap-5">
          {/* Auto-analyse loading state */}
          {isLoading && messages.length === 0 && (
            <div className="flex items-start gap-3">
              <img src={avatar.image} alt={avatar.name} loading="lazy" decoding="async"
                className="w-7 h-7 rounded-full object-cover border border-white/[0.15] flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
              <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-[4px]">
                <ThinkingDots />
              </div>
            </div>
          )}

          {messages.map((msg, idx) =>
            msg.role === 'user' ? (
              <div key={idx} className="flex justify-end">
                <div className="bg-white/[0.13] border border-white/[0.12] backdrop-blur-xl rounded-2xl rounded-tr-[6px] px-5 py-4 max-w-[85%] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-white text-[14.5px] leading-[1.72] tracking-[0.01em]">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-3">
                  <img src={avatar.image} alt={avatar.name} loading="lazy" decoding="async"
                    className="w-8 h-8 rounded-full object-cover border border-white/[0.18] flex-shrink-0 mt-0.5 shadow-[0_0_16px_rgba(0,0,0,0.6)]" />
                  <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-tl-[5px] px-5 py-4 max-w-[85%] shadow-[0_2px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <TypewriterText
                      text={msg.text}
                      isTyping={typingSet.has(idx)}
                      onDone={() => doneTyping(idx)}
                    />
                  </div>
                </div>
                <TtsControls
                  idx={idx}
                  playingIdx={playingIdx}
                  isPlaying={isPlaying}
                  playbackMode={playbackMode}
                  onPlay={() => { void playTTS(msg.text, idx); }}
                  onSkip={skipTime}
                />
              </div>
            )
          )}

          {isLoading && messages.length > 0 && (
            <div className="flex items-start gap-3">
              <img src={avatar.image} alt={avatar.name} loading="lazy" decoding="async"
                className="w-7 h-7 rounded-full object-cover border border-white/[0.15] flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
              <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-[5px]">
                <ThinkingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="mx-auto px-4 py-2 rounded-full bg-red-500/10 border border-red-400/20">
              <p className="text-center text-red-400/90 text-[11.5px] tracking-wide">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Usage Dashboard overlay ── */}
        <AnimatePresence>
          {showDashboard && (
            <UsageDashboard
              tokens={sessionTokens}
              voiceChars={sessionVoiceChars}
              playbackMode={playbackMode}
              onClose={() => setShowDashboard(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Input — with safe-area bottom padding ── */}
        <div className="flex-shrink-0 px-5 sm:px-7 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,12px))] border-t border-white/[0.06] bg-gradient-to-b from-transparent via-white/[0.01] to-white/[0.02]">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); if (error) setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              disabled={isLoading}
              placeholder={isLoading ? 'Thinking…' : `Ask ${avatar.name.split(' ')[0]} anything…`}
              className="flex-1 bg-white/[0.07] border border-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-full px-6 py-3.5 text-white text-[14px] placeholder-white/30 outline-none focus:border-white/[0.26] focus:bg-white/[0.10] focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_3px_rgba(255,255,255,0.04)] disabled:opacity-40 transition-all duration-300 tracking-wide"
            />
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.08 }}
              whileTap={{ scale: isLoading ? 1 : 0.92 }}
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-white/[0.09] border border-white/[0.15] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.18] hover:border-white/[0.28] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
            >
              <span className="text-[17px] leading-none">↑</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Portal Wiki Card ─────────────────────────────────────────────────────────
function PortalWikiCard({ item, onSelect, lm }: { item: WikiItem; onSelect: () => void; lm?: boolean }) {
  const imgSrc  = item.thumbnail?.source;
  const snippet = item.extract?.split('\n').find(l => l.trim()) ?? '';
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`flex-shrink-0 w-52 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-300 ease-out ${
        lm
          ? 'border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)]'
          : 'border border-white/[0.08] bg-white/[0.04] backdrop-blur-[16px] hover:border-white/[0.20] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
      }`}
    >
      {imgSrc ? (
        <div className={`w-full h-28 overflow-hidden ${lm ? 'bg-slate-100' : 'bg-black/20'}`}>
          <img src={imgSrc} alt={item.title} loading="lazy" decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className={`w-full h-28 flex items-center justify-center ${lm ? 'bg-slate-100' : 'bg-gradient-to-br from-amber-900/20 via-black/20 to-transparent'}`}>
          <span className={`text-4xl font-thin select-none ${lm ? 'text-slate-300' : 'text-amber-200/15'}`}>W</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <SourceBadge source="wiki" />
        </div>
        <p className={`text-[12px] font-medium leading-snug tracking-wide truncate mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>{item.title}</p>
        {snippet && (
          <p className={`text-[11px] leading-relaxed line-clamp-2 ${lm ? 'text-slate-500' : 'text-white/40'}`}>{snippet}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── PhET Simulation Card ────────────────────────────────────────────────────
// ─── Premium icon-cover design system (shared by Quantum Lab, Advanced Sandbox, Arcade Zone) ───
type CoverTheme = 'blue' | 'purple' | 'cyan' | 'amber' | 'emerald';
type IconComponent = React.FC<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

const COVER_PALETTE: Record<CoverTheme, { primary: string; glow: string; bgFrom: string; bgTo: string }> = {
  blue:    { primary: '#38bdf8', glow: 'rgba(56,189,248,0.52)',  bgFrom: 'rgba(2,24,54,0.82)',  bgTo: 'rgba(3,10,28,0.92)'  },
  purple:  { primary: '#a855f7', glow: 'rgba(168,85,247,0.52)',  bgFrom: 'rgba(20,5,40,0.82)',  bgTo: 'rgba(10,3,22,0.92)'  },
  cyan:    { primary: '#22d3ee', glow: 'rgba(34,211,238,0.52)',  bgFrom: 'rgba(2,22,30,0.82)',  bgTo: 'rgba(1,12,18,0.92)'  },
  amber:   { primary: '#f59e0b', glow: 'rgba(245,158,11,0.52)',  bgFrom: 'rgba(35,18,2,0.82)',  bgTo: 'rgba(22,10,2,0.92)'  },
  emerald: { primary: '#10b981', glow: 'rgba(16,185,129,0.52)',  bgFrom: 'rgba(2,22,14,0.82)',  bgTo: 'rgba(1,12,8,0.92)'   },
};

/** Lucide icon + colour keyed by PhET slug — every simulation gets a distinct icon */
const SIM_SLUG_COVER: Record<string, { Icon: IconComponent; theme: CoverTheme }> = {
  'wave-on-a-string':            { Icon: Waves,        theme: 'cyan'    },
  'pendulum-lab':                { Icon: Timer,        theme: 'amber'   },
  'projectile-motion':           { Icon: Rocket,       theme: 'blue'    },
  'forces-and-motion-basics':    { Icon: Zap,          theme: 'amber'   },
  'gravity-and-orbits':          { Icon: Orbit,        theme: 'emerald' },
  'my-solar-system':             { Icon: Globe,        theme: 'emerald' },
  'charges-and-fields':          { Icon: Cpu,          theme: 'blue'    },
  'john-travoltage':             { Icon: Magnet,       theme: 'cyan'    },
  'faradays-law':                { Icon: Magnet,       theme: 'purple'  },
  'ohms-law':                    { Icon: Activity,     theme: 'blue'    },
  'circuit-construction-kit-dc': { Icon: Network,      theme: 'blue'    },
  'capacitor-lab-basics':        { Icon: Layers3,      theme: 'cyan'    },
  'bending-light':               { Icon: Sparkles,     theme: 'amber'   },
  'color-vision':                { Icon: Star,         theme: 'amber'   },
  'wave-interference':           { Icon: Radio,        theme: 'purple'  },
  'fourier-making-waves':        { Icon: Sigma,        theme: 'emerald' },
  'density':                     { Icon: Gauge,        theme: 'purple'  },
  'buoyancy':                    { Icon: Droplets,     theme: 'cyan'    },
  'balancing-act':               { Icon: Scale,        theme: 'amber'   },
  'collision-lab':               { Icon: Target,       theme: 'blue'    },
  'energy-forms-and-changes':    { Icon: Flame,        theme: 'amber'   },
  'states-of-matter':            { Icon: Thermometer,  theme: 'purple'  },
  'gas-properties':              { Icon: Wind,         theme: 'cyan'    },
  'rutherford-scattering':       { Icon: Atom,         theme: 'purple'  },
  'models-of-the-hydrogen-atom': { Icon: Atom,         theme: 'blue'    },
  'build-an-atom':               { Icon: Atom,         theme: 'emerald' },
  'build-a-molecule':            { Icon: FlaskConical, theme: 'emerald' },
  'molecule-shapes':             { Icon: Network,      theme: 'purple'  },
  'natural-selection':           { Icon: Leaf,         theme: 'emerald' },
  'neuron':                      { Icon: Activity,     theme: 'purple'  },
  'gene-expression-essentials':  { Icon: Microscope,   theme: 'emerald' },
  'greenhouse-effect':           { Icon: Globe,        theme: 'blue'    },
  'gravity-force-lab':           { Icon: Orbit,        theme: 'blue'    },
  'friction':                    { Icon: Wind,         theme: 'amber'   },
  'vector-addition':             { Icon: Compass,      theme: 'purple'  },
};

/** Lucide icon + colour keyed by Advanced Sandbox id — every simulation gets a distinct icon */
const ADV_SIM_ID_COVER: Record<string, { Icon: IconComponent; theme: CoverTheme }> = {
  'mpl-double-pendulum':  { Icon: RotateCw,     theme: 'purple'  },
  'mpl-pendulum':         { Icon: Timer,        theme: 'amber'   },
  'mpl-driven-pendulum':  { Icon: Flame,        theme: 'amber'   },
  'mpl-clock':            { Icon: Scale,        theme: 'cyan'    },
  'mpl-chaotic-pendulum': { Icon: Waves,        theme: 'purple'  },
  'mpl-dangling-stick':   { Icon: Rocket,       theme: 'blue'    },
  'mpl-single-spring':    { Icon: RotateCw,     theme: 'cyan'    },
  'mpl-double-spring':    { Icon: Network,      theme: 'cyan'    },
  'mpl-spring2d':         { Icon: Waves,        theme: 'cyan'    },
  'mpl-spring-array':     { Icon: Radio,        theme: 'blue'    },
  'mpl-molecule3':        { Icon: Atom,         theme: 'emerald' },
  'mpl-molecule5':        { Icon: Microscope,   theme: 'emerald' },
  'mpl-billiards':        { Icon: Target,       theme: 'blue'    },
  'mpl-collision':        { Icon: Zap,          theme: 'blue'    },
  'mpl-rigid-body':       { Icon: Layers3,      theme: 'amber'   },
  'mpl-newtons-cradle':   { Icon: Activity,     theme: 'cyan'    },
  'mpl-pile-driver':      { Icon: Zap,          theme: 'amber'   },
  'mpl-circular-motion':  { Icon: Orbit,        theme: 'emerald' },
  'mpl-sumo':             { Icon: Wind,         theme: 'amber'   },
  'mpl-spinning':         { Icon: Compass,      theme: 'purple'  },
  'mpl-polygons':         { Icon: Atom,         theme: 'purple'  },
  'mpl-roller-single':    { Icon: Flame,        theme: 'emerald' },
  'mpl-roller-spring':    { Icon: RotateCw,     theme: 'emerald' },
  'mpl-roller-flight':    { Icon: Wind,         theme: 'cyan'    },
  'mpl-wave1':            { Icon: Waves,        theme: 'blue'    },
  'mpl-wave2':            { Icon: Activity,     theme: 'purple'  },
  'mpl-lorenz':           { Icon: Thermometer,  theme: 'amber'   },
  'mpl-dp-chaos':         { Icon: Gauge,        theme: 'amber'   },
  'mpl-harmonic':         { Icon: Thermometer,  theme: 'purple'  },
  'mpl-cart2':            { Icon: Cpu,          theme: 'blue'    },
  'phet-qwi':             { Icon: Waves,        theme: 'emerald' },
  'phet-photo':           { Icon: FlaskConical, theme: 'emerald' },
  'phet-blackbody':       { Icon: Sun,          theme: 'amber'   },
  'phet-rutherford':      { Icon: Atom,         theme: 'cyan'    },
  'phet-hydrogen':        { Icon: Atom,         theme: 'blue'    },
  'phet-skatepark':       { Icon: Flame,        theme: 'blue'    },
  'phet-masses-springs':  { Icon: RotateCw,     theme: 'blue'    },
  'phet-hookes-law':      { Icon: Gauge,        theme: 'purple'  },
  'phet-under-pressure':  { Icon: Droplets,     theme: 'blue'    },
  'phet-acid-base':       { Icon: FlaskConical, theme: 'purple'  },
  'phet-ph-scale':        { Icon: Sigma,        theme: 'blue'    },
  'phet-isotopes':        { Icon: Atom,         theme: 'amber'   },
  'phet-atomic':          { Icon: Microscope,   theme: 'blue'    },
  'phet-reactions':       { Icon: FlaskConical, theme: 'amber'   },
  'phet-circuit-ac':      { Icon: Cpu,          theme: 'purple'  },
  'phet-faraday-lab':     { Icon: Magnet,       theme: 'purple'  },
  'phet-molarity':        { Icon: Droplets,     theme: 'emerald' },
  'phet-beers-law':       { Icon: Sparkles,     theme: 'amber'   },
  'phet-molecules-light': { Icon: Waves,        theme: 'amber'   },
  'phet-resistance':      { Icon: Network,      theme: 'amber'   },
};

/** Lucide icon + colour for each Arcade game id */
const GAME_COVER: Record<string, { Icon: IconComponent; theme: CoverTheme }> = {
  'game-2048':        { Icon: Brain,    theme: 'purple'  },
  'game-tetris':      { Icon: Layers3,  theme: 'cyan'    },
  'game-flappy':      { Icon: Wind,     theme: 'blue'    },
  'game-pacman':      { Icon: Ghost,    theme: 'amber'   },
  'game-breakout':    { Icon: Target,   theme: 'blue'    },
  'game-minesweeper': { Icon: Puzzle,   theme: 'amber'   },
  'game-mahjong':     { Icon: Dices,    theme: 'purple'  },
  'game-sudoku':      { Icon: Brain,    theme: 'emerald' },
  'game-asteroids':   { Icon: Sparkles, theme: 'blue'    },
  'game-hexgl':       { Icon: Zap,      theme: 'amber'   },
};

/**
 * Shared premium cover tile — glassmorphism dark background, hex-grid texture,
 * centred glowing Lucide icon, animated pulsing accent dot.
 * Matches the visual language of Cosmic Masterpieces exactly.
 */
function PremiumCover({
  Icon, theme, uid, index = 0, lm,
}: {
  Icon: IconComponent;
  theme: CoverTheme;
  uid: string;
  index?: number;
  lm?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const p = COVER_PALETTE[theme];

  // Light-mode: same dark header strip as MasterpieceCard uses (premium contrast)
  if (lm) {
    return (
      <div
        className="w-full h-28 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${p.bgFrom}, ${p.bgTo})` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${p.glow.replace('0.52)', '0.16)')}, transparent)` }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`hclm-${uid}`} x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
              <polygon points="15,0.5 29.5,8 29.5,23 15,30.5 0.5,23 0.5,8" fill="none" stroke={p.primary} strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hclm-${uid})`} />
        </svg>
        <Icon size={32} strokeWidth={1.4} style={{ color: p.primary, filter: `drop-shadow(0 0 10px ${p.primary})`, position: 'relative', zIndex: 10 }} />
        <div
          className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{ background: p.primary, boxShadow: `0 0 6px ${p.primary}` }}
        />
      </div>
    );
  }

  // Dark-mode: full glassmorphism + animated glow
  return (
    <div
      className="w-full h-28 flex items-center justify-center relative overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: `linear-gradient(145deg, ${p.bgFrom}, ${p.bgTo})` }}
    >
      {/* Radial glow blob */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 80% 70% at 50% 55%, ${p.glow.replace('0.52)', '0.22)')}, transparent 75%)`,
          opacity: hovered ? 1 : 0.45,
        }}
      />
      {/* Hex grid texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`hc-${uid}`} x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
            <polygon points="15,0.5 29.5,8 29.5,23 15,30.5 0.5,23 0.5,8" fill="none" stroke={p.primary} strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#hc-${uid})`} />
      </svg>
      {/* Icon */}
      <motion.div
        className="relative z-10"
        animate={{ scale: hovered ? 1.15 : 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Icon size={34} strokeWidth={1.4} style={{ color: p.primary, filter: `drop-shadow(0 0 14px ${p.primary})` }} />
      </motion.div>
      {/* Pulsing accent dot */}
      <motion.div
        className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full pointer-events-none"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
        style={{ background: p.primary, boxShadow: `0 0 8px ${p.primary}` }}
      />
    </div>
  );
}

// ─── Quantum Lab Card ─────────────────────────────────────────────────────────
function PortalSimCard({ sim, index = 0, onSelect, lm }: { sim: SimItem; index?: number; onSelect: () => void; lm?: boolean }) {
  const cover = SIM_SLUG_COVER[sim.slug] ?? { Icon: Atom, theme: 'purple' as CoverTheme };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`flex-shrink-0 w-52 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-[transform,box-shadow,border-color] duration-300 ease-out group ${
        lm
          ? 'border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)]'
          : 'border border-white/[0.08] bg-white/[0.04] backdrop-blur-[16px] hover:border-white/[0.20] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Premium icon cover */}
      <PremiumCover Icon={cover.Icon} theme={cover.theme} uid={`sim-${sim.slug}`} index={index} lm={lm} />
      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full border ${
            lm ? 'border-violet-300/60 text-violet-700 bg-violet-50' : 'border-violet-400/30 text-violet-300/80 bg-violet-500/10'
          }`}>
            <FlaskConical size={9} strokeWidth={1.8} />Simulation
          </span>
        </div>
        <p className={`text-[12px] font-medium leading-snug tracking-wide truncate mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>{sim.title}</p>
        <p className={`text-[11px] leading-relaxed truncate ${lm ? 'text-slate-500' : 'text-white/40'}`}>{sim.subject}</p>
      </div>
    </motion.div>
  );
}

// ─── Simulation Full-Screen Modal ─────────────────────────────────────────────
function SimulationModal({ sim, onClose, lm }: { sim: SimItem; onClose: () => void; lm?: boolean }) {
  const iframeUrl = phetIframeUrl(sim.slug);
  return (
    <motion.div
      key="sim-modal"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-2xl flex flex-col overflow-hidden"
    >
      {/* Sticky Header */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${
        lm
          ? 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm'
          : 'border-white/[0.10] bg-[rgba(10,10,18,0.85)] backdrop-blur-xl'
      }`}>
        {/* Back button — large tappable area */}
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[13px] transition-all duration-200 min-w-[80px] ${
            lm
              ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              : 'bg-white/[0.10] text-white border border-white/[0.15] hover:bg-white/[0.18] hover:text-white'
          }`}
        >
          <span className="text-[15px] leading-none">←</span>
          <span>Back</span>
        </motion.button>
        {/* Title area */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            lm ? 'border-violet-300/60 text-violet-700 bg-violet-50' : 'border-violet-400/30 text-violet-300/80 bg-violet-500/10'
          }`}>
            <Atom size={9} strokeWidth={1.8} />PhET
          </span>
          <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white/90'}`}>{sim.title}</span>
        </div>
        {/* Close X */}
        <button
          onClick={onClose}
          className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-[14px] font-medium transition-all duration-200 ${
            lm
              ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              : 'border-white/[0.12] bg-white/[0.08] text-white/60 hover:bg-white/[0.15] hover:text-white'
          }`}
        >
          ✕
        </button>
      </div>
      {/* Iframe */}
      <div className="flex-1 relative">
        <iframe
          src={iframeUrl}
          title={sim.title}
          allowFullScreen
          allow="fullscreen"
          className="absolute inset-0 w-full h-full border-0"
          style={{ touchAction: 'manipulation' }}
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}

// ─── Advanced Sandbox Data ────────────────────────────────────────────────────
type AdvSimItem = {
  id: string;
  title: string;
  description: string;
  categoryTag: string;
  iframeUrl: string;
  wikiQuery: string;
};

const ADVANCED_SIMS: AdvSimItem[] = [
  // ── MyPhysicsLab ─────────────────────────────────────────────────────────
  { id: 'mpl-double-pendulum',   title: 'Double Pendulum',        description: 'Chaotic motion of two linked pendulums.',        categoryTag: '⚙️ Chaos',        iframeUrl: 'https://www.myphysicslab.com/pendulum/double-pendulum-en.html',        wikiQuery: 'Double pendulum' },
  { id: 'mpl-pendulum',          title: 'Pendulum Lab',           description: 'Classic pendulum with adjustable length and gravity.',categoryTag: '⚙️ Mechanics',   iframeUrl: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html',                       wikiQuery: 'Pendulum' },
  { id: 'mpl-driven-pendulum',   title: 'Energy Forms & Changes', description: 'Conversion between kinetic, potential and thermal energy.',categoryTag: '⚙️ Energy',      iframeUrl: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html',wikiQuery: 'Conservation of energy' },
  { id: 'mpl-clock',             title: 'Balancing Act',          description: 'Torque and lever balance with adjustable masses.', categoryTag: '⚙️ Mechanics',   iframeUrl: 'https://phet.colorado.edu/sims/html/balancing-act/latest/balancing-act_en.html',                     wikiQuery: 'Lever' },
  { id: 'mpl-chaotic-pendulum',  title: 'Chaotic Pendulum',       description: 'Sensitivity to initial conditions visualised.',  categoryTag: '⚙️ Chaos',        iframeUrl: 'https://www.myphysicslab.com/pendulum/chaotic-pendulum-en.html',     wikiQuery: 'Chaos theory' },
  { id: 'mpl-dangling-stick',    title: 'Projectile Motion',      description: 'Launch angle, speed and air resistance controls.', categoryTag: '⚙️ Kinematics',  iframeUrl: 'https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html',              wikiQuery: 'Projectile motion' },
  { id: 'mpl-single-spring',     title: 'Spring Oscillator',      description: 'Mass on a spring with damping controls.',        categoryTag: '⚙️ Vibration',    iframeUrl: 'https://www.myphysicslab.com/springs/single-spring-en.html',         wikiQuery: 'Harmonic oscillator' },
  { id: 'mpl-double-spring',     title: 'Double Spring',          description: 'Coupled spring system showing normal modes.',    categoryTag: '⚙️ Vibration',    iframeUrl: 'https://www.myphysicslab.com/springs/double-spring-en.html',         wikiQuery: 'Coupled oscillation' },
  { id: 'mpl-spring2d',          title: 'Wave on a String',       description: 'Transverse wave with adjustable tension and damping.',categoryTag: '⚙️ Waves',       iframeUrl: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html',               wikiQuery: 'Wave' },
  { id: 'mpl-spring-array',      title: 'Wave Interference',      description: 'Constructive and destructive interference patterns.', categoryTag: '⚙️ Waves',       iframeUrl: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html',              wikiQuery: 'Wave interference' },
  { id: 'mpl-molecule3',         title: '3-Atom Lattice',         description: 'Three-body molecular spring simulation.',       categoryTag: '⚙️ Molecular',    iframeUrl: 'https://www.myphysicslab.com/springs/molecule3-en.html',             wikiQuery: 'Molecular dynamics' },
  { id: 'mpl-molecule5',         title: '5-Atom Dynamics',        description: 'Five-atom spring-connected particle system.',   categoryTag: '⚙️ Molecular',    iframeUrl: 'https://www.myphysicslab.com/springs/molecule5-en.html',             wikiQuery: 'Molecular dynamics' },
  { id: 'mpl-billiards',         title: 'Billiard Collisions',    description: 'Elastic collisions on a friction-free table.',  categoryTag: '⚙️ 2D Dynamics',  iframeUrl: 'https://www.myphysicslab.com/engine2D/billiards-en.html',            wikiQuery: 'Elastic collision' },
  { id: 'mpl-collision',         title: '2D Rigid Collision',     description: 'Configurable two-body rigid collision.',        categoryTag: '⚙️ 2D Dynamics',  iframeUrl: 'https://www.myphysicslab.com/engine2D/collision-en.html',            wikiQuery: 'Collision' },
  { id: 'mpl-rigid-body',        title: 'Rigid Body Stack',       description: 'Multi-body stacking with realistic friction.',  categoryTag: '⚙️ Rigid Body',   iframeUrl: 'https://www.myphysicslab.com/engine2D/rigid-body-en.html',           wikiQuery: 'Rigid body' },
  { id: 'mpl-newtons-cradle',    title: "Newton's Cradle",        description: 'Momentum transfer through suspended balls.',    categoryTag: '⚙️ Momentum',     iframeUrl: 'https://www.myphysicslab.com/engine2D/newtons-cradle-en.html',       wikiQuery: "Newton's cradle" },
  { id: 'mpl-pile-driver',       title: 'Collision Lab',          description: 'Elastic and inelastic collisions with momentum graphs.', categoryTag: '⚙️ Momentum',    iframeUrl: 'https://phet.colorado.edu/sims/html/collision-lab/latest/collision-lab_en.html',                     wikiQuery: 'Elastic collision' },
  { id: 'mpl-circular-motion',   title: 'Gravity Force Lab',      description: 'Gravitational attraction between masses in orbit.', categoryTag: '⚙️ Gravity',      iframeUrl: 'https://phet.colorado.edu/sims/html/gravity-force-lab/latest/gravity-force-lab_en.html',              wikiQuery: 'Gravity' },
  { id: 'mpl-sumo',              title: 'Friction',               description: 'Static vs kinetic friction on slopes and surfaces.', categoryTag: '⚙️ Mechanics',   iframeUrl: 'https://phet.colorado.edu/sims/html/friction/latest/friction_en.html',                               wikiQuery: 'Friction' },
  { id: 'mpl-spinning',          title: 'Vector Addition',        description: 'Graphical and component vector addition methods.',  categoryTag: '⚙️ Kinematics',  iframeUrl: 'https://phet.colorado.edu/sims/html/vector-addition/latest/vector-addition_en.html',                 wikiQuery: 'Euclidean vector' },
  { id: 'mpl-polygons',          title: 'Build an Atom',          description: 'Protons, neutrons and electrons forming stable atoms.', categoryTag: '⚙️ Atomic',      iframeUrl: 'https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_en.html',                     wikiQuery: 'Atom' },
  { id: 'mpl-roller-single',     title: 'Roller Coaster',         description: 'Energy conservation on a custom track.',        categoryTag: '⚙️ Energy',       iframeUrl: 'https://www.myphysicslab.com/roller/roller-single-en.html',          wikiQuery: 'Roller coaster physics' },
  { id: 'mpl-roller-spring',     title: 'Spring Roller',          description: 'Roller coaster with spring propulsion.',        categoryTag: '⚙️ Energy',       iframeUrl: 'https://www.myphysicslab.com/roller/roller-spring-en.html',          wikiQuery: 'Elastic potential energy' },
  { id: 'mpl-roller-flight',     title: 'Braking Roller',         description: 'Coaster leaving the track under friction.',     categoryTag: '⚙️ Friction',     iframeUrl: 'https://www.myphysicslab.com/roller/roller-flight-en.html',          wikiQuery: 'Friction' },
  { id: 'mpl-wave1',             title: 'Wave on a String',       description: 'Transverse wave with adjustable tension and damping.',categoryTag: '⚙️ Waves',       iframeUrl: 'https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_en.html',               wikiQuery: 'Transverse wave' },
  { id: 'mpl-wave2',             title: 'Wave Interference',      description: 'Constructive and destructive wave interference patterns.', categoryTag: '⚙️ Waves',       iframeUrl: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html',              wikiQuery: 'Standing wave' },
  { id: 'mpl-lorenz',            title: 'Gas Properties',         description: 'Kinetic theory — pressure, volume and temperature.',categoryTag: '⚙️ Thermodynamics',iframeUrl: 'https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html',                   wikiQuery: 'Ideal gas' },
  { id: 'mpl-dp-chaos',          title: 'Energy Skate Park',      description: 'Conservation of energy on a custom skate track.',   categoryTag: '⚙️ Energy',       iframeUrl: 'https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_en.html',              wikiQuery: 'Mechanical energy' },
  { id: 'mpl-harmonic',          title: 'States of Matter',       description: 'Solid, liquid and gas phase transitions at the atomic scale.',categoryTag: '⚙️ Thermodynamics',iframeUrl: 'https://phet.colorado.edu/sims/html/states-of-matter/latest/states-of-matter_en.html',               wikiQuery: 'State of matter' },
  { id: 'mpl-cart2',             title: 'Circuit Construction DC',description: 'Build and test DC circuits with real components.',  categoryTag: '⚙️ Electricity',  iframeUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html',wikiQuery: 'Electrical circuit' },
  // ── Extra PhET HTML5 ─────────────────────────────────────────────────────
  { id: 'phet-qwi',              title: 'Wave Interference',      description: 'Constructive and destructive interference — light, sound and water.',categoryTag: '⚙️ Quantum',     iframeUrl: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html',              wikiQuery: 'Double-slit experiment' },
  { id: 'phet-photo',            title: 'Build a Molecule',       description: 'Combine atoms to form real molecules and compounds.', categoryTag: '⚙️ Chemistry',   iframeUrl: 'https://phet.colorado.edu/sims/html/build-a-molecule/latest/build-a-molecule_en.html',                wikiQuery: 'Molecule' },
  { id: 'phet-blackbody',        title: 'Blackbody Spectrum',     description: 'Thermal radiation curve vs. temperature.',      categoryTag: '⚙️ Thermodynamics',iframeUrl: 'https://phet.colorado.edu/sims/html/blackbody-spectrum/latest/blackbody-spectrum_all.html',              wikiQuery: 'Blackbody radiation' },
  { id: 'phet-rutherford',       title: 'Rutherford Scattering',  description: 'Alpha particles deflected by a gold nucleus.',  categoryTag: '⚙️ Nuclear',      iframeUrl: 'https://phet.colorado.edu/sims/html/rutherford-scattering/latest/rutherford-scattering_all.html',        wikiQuery: 'Rutherford scattering' },
  { id: 'phet-hydrogen',         title: 'Hydrogen Atom Models',   description: 'Bohr to quantum mechanical atomic models.',     categoryTag: '⚙️ Atomic',       iframeUrl: 'https://phet.colorado.edu/sims/html/models-of-the-hydrogen-atom/latest/models-of-the-hydrogen-atom_all.html', wikiQuery: 'Hydrogen atom' },
  { id: 'phet-skatepark',        title: 'Energy Skate Park',      description: 'Kinetic vs. potential energy on a half-pipe.',  categoryTag: '⚙️ Energy',       iframeUrl: 'https://phet.colorado.edu/sims/html/energy-skate-park-basics/latest/energy-skate-park-basics_all.html',  wikiQuery: 'Mechanical energy' },
  { id: 'phet-masses-springs',   title: 'Masses and Springs',     description: 'Hanging masses on springs with real-time graphs.',categoryTag: '⚙️ Vibration',   iframeUrl: 'https://phet.colorado.edu/sims/html/masses-and-springs/latest/masses-and-springs_all.html',            wikiQuery: 'Spring (device)' },
  { id: 'phet-hookes-law',       title: "Hooke's Law",            description: 'Spring deformation vs. applied force.',         categoryTag: '⚙️ Elasticity',   iframeUrl: 'https://phet.colorado.edu/sims/html/hookes-law/latest/hookes-law_all.html',                            wikiQuery: "Hooke's law" },
  { id: 'phet-under-pressure',   title: 'Under Pressure',         description: 'Fluid pressure at depth in different liquids.',  categoryTag: '⚙️ Fluids',      iframeUrl: 'https://phet.colorado.edu/sims/html/under-pressure/latest/under-pressure_all.html',                    wikiQuery: 'Fluid pressure' },
  { id: 'phet-acid-base',        title: 'Acid-Base Solutions',    description: 'pH, conductivity and molecule concentrations.',  categoryTag: '⚙️ Chemistry',    iframeUrl: 'https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_all.html',          wikiQuery: 'Acid–base reaction' },
  { id: 'phet-ph-scale',         title: 'pH Scale',               description: 'Logarithmic hydrogen ion concentration scale.', categoryTag: '⚙️ Chemistry',    iframeUrl: 'https://phet.colorado.edu/sims/html/ph-scale/latest/ph-scale_all.html',                              wikiQuery: 'PH' },
  { id: 'phet-isotopes',         title: 'Isotopes & Atomic Mass', description: 'Proton/neutron counts and isotope abundance.',  categoryTag: '⚙️ Nuclear',      iframeUrl: 'https://phet.colorado.edu/sims/html/isotopes-and-atomic-mass/latest/isotopes-and-atomic-mass_all.html',  wikiQuery: 'Isotope' },
  { id: 'phet-atomic',           title: 'Atomic Interactions',    description: 'Lennard-Jones potential between two atoms.',    categoryTag: '⚙️ Molecular',    iframeUrl: 'https://phet.colorado.edu/sims/html/atomic-interactions/latest/atomic-interactions_all.html',          wikiQuery: 'Lennard-Jones potential' },
  { id: 'phet-reactions',        title: 'Chemical Reactions',     description: 'Limiting reagents and reaction stoichiometry.', categoryTag: '⚙️ Chemistry',    iframeUrl: 'https://phet.colorado.edu/sims/html/reactants-products-and-leftovers/latest/reactants-products-and-leftovers_all.html', wikiQuery: 'Stoichiometry' },
  { id: 'phet-circuit-ac',       title: 'AC Circuit Kit',         description: 'Build and analyse alternating current circuits.',categoryTag: '⚙️ Electricity',  iframeUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-ac/latest/circuit-construction-kit-ac_all.html',    wikiQuery: 'Alternating current' },
  { id: 'phet-faraday-lab',      title: "Faraday's EM Lab",       description: 'Electromagnetic induction with a bar magnet.',  categoryTag: '⚙️ Magnetism',    iframeUrl: 'https://phet.colorado.edu/sims/html/faradays-electromagnetic-lab/latest/faradays-electromagnetic-lab_all.html', wikiQuery: 'Electromagnetic induction' },
  { id: 'phet-molarity',         title: 'Molarity',               description: 'Moles per litre and solution concentration.',   categoryTag: '⚙️ Chemistry',    iframeUrl: 'https://phet.colorado.edu/sims/html/molarity/latest/molarity_all.html',                              wikiQuery: 'Molar concentration' },
  { id: 'phet-beers-law',        title: "Beer's Law Lab",         description: "Light absorbance and Beer-Lambert law.",        categoryTag: '⚙️ Optics',       iframeUrl: 'https://phet.colorado.edu/sims/html/beers-law-lab/latest/beers-law-lab_all.html',                      wikiQuery: 'Beer–Lambert law' },
  { id: 'phet-molecules-light',  title: 'Molecules and Light',    description: 'How IR/UV photons interact with gas molecules.', categoryTag: '⚙️ Chemistry',   iframeUrl: 'https://phet.colorado.edu/sims/html/molecules-and-light/latest/molecules-and-light_all.html',          wikiQuery: 'Molecular absorption spectroscopy' },
  { id: 'phet-resistance',       title: 'Resistance in a Wire',   description: 'Resistivity, length and cross-section demo.',   categoryTag: '⚙️ Electricity',  iframeUrl: 'https://phet.colorado.edu/sims/html/resistance-in-a-wire/latest/resistance-in-a-wire_all.html',        wikiQuery: 'Electrical resistance' },
];

// ─── Arcade Zone ──────────────────────────────────────────────────────────────
type FunGameItem = {
  id: string;
  title: string;
  description: string;
  categoryTag: string;
  iframeUrl: string;
  wikiQuery: string;
};

const FUN_GAMES: FunGameItem[] = [
  { id: 'game-2048',        title: '2048',          description: 'Slide tiles to combine numbers — reach the 2048 tile!',              categoryTag: '🕹️ GAME', iframeUrl: 'https://gabrielecirulli.github.io/2048/',         wikiQuery: '2048 (video game)' },
  { id: 'game-tetris',      title: 'Tetris',         description: 'Stack falling tetrominoes to clear lines in this timeless classic.',  categoryTag: '🕹️ GAME', iframeUrl: 'https://chvin.github.io/react-tetris/',           wikiQuery: 'Tetris' },
  { id: 'game-flappy',      title: 'Flappy Bird',    description: 'Tap to fly through pipes — how far can you get?',                    categoryTag: '🕹️ GAME', iframeUrl: 'https://flappybird.io/',                          wikiQuery: 'Flappy Bird' },
  { id: 'game-pacman',      title: 'Pac-Man',        description: 'Eat dots, avoid ghosts, and rule the maze.',                         categoryTag: '🕹️ GAME', iframeUrl: 'https://freepacman.org/',                         wikiQuery: 'Pac-Man' },
  { id: 'game-breakout',    title: 'Breakout',       description: 'Bounce the ball to smash all the bricks — Atari classic!',           categoryTag: '🕹️ GAME', iframeUrl: 'https://elgoog.im/breakout/',                     wikiQuery: 'Breakout (video game)' },
  { id: 'game-minesweeper', title: 'Minesweeper',    description: 'Uncover tiles without hitting a mine — pure logic!',                 categoryTag: '🕹️ GAME', iframeUrl: 'https://minesweeper.online/',                     wikiQuery: 'Microsoft Minesweeper' },
  { id: 'game-mahjong',     title: 'Mahjong',        description: 'Match pairs of tiles to clear the ancient board.',                    categoryTag: '🕹️ GAME', iframeUrl: 'https://www.mahjong-game.com/',                   wikiQuery: 'Mahjong' },
  { id: 'game-sudoku',      title: 'Sudoku',         description: 'Fill the 9×9 grid so every row, column and box holds 1–9.',         categoryTag: '🕹️ GAME', iframeUrl: 'https://www.websudoku.com/',                      wikiQuery: 'Sudoku' },
  { id: 'game-asteroids',   title: 'Asteroids',      description: 'Pilot your ship and blast the asteroid field — retro action!',       categoryTag: '🕹️ GAME', iframeUrl: 'https://www.kevs3d.co.uk/dev/asteroids/',         wikiQuery: 'Asteroids (video game)' },
  { id: 'game-hexgl',       title: 'HexGL Racing',   description: 'Futuristic anti-gravity racing at breathtaking speed.',              categoryTag: '🕹️ GAME', iframeUrl: 'https://hexgl.bkcore.com/play/',                  wikiQuery: 'WipEout (video game)' },
];

// ─── Cosmic Masterpieces Data ────────────────────────────────────────────────
const COSMIC_MASTERPIECES: MasterpieceItem[] = [
  {
    id:       'blue-dot',
    title:    'The Blue Dot',
    subtitle: 'Real-time 3D Earth & ISS',
    icon:     '🌍',
    theme:    'blue',
  },
  {
    id:       'solar-system',
    title:    'Solar System',
    subtitle: 'Interactive Orbital Explorer',
    icon:     '☀️',
    theme:    'amber',
  },
  {
    id:       'deep-space',
    title:    'Deep Space Artifacts',
    subtitle: '3D Black Holes & Nebulae',
    icon:     '🕳️',
    theme:    'purple',
  },
  {
    id:       'infinite-galaxy',
    title:    'Infinite Galaxy',
    subtitle: 'Procedural Starfield Engine',
    icon:     '🌌',
    theme:    'cyan',
  },
  {
    id:       'gaia-starmap',
    title:    'The Gaia Star Map',
    subtitle: 'ESA Real Star Positions',
    icon:     '⭐',
    theme:    'emerald',
  },
];

// ─── Masterpiece Card theme palette (card-level) ─────────────────────────────
const MP_CARD_THEME: Record<string, {
  primary: string; glow: string; border: string; borderHover: string;
  bgFrom: string; bgTo: string; tag: string; tagBorder: string; tagText: string;
}> = {
  blue: {
    primary:     '#38bdf8',
    glow:        'rgba(56,189,248,0.55)',
    border:      'rgba(56,189,248,0.22)',
    borderHover: 'rgba(56,189,248,0.65)',
    bgFrom:      'rgba(2,24,54,0.72)',
    bgTo:        'rgba(3,10,28,0.88)',
    tag:         'rgba(56,189,248,0.12)',
    tagBorder:   'rgba(56,189,248,0.35)',
    tagText:     '#38bdf8',
  },
  amber: {
    primary:     '#f59e0b',
    glow:        'rgba(245,158,11,0.55)',
    border:      'rgba(245,158,11,0.22)',
    borderHover: 'rgba(245,158,11,0.65)',
    bgFrom:      'rgba(35,18,2,0.72)',
    bgTo:        'rgba(22,10,2,0.88)',
    tag:         'rgba(245,158,11,0.12)',
    tagBorder:   'rgba(245,158,11,0.35)',
    tagText:     '#f59e0b',
  },
  purple: {
    primary:     '#a855f7',
    glow:        'rgba(168,85,247,0.55)',
    border:      'rgba(168,85,247,0.22)',
    borderHover: 'rgba(168,85,247,0.65)',
    bgFrom:      'rgba(20,5,40,0.72)',
    bgTo:        'rgba(10,3,22,0.88)',
    tag:         'rgba(168,85,247,0.12)',
    tagBorder:   'rgba(168,85,247,0.35)',
    tagText:     '#a855f7',
  },
  cyan: {
    primary:     '#22d3ee',
    glow:        'rgba(34,211,238,0.55)',
    border:      'rgba(34,211,238,0.22)',
    borderHover: 'rgba(34,211,238,0.65)',
    bgFrom:      'rgba(2,22,30,0.72)',
    bgTo:        'rgba(1,12,18,0.88)',
    tag:         'rgba(34,211,238,0.12)',
    tagBorder:   'rgba(34,211,238,0.35)',
    tagText:     '#22d3ee',
  },
  emerald: {
    primary:     '#10b981',
    glow:        'rgba(16,185,129,0.55)',
    border:      'rgba(16,185,129,0.22)',
    borderHover: 'rgba(16,185,129,0.65)',
    bgFrom:      'rgba(2,22,14,0.72)',
    bgTo:        'rgba(1,12,8,0.88)',
    tag:         'rgba(16,185,129,0.12)',
    tagBorder:   'rgba(16,185,129,0.35)',
    tagText:     '#10b981',
  },
};

// ─── Lucide icon map for Masterpiece cards ───────────────────────────────────
const MP_PIECE_ICONS: Record<string, IconComponent> = {
  'blue-dot':        Globe,
  'solar-system':    Orbit,
  'deep-space':      Telescope,
  'infinite-galaxy': Sparkles,
  'gaia-starmap':    Satellite,
};

// ─── Masterpiece Card ────────────────────────────────────────────────────────
function MasterpieceCard({
  piece, index, lm, onSelect,
}: { piece: MasterpieceItem; index: number; lm?: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const th = MP_CARD_THEME[piece.theme];

  const PieceIcon = MP_PIECE_ICONS[piece.id] ?? Globe;

  // Light-mode: fall back to a clean card style
  if (lm) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.97 }}
        onClick={onSelect}
        className="flex-shrink-0 w-48 rounded-2xl overflow-hidden cursor-pointer border border-slate-200 bg-white shadow-[0_4px_18px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_32px_rgba(0,0,0,0.14)] hover:border-slate-300 transition-all duration-300"
      >
        {/* Gradient header strip */}
        <div
          className="w-full h-24 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${th.bgFrom}, ${th.bgTo})` }}
        >
          <PieceIcon
            size={36}
            strokeWidth={1.4}
            className="relative z-10"
            style={{ color: th.primary, filter: `drop-shadow(0 0 10px ${th.primary})` }}
          />
          {/* Subtle glow blob */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${th.glow.replace('0.55)', '0.18)')}, transparent)` }}
          />
        </div>
        <div className="p-3">
          <p className="text-[12px] font-semibold tracking-wide text-slate-900 mb-0.5 truncate">{piece.title}</p>
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{piece.subtitle}</p>
          <div
            className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full border"
            style={{ background: th.tag, borderColor: th.tagBorder, color: th.tagText }}
          >
            ✦ 3D
          </div>
        </div>
      </motion.div>
    );
  }

  // Dark-mode: full glassmorphism + glow
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-shrink-0 w-48 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        border:         `1px solid ${hovered ? th.borderHover : th.border}`,
        background:     `linear-gradient(145deg, ${th.bgFrom}, ${th.bgTo})`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow:      hovered
          ? `0 0 0 1px ${th.border}, 0 12px 40px rgba(0,0,0,0.6), 0 0 32px ${th.glow}`
          : `0 0 0 1px ${th.border}, 0 4px 18px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Header area */}
      <div className="w-full h-28 flex items-center justify-center relative overflow-hidden">
        {/* Radial glow background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.4 }}
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 55%, ${th.glow.replace('0.55)', '0.22)')}, transparent 75%)`,
          }}
        />
        {/* Hex grid SVG mini */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`hex-card-${piece.id}`} x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
              <polygon points="15,0.5 29.5,8 29.5,23 15,30.5 0.5,23 0.5,8" fill="none" stroke={th.primary} strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#hex-card-${piece.id})`} />
        </svg>
        {/* Icon */}
        <motion.div
          className="relative z-10"
          animate={{ scale: hovered ? 1.15 : 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <PieceIcon
            size={36}
            strokeWidth={1.4}
            style={{ color: th.primary, filter: `drop-shadow(0 0 14px ${th.primary})` }}
          />
        </motion.div>
        {/* Top-right glow dot */}
        <motion.div
          className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
          style={{ background: th.primary, boxShadow: `0 0 8px ${th.primary}` }}
        />
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-2">
        <p
          className="text-[12px] font-semibold tracking-wide mb-0.5 truncate"
          style={{ color: '#fff', textShadow: `0 0 12px ${th.glow}` }}
        >
          {piece.title}
        </p>
        <p className="text-[10px] leading-relaxed line-clamp-2 text-white/40">{piece.subtitle}</p>

        {/* 3D badge */}
        <div
          className="mt-2.5 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
          style={{ background: th.tag, borderColor: th.tagBorder, color: th.tagText }}
        >
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.25 }}
            style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: th.primary, boxShadow: `0 0 6px ${th.primary}` }}
          />
          3D Engine
        </div>
      </div>

      {/* Bottom glow line */}
      <motion.div
        className="h-[1.5px] w-full"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ background: `linear-gradient(90deg, transparent, ${th.primary}, transparent)` }}
      />
    </motion.div>
  );
}

// ─── Advanced Sandbox Card ─────────────────────────────────────────────────────
function AdvSimCard({ sim, index = 0, onSelect, lm }: { sim: AdvSimItem; index?: number; onSelect: () => void; lm?: boolean }) {
  const cover = ADV_SIM_ID_COVER[sim.id] ?? { Icon: FlaskConical, theme: 'emerald' as CoverTheme };
  const catLabel = sim.categoryTag.replace(/^[^A-Za-z0-9]+/, '').trim();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`flex-shrink-0 w-52 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group ${
        lm
          ? 'border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)]'
          : 'border border-white/[0.08] bg-white/[0.04] backdrop-blur-[16px] hover:border-white/[0.20] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Premium icon cover */}
      <PremiumCover Icon={cover.Icon} theme={cover.theme} uid={`adv-${sim.id}`} index={index} lm={lm} />
      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full border ${
            lm ? 'border-cyan-300/60 text-cyan-700 bg-cyan-50' : 'border-cyan-400/30 text-cyan-300/80 bg-cyan-500/10'
          }`}>
            <Settings2 size={9} strokeWidth={1.8} />{catLabel}
          </span>
        </div>
        <p className={`text-[12px] font-medium leading-snug tracking-wide truncate mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>{sim.title}</p>
        <p className={`text-[11px] leading-relaxed line-clamp-2 ${lm ? 'text-slate-500' : 'text-white/40'}`}>{sim.description}</p>
      </div>
    </motion.div>
  );
}

// ─── Advanced Sandbox Modal ────────────────────────────────────────────────────
function AdvSandboxModal({ sim, onClose, lm }: { sim: AdvSimItem; onClose: () => void; lm?: boolean }) {
  return (
    <motion.div
      key="adv-modal"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-2xl flex flex-col overflow-hidden"
    >
      {/* Sticky Header */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${
        lm
          ? 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm'
          : 'border-white/[0.10] bg-[rgba(10,10,18,0.85)] backdrop-blur-xl'
      }`}>
        {/* Back button — large tappable area */}
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[13px] transition-all duration-200 min-w-[80px] ${
            lm
              ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              : 'bg-white/[0.10] text-white border border-white/[0.15] hover:bg-white/[0.18] hover:text-white'
          }`}
        >
          <span className="text-[15px] leading-none">←</span>
          <span>Back</span>
        </motion.button>
        {/* Title area */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            lm ? 'border-cyan-300/60 text-cyan-700 bg-cyan-50' : 'border-cyan-400/30 text-cyan-300/80 bg-cyan-500/10'
          }`}>
            <Settings2 size={9} strokeWidth={1.8} />{sim.categoryTag.replace(/^[^A-Za-z0-9]+/, '').trim()}
          </span>
          <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white/90'}`}>{sim.title}</span>
        </div>
        {/* Close X */}
        <button
          onClick={onClose}
          className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-[14px] font-medium transition-all duration-200 ${
            lm
              ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              : 'border-white/[0.12] bg-white/[0.08] text-white/60 hover:bg-white/[0.15] hover:text-white'
          }`}
        >
          ✕
        </button>
      </div>
      {/* Iframe */}
      <div className="flex-1 relative">
        <iframe
          src={sim.iframeUrl}
          title={sim.title}
          allowFullScreen
          allow="fullscreen"
          className="absolute inset-0 w-full h-full border-0"
          style={{ touchAction: 'manipulation' }}
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}

// ─── Arcade Zone Card ─────────────────────────────────────────────────────────
function FunGameCard({ game, index = 0, onSelect, lm }: { game: FunGameItem; index?: number; onSelect: () => void; lm?: boolean }) {
  const cover = GAME_COVER[game.id] ?? { Icon: Zap, theme: 'amber' as CoverTheme };
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`flex-shrink-0 w-52 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group ${
        lm
          ? 'border border-slate-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-slate-300 hover:shadow-[0_8px_28px_rgba(0,0,0,0.14)]'
          : 'border border-white/[0.08] bg-white/[0.04] backdrop-blur-[16px] hover:border-white/[0.20] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
      }`}
    >
      {/* Premium icon cover */}
      <PremiumCover Icon={cover.Icon} theme={cover.theme} uid={`game-${game.id}`} index={index} lm={lm} />
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full border ${
            lm ? 'border-amber-300/60 text-amber-700 bg-amber-50' : 'border-amber-400/30 text-amber-300/80 bg-amber-500/10'
          }`}>
            <Gamepad2 size={9} strokeWidth={1.8} />Game
          </span>
        </div>
        <p className={`text-[12px] font-medium leading-snug tracking-wide truncate mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>{game.title}</p>
        <p className={`text-[11px] leading-relaxed line-clamp-2 ${lm ? 'text-slate-500' : 'text-white/40'}`}>{game.description}</p>
      </div>
    </motion.div>
  );
}

// ─── Arcade Zone Modal ─────────────────────────────────────────────────────────
function ArcadeModal({ game, onClose, lm }: { game: FunGameItem; onClose: () => void; lm?: boolean }) {
  return (
    <motion.div
      key="arcade-modal"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-2xl flex flex-col overflow-hidden"
    >
      {/* Sticky Header */}
      <div className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${
        lm
          ? 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm'
          : 'border-white/[0.10] bg-[rgba(10,10,18,0.85)] backdrop-blur-xl'
      }`}>
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[13px] transition-all duration-200 min-w-[80px] ${
            lm
              ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              : 'bg-white/[0.10] text-white border border-white/[0.15] hover:bg-white/[0.18] hover:text-white'
          }`}
        >
          <span className="text-[15px] leading-none">←</span>
          <span>Back</span>
        </motion.button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            lm ? 'border-amber-300/60 text-amber-700 bg-amber-50' : 'border-amber-400/30 text-amber-300/80 bg-amber-500/10'
          }`}>
            <Gamepad2 size={9} strokeWidth={1.8} />Arcade
          </span>
          <span className={`text-[13px] font-semibold tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white/90'}`}>{game.title}</span>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-[14px] font-medium transition-all duration-200 ${
            lm
              ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              : 'border-white/[0.12] bg-white/[0.08] text-white/60 hover:bg-white/[0.15] hover:text-white'
          }`}
        >
          ✕
        </button>
      </div>
      <div className="flex-1 relative">
        <iframe
          src={game.iframeUrl}
          title={game.title}
          allowFullScreen
          allow="fullscreen"
          className="absolute inset-0 w-full h-full border-0"
          style={{ touchAction: 'manipulation' }}
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}

// ─── Glassmorphism Avatar Card ────────────────────────────────────────────────
const AvatarCard = memo(function AvatarCard({ name, subtitle, image, onChat, lm }: {
  name: string; subtitle: string; image?: string; onChat: () => void; lm?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer group ${
        lm
          ? 'border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)]'
          : 'border border-white/[0.09] bg-white/[0.05] backdrop-blur-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.45)]'
      }`}
    >
      <div className="w-full h-36 relative overflow-hidden">
        {image ? (
          <img src={image} alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center relative ${lm ? 'bg-slate-100' : 'bg-gradient-to-br from-white/10 to-transparent'}`}>
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
            <span className={`text-4xl font-thin select-none z-10 ${lm ? 'text-slate-400' : 'text-white/80'}`}>
              {name.split(' ').map((w: string) => w[0]).join('')}
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className={`text-sm font-medium tracking-wide truncate ${lm ? 'text-slate-900' : 'text-white'}`}>{name}</p>
        <p className={`text-[10px] tracking-wider uppercase mt-0.5 truncate ${lm ? 'text-slate-500' : 'text-white/40'}`}>{subtitle}</p>
        <div className="mt-2.5 flex gap-1.5">
          <button onClick={onChat}
            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors duration-200 ${
              lm
                ? 'text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 hover:text-slate-900'
                : 'text-white/70 bg-white/8 border border-white/20 hover:bg-white/15 hover:text-white'
            }`}>
            Chat
          </button>
          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
            lm ? 'text-slate-500 bg-slate-50 border border-slate-200' : 'text-white/50 bg-white/5 border border-white/10'
          }`}>
            Explore
          </span>
        </div>
      </div>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
});

// ─── UserBadge ────────────────────────────────────────────────────────────────
function UserBadge({ user, lm, onLogout }: { user: UserProfile; lm: boolean; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Avatar + name pill */}
      <div
        className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border backdrop-blur-[18px] transition-all duration-300 ${
          lm
            ? 'border-purple-300/50 bg-purple-50/70 text-purple-800'
            : 'border-purple-500/30 bg-purple-500/10 text-purple-200/90'
        }`}
        style={{ boxShadow: lm ? 'none' : '0 0 12px rgba(147,112,219,0.15)' }}
      >
        <img
          src={user.avatar}
          alt={user.username}
          className="w-5 h-5 rounded-full object-cover border border-white/25 flex-shrink-0"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="text-[11px] font-mono tracking-[0.08em] max-w-[80px] truncate">
          {user.username}
        </span>
      </div>
      {/* Logout button */}
      <button
        onClick={onLogout}
        title="Sign out"
        className={`w-7 h-7 flex items-center justify-center rounded-full border backdrop-blur-[18px] transition-all duration-200 ${
          lm
            ? 'border-black/[0.10] bg-black/[0.04] text-slate-400 hover:text-red-500 hover:border-red-300/50 hover:bg-red-50/60'
            : 'border-white/[0.10] bg-white/[0.04] text-white/35 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/[0.08]'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Wouter location — used to render the dedicated /nexus route
  const [location, setLocation] = useLocation();

  // show3D = false → clean charcoal background, no iframe, no WarpIntro (default)
  // show3D = true  → WarpIntro + Sketchfab 3D animation active
  const [show3D,       setShow3D]      = useState(false);
  const [showIntro,    setShowIntro]   = useState(false);   // stays false until 3D is first enabled
  const [isLightMode,  setIsLightMode] = useState(false);
  // lm = light mode is actively visible (3D off + light on)
  const lm = isLightMode && !show3D;
  const [focused,      setFocused]     = useState(false);
  const twTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');
  const searchInputRef  = useRef<HTMLInputElement>(null);
  const [shareCopied,   setShareCopied]   = useState(false);
  const shareCopyTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPortal,   setShowPortal]  = useState(false);
  const [showLibrary,  setShowLibrary] = useState(false);
  const [language,     setLanguage]    = useState('English');
  const [langOpen,    setLangOpen]   = useState(false);
  const [activeTab,   setActiveTab]  = useState('All');
  const [portalQuery, setPortalQuery]= useState('');
  const [activeChat,       setActiveChat]       = useState<ChatTarget | null>(null);
  const [chatSharedCtx,    setChatSharedCtx]    = useState<SharedContext | undefined>(undefined);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const [sceneIdx,         setSceneIdx]         = useState(() => Math.floor(Math.random() * cosmicScenes.length));
  const overlayControls = useAnimation();
  const bgIframeRef     = useRef<HTMLIFrameElement>(null);
  const lastFlushRef    = useRef<number>(Date.now());

  // ── Unified search state ──────────────────────────────────────────────────
  const [nasaQuery,        setNasaQuery]        = useState('');
  const [acSuggestions,   setAcSuggestions]   = useState<string[]>([]);
  const [searchResults,    setSearchResults]    = useState<UnifiedItem[]>([]);
  const [searchStatus,     setSearchStatus]     = useState<NasaStatus>('idle');
  const [searchError,      setSearchError]      = useState('');
  const [isEverythingMode, setIsEverythingMode] = useState(false);
  const [isLoadingMore,    setIsLoadingMore]    = useState(false);
  const [selectedCard,     setSelectedCard]     = useState<UnifiedItem | null>(null);
  const [searchSections,   setSearchSections]   = useState<SearchSections | null>(null);

  // ── Recent searches (localStorage) ───────────────────────────────────────
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cosmos_recent_searches') ?? '[]') as string[]; }
    catch { return []; }
  });

  const saveRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      try { localStorage.setItem('cosmos_recent_searches', JSON.stringify(next)); } catch { /* storage full */ }
      return next;
    });
  }, []);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Portal prefetch state ──────────────────────────────────────────────────
  const [portalFetched,    setPortalFetched]    = useState(false);
  const [portalBlackHoles, setPortalBlackHoles] = useState<WikiItem[]>([]);
  const [portalEquations,  setPortalEquations]  = useState<WikiItem[]>([]);
  const [simulationModal,  setSimulationModal]  = useState<SimItem | null>(null);
  const [advModal,         setAdvModal]         = useState<AdvSimItem | null>(null);
  const [arcadeModal,      setArcadeModal]      = useState<FunGameItem | null>(null);
  const [showChess,        setShowChess]        = useState(false);
  const [showCarrom,       setShowCarrom]       = useState(false);
  const [masterpieceModal, setMasterpieceModal] = useState<MasterpieceItem | null>(null);
  const [showProfile,      setShowProfile]      = useState(false);
  const [showNexus,        setShowNexus]        = useState(false);
  const [showBiologyHub,   setShowBiologyHub]   = useState(false);
  const { isAuthenticated, recordChessResult, user, logout } = useAuthStore();
  // ── Video Media Hub ─────────────────────────────────────────────────────────
  const [videoResults,     setVideoResults]     = useState<VideoItem[]>([]);
  const [videoStatus,      setVideoStatus]      = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [activeVideo,      setActiveVideo]      = useState<VideoItem | null>(null);

  const hasSearchResults = searchStatus !== 'idle';

  // Theme is applied directly to the outermost wrapper div via Tailwind class;
  // no document.body manipulation needed.

  // ── Restore session from httpOnly cookie on mount ────────────────────────
  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  // ── Restore search query from URL on mount (?q=) ─────────────────────────
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q')?.trim();
      if (q) {
        setNasaQuery(q);
        searchAll(q, 'specific');
      }
    } catch { /* noop */ }
    // searchAll is stable (useCallback with [] deps) — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Track time spent on site; flush to Supabase every 60 s ───────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    lastFlushRef.current = Date.now();

    const intervalId = setInterval(() => {
      useAuthStore.getState().addTimeSpent(60);
      lastFlushRef.current = Date.now();
    }, 60_000);

    const flushRemaining = () => {
      const elapsed = Math.round((Date.now() - lastFlushRef.current) / 1000);
      if (elapsed > 0) useAuthStore.getState().addTimeSpent(elapsed);
    };

    window.addEventListener('beforeunload', flushRemaining);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', flushRemaining);
      flushRemaining();
    };
  }, [isAuthenticated]);

  // ── Inject Google Translate once on mount ─────────────────────────────────
  useEffect(() => {
    injectGoogleTranslate();
  }, []);

  // ── Apply Google Translate whenever language changes ──────────────────────
  useEffect(() => {
    const lang = LANGUAGES.find(l => l.label === language);
    if (!lang) return;
    // Small delay to let GT widget load on first run
    const timer = setTimeout(() => applyGTranslate(lang.gtCode), 800);
    return () => clearTimeout(timer);
  }, [language]);

  // ── STRICT BACKGROUND FREEZE: hide iframe entirely to stop GPU rendering ──
  // Using imperative DOM mutation — avoids re-mounting / key change on the iframe
  useEffect(() => {
    const iframe = bgIframeRef.current;
    if (!iframe) return;
    if (isAnimationPaused) {
      iframe.style.display = 'none';
    } else {
      iframe.style.display = '';
    }
  });

  const isAnimationPaused =
    !show3D || showIntro || focused || showPortal || showLibrary || langOpen ||
    activeChat !== null || chatInputFocused ||
    hasSearchResults || selectedCard !== null || simulationModal !== null || advModal !== null || arcadeModal !== null || showChess || activeVideo !== null;

  const searchAll = useCallback(async (q: string, mode: 'specific' | 'everything' = 'specific') => {
    const term = q.trim();
    if (!term) return;
    // ── Reflect query in URL for shareability / reload restore ──────────────
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('q', term);
      url.searchParams.delete('tab'); // tab resets on new search
      history.replaceState(null, '', url.toString());
    } catch { /* noop */ }
    const everything = mode === 'everything';
    setIsEverythingMode(everything);
    setSearchStatus('loading');
    setSearchResults([]);
    setSearchSections(null);
    setSearchError('');
    setVideoResults([]);
    setVideoStatus('idle');

    const actualQuery = everything
      ? EVERYTHING_TERMS[Math.floor(Math.random() * EVERYTHING_TERMS.length)]
      : term;

    try {
      const resp = await fetch(
        `/api/search/unified?q=${encodeURIComponent(actualQuery)}&page=1`
      );
      // Non-2xx: try to parse body anyway; if that fails fall back to empty sections
      let data: SearchSections;
      try {
        data = await resp.json() as SearchSections;
      } catch {
        data = {
          query: actualQuery, page: 1,
          videos: [], wikipedia: [], research: [], nasa: [], esa: [], books: [],
          relatedTopics: [], hasMore: false,
        } as SearchSections;
      }
      setSearchSections(data);
      setVideoResults(data.videos ?? []);
      setVideoStatus('done');
      setSearchStatus('done');
      saveRecentSearch(term);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('[searchAll]', err);
      // Degrade gracefully: show empty results, never crash
      setSearchSections({
        query: actualQuery, page: 1,
        videos: [], wikipedia: [], research: [], nasa: [], esa: [], books: [],
        relatedTopics: [], hasMore: false,
      } as SearchSections);
      setVideoResults([]);
      setVideoStatus('done');
      setSearchStatus('done');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    // Need either sections mode or everything mode to paginate
    if (!searchSections && !isEverythingMode) return;
    // Stop if the last page indicated no more results (non-everything mode only)
    if (!isEverythingMode && searchSections && !searchSections.hasMore) return;
    setIsLoadingMore(true);
    try {
      const currentPage = searchSections?.page ?? 1;
      const q = searchSections?.query
        ?? EVERYTHING_TERMS[Math.floor(Math.random() * EVERYTHING_TERMS.length)];
      const resp = await fetch(
        `/api/search/unified?q=${encodeURIComponent(q)}&page=${currentPage + 1}`
      );
      if (!resp.ok) return;
      const data = await resp.json() as SearchSections;
      setSearchSections(prev => {
        if (!prev) return data;
        return {
          ...data,
          page:          data.page,
          aiSummary:     prev.aiSummary,    // keep original AI summary
          videos:        prev.videos,        // keep original videos
          relatedTopics: prev.relatedTopics, // keep original topics
          wikipedia: [...prev.wikipedia, ...data.wikipedia],
          research:  [...prev.research,  ...data.research],
          nasa:      [...prev.nasa,      ...data.nasa],
          esa:       [...prev.esa,       ...data.esa],
          books:     [...prev.books,     ...data.books],
        };
      });
    } catch { /* silently swallow */ }
    finally { setIsLoadingMore(false); }
  }, [isLoadingMore, searchSections, isEverythingMode]);

  const clearSearch = useCallback(() => {
    setNasaQuery('');
    setSearchResults([]);
    setSearchSections(null);
    setSearchStatus('idle');
    setSearchError('');
    setIsEverythingMode(false);
    setSelectedCard(null);
    setIsLoadingMore(false);
    setVideoResults([]);
    setVideoStatus('idle');
    // ── Remove q/tab params from URL when clearing ───────────────────────
    try {
      history.replaceState(null, '', window.location.pathname);
    } catch { /* noop */ }
  }, []);

  // ── Portal fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showPortal || portalFetched) return;
    setPortalFetched(true);

    const fetchWikiTitles = async (titles: string[], setter: (items: WikiItem[]) => void) => {
      try {
        const joined = titles.map(encodeURIComponent).join('|');
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${joined}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=400&format=json&origin=*`
        );
        if (!res.ok) return;
        const json = await res.json() as { query?: { pages?: Record<string, WikiItem> } };
        const items = Object.values(json.query?.pages ?? {}).filter(p => !('missing' in p));
        setter(items);
      } catch { /* ignore */ }
    };

    fetchWikiTitles(['Black hole', 'Supermassive black hole', 'Event horizon'], setPortalBlackHoles);
    fetchWikiTitles(['Theory of relativity', 'Schrödinger equation', 'Standard Model'], setPortalEquations);
  }, [showPortal, portalFetched]);

  // ── Typewriter placeholder animation ─────────────────────────────────────
  useEffect(() => {
    if (focused || nasaQuery) {
      if (twTimerRef.current) clearTimeout(twTimerRef.current);
      setTypedPlaceholder('');
      return;
    }
    let phraseIdx = 0, charIdx = 0, deleting = false;
    const phrases = TYPEWRITER_PHRASES;
    function tick() {
      const phrase = phrases[phraseIdx];
      if (!deleting) {
        charIdx++;
        setTypedPlaceholder(phrase.slice(0, charIdx));
        if (charIdx === phrase.length) {
          twTimerRef.current = setTimeout(() => { deleting = true; tick(); }, 2400);
          return;
        }
      } else {
        charIdx--;
        setTypedPlaceholder(phrase.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          twTimerRef.current = setTimeout(tick, 420);
          return;
        }
      }
      twTimerRef.current = setTimeout(tick, deleting ? 26 : 55);
    }
    twTimerRef.current = setTimeout(tick, 800);
    return () => { if (twTimerRef.current) clearTimeout(twTimerRef.current); };
  }, [focused, nasaQuery]);

  // ── Autocomplete — Wikipedia OpenSearch (debounced 300 ms) ──────────────
  useEffect(() => {
    const q = nasaQuery.trim();
    if (!q) { setAcSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const url =
          `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}` +
          `&limit=6&namespace=0&format=json&origin=*`;
        const res  = await fetch(url);
        const data = await res.json() as [string, string[]];
        // data[1] is the array of suggestion titles
        setAcSuggestions((data[1] ?? []).slice(0, 6));
      } catch { setAcSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [nasaQuery]);

  // ── Share — copy ?q=… URL to clipboard ──────────────────────────────────
  const handleShareSearch = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('q', nasaQuery.trim());
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShareCopied(true);
      if (shareCopyTimer.current) clearTimeout(shareCopyTimer.current);
      shareCopyTimer.current = setTimeout(() => setShareCopied(false), 2200);
    }).catch(() => { /* clipboard denied */ });
  }, [nasaQuery]);

  // ── Keyboard shortcut: "/" focuses the search bar ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── IntersectionObserver — infinite scroll ────────────────────────────────
  // Attaches for ALL search modes (specific filter or Everything).
  // loadMore() itself guards against fetching when hasMore is false.
  useEffect(() => {
    if (searchStatus !== 'done') return;
    if (!searchSections && !isEverythingMode) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isEverythingMode, searchStatus, searchSections, loadMore]);

  // ── Scene rotation — paused when any UI interaction is active ─────────────
  useEffect(() => {
    if (isAnimationPaused) return;

    const interval = setInterval(async () => {
      await overlayControls.start({ opacity: 1, transition: { duration: 1.5, ease: 'easeInOut' } });
      setSceneIdx(prev => randomIndexExcluding(prev, cosmicScenes.length));
      await overlayControls.start({ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } });
    }, 300_000);
    return () => clearInterval(interval);
  }, [overlayControls, isAnimationPaused]);

  // ── Stable callbacks ──────────────────────────────────────────────────────
  const closeChat = useCallback(() => {
    setActiveChat(null);
    setChatSharedCtx(undefined);
  }, []);

  const openChat = useCallback((avatar: ChatTarget) => {
    setChatSharedCtx(undefined);
    setActiveChat(avatar);
  }, []);

  // Open chat WITH shared context (from "Discuss with a Scientist")
  const openChatWithContext = useCallback((avatarName: string, ctx: SharedContext) => {
    const av = AVATARS.find(a => a.name === avatarName);
    if (!av) return;
    setChatSharedCtx(ctx);
    setActiveChat({ name: av.name, role: av.role, image: av.image });
  }, []);

  // Library "Discuss" → close library + open chat with shared context
  const handleLibraryDiscuss = useCallback((avatarName: string, ctx: LibrarySharedContext) => {
    setShowLibrary(false);
    openChatWithContext(avatarName, ctx);
  }, [openChatWithContext]);

  // Build shared context from a selected card for passing to DetailModal
  const buildSharedContext = useCallback((card: UnifiedItem): SharedContext => {
    switch (card.source) {
      case 'nasa':
        return { title: card.item.data?.[0]?.title ?? 'NASA Image',       description: card.item.data?.[0]?.description ?? '', source: 'nasa'   };
      case 'wiki':
        return { title: card.item.title ?? 'Wikipedia Article',            description: card.item.extract ?? '',                source: 'wiki'   };
      case 'arxiv':
        return { title: card.item.title,                                   description: card.item.summary,                      source: 'arxiv'  };
      case 'spacex':
        return { title: card.item.name,                                    description: card.item.details ?? '',                source: 'spacex' };
      case 'cern':
        return { title: card.item.title,                                   description: card.item.description,                  source: 'cern'   };
    }
  }, []);

  // ── /chat — dedicated Singularity Chat page ───────────────────────────────
  if (location === '/chat') {
    return <SingularityChat onClose={() => setLocation('/')} />;
  }

  return (
    <div
      className="relative min-h-[100dvh] h-[100dvh] w-full overflow-hidden transition-all duration-700"
      style={{ background: lm
        ? 'radial-gradient(ellipse at 50% -20%, #f8fafc 0%, #ffffff 45%, #e2e8f0 100%)'
        : 'radial-gradient(ellipse at 50% -10%, #27272a 0%, #0a0a0b 45%, #000000 100%)' }}
    >

      {/* ── Auth Gate ── */}
      <AnimatePresence>
        {!isAuthenticated && <LoginScreen />}
      </AnimatePresence>

      {/* ── Cinematic Big Bang Intro (only when 3D is enabled) ── */}
      <AnimatePresence>
        {show3D && showIntro && <WarpIntro onDone={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* ── z-0  Full-screen Sketchfab background (only when 3D is enabled) ── */}
      {show3D && (
        <div
          className="absolute inset-0 z-0 overflow-hidden pointer-events-auto flex items-center justify-center bg-black"
          style={{ filter: hasSearchResults ? 'blur(14px) brightness(0.55)' : 'none' }}
        >
          {/* Static fallback gradient shown while iframe is paused */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, #1a0a3a 0%, #050010 50%, #000000 100%)',
              opacity: isAnimationPaused ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
          />
          <iframe
            key={sceneIdx}
            ref={bgIframeRef}
            title="Cosmic Background"
            src={cosmicScenes[sceneIdx]}
            className="absolute w-[110vw] h-[120vh] border-none pointer-events-auto"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            xr-spatial-tracking="true"
            execution-while-out-of-viewport="true"
            execution-while-not-rendered="true"
            web-share="true"
          />
        </div>
      )}

      {/* ── z-10  Cinematic crossfade overlay (only when 3D is enabled) ── */}
      {show3D && (
        <motion.div
          className="absolute inset-0 z-10 bg-black pointer-events-none"
          initial={{ opacity: 0 }}
          animate={overlayControls}
        />
      )}

      {/* ── z-11  Freeze overlay (only when 3D is enabled) ── */}
      {show3D && (
        <motion.div
          className="absolute inset-0 z-[11] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isAnimationPaused ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ backdropFilter: isAnimationPaused ? 'blur(2px)' : 'blur(0px)', background: 'rgba(0,0,0,0.45)' }}
        />
      )}

      {/* ── z-20  Main cinematic UI ── */}
      <AnimatePresence>
        {!showPortal && (
          <motion.div key="main-ui"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`absolute inset-0 z-20 flex flex-col items-center pointer-events-none ${
              hasSearchResults ? 'justify-start overflow-y-auto overflow-x-hidden pt-10 pb-16' : 'justify-center'
            }`}
          >
            {/* ── Premium floating pill nav — hidden in search-results view ── */}
            {!hasSearchResults && (
              <div className="absolute top-5 left-0 right-0 z-30 pointer-events-auto flex justify-center px-4">
                <motion.div
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-full border backdrop-blur-[44px] ${
                    lm
                      ? 'bg-white/[0.92] border-black/[0.07] shadow-[0_2px_20px_rgba(0,0,0,0.09),0_1px_0_rgba(255,255,255,0.96)_inset]'
                      : 'bg-[rgba(6,6,14,0.80)] border-white/[0.10] shadow-[0_2px_20px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)_inset,0_0_0_1px_rgba(255,255,255,0.025)_inset]'
                  }`}
                >
                  {/* Library */}
                  <button
                    onClick={() => setShowLibrary(true)}
                    title="Research Library"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11.5px] font-medium tracking-[0.025em] transition-all duration-200 active:scale-[0.97] ${
                      lm
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.07] active:bg-black/[0.10]'
                        : 'text-white/45 hover:text-white/95 hover:bg-white/[0.09] active:bg-white/[0.06]'
                    }`}
                  >
                    <BookOpen size={14} strokeWidth={1.8} />
                    <span>Library</span>
                  </button>

                  {/* Nexus */}
                  <button
                    onClick={() => setShowNexus(true)}
                    title="Cosmic Nexus"
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11.5px] font-medium tracking-[0.025em] transition-all duration-200 active:scale-[0.97] ${
                      lm
                        ? 'text-violet-600 hover:text-violet-900 hover:bg-violet-500/[0.08] active:bg-violet-500/[0.12]'
                        : 'text-violet-300/60 hover:text-violet-200/95 hover:bg-violet-500/[0.11] active:bg-violet-500/[0.07]'
                    }`}
                  >
                    <Orbit size={14} strokeWidth={1.8} />
                    <span>Nexus</span>
                  </button>

                  {/* Divider */}
                  <div className={`w-px h-5 mx-1 flex-shrink-0 rounded-full ${lm ? 'bg-black/[0.10]' : 'bg-white/[0.08]'}`} />

                  {/* Language dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setLangOpen(o => !o)}
                      title="Language"
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[11.5px] font-medium tracking-[0.025em] transition-all duration-200 active:scale-[0.97] ${
                        lm
                          ? 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.07] active:bg-black/[0.10]'
                          : 'text-white/45 hover:text-white/95 hover:bg-white/[0.09] active:bg-white/[0.06]'
                      }`}
                    >
                      <Globe size={14} strokeWidth={1.8} />
                      <span className="max-w-[52px] truncate">{language}</span>
                      <ChevronDown size={9} strokeWidth={2.5} className={`flex-shrink-0 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''} ${lm ? 'text-slate-400' : 'text-white/28'}`} />
                    </button>
                    <AnimatePresence>
                      {langOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.94 }}
                          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className={`absolute left-0 mt-2 w-40 rounded-2xl border backdrop-blur-[28px] overflow-hidden z-50 ${
                            lm
                              ? 'border-black/[0.08] bg-white/[0.97] shadow-[0_20px_60px_rgba(0,0,0,0.12)]'
                              : 'border-white/[0.09] bg-[rgba(8,8,14,0.95)] shadow-[0_20px_60px_rgba(0,0,0,0.85)]'
                          }`}
                        >
                          {LANGUAGES.map(lang => (
                            <button key={lang.label} onClick={() => { setLanguage(lang.label); setLangOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 text-[12px] tracking-wide transition-all duration-150 border-l-2 ${
                                lm
                                  ? lang.label === language ? 'text-slate-900 bg-black/[0.06] border-slate-400' : 'text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] border-transparent'
                                  : lang.label === language ? 'text-white bg-white/[0.10] border-white/40'     : 'text-white/55 hover:text-white hover:bg-white/[0.06] border-transparent'
                              }`}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className={`w-px h-5 mx-1 flex-shrink-0 rounded-full ${lm ? 'bg-black/[0.10]' : 'bg-white/[0.08]'}`} />

                  {/* 3D toggle */}
                  <button
                    onClick={() => {
                      setShow3D(prev => {
                        if (!prev) { setShowIntro(true); setIsLightMode(false); }
                        return !prev;
                      });
                    }}
                    title={show3D ? 'Disable 3D Background' : 'Enable 3D Background'}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] ${
                      show3D
                        ? lm ? 'bg-black/[0.10] text-slate-800 shadow-[inset_0_1px_0_rgba(0,0,0,0.06)]' : 'bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                        : lm ? 'text-slate-400 hover:text-slate-900 hover:bg-black/[0.07]' : 'text-white/35 hover:text-white/90 hover:bg-white/[0.09]'
                    }`}
                  >
                    <Layers3 size={14} strokeWidth={1.8} />
                  </button>

                  {/* Light / Dark toggle — only when 3D off */}
                  {!show3D && (
                    <button
                      onClick={() => setIsLightMode(m => !m)}
                      title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.92] ${
                        lm
                          ? 'text-slate-400 hover:text-slate-900 hover:bg-black/[0.07]'
                          : 'text-white/35 hover:text-white/90 hover:bg-white/[0.09]'
                      }`}
                    >
                      {isLightMode ? <Moon size={14} strokeWidth={1.8} /> : <Sun size={14} strokeWidth={1.8} />}
                    </button>
                  )}
                </motion.div>
              </div>
            )}

            {/* Search bar + tags */}
            <motion.div
              animate={{ y: hasSearchResults ? 0 : focused ? -120 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className={`flex flex-col items-center gap-5 pointer-events-auto px-6 w-full ${
                hasSearchResults ? 'max-w-2xl' : 'max-w-md'
              }`}
            >
              {/* Search pill + recent searches dropdown wrapper */}
              <div className="relative w-full">
                <div className={`w-full backdrop-blur-[32px] rounded-full px-5 py-3.5 flex items-center gap-3 transition-all duration-300 ${
                  lm
                    ? 'bg-white/[0.60] border border-black/[0.09] shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_8px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] focus-within:border-black/[0.16] focus-within:bg-white/[0.74] focus-within:shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_10px_48px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,1)]'
                    : 'bg-white/[0.055] border border-white/[0.10] shadow-[0_0_0_1px_rgba(255,255,255,0.035),0_8px_48px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.09)] focus-within:border-violet-400/[0.28] focus-within:bg-white/[0.075] focus-within:shadow-[0_0_0_1px_rgba(167,139,250,0.10),0_8px_48px_rgba(0,0,0,0.75),0_0_28px_rgba(139,92,246,0.09),inset_0_1px_0_rgba(255,255,255,0.12)]'
                }`}>
                  <Search
                    size={16}
                    strokeWidth={2}
                    className={`flex-shrink-0 transition-colors duration-200 ${
                      lm ? 'text-slate-400' : 'text-white/30'
                    }`}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={nasaQuery}
                    placeholder={typedPlaceholder || 'Search the cosmos…'}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={e => { setNasaQuery(e.target.value); if (!e.target.value.trim()) clearSearch(); }}
                    onKeyDown={e => { if (e.key === 'Enter') searchAll(nasaQuery); }}
                    className={`flex-1 bg-transparent outline-none text-[15px] tracking-wide font-light leading-relaxed ${
                      lm ? 'text-slate-900 placeholder-slate-400/75' : 'text-white/95 placeholder-white/28'
                    }`}
                  />
                </div>

                {/* Recent searches dropdown */}
                <AnimatePresence>
                  {focused && !nasaQuery.trim() && recentSearches.length > 0 && (
                    <motion.div
                      key="recent-searches"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border overflow-hidden ${
                        lm
                          ? 'bg-white/90 border-black/[0.08] shadow-[0_12px_48px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-xl'
                          : 'bg-[#0d0d1e]/90 border-white/[0.09] shadow-[0_12px_48px_rgba(0,0,0,0.75)] backdrop-blur-xl'
                      }`}
                    >
                      {/* Header */}
                      <div className={`flex items-center justify-between px-4 pt-3 pb-2 ${lm ? 'border-b border-black/[0.06]' : 'border-b border-white/[0.06]'}`}>
                        <span className={`text-[9px] uppercase tracking-[0.22em] font-semibold ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                          Recent Searches
                        </span>
                        <button
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setRecentSearches([]);
                            try { localStorage.removeItem('cosmos_recent_searches'); } catch { /* noop */ }
                          }}
                          className={`text-[9px] uppercase tracking-[0.16em] transition-colors duration-150 ${lm ? 'text-gray-300 hover:text-gray-600' : 'text-white/20 hover:text-white/55'}`}
                        >
                          Clear
                        </button>
                      </div>

                      {/* Chips */}
                      <div className="flex flex-col py-1.5">
                        {recentSearches.map((s, i) => (
                          <button
                            key={s}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setNasaQuery(s); searchAll(s); setFocused(false); }}
                            className={`group flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 ${
                              lm
                                ? 'hover:bg-black/[0.04] text-gray-700 hover:text-gray-900'
                                : 'hover:bg-white/[0.05] text-white/60 hover:text-white/90'
                            }`}
                          >
                            <Search size={11} strokeWidth={2} className={`flex-shrink-0 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/18 group-hover:text-white/45'} transition-colors duration-150`} />
                            <span className="flex-1 text-[13px] font-light tracking-wide truncate">{s}</span>
                            <span className={`flex-shrink-0 text-[8.5px] uppercase tracking-[0.18em] ${lm ? 'text-gray-300' : 'text-white/18'}`}>#{i + 1}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Autocomplete suggestions — Wikipedia OpenSearch */}
                <AnimatePresence>
                  {focused && nasaQuery.trim() && acSuggestions.length > 0 && (
                    <motion.div
                      key="autocomplete"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border overflow-hidden ${
                        lm
                          ? 'bg-white/90 border-black/[0.08] shadow-[0_12px_48px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-xl'
                          : 'bg-[#0d0d1e]/90 border-white/[0.09] shadow-[0_12px_48px_rgba(0,0,0,0.75)] backdrop-blur-xl'
                      }`}
                    >
                      <div className={`flex items-center px-4 pt-3 pb-2 ${lm ? 'border-b border-black/[0.06]' : 'border-b border-white/[0.06]'}`}>
                        <span className={`text-[9px] uppercase tracking-[0.22em] font-semibold ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                          Suggestions
                        </span>
                      </div>
                      <div className="flex flex-col py-1.5">
                        {acSuggestions.map((s) => (
                          <button
                            key={s}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setNasaQuery(s); setAcSuggestions([]); searchAll(s); setFocused(false); }}
                            className={`group flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 ${
                              lm
                                ? 'hover:bg-black/[0.04] text-gray-700 hover:text-gray-900'
                                : 'hover:bg-white/[0.05] text-white/60 hover:text-white/90'
                            }`}
                          >
                            <Search size={11} strokeWidth={2} className={`flex-shrink-0 ${lm ? 'text-gray-300 group-hover:text-gray-500' : 'text-white/18 group-hover:text-white/45'} transition-colors duration-150`} />
                            <span className="flex-1 text-[13px] font-light tracking-wide truncate">{s}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap justify-center gap-2.5">
                {TAGS.map(tag => {
                  const isEverything = tag === 'Everything';
                  return (
                    <button key={tag}
                      onClick={() => {
                        if (isEverything) {
                          setNasaQuery('cosmos');
                          searchAll('cosmos', 'everything');
                        } else {
                          setNasaQuery(tag);
                          searchAll(tag, 'specific');
                          setIsEverythingMode(false);
                        }
                      }}
                      className={`text-[11px] uppercase tracking-[0.13em] backdrop-blur-[18px] px-4 py-2 rounded-full transition-all duration-250 ease-out cursor-pointer hover:-translate-y-px active:translate-y-0 active:scale-[0.97] ${
                        lm
                          ? isEverything
                            ? 'text-slate-800 bg-black/[0.08] border border-black/[0.13] shadow-[0_2px_14px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.82)] hover:bg-black/[0.12] hover:text-slate-900 hover:border-black/[0.20] hover:shadow-[0_4px_22px_rgba(0,0,0,0.13),inset_0_1px_0_rgba(255,255,255,0.90)] font-medium'
                            : 'text-slate-500 bg-black/[0.04] border border-black/[0.08] shadow-[0_1px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-black/[0.08] hover:text-slate-800 hover:border-black/[0.14] hover:shadow-[0_2px_14px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.80)]'
                          : isEverything
                            ? 'text-white/88 bg-white/[0.08] border border-white/[0.16] shadow-[0_2px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.09)] hover:bg-white/[0.12] hover:text-white hover:border-violet-300/[0.24] hover:shadow-[0_4px_22px_rgba(0,0,0,0.55),0_0_18px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.13)] font-medium'
                            : 'text-white/48 bg-white/[0.035] border border-white/[0.07] shadow-[0_1px_8px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.045)] hover:bg-white/[0.075] hover:text-white/82 hover:border-white/[0.13] hover:shadow-[0_2px_14px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.07)]'
                      }`}>
                      {(() => { const TagIcon = TAG_ICON_MAP[tag]; return (
                        <span className="flex items-center gap-1.5">
                          {TagIcon && <TagIcon size={11} strokeWidth={1.8} className="flex-shrink-0" />}
                          {tag}
                        </span>
                      ); })()}
                    </button>
                  );
                })}
              </div>

              {!hasSearchResults && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowPortal(true)}
                  className={`mt-1 px-9 py-3 rounded-full border backdrop-blur-[22px] text-[11.5px] uppercase tracking-[0.30em] font-medium transition-all duration-300 ${
                    lm
                      ? 'border-black/[0.11] bg-black/[0.05] text-slate-600 shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-black/[0.09] hover:text-slate-800 hover:border-black/[0.17] hover:shadow-[0_6px_28px_rgba(0,0,0,0.13),inset_0_1px_0_rgba(255,255,255,0.82)]'
                      : 'border-white/[0.12] bg-white/[0.05] text-white/68 shadow-[0_4px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-white/[0.08] hover:text-white/92 hover:border-white/[0.18] hover:shadow-[0_6px_32px_rgba(0,0,0,0.55),0_0_22px_rgba(139,92,246,0.09),inset_0_1px_0_rgba(255,255,255,0.10)]'
                  }`}
                >
                  Explore Portal ✦
                </motion.button>
              )}
            </motion.div>

            {/* Results feed */}
            {hasSearchResults && (
              <div className="w-full max-w-2xl px-6 mt-8 pointer-events-auto">
                {/* Share row */}
                <div className="flex items-center justify-end mb-3">
                  <AnimatePresence mode="wait">
                    {shareCopied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.88, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide border ${
                          lm
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300'
                        }`}
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                          <path d="M2 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Link Copied!
                      </motion.span>
                    ) : (
                      <motion.button
                        key="share"
                        initial={{ opacity: 0, scale: 0.88, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleShareSearch}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide border transition-all duration-150 ${
                          lm
                            ? 'bg-white/70 border-black/[0.08] text-slate-500 hover:text-slate-800 hover:border-black/[0.15] hover:bg-white'
                            : 'bg-white/[0.05] border-white/[0.10] text-white/35 hover:text-white/70 hover:border-white/[0.20] hover:bg-white/[0.09]'
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                          <circle cx="13" cy="2.5" r="1.75" stroke="currentColor" strokeWidth="1.4"/>
                          <circle cx="13" cy="13.5" r="1.75" stroke="currentColor" strokeWidth="1.4"/>
                          <circle cx="3"  cy="8"    r="1.75" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M4.7 7.1 11.3 3.4M4.7 8.9l6.6 3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        Share
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                <NasaSearch
                  results={searchResults}
                  status={searchStatus}
                  errMsg={searchError}
                  onClear={clearSearch}
                  onCardClick={setSelectedCard}
                  sentinelRef={sentinelRef}
                  isEverythingMode={isEverythingMode}
                  isLoadingMore={isLoadingMore}
                  videoResults={videoResults}
                  videoStatus={videoStatus}
                  onVideoClick={setActiveVideo}
                  lm={lm}
                  sections={searchSections}
                  chatAvatars={AVATARS.map(a => ({ name: a.name, image: a.image }))}
                  onSectionItemShare={(avatarName, title, desc, src) => {
                    openChatWithContext(avatarName, {
                      title,
                      description: desc,
                      source: src as 'nasa' | 'wiki' | 'arxiv' | 'spacex' | 'cern',
                    });
                  }}
                  onRelatedTopicSearch={topic => {
                    setNasaQuery(topic);
                    searchAll(topic, 'specific');
                  }}
                  onLoadMore={loadMore}
                  shortsHasMore={searchSections?.hasMore ?? true}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-30  Everything Portal ── */}
      <AnimatePresence>
        {showPortal && (
          <motion.div key="portal"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 z-30 flex flex-col overflow-hidden ${lm ? 'bg-slate-50/96 backdrop-blur-2xl' : 'bg-black/60 backdrop-blur-2xl'}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0 border-b ${lm ? 'border-slate-200' : 'border-white/[0.06]'}`}>
              <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPortal(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-[13px] transition-all duration-200 ${
                  lm
                    ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                    : 'bg-white/[0.08] text-white/70 border border-white/[0.12] hover:bg-white/[0.14] hover:text-white'
                }`}>
                <span className="text-[15px] leading-none">←</span>
                <span>Back</span>
              </motion.button>

              {/* Language selector inside portal */}
              <div className="relative">
                <button onClick={() => setLangOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-[18px] text-[11px] uppercase tracking-[0.15em] transition-all duration-300 ${
                    lm
                      ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-white/[0.12] bg-white/[0.06] text-white/80 hover:bg-white/[0.11] hover:border-white/[0.2]'
                  }`}>
                  <Globe size={13} strokeWidth={1.6} className="flex-shrink-0" />{language}
                  <span className={`text-[9px] ${lm ? 'text-slate-400' : 'text-white/35'}`}>{langOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.94 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/[0.09] bg-[rgba(8,8,14,0.92)] backdrop-blur-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50"
                    >
                      {LANGUAGES.map(lang => (
                        <button key={lang.label} onClick={() => { setLanguage(lang.label); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-[12px] tracking-wide transition-all duration-150
                            ${lang.label === language ? 'text-white bg-white/[0.10] border-l-2 border-white/40' : 'text-white/55 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Portal search bar */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="w-full backdrop-blur-[20px] bg-white/[0.07] border border-white/[0.12] rounded-2xl px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] focus-within:border-white/[0.22] focus-within:bg-white/[0.10] transition-all duration-300">
                <input type="text" value={portalQuery} onChange={e => setPortalQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && portalQuery.trim()) {
                      searchAll(portalQuery, 'specific');
                      setShowPortal(false);
                    }
                  }}
                  placeholder="Search everything in the cosmos…"
                  className="w-full bg-transparent outline-none text-white placeholder-white/35 text-[15px] tracking-wide font-light"
                  autoFocus />
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-5 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {PORTAL_TABS.map(tab => (
                  <button key={tab} onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'All') { setShowPortal(false); clearSearch(); }
                    else { searchAll(tab, 'specific'); setShowPortal(false); }
                  }}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.14em] border transition-all duration-300 hover:-translate-y-px
                      ${activeTab === tab
                        ? 'border-white/[0.35] bg-white/[0.13] text-white shadow-[0_2px_12px_rgba(255,255,255,0.06)]'
                        : 'border-white/[0.09] bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.17]'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">

              {/* ── Singularity Nexus — AI Chat (pinned to top) ── */}
              <div className="mb-7 pt-2">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2
                    className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`}
                    style={{ fontFamily: 'var(--app-font-heading)' }}
                  >
                    ✦ Singularity Nexus
                  </h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>
                    DeepSeek R1 AI
                  </span>
                </div>
                <SingularityLaunchButton />
              </div>

              {/* Cosmic Pix — avatar cards */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Cosmic Pix</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>AI Avatars</span>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {AVATARS.map(av => (
                    <AvatarCard
                      key={av.name}
                      name={av.name}
                      subtitle={av.role}
                      image={av.image}
                      onChat={() => openChat(av)}
                      lm={lm}
                    />
                  ))}
                </div>
              </div>

              {/* ── Banner Carousel ── */}
              <BannerCarousel lm={lm} />

              {/* ── Black Holes ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Black Holes</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Singularities & Event Horizons</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {portalBlackHoles.length > 0
                    ? portalBlackHoles.map(item => (
                        <PortalWikiCard key={item.pageid} item={item} lm={lm}
                          onSelect={() => setSelectedCard({ source: 'wiki', item })} />
                      ))
                    : [...Array(3)].map((_, i) => (
                        <div key={i} className={`flex-shrink-0 w-52 h-44 rounded-xl animate-pulse ${lm ? 'border border-slate-200 bg-slate-100' : 'border border-white/8 bg-white/4 backdrop-blur-md'}`} />
                      ))}
                </div>
              </div>

              {/* ── Equations ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Equations</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>The Language of the Universe</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {portalEquations.length > 0
                    ? portalEquations.map(item => (
                        <PortalWikiCard key={item.pageid} item={item} lm={lm}
                          onSelect={() => setSelectedCard({ source: 'wiki', item })} />
                      ))
                    : [...Array(3)].map((_, i) => (
                        <div key={i} className={`flex-shrink-0 w-52 h-44 rounded-xl animate-pulse ${lm ? 'border border-slate-200 bg-slate-100' : 'border border-white/8 bg-white/4 backdrop-blur-md'}`} />
                      ))}
                </div>
              </div>

              {/* ── Simulation Search ── */}
              <SimulationSearch lm={lm} />

              {/* ── Biology Hub Hero Card ── */}
              <BioHeroCard lm={lm} onOpen={() => setShowBiologyHub(true)} />

              {/* ── Quantum Lab ── */}
              <div className="mb-6 cv-section">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide flex items-center gap-1.5 ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}><Atom size={15} strokeWidth={1.6} className="flex-shrink-0" />Quantum Lab</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Interactive Science Simulations</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 perf-scroll">
                  {PHET_SIMULATIONS.map((sim, idx) => (
                    <PortalSimCard
                      key={sim.slug}
                      sim={sim}
                      index={idx}
                      onSelect={() => setSimulationModal(sim)}
                      lm={lm}
                    />
                  ))}
                </div>
              </div>

              {/* ── Advanced Sandbox ── */}
              <div className="mb-6 cv-section">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide flex items-center gap-1.5 ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}><Settings2 size={15} strokeWidth={1.6} className="flex-shrink-0" />Advanced Sandbox</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Next-Gen STEM Simulations</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 perf-scroll">
                  {ADVANCED_SIMS.map((sim, idx) => (
                    <AdvSimCard
                      key={sim.id}
                      sim={sim}
                      index={idx}
                      onSelect={() => setAdvModal(sim)}
                      lm={lm}
                    />
                  ))}
                </div>
              </div>

              {/* ── Cosmic Masterpieces ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2
                    className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`}
                    style={{ fontFamily: 'var(--app-font-heading)' }}
                  >
                    Cosmic Masterpieces
                  </h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>
                    Cinematic 3D Experiences
                  </span>
                  <span className={`ml-auto text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    lm ? 'bg-violet-100 text-violet-600 border border-violet-200' : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                  }`}>
                    Coming Soon
                  </span>
                </div>

                {/* ── Scrollable card row ── */}
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-3">
                  {COSMIC_MASTERPIECES.map((piece, idx) => (
                    <MasterpieceCard
                      key={piece.id}
                      piece={piece}
                      index={idx}
                      lm={lm}
                      onSelect={() => setMasterpieceModal(piece)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Arcade Zone ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide flex items-center gap-1.5 ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}><Gamepad2 size={15} strokeWidth={1.6} className="flex-shrink-0" />Arcade Zone</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Pure Fun & Games</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {FUN_GAMES.map((game, idx) => (
                    <FunGameCard
                      key={game.id}
                      game={game}
                      index={idx}
                      onSelect={() => setArcadeModal(game)}
                      lm={lm}
                    />
                  ))}
                </div>
              </div>

              {/* ── Grandmaster Chess ── */}
              <div className="mb-4">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>Grandmaster Chess</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Challenge the Geniuses</span>
                </div>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowChess(true)}
                  className={`cursor-pointer w-full rounded-2xl overflow-hidden border transition-all duration-300 ${
                    lm
                      ? 'border-violet-200 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 hover:border-violet-400 hover:shadow-[0_8px_28px_rgba(139,92,246,0.18)]'
                      : 'border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/8 to-indigo-500/10 hover:border-violet-400/50 hover:shadow-[0_12px_40px_rgba(139,92,246,0.3)]'
                  }`}
                >
                  <div className="flex items-center gap-5 px-5 py-5">
                    {/* Chess piece cluster */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 ${
                      lm ? 'bg-white shadow-sm border border-violet-100' : 'bg-white/[0.06] border border-white/[0.10]'
                    }`}>
                      ♛
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-semibold tracking-[-0.01em] mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>
                        Play Grandmaster Chess
                      </p>
                      <p className={`text-[12px] leading-relaxed ${lm ? 'text-slate-500' : 'text-white/40'}`}>
                        Pass &amp; Play, challenge Einstein or Feynman, or watch two geniuses battle it out with Minimax AI.
                      </p>
                      {/* Avatar previews */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {[
                          { img: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg', name: 'Einstein' },
                          { img: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg', name: 'Feynman' },
                          { img: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg', name: 'Tesla' },
                          { img: '/mehera.jpg', name: 'Mahera' },
                        ].map((av, i) => (
                          <div key={av.name} className="w-6 h-6 rounded-full overflow-hidden border-2 border-violet-300/40 -ml-1 first:ml-0 shadow-sm">
                            <img src={av.img} alt={av.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ))}
                        <span className={`ml-1 text-[10px] ${lm ? 'text-slate-400' : 'text-white/30'}`}>5 opponents</span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                      lm ? 'bg-violet-100 text-violet-600' : 'bg-violet-500/20 text-violet-300'
                    }`}>›</div>
                  </div>
                </motion.div>
              </div>

              {/* ── Cosmic Carrom ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>Cosmic Carrom</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Physics Board Game</span>
                </div>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCarrom(true)}
                  className={`cursor-pointer w-full rounded-2xl overflow-hidden border transition-all duration-300 ${
                    lm
                      ? 'border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 hover:border-amber-400 hover:shadow-[0_8px_28px_rgba(245,158,11,0.18)]'
                      : 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/8 to-yellow-500/10 hover:border-amber-400/50 hover:shadow-[0_12px_40px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  <div className="flex items-center gap-5 px-5 py-5">
                    {/* Carrom board icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      lm ? 'bg-white shadow-sm border border-amber-100' : 'bg-white/[0.06] border border-white/[0.10]'
                    }`}>
                      <Target size={34} strokeWidth={1.3} className={lm ? 'text-amber-500' : 'text-amber-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-semibold tracking-[-0.01em] mb-1 ${lm ? 'text-slate-900' : 'text-white'}`}>
                        Play Cosmic Carrom
                      </p>
                      <p className={`text-[12px] leading-relaxed ${lm ? 'text-slate-500' : 'text-white/40'}`}>
                        Realistic 2D physics board. Pass &amp; Play, challenge Mom (unbeatable grandmaster) or Feynman (beginner), or watch AI spectate.
                      </p>
                      {/* Avatar previews */}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {[
                          { img: '/mehera.jpg', name: 'Mom' },
                          { img: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg', name: 'Einstein' },
                          { img: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg', name: 'Feynman' },
                          { img: '/carl-sagan.jpg', name: 'Sagan' },
                          { img: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg', name: 'Tesla' },
                        ].map(av => (
                          <div key={av.name} className="w-6 h-6 rounded-full overflow-hidden border-2 border-amber-300/40 -ml-1 first:ml-0 shadow-sm">
                            <img src={av.img} alt={av.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        ))}
                        <span className={`ml-1 text-[10px] ${lm ? 'text-slate-400' : 'text-white/30'}`}>5 avatars</span>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                      lm ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/20 text-amber-300'
                    }`}>›</div>
                  </div>
                </motion.div>
              </div>

              {/* ── My Command Center ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: 'var(--app-font-heading)' }}>My Command Center</h2>
                  <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>Cosmic Profile</span>
                </div>
                <motion.div
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowProfile(true)}
                  className="cursor-pointer w-full rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: lm
                      ? 'rgba(248,246,255,0.95)'
                      : 'rgba(12,10,26,0.82)',
                    border: lm
                      ? '1px solid rgba(139,92,246,0.18)'
                      : '1px solid rgba(139,92,246,0.16)',
                    boxShadow: lm
                      ? '0 4px 24px rgba(139,92,246,0.07)'
                      : '0 8px 32px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                      style={{
                        border: '2px solid rgba(139,92,246,0.45)',
                        boxShadow: '0 0 0 3px rgba(139,92,246,0.10), 0 0 20px rgba(139,92,246,0.18)',
                      }}
                    >
                      <img
                        src={user?.avatar ?? PRESET_AVATARS[0].url}
                        alt={user?.username ?? 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[9px] uppercase tracking-[0.3em] font-mono mb-1 ${lm ? 'text-slate-400' : 'text-white/28'}`}>
                        Command Center
                      </p>
                      <p className={`text-[15px] font-light tracking-tight truncate ${lm ? 'text-slate-900' : 'text-white'}`}>
                        {user?.username ?? 'My Profile'}
                      </p>
                      <p className={`text-[11px] font-mono truncate mt-0.5 ${lm ? 'text-slate-400' : 'text-white/35'}`}>
                        {user?.email ?? ''}
                      </p>
                    </div>
                    {/* Stats inline preview */}
                    {user && (
                      <div className="flex-shrink-0 flex flex-col items-end gap-0.5 mr-1">
                        <p className={`text-[10px] font-mono ${lm ? 'text-slate-400' : 'text-white/30'}`}>
                          <span className="text-purple-400 font-medium">{user.chessWins}W</span>
                          {' / '}
                          <span className="text-white/40">{user.chessLosses}L</span>
                        </p>
                        <p className={`text-[9px] uppercase tracking-widest font-mono ${lm ? 'text-slate-300' : 'text-white/20'}`}>chess</p>
                      </div>
                    )}
                    {/* Arrow */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[18px] ${
                      lm ? 'bg-violet-100 text-violet-500' : 'bg-white/[0.05] text-white/30'
                    }`}>›</div>
                  </div>
                </motion.div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-30  Library ── */}
      <AnimatePresence>
        {showLibrary && (
          <LibraryView
            onClose={() => setShowLibrary(false)}
            onDiscussWithAvatar={handleLibraryDiscuss}
            avatars={AVATARS.map(a => ({ name: a.name, image: a.image }))}
          />
        )}
      </AnimatePresence>

      {/* ── z-[100]  Chat Modal ── */}
      <AnimatePresence>
        {activeChat && (
          <ChatModal
            key={`${activeChat.name}-${chatSharedCtx?.title ?? 'plain'}`}
            avatar={activeChat}
            language={language}
            sharedContext={chatSharedCtx}
            onClose={closeChat}
            onInputFocus={() => setChatInputFocused(true)}
            onInputBlur={() => setChatInputFocused(false)}
          />
        )}
      </AnimatePresence>

      {/* ── z-[250]  Simulation Modal (PhET / Quantum Lab) ── */}
      <AnimatePresence>
        {simulationModal && (
          <SimulationModal
            sim={simulationModal}
            onClose={() => setSimulationModal(null)}
            lm={lm}
          />
        )}
      </AnimatePresence>

      {/* ── z-[250]  Advanced Sandbox Modal ── */}
      <AnimatePresence>
        {advModal && (
          <AdvSandboxModal
            sim={advModal}
            onClose={() => setAdvModal(null)}
            lm={lm}
          />
        )}
      </AnimatePresence>

      {/* ── z-[250]  Arcade Zone Modal ── */}
      <AnimatePresence>
        {arcadeModal && (
          <ArcadeModal
            game={arcadeModal}
            onClose={() => setArcadeModal(null)}
            lm={lm}
          />
        )}
      </AnimatePresence>

      {/* ── z-[350]  Profile Modal ── */}
      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} lm={lm} />}
      </AnimatePresence>

      {/* ── z-[150]  Cosmic Nexus Social Hub ── */}
      <AnimatePresence>
        {showNexus && (
          <Suspense fallback={null}>
            <CosmicNexus onClose={() => setShowNexus(false)} lm={lm} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── z-[160]  Biology Hub ── */}
      <AnimatePresence>
        {showBiologyHub && (
          <Suspense fallback={null}>
            <BiologyHub
              lm={lm}
              onToggleLm={() => setIsLightMode((v) => !v)}
              onClose={() => setShowBiologyHub(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── z-[300]  Grandmaster Chess Modal ── */}
      <AnimatePresence>
        {showChess && (
          <Suspense fallback={null}>
            <GrandmasterChessModal
              onClose={() => setShowChess(false)}
              lm={lm}
              onGameEnd={recordChessResult}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── z-[300]  Cosmic Carrom Modal ── */}
      <AnimatePresence>
        {showCarrom && (
          <Suspense fallback={null}>
            <CosmicCarromModal
              onClose={() => setShowCarrom(false)}
              lm={lm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ── z-[350]  Video Player Modal ── */}
      <AnimatePresence>
        {activeVideo && (
          <VideoPlayerModal
            video={activeVideo}
            onClose={() => setActiveVideo(null)}
            lm={lm}
          />
        )}
      </AnimatePresence>

      {/* ── z-[200]  NASA Detail Modal ── */}
      <AnimatePresence>
        {selectedCard && (
          <DetailModal
            item={selectedCard}
            onClose={() => setSelectedCard(null)}
            lm={lm}
            chatAvatars={AVATARS.map(a => ({ name: a.name, image: a.image }))}
            onShareToChat={(avatarName) => {
              const ctx = buildSharedContext(selectedCard);
              setSelectedCard(null);
              openChatWithContext(avatarName, ctx);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── z-[300]  Cosmic 3D Viewer Modal ── */}
      <AnimatePresence>
        {masterpieceModal && (
          <Suspense fallback={null}>
            <Cosmic3DViewerModal
              item={masterpieceModal}
              onClose={() => setMasterpieceModal(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

    </div>
  );
}
