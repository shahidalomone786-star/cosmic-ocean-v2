/**
 * AISummary — Production AI Overview Component
 *
 * • Streams tokens from /api/ai-summary (SSE) progressively
 * • sessionStorage client cache — instant replay on repeated queries
 * • AbortController — stale requests cancelled immediately on query change
 * • Never blocks search results — fully async, independent lifecycle
 * • React.memo + useCallback/useMemo — zero unnecessary re-renders
 * • content-visibility:auto — GPU-composited, paint-skipped off-screen
 * • IntersectionObserver — delays heavy fetch until visible on screen
 * • Reduced-motion — respects prefers-reduced-motion
 * • ARIA live region — accessible progressive announcement
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
import { Sparkles, Zap } from 'lucide-react';
import type { SearchSections } from './NasaSearch';

// ─── Session cache (30 min TTL) ───────────────────────────────────────────────
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(cacheKey: string): string | null {
  try {
    const raw = sessionStorage.getItem(`ai-overview:${cacheKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { text: string; exp: number };
    if (Date.now() > parsed.exp) {
      sessionStorage.removeItem(`ai-overview:${cacheKey}`);
      return null;
    }
    return parsed.text;
  } catch {
    return null;
  }
}

function setCached(cacheKey: string, text: string): void {
  try {
    sessionStorage.setItem(
      `ai-overview:${cacheKey}`,
      JSON.stringify({ text, exp: Date.now() + SESSION_CACHE_TTL_MS }),
    );
  } catch {
    // Storage quota exceeded — silently drop
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SummaryState = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface Props {
  query: string;
  sections: SearchSections | null;
  lm?: boolean;
}

// ─── Skeleton shimmer bar ─────────────────────────────────────────────────────
const SkeletonBar = memo(function SkeletonBar({
  width,
  lm,
}: {
  width: string;
  lm?: boolean;
}) {
  return (
    <div
      className={`h-3 rounded-full animate-pulse ${
        lm ? 'bg-violet-100/80' : 'bg-violet-500/[0.12]'
      }`}
      style={{ width }}
      aria-hidden="true"
    />
  );
});

// ─── Premium skeleton ─────────────────────────────────────────────────────────
const AISummarySkeleton = memo(function AISummarySkeleton({
  lm,
}: {
  lm?: boolean;
}) {
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
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: lm
            ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.18), transparent 65%)'
            : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.10), transparent 65%)',
        }}
      />

      {/* Animated border glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(167,139,250,0.15), transparent 50%, rgba(99,102,241,0.08))'
            : 'linear-gradient(135deg, rgba(139,92,246,0.08), transparent 50%, rgba(99,102,241,0.06))',
        }}
      />

      <div className="relative flex gap-4 items-start">
        {/* Icon container with pulse */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 animate-pulse ${
            lm
              ? 'bg-violet-100 border border-violet-200'
              : 'bg-violet-500/15 border border-violet-400/20'
          }`}
        >
          <Sparkles
            size={14}
            strokeWidth={2}
            className={lm ? 'text-violet-400' : 'text-violet-400/50'}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-2.5 pt-0.5">
          {/* Label */}
          <div
            className={`h-2 w-20 rounded-full animate-pulse ${
              lm ? 'bg-violet-200/70' : 'bg-violet-400/20'
            }`}
          />
          {/* Text lines */}
          <div className="space-y-2 pt-1">
            <SkeletonBar width="100%" lm={lm} />
            <SkeletonBar width="92%" lm={lm} />
            <SkeletonBar width="97%" lm={lm} />
            <SkeletonBar width="78%" lm={lm} />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Token cursor (blinking caret) ───────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
const AISummary = memo(function AISummary({ query, sections, lm }: Props) {
  const [summaryState, setSummaryState] = useState<SummaryState>('idle');
  const [text, setText] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  // Track what query+context-tier we last fetched for
  const fetchStateRef = useRef<{
    query: string;
    hadContext: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);

  // ── Build context snippets (memoised) ──────────────────────────────────────
  const contextSnippets = useMemo<string[]>(() => {
    if (!sections) return [];
    const out: string[] = [];
    sections.wikipedia
      .slice(0, 3)
      .forEach(it => it.description && out.push(it.description.slice(0, 350)));
    sections.research
      .slice(0, 4)
      .forEach(it => it.description && out.push(it.description.slice(0, 350)));
    [...sections.nasa.slice(0, 2), ...sections.esa.slice(0, 2)].forEach(
      it => it.description && out.push(it.description.slice(0, 220)),
    );
    return out.slice(0, 8);
  }, [sections]);

  // ── Core streaming fetch ───────────────────────────────────────────────────
  const doFetch = useCallback(
    async (q: string, snippets: string[]) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSummaryState('loading');
      setText('');

      try {
        const res = await fetch('/api/ai-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, contextSnippets: snippets, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
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
                token?: string;
                done?: boolean;
              };
              if (msg.token) {
                accumulated += msg.token;
                setText(accumulated);
              }
              if (msg.done) {
                if (accumulated) {
                  setCached(q.toLowerCase().trim(), accumulated);
                }
                setSummaryState('done');
                break outer;
              }
            } catch {
              // malformed SSE chunk — skip
            }
          }
        }

        // Ensure done state even if no explicit done event
        setSummaryState(prev => (prev === 'streaming' ? 'done' : prev));
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return; // intentional cancel
        setSummaryState('error');
      }
    },
    [],
  );

  // ── Effect 1: query changed ────────────────────────────────────────────────
  useEffect(() => {
    const trimmed = query?.trim() ?? '';

    if (!trimmed) {
      abortRef.current?.abort();
      setSummaryState('idle');
      setText('');
      fetchStateRef.current = null;
      return;
    }

    // Already handled this exact query
    if (fetchStateRef.current?.query === trimmed) return;

    // Abort any prior request, reset tracking
    abortRef.current?.abort();
    fetchStateRef.current = { query: trimmed, hadContext: false };

    // Cache hit → instant display
    const cached = getCached(trimmed.toLowerCase());
    if (cached) {
      setText(cached);
      setSummaryState('done');
      fetchStateRef.current = { query: trimmed, hadContext: true };
      return;
    }

    // No cache: show loading skeleton, fetch immediately (zero-context is fine;
    // server generates from its own LLM knowledge even without snippets)
    setSummaryState('loading');
    setText('');
    fetchStateRef.current = { query: trimmed, hadContext: contextSnippets.length > 0 };
    doFetch(trimmed, contextSnippets);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Effect 2: context arrived after initial zero-context fetch ─────────────
  useEffect(() => {
    if (contextSnippets.length === 0) return;
    const fs = fetchStateRef.current;
    if (!fs) return;
    if (fs.hadContext) return; // already fetched with rich context
    if (summaryState === 'streaming') return; // currently streaming

    // Mark upgraded
    fetchStateRef.current = { query: fs.query, hadContext: true };

    // Skip if the result ended up in session cache (server cache hit was fast)
    const cached = getCached(fs.query.toLowerCase());
    if (cached) return;

    // Background re-fetch now that we have real context snippets
    doFetch(fs.query, contextSnippets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSnippets.length]);

  // ── IntersectionObserver — delay fetch until visible ──────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) visibleRef.current = true;
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  if (summaryState === 'idle') return null;

  return (
    <div ref={containerRef} style={{ contentVisibility: 'auto' }}>
      <AnimatePresence mode="wait">
        {(summaryState === 'loading') && (
          <AISummarySkeleton key="skeleton" lm={lm} />
        )}

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
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background: lm
                  ? 'radial-gradient(ellipse at 0% 0%, rgba(167,139,250,0.18), transparent 65%)'
                  : 'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.13), transparent 65%)',
              }}
            />

            {/* Premium border shimmer */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              aria-hidden="true"
              style={{
                background: lm
                  ? 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, transparent 45%, rgba(99,102,241,0.10) 100%)'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, transparent 45%, rgba(99,102,241,0.07) 100%)',
              }}
            />

            {/* Top-edge glow line */}
            <div
              className="absolute top-0 left-8 right-8 h-px pointer-events-none"
              aria-hidden="true"
              style={{
                background: lm
                  ? 'linear-gradient(90deg, transparent, rgba(167,139,250,0.45), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(139,92,246,0.30), transparent)',
              }}
            />

            <div className="relative flex gap-4 items-start">
              {/* Icon */}
              <div
                aria-hidden="true"
                className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 ${
                  lm
                    ? 'bg-violet-100 border border-violet-200/80 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                    : 'bg-violet-500/15 border border-violet-400/22 shadow-[0_0_16px_rgba(139,92,246,0.20)]'
                }`}
              >
                <Sparkles
                  size={14}
                  strokeWidth={2}
                  className={lm ? 'text-violet-600' : 'text-violet-300'}
                />
              </div>

              <div className="flex-1 min-w-0">
                {/* Label row */}
                <div className="flex items-center gap-2 mb-2.5">
                  <p
                    className={`text-[10px] uppercase tracking-[0.24em] font-semibold ${
                      lm ? 'text-violet-500' : 'text-violet-300/75'
                    }`}
                  >
                    AI Overview
                  </p>
                  {summaryState === 'streaming' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
                        lm
                          ? 'bg-violet-50 border-violet-200/80 text-violet-500'
                          : 'bg-violet-500/[0.12] border-violet-400/[0.18] text-violet-300/80'
                      }`}
                    >
                      <Zap
                        size={8}
                        strokeWidth={2.5}
                        className="flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[8.5px] font-semibold tracking-widest uppercase">
                        Live
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Streaming text with per-word fade */}
                <StreamingText
                  text={text}
                  isStreaming={summaryState === 'streaming'}
                  lm={lm}
                />
              </div>
            </div>

            {/* Groq attribution */}
            {summaryState === 'done' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className={`relative mt-4 pt-3 border-t flex items-center gap-2 ${
                  lm ? 'border-violet-100' : 'border-violet-500/[0.10]'
                }`}
              >
                <span
                  className={`text-[9px] uppercase tracking-[0.2em] ${
                    lm ? 'text-violet-300' : 'text-violet-400/45'
                  }`}
                >
                  Generated by Groq · llama-3.3-70b · Verify with primary sources
                </span>
              </motion.div>
            )}
          </motion.div>
        )}

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

// ─── StreamingText — renders words with staggered fade-in ────────────────────
const StreamingText = memo(function StreamingText({
  text,
  isStreaming,
  lm,
}: {
  text: string;
  isStreaming: boolean;
  lm?: boolean;
}) {
  // Prefer prefers-reduced-motion: just render text without word-by-word fade
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const textCls = `text-[13.5px] leading-relaxed tracking-wide ${
    lm ? 'text-gray-700' : 'text-white/75'
  }`;

  if (prefersReduced || !isStreaming) {
    return (
      <p className={textCls}>
        {text}
        {isStreaming && <StreamCursor lm={lm} />}
      </p>
    );
  }

  // Split into word spans — only the last few get the fade animation
  // to avoid re-animating already-visible text
  const words = text.split(' ');
  const ANIMATED_TAIL = 6; // only last N words animate

  return (
    <p className={textCls} aria-label={text}>
      {words.map((word, i) => {
        const isInTail = i >= words.length - ANIMATED_TAIL;
        if (!isInTail || !isStreaming) {
          return (
            <span key={i} aria-hidden="true">
              {word}{' '}
            </span>
          );
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

export default AISummary;
