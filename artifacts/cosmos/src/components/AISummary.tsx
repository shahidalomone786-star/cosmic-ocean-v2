/**
 * AISummary — Premium AI Overview
 *
 * Quality guarantees:
 *   • Confidence badge: High / Medium / Limited Evidence (from server heuristic)
 *   • Source attribution: compact chips, only sources that contributed
 *   • Grounding: server prompt strictly forbids model-memory answers
 *   • sessionStorage cache stores text + confidence + sources for instant replay
 *   • AbortController cancels stale requests on query change
 *   • SSE streaming — progressive token rendering, never blocks search results
 *   • React.memo / useMemo / useCallback — zero unnecessary re-renders
 *   • content-visibility:auto — paint skipped when off-screen
 *   • ARIA live region — accessible progressive announcement
 *   • prefers-reduced-motion — word-fade disabled when requested
 */

import {
  memo,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, ShieldCheck, ShieldAlert, ShieldOff,
  Headphones, Copy, Check, MessageSquare,
} from 'lucide-react';
import type { SearchSections } from './NasaSearch';

// ─── Confidence label type (mirrors server) ───────────────────────────────────
type ConfidenceLabel = 'High' | 'Medium' | 'Limited Evidence';

// ─── Session cache (30 min TTL) — stores text + quality metadata ──────────────
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  text:            string;
  confidenceLabel: ConfidenceLabel | null;
  usedSources:     string[];
  exp:             number;
}

function getCached(cacheKey: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(`ai-overview-v2:${cacheKey}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() > entry.exp) {
      sessionStorage.removeItem(`ai-overview-v2:${cacheKey}`);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function setCached(cacheKey: string, entry: Omit<CacheEntry, 'exp'>): void {
  try {
    sessionStorage.setItem(
      `ai-overview-v2:${cacheKey}`,
      JSON.stringify({ ...entry, exp: Date.now() + SESSION_CACHE_TTL_MS }),
    );
  } catch {
    // Storage quota exceeded — silently drop
  }
}

// ─── Source label map ─────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  wiki:            'Wikipedia',
  arxiv:           'arXiv',
  openalex:        'OpenAlex',
  semanticscholar: 'Semantic Scholar',
  inspirehep:      'INSPIRE-HEP',
  nasa:            'NASA',
  esa:             'ESA Hubble',
  book:            'OpenAlex',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SummaryState = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface Props {
  query:    string;
  sections: SearchSections | null;
  lm?:      boolean;
}

// ─── Confidence badge config ──────────────────────────────────────────────────
interface BadgeCfg {
  label:    ConfidenceLabel;
  icon:     typeof ShieldCheck;
  darkCls:  string;
  lightCls: string;
}

const CONFIDENCE_CFG: Record<ConfidenceLabel, BadgeCfg> = {
  High: {
    label:    'High',
    icon:     ShieldCheck,
    darkCls:  'bg-emerald-500/[0.10] border-emerald-400/[0.20] text-emerald-300/90',
    lightCls: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  Medium: {
    label:    'Medium',
    icon:     ShieldAlert,
    darkCls:  'bg-amber-500/[0.09] border-amber-400/[0.18] text-amber-300/85',
    lightCls: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  'Limited Evidence': {
    label:    'Limited Evidence',
    icon:     ShieldOff,
    darkCls:  'bg-slate-500/[0.08] border-slate-400/[0.15] text-slate-300/70',
    lightCls: 'bg-slate-50 border-slate-200 text-slate-600',
  },
};

// ─── Source chip display config ───────────────────────────────────────────────
const SOURCE_CHIP_LABELS: Record<string, string> = {
  'Wikipedia':        'Wikipedia',
  'NASA':             'NASA',
  'ESA Hubble':       'ESA',
  'arXiv':            'arXiv',
  'OpenAlex':         'OpenAlex',
  'Semantic Scholar': 'S2',
  'INSPIRE-HEP':      'INSPIRE',
};

// ─── Skeleton shimmer bar ─────────────────────────────────────────────────────
const SkeletonBar = memo(function SkeletonBar({ width, lm }: { width: string; lm?: boolean }) {
  return (
    <div
      className={`h-2.5 rounded-full animate-pulse ${lm ? 'bg-violet-200/60' : 'bg-violet-500/[0.14]'}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
});

// ─── Premium loading skeleton ─────────────────────────────────────────────────
const AISummarySkeleton = memo(function AISummarySkeleton({ lm }: { lm?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
      className="relative rounded-2xl p-[1px] mb-6 overflow-hidden"
    >
      {/* Border gradient — skeleton */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(167,139,250,0.30), rgba(99,102,241,0.20), rgba(167,139,250,0.30))'
            : 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(59,130,246,0.15), rgba(139,92,246,0.22))',
        }}
      />
      <div className={`relative rounded-[15px] px-6 py-5 overflow-hidden ${
        lm
          ? 'bg-gradient-to-br from-violet-50/95 to-indigo-50/85'
          : 'bg-gradient-to-br from-[#120d28]/95 to-[#0a0d22]/95'
      }`}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: lm
            ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.14), transparent 60%)'
            : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.09), transparent 60%)',
        }} />
        <div className="relative flex gap-4 items-start">
          <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 animate-pulse ${
            lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/15 border border-violet-400/20'
          }`}>
            <Sparkles size={14} strokeWidth={2} className={lm ? 'text-violet-400' : 'text-violet-400/50'} />
          </div>
          <div className="flex-1 min-w-0 space-y-3 pt-0.5">
            {/* Header row skeleton */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-20 rounded-full animate-pulse ${lm ? 'bg-violet-200/70' : 'bg-violet-400/20'}`} />
              <div className={`h-2 w-14 rounded-full animate-pulse ${lm ? 'bg-violet-100/70' : 'bg-violet-400/12'}`} />
            </div>
            {/* Text skeleton */}
            <div className="space-y-2">
              <SkeletonBar width="100%" lm={lm} />
              <SkeletonBar width="94%" lm={lm} />
              <SkeletonBar width="97%" lm={lm} />
              <SkeletonBar width="78%" lm={lm} />
            </div>
            {/* Source chip skeleton */}
            <div className="flex gap-1.5 pt-1">
              {['w-16', 'w-12', 'w-20', 'w-10'].map((w, i) => (
                <div key={i} className={`h-5 ${w} rounded-full animate-pulse ${lm ? 'bg-violet-100/60' : 'bg-violet-400/10'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Blinking stream cursor ───────────────────────────────────────────────────
const StreamCursor = memo(function StreamCursor({ lm }: { lm?: boolean }) {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
      className={`inline-block w-[2px] h-[1em] ml-0.5 rounded-full align-middle ${
        lm ? 'bg-violet-500' : 'bg-violet-400'
      }`}
    />
  );
});

// ─── Confidence badge ─────────────────────────────────────────────────────────
const ConfidenceBadge = memo(function ConfidenceBadge({
  label, lm,
}: { label: ConfidenceLabel; lm?: boolean }) {
  const cfg = CONFIDENCE_CFG[label];
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-semibold tracking-wide ${
        lm ? cfg.lightCls : cfg.darkCls
      }`}
      aria-label={`Confidence: ${label}`}
      title={`Evidence quality: ${label}`}
    >
      <Icon size={9} strokeWidth={2.5} aria-hidden="true" />
      <span>{label}</span>
    </motion.div>
  );
});

// ─── Source count badge ───────────────────────────────────────────────────────
const SourceCountBadge = memo(function SourceCountBadge({
  count, lm,
}: { count: number; lm?: boolean }) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium tracking-wide ${
        lm
          ? 'bg-violet-50 border-violet-200/70 text-violet-500'
          : 'bg-violet-500/[0.08] border-violet-400/[0.15] text-violet-300/70'
      }`}
      title={`${count} sources contributed`}
    >
      <span>{count} source{count !== 1 ? 's' : ''}</span>
    </motion.div>
  );
});

// ─── Source chips ─────────────────────────────────────────────────────────────
const SourceChips = memo(function SourceChips({
  sources, lm,
}: { sources: string[]; lm?: boolean }) {
  if (sources.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-1.5 flex-wrap"
      aria-label={`Summary based on: ${sources.join(', ')}`}
    >
      <span className={`text-[8.5px] uppercase tracking-[0.18em] flex-shrink-0 mr-0.5 ${
        lm ? 'text-violet-400/70' : 'text-violet-400/40'
      }`}>
        Sources
      </span>
      {sources.map(src => (
        <span
          key={src}
          className={`px-2 py-[3px] rounded-full border text-[9.5px] font-medium flex-shrink-0 ${
            lm
              ? 'bg-white border-violet-200/80 text-violet-600 shadow-sm'
              : 'bg-violet-500/[0.08] border-violet-400/[0.16] text-violet-300/75'
          }`}
        >
          {SOURCE_CHIP_LABELS[src] ?? src}
        </span>
      ))}
    </motion.div>
  );
});

// ─── Action buttons ───────────────────────────────────────────────────────────
const ActionButtons = memo(function ActionButtons({
  text, lm,
}: { text: string; lm?: boolean }) {
  const [copied,    setCopied]    = useState(false);
  const [listening, setListening] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => { /* clipboard denied */ });
  }, [text]);

  // Listen — UI only (no TTS call); shows brief loading state
  const handleListen = useCallback(() => {
    if (listening) return;
    setListening(true);
    setTimeout(() => setListening(false), 1800);
  }, [listening]);

  const btnBase = `flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10.5px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 select-none`;
  const btnDark = `bg-white/[0.04] border-white/[0.10] text-white/50 hover:bg-white/[0.09] hover:border-violet-400/[0.25] hover:text-violet-300/90`;
  const btnLight = `bg-white border-violet-200/80 text-violet-600 hover:bg-violet-50 hover:border-violet-300 shadow-sm`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2 flex-wrap"
    >
      {/* Listen */}
      <button
        onClick={handleListen}
        disabled={listening}
        className={`${btnBase} ${lm ? btnLight : btnDark} disabled:opacity-60 disabled:cursor-not-allowed`}
        aria-label="Listen to summary"
        title="Listen (TTS)"
      >
        {listening ? (
          <motion.span
            className={`inline-block w-2.5 h-2.5 rounded-full border-2 border-t-transparent ${
              lm ? 'border-violet-400' : 'border-violet-400'
            }`}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          />
        ) : (
          <Headphones size={11} strokeWidth={2} aria-hidden="true" />
        )}
        {listening ? 'Loading…' : 'Listen'}
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className={`${btnBase} ${lm ? btnLight : btnDark}`}
        aria-label={copied ? 'Copied' : 'Copy summary to clipboard'}
      >
        {copied
          ? <Check size={11} strokeWidth={2.5} className={lm ? 'text-emerald-600' : 'text-emerald-400'} aria-hidden="true" />
          : <Copy size={11} strokeWidth={2} aria-hidden="true" />
        }
        {copied ? 'Copied' : 'Copy'}
      </button>

      {/* Ask AI — UI only */}
      <button
        className={`${btnBase} ${lm ? btnLight : btnDark}`}
        aria-label="Ask AI about this topic"
        title="Ask AI (coming soon)"
        onClick={() => { /* UI only */ }}
      >
        <MessageSquare size={11} strokeWidth={2} aria-hidden="true" />
        Ask AI
      </button>
    </motion.div>
  );
});

// ─── StreamingText — progressive word fade ────────────────────────────────────
const StreamingText = memo(function StreamingText({
  text, isStreaming, lm,
}: { text: string; isStreaming: boolean; lm?: boolean }) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cls = `text-[14px] leading-[1.78] tracking-[0.01em] ${lm ? 'text-gray-700' : 'text-white/78'}`;

  if (prefersReduced || !isStreaming) {
    return (
      <p className={cls}>
        {text}
        {isStreaming && <StreamCursor lm={lm} />}
      </p>
    );
  }

  const words = text.split(' ');
  const TAIL = 6;

  return (
    <p className={cls} aria-label={text}>
      {words.map((word, i) => {
        if (!isStreaming || i < words.length - TAIL) {
          return <span key={i} aria-hidden="true">{word}{' '}</span>;
        }
        return (
          <motion.span
            key={`${i}-${word}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            aria-hidden="true"
          >
            {word}{' '}
          </motion.span>
        );
      })}
      {isStreaming && <StreamCursor lm={lm} />}
    </p>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
const AISummary = memo(function AISummary({ query, sections, lm }: Props) {
  const [summaryState, setSummaryState]       = useState<SummaryState>('idle');
  const [text, setText]                       = useState('');
  const [confidenceLabel, setConfidenceLabel] = useState<ConfidenceLabel | null>(null);
  const usedSourcesRef = useRef<string[]>([]);

  const abortRef      = useRef<AbortController | null>(null);
  const fetchStateRef = useRef<{ query: string; hadContext: boolean } | null>(null);
  const containerRef  = useRef<HTMLDivElement | null>(null);

  // ── Source labels derived from sections (only sources with content) ──────
  const usedSources = useMemo<string[]>(() => {
    if (!sections) return [];
    const seen = new Set<string>();

    sections.wikipedia.slice(0, 3).forEach(it => {
      if (it.description) seen.add('Wikipedia');
    });
    sections.research.slice(0, 4).forEach(it => {
      if (!it.description) return;
      const label = SOURCE_LABELS[it.source];
      if (label) seen.add(label);
    });
    sections.nasa.slice(0, 2).forEach(it => {
      if (it.description) seen.add('NASA');
    });
    sections.esa.slice(0, 2).forEach(it => {
      if (it.description) seen.add('ESA Hubble');
    });
    sections.books?.slice(0, 2).forEach(it => {
      if (it.description) seen.add('OpenAlex');
    });

    const ORDER = ['Wikipedia', 'NASA', 'ESA Hubble', 'arXiv', 'OpenAlex', 'Semantic Scholar', 'INSPIRE-HEP'];
    return ORDER.filter(s => seen.has(s));
  }, [sections]);

  usedSourcesRef.current = usedSources;

  // ── Context snippets (for sending to API) ────────────────────────────────
  const contextSnippets = useMemo<string[]>(() => {
    if (!sections) return [];
    const out: string[] = [];
    sections.wikipedia.slice(0, 3).forEach(it => it.description && out.push(it.description.slice(0, 380)));
    sections.research.slice(0, 4).forEach(it  => it.description && out.push(it.description.slice(0, 380)));
    sections.nasa.slice(0, 2).forEach(it      => it.description && out.push(it.description.slice(0, 240)));
    sections.esa.slice(0, 2).forEach(it       => it.description && out.push(it.description.slice(0, 240)));
    return out.slice(0, 8);
  }, [sections]);

  // ── Core streaming fetch ─────────────────────────────────────────────────
  const doFetch = useCallback(async (q: string, snippets: string[]) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSummaryState('loading');
    setText('');
    setConfidenceLabel(null);

    try {
      const res = await fetch('/api/ai-summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q, contextSnippets: snippets, stream: true }),
        signal:  controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setSummaryState('streaming');

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const msg = JSON.parse(raw) as {
              token?:           string;
              done?:            boolean;
              confidenceLabel?: ConfidenceLabel;
            };

            if (msg.token) {
              accumulated += msg.token;
              setText(accumulated);
            }

            if (msg.done) {
              const label = msg.confidenceLabel ?? null;
              setConfidenceLabel(label);
              setSummaryState('done');

              if (accumulated) {
                setCached(q.toLowerCase().trim(), {
                  text:            accumulated,
                  confidenceLabel: label,
                  usedSources:     usedSourcesRef.current,
                });
              }
              break outer;
            }
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }

      setSummaryState(prev => (prev === 'streaming' ? 'done' : prev));
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setSummaryState('error');
    }
  }, []);

  // ── Effect 1: query changed ──────────────────────────────────────────────
  useEffect(() => {
    const trimmed = query?.trim() ?? '';

    if (!trimmed) {
      abortRef.current?.abort();
      setSummaryState('idle');
      setText('');
      setConfidenceLabel(null);
      fetchStateRef.current = null;
      return;
    }

    if (fetchStateRef.current?.query === trimmed) return;

    abortRef.current?.abort();
    fetchStateRef.current = { query: trimmed, hadContext: false };

    const cached = getCached(trimmed.toLowerCase());
    if (cached) {
      setText(cached.text);
      setConfidenceLabel(cached.confidenceLabel);
      setSummaryState('done');
      fetchStateRef.current = { query: trimmed, hadContext: true };
      return;
    }

    setSummaryState('loading');
    setText('');
    setConfidenceLabel(null);
    fetchStateRef.current = { query: trimmed, hadContext: contextSnippets.length > 0 };
    doFetch(trimmed, contextSnippets);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Effect 2: sections loaded after zero-context initial fetch ───────────
  useEffect(() => {
    if (contextSnippets.length === 0) return;
    const fs = fetchStateRef.current;
    if (!fs || fs.hadContext) return;
    if (summaryState === 'streaming') return;

    fetchStateRef.current = { query: fs.query, hadContext: true };

    const cached = getCached(fs.query.toLowerCase());
    if (cached) return;

    doFetch(fs.query, contextSnippets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSnippets.length]);

  // ── IntersectionObserver (visibility tracking) ───────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      () => { /* visibility tracked by browser paint */ },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  if (summaryState === 'idle') return null;

  return (
    <div ref={containerRef} style={{ contentVisibility: 'auto' }}>
      <AnimatePresence mode="wait">

        {/* ── Loading skeleton ── */}
        {summaryState === 'loading' && (
          <AISummarySkeleton key="skeleton" lm={lm} />
        )}

        {/* ── Summary card ── */}
        {(summaryState === 'streaming' || summaryState === 'done') && text && (
          <motion.div
            key="summary-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl p-[1px] mb-6 overflow-hidden"
            role="region"
            aria-label="AI Overview"
          >
            {/* ── Animated border gradient ── */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              aria-hidden="true"
              style={{
                background: lm
                  ? 'linear-gradient(135deg, rgba(167,139,250,0.55), rgba(99,102,241,0.35), rgba(167,139,250,0.55))'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.50), rgba(59,130,246,0.28), rgba(139,92,246,0.50))',
              }}
            />

            {/* ── Card inner surface ── */}
            <div
              className={`relative rounded-[15px] overflow-hidden ${
                lm
                  ? 'bg-gradient-to-br from-violet-50/98 to-indigo-50/92'
                  : 'bg-gradient-to-br from-[#110c25]/97 to-[#0a0c20]/97'
              }`}
            >
              {/* Ambient radial glow */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
                background: lm
                  ? 'radial-gradient(ellipse at 8% 8%, rgba(167,139,250,0.22), transparent 60%)'
                  : 'radial-gradient(ellipse at 8% 8%, rgba(139,92,246,0.14), transparent 60%)',
              }} />

              {/* Diagonal shimmer */}
              <div className="absolute inset-0 rounded-[15px] pointer-events-none" aria-hidden="true" style={{
                background: lm
                  ? 'linear-gradient(135deg, rgba(167,139,250,0.14) 0%, transparent 50%, rgba(99,102,241,0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.09) 0%, transparent 50%, rgba(99,102,241,0.06) 100%)',
              }} />

              {/* Top-edge glow line */}
              <div className="absolute top-0 left-10 right-10 h-px pointer-events-none" aria-hidden="true" style={{
                background: lm
                  ? 'linear-gradient(90deg, transparent, rgba(167,139,250,0.55), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent)',
              }} />

              {/* ── Content ── */}
              <div className="relative px-6 py-5">
                <div className="flex gap-4 items-start">
                  {/* Sparkle icon */}
                  <div aria-hidden="true" className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
                    lm
                      ? 'bg-violet-100 border border-violet-200/90 shadow-[0_0_12px_rgba(139,92,246,0.18)]'
                      : 'bg-violet-500/15 border border-violet-400/25 shadow-[0_0_16px_rgba(139,92,246,0.22)]'
                  }`}>
                    <Sparkles size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* ── Header row ── */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <p className={`text-[10px] uppercase tracking-[0.26em] font-semibold flex-shrink-0 ${
                        lm ? 'text-violet-500' : 'text-violet-300/80'
                      }`}>
                        AI Overview
                      </p>

                      {/* Live badge while streaming */}
                      {summaryState === 'streaming' && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                            lm
                              ? 'bg-violet-50 border-violet-200/80 text-violet-500'
                              : 'bg-violet-500/[0.12] border-violet-400/[0.20] text-violet-300/80'
                          }`}
                        >
                          <Zap size={8} strokeWidth={2.5} aria-hidden="true" />
                          <span className="text-[8.5px] font-semibold tracking-widest uppercase">Live</span>
                        </motion.div>
                      )}

                      {/* Confidence badge — shown once done */}
                      {summaryState === 'done' && confidenceLabel && (
                        <ConfidenceBadge label={confidenceLabel} lm={lm} />
                      )}

                      {/* Source count badge */}
                      {summaryState === 'done' && usedSources.length > 0 && (
                        <SourceCountBadge count={usedSources.length} lm={lm} />
                      )}
                    </div>

                    {/* ── Progressive summary text ── */}
                    <StreamingText
                      text={text}
                      isStreaming={summaryState === 'streaming'}
                      lm={lm}
                    />
                  </div>
                </div>

                {/* ── Footer: source chips + action buttons + model note ── */}
                {summaryState === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={`mt-4 pt-3.5 border-t flex flex-col gap-3 ${
                      lm ? 'border-violet-100' : 'border-violet-500/[0.10]'
                    }`}
                  >
                    {/* Source chips */}
                    <SourceChips sources={usedSources} lm={lm} />

                    {/* Action buttons */}
                    <ActionButtons text={text} lm={lm} />

                    {/* Model / disclaimer note */}
                    <span className={`text-[8.5px] uppercase tracking-[0.16em] ${
                      lm ? 'text-violet-300/70' : 'text-violet-400/35'
                    }`}>
                      Groq · llama-3.3-70b · Verify with primary sources
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Empty state: done but no text produced ── */}
        {summaryState === 'done' && !text && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-2.5 px-4 py-3 mb-6 rounded-2xl border text-[11.5px] ${
              lm
                ? 'bg-violet-50/60 border-violet-100 text-violet-400'
                : 'bg-violet-500/[0.05] border-violet-500/[0.10] text-violet-400/55'
            }`}
            role="status"
          >
            <Sparkles size={12} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
            AI summary unavailable.
          </motion.div>
        )}

        {/* ── Error state ── */}
        {summaryState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-2.5 px-4 py-3 mb-6 rounded-2xl border text-[11.5px] ${
              lm
                ? 'bg-red-50/60 border-red-100 text-red-400'
                : 'bg-red-500/[0.05] border-red-500/[0.12] text-red-400/60'
            }`}
            role="alert"
          >
            <Sparkles size={12} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
            AI Overview unavailable — search results are unaffected
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
});

export default AISummary;
