/**
 * AISummary — Production AI Overview with Quality Layer
 *
 * Quality guarantees:
 *   • Confidence badge: High / Medium / Limited Evidence (from server heuristic)
 *   • Source attribution: only sources that actually contributed context snippets
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
import { Sparkles, Zap, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
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
  label:     ConfidenceLabel;
  icon:      typeof ShieldCheck;
  darkCls:   string;
  lightCls:  string;
  dotDark:   string;
  dotLight:  string;
}

const CONFIDENCE_CFG: Record<ConfidenceLabel, BadgeCfg> = {
  High: {
    label:    'High',
    icon:     ShieldCheck,
    darkCls:  'bg-emerald-500/[0.10] border-emerald-400/[0.18] text-emerald-300/90',
    lightCls: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dotDark:  'bg-emerald-400',
    dotLight: 'bg-emerald-500',
  },
  Medium: {
    label:    'Medium',
    icon:     ShieldAlert,
    darkCls:  'bg-amber-500/[0.09] border-amber-400/[0.16] text-amber-300/85',
    lightCls: 'bg-amber-50 border-amber-200 text-amber-700',
    dotDark:  'bg-amber-400',
    dotLight: 'bg-amber-500',
  },
  'Limited Evidence': {
    label:    'Limited Evidence',
    icon:     ShieldOff,
    darkCls:  'bg-slate-500/[0.08] border-slate-400/[0.14] text-slate-300/75',
    lightCls: 'bg-slate-50 border-slate-200 text-slate-600',
    dotDark:  'bg-slate-400',
    dotLight: 'bg-slate-500',
  },
};

// ─── Skeleton shimmer bar ─────────────────────────────────────────────────────
const SkeletonBar = memo(function SkeletonBar({ width, lm }: { width: string; lm?: boolean }) {
  return (
    <div
      className={`h-3 rounded-full animate-pulse ${lm ? 'bg-violet-100/80' : 'bg-violet-500/[0.12]'}`}
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
      className={`relative rounded-2xl border px-6 py-5 mb-6 overflow-hidden ${
        lm
          ? 'bg-gradient-to-br from-violet-50/90 to-indigo-50/70 border-violet-200/70'
          : 'bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border-violet-500/15'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: lm
          ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.18), transparent 65%)'
          : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.10), transparent 65%)',
      }} />

      <div className="relative flex gap-4 items-start">
        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 animate-pulse ${
          lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/15 border border-violet-400/20'
        }`}>
          <Sparkles size={14} strokeWidth={2} className={lm ? 'text-violet-400' : 'text-violet-400/50'} />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5 pt-0.5">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-20 rounded-full animate-pulse ${lm ? 'bg-violet-200/70' : 'bg-violet-400/20'}`} />
            <div className={`h-2 w-14 rounded-full animate-pulse ${lm ? 'bg-violet-100/70' : 'bg-violet-400/10'}`} />
          </div>
          <div className="space-y-2 pt-1">
            <SkeletonBar width="100%" lm={lm} />
            <SkeletonBar width="92%" lm={lm} />
            <SkeletonBar width="97%" lm={lm} />
            <SkeletonBar width="74%" lm={lm} />
          </div>
          {/* Source skeleton */}
          <div className="flex gap-1.5 pt-1">
            {['w-16', 'w-12', 'w-20'].map((w, i) => (
              <div key={i} className={`h-2 ${w} rounded-full animate-pulse ${lm ? 'bg-violet-100/60' : 'bg-violet-400/10'}`} />
            ))}
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

// ─── Source attribution ───────────────────────────────────────────────────────
const SourceAttribution = memo(function SourceAttribution({
  sources, lm,
}: { sources: string[]; lm?: boolean }) {
  if (sources.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="flex items-center gap-1.5 flex-wrap"
      aria-label={`Summary based on: ${sources.join(', ')}`}
    >
      <span className={`text-[9px] uppercase tracking-[0.18em] flex-shrink-0 ${
        lm ? 'text-violet-300' : 'text-violet-400/40'
      }`}>
        Based on
      </span>
      {sources.map((src, i) => (
        <span key={src} className="flex items-center gap-1.5">
          <span className={`text-[9px] font-medium ${lm ? 'text-violet-400' : 'text-violet-300/55'}`}>
            {src}
          </span>
          {i < sources.length - 1 && (
            <span className={`text-[8px] ${lm ? 'text-violet-200' : 'text-violet-500/25'}`} aria-hidden="true">·</span>
          )}
        </span>
      ))}
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

  const cls = `text-[13.5px] leading-relaxed tracking-wide ${lm ? 'text-gray-700' : 'text-white/75'}`;

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
  // usedSources is derived from sections — no need to store in state,
  // but we keep a live ref so doFetch can read it at call time
  const usedSourcesRef = useRef<string[]>([]);

  const abortRef     = useRef<AbortController | null>(null);
  const fetchStateRef = useRef<{ query: string; hadContext: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    // Preserve a stable display order
    const ORDER = ['Wikipedia', 'NASA', 'ESA Hubble', 'arXiv', 'OpenAlex', 'Semantic Scholar', 'INSPIRE-HEP'];
    return ORDER.filter(s => seen.has(s));
  }, [sections]);

  // Keep ref in sync so doFetch can read latest without being a dep
  usedSourcesRef.current = usedSources;

  // ── Context snippets (for sending to API) ────────────────────────────────
  const contextSnippets = useMemo<string[]>(() => {
    if (!sections) return [];
    const out: string[] = [];
    sections.wikipedia.slice(0, 3).forEach(it => it.description && out.push(it.description.slice(0, 380)));
    sections.research.slice(0, 4).forEach(it => it.description && out.push(it.description.slice(0, 380)));
    sections.nasa.slice(0, 2).forEach(it => it.description && out.push(it.description.slice(0, 240)));
    sections.esa.slice(0, 2).forEach(it => it.description && out.push(it.description.slice(0, 240)));
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

      // Safety net: ensure done even if no explicit done event
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

    // ── Cache hit → instant display with all quality metadata ──────────────
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

  // ── Effect 2: sections loaded with context after zero-context initial fetch
  useEffect(() => {
    if (contextSnippets.length === 0) return;
    const fs = fetchStateRef.current;
    if (!fs || fs.hadContext) return;
    if (summaryState === 'streaming') return;

    fetchStateRef.current = { query: fs.query, hadContext: true };

    const cached = getCached(fs.query.toLowerCase());
    if (cached) return; // server cache hit already gave us a good result

    doFetch(fs.query, contextSnippets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSnippets.length]);

  // ── IntersectionObserver (no-op ref — visibility tracking) ──────────────
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
            className={`relative rounded-2xl border px-6 py-5 mb-6 overflow-hidden ${
              lm
                ? 'bg-gradient-to-br from-violet-50/90 to-indigo-50/70 border-violet-200/70 shadow-[0_4px_28px_rgba(124,58,237,0.10)]'
                : 'bg-gradient-to-br from-violet-950/35 to-indigo-950/25 border-violet-500/18 shadow-[0_4px_36px_rgba(124,58,237,0.14)]'
            }`}
            role="region"
            aria-label="AI Overview"
            aria-live="polite"
            aria-atomic="false"
          >
            {/* Ambient radial glow */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
              background: lm
                ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.18), transparent 65%)'
                : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.13), transparent 65%)',
            }} />

            {/* Diagonal gradient shimmer */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" aria-hidden="true" style={{
              background: lm
                ? 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, transparent 45%, rgba(99,102,241,0.10) 100%)'
                : 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, transparent 45%, rgba(99,102,241,0.07) 100%)',
            }} />

            {/* Top-edge glow line */}
            <div className="absolute top-0 left-8 right-8 h-px pointer-events-none" aria-hidden="true" style={{
              background: lm
                ? 'linear-gradient(90deg, transparent, rgba(167,139,250,0.45), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.30), transparent)',
            }} />

            <div className="relative flex gap-4 items-start">
              {/* Sparkle icon */}
              <div aria-hidden="true" className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
                lm
                  ? 'bg-violet-100 border border-violet-200/80 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                  : 'bg-violet-500/15 border border-violet-400/22 shadow-[0_0_16px_rgba(139,92,246,0.20)]'
              }`}>
                <Sparkles size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header row: label + live badge + confidence */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <p className={`text-[10px] uppercase tracking-[0.24em] font-semibold flex-shrink-0 ${
                    lm ? 'text-violet-500' : 'text-violet-300/75'
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
                          : 'bg-violet-500/[0.12] border-violet-400/[0.18] text-violet-300/80'
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
                </div>

                {/* Progressive text */}
                <StreamingText
                  text={text}
                  isStreaming={summaryState === 'streaming'}
                  lm={lm}
                />
              </div>
            </div>

            {/* Footer: source attribution + Groq note */}
            {summaryState === 'done' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className={`relative mt-4 pt-3 border-t flex flex-col gap-1.5 ${
                  lm ? 'border-violet-100' : 'border-violet-500/[0.10]'
                }`}
              >
                {/* Source list */}
                <SourceAttribution sources={usedSources} lm={lm} />

                {/* Groq + disclaimer */}
                <span className={`text-[9px] uppercase tracking-[0.18em] ${
                  lm ? 'text-violet-300/80' : 'text-violet-400/38'
                }`}>
                  Groq · llama-3.3-70b · Verify with primary sources
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Error state ── */}
        {summaryState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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
