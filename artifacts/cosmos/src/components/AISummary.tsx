/**
 * AISummary — 3-D Glassmorphism AI Overview + Follow-Up Research Copilot
 *
 * Design:
 *   • bg-[#0A0A10]/70 backdrop-blur-2xl animated-gradient-border card
 *   • Premium chip / button system: bg-white/5 border border-white/10 backdrop-blur-md
 *   • Neural TTS: fetch /api/tts → Blob → URL.createObjectURL → Audio.play()
 *   • Follow-up responses: each in its own glassmorphism bubble + dedicated Listen button
 *
 * Performance:
 *   • React.memo on every sub-component — FollowUpPanel never re-renders parent
 *   • sessionStorage cache (30-min TTL)
 *   • AbortController on every fetch
 *   • content-visibility:auto
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
  Headphones, Copy, Check, ArrowRight, Volume2,
} from 'lucide-react';
import type { SearchSections } from './NasaSearch';

// ─── Types ────────────────────────────────────────────────────────────────────
type ConfidenceLabel = 'High' | 'Medium' | 'Limited Evidence';
type SummaryState    = 'idle' | 'loading' | 'streaming' | 'done' | 'error';
type FollowUpState   = 'idle' | 'loading' | 'streaming' | 'done' | 'error';
type ListenState     = 'idle' | 'loading' | 'playing' | 'error';

interface Props {
  query:    string;
  sections: SearchSections | null;
  lm?:      boolean;
}

// ─── Session cache (30-min TTL) ───────────────────────────────────────────────
const CACHE_TTL = 30 * 60 * 1000;
interface CacheEntry {
  text:            string;
  confidenceLabel: ConfidenceLabel | null;
  usedSources:     string[];
  exp:             number;
}
function getCached(key: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(`ai-v3:${key}`);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    if (Date.now() > e.exp) { sessionStorage.removeItem(`ai-v3:${key}`); return null; }
    return e;
  } catch { return null; }
}
function setCached(key: string, e: Omit<CacheEntry, 'exp'>) {
  try { sessionStorage.setItem(`ai-v3:${key}`, JSON.stringify({ ...e, exp: Date.now() + CACHE_TTL })); }
  catch { /* quota */ }
}

// ─── Source constants ─────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = {
  wiki: 'Wikipedia', arxiv: 'arXiv', openalex: 'OpenAlex',
  semanticscholar: 'Semantic Scholar', inspirehep: 'INSPIRE-HEP',
  nasa: 'NASA', esa: 'ESA Hubble', book: 'OpenAlex',
};
const SOURCE_CHIP: Record<string, string> = {
  'Wikipedia': 'Wikipedia', 'NASA': 'NASA', 'ESA Hubble': 'ESA',
  'arXiv': 'arXiv', 'OpenAlex': 'OpenAlex',
  'Semantic Scholar': 'S2', 'INSPIRE-HEP': 'INSPIRE',
};
const SOURCE_ORDER = ['Wikipedia','NASA','ESA Hubble','arXiv','OpenAlex','Semantic Scholar','INSPIRE-HEP'];

const QUICK_PROMPTS = [
  'Explain Simply', 'Give Examples', 'Compare Concepts',
  'Latest Research', 'Real-world Applications',
] as const;

// ─── Confidence config ────────────────────────────────────────────────────────
const CONF: Record<ConfidenceLabel, { icon: typeof ShieldCheck; cls: string }> = {
  'High':             { icon: ShieldCheck, cls: 'text-emerald-400/80 border-emerald-400/20 bg-emerald-400/8'  },
  'Medium':           { icon: ShieldAlert, cls: 'text-amber-400/80  border-amber-400/20  bg-amber-400/8'    },
  'Limited Evidence': { icon: ShieldOff,   cls: 'text-slate-400/70  border-slate-400/15  bg-slate-400/6'    },
};

// ─── Shared button/chip class ─────────────────────────────────────────────────
// NOTE: the two `shadow-*` utilities requested (shadow-xl + shadow-[inset...]) both write to the
// same --tw-shadow CSS variable, so stacking them as separate classes means only one survives —
// merged into a single shadow-[...] with comma-separated layers (shadow-xl's real px values + inset).
const CHIP = `bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-2xl px-4 py-2
              transition-all duration-300 text-sm font-medium backdrop-blur-xl
              shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
              disabled:opacity-40 disabled:cursor-not-allowed`;

// Small variant for badges inside the header
const CHIP_SM = `bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-2xl px-3 py-1
                transition-all duration-300 text-xs font-medium backdrop-blur-xl
                shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
                disabled:opacity-40 disabled:cursor-not-allowed`;

// ─── TTS helper ───────────────────────────────────────────────────────────────
function cleanTtsText(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, ' formula ')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' formula ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' formula ')
    .replace(/\$[^$]*\$/g, ' formula ')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 2500);
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser speech is unavailable'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanTtsText(text));
    utterance.rate = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser speech failed'));
    window.speechSynthesis.speak(utterance);
  });
}

async function playTTS(text: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/tts', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text: cleanTtsText(text) }),
    signal,
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let settled = false;
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      signal?.removeEventListener('abort', onAbort);
      URL.revokeObjectURL(url);
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      error ? reject(error) : resolve();
    };
    const onAbort = () => {
      audio.pause();
      audio.src = '';
      finish(new DOMException('TTS playback aborted', 'AbortError'));
    };
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('audio playback failed'));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    audio.play().catch(error => finish(error));
  });
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = memo(function Spinner({ size = 12, color = 'border-violet-400' }: { size?: number; color?: string }) {
  return (
    <motion.span
      className={`inline-block rounded-full border-2 border-t-transparent ${color}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.65, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    />
  );
});

// ─── Listen button (shared, fully self-contained) ─────────────────────────────
const ListenButton = memo(function ListenButton({ text, small }: { text: string; small?: boolean }) {
  const [state, setState] = useState<ListenState>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'loading' || state === 'playing') {
      abortRef.current?.abort();
      window.speechSynthesis?.cancel();
      setState('idle');
      return;
    }
    setState('loading');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await playTTS(text, controller.signal);
      setState('idle');
    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') { setState('idle'); return; }
      try {
        setState('playing');
        await speakWithBrowser(text);
        setState('idle');
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [state, text]);

  useEffect(() => () => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const cls = small ? CHIP_SM : CHIP;

  return (
    <button
      onClick={handleClick}
      className={`${cls} flex items-center gap-2 ${state === 'error' ? 'text-red-400/80' : 'text-white/90'}`}
      aria-label={state === 'loading' ? 'Generating audio…' : state === 'playing' ? 'Playing…' : 'Listen'}
    >
      {state === 'loading' ? (
        <>
          <motion.span
            className="inline-block w-3 h-3 rounded-full"
            animate={{ boxShadow: ['0 0 4px 1px rgba(139,92,246,0.4)', '0 0 10px 3px rgba(139,92,246,0.8)', '0 0 4px 1px rgba(139,92,246,0.4)'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'rgba(139,92,246,0.6)' }}
          />
          <span>Loading…</span>
        </>
      ) : state === 'playing' ? (
        <>
          <Volume2 size={small ? 10 : 12} strokeWidth={2} aria-hidden="true" />
          <span>Playing</span>
        </>
      ) : state === 'error' ? (
        <>
          <Headphones size={small ? 10 : 12} strokeWidth={2} aria-hidden="true" />
          <span>Retry</span>
        </>
      ) : (
        <>
          <Headphones size={small ? 10 : 12} strokeWidth={2} aria-hidden="true" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
});


// ─── Copy button ──────────────────────────────────────────────────────────────
const CopyButton = memo(function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  }, [text]);
  const cls = small ? CHIP_SM : CHIP;
  return (
    <button onClick={handleCopy} className={`${cls} flex items-center gap-2 ${copied ? 'text-emerald-400' : 'text-white/90'}`} aria-label={copied ? 'Copied' : 'Copy'}>
      {copied ? <Check size={small ? 10 : 12} strokeWidth={2.5} aria-hidden="true" /> : <Copy size={small ? 10 : 12} strokeWidth={2} aria-hidden="true" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
});

// ─── Stream cursor ────────────────────────────────────────────────────────────
const StreamCursor = memo(function StreamCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
      className="inline-block w-[2px] h-[1em] ml-0.5 rounded-full bg-violet-400 align-middle"
    />
  );
});

// ─── Streaming text ───────────────────────────────────────────────────────────
const StreamingText = memo(function StreamingText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cls = 'text-[14px] leading-relaxed tracking-[0.01em] text-white/85';

  if (prefersReduced || !isStreaming) {
    return <p className={cls}>{text}{isStreaming && <StreamCursor />}</p>;
  }

  const words = text.split(' ');
  const TAIL  = 6;
  return (
    <p className={cls} aria-label={text}>
      {words.map((w, i) =>
        !isStreaming || i < words.length - TAIL
          ? <span key={i} aria-hidden="true">{w}{' '}</span>
          : <motion.span key={`${i}-${w}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} aria-hidden="true">{w}{' '}</motion.span>
      )}
      {isStreaming && <StreamCursor />}
    </p>
  );
});

// ─── Source chips ─────────────────────────────────────────────────────────────
const SourceChips = memo(function SourceChips({ sources }: { sources: string[] }) {
  if (!sources.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.28 }}
      className="flex items-center gap-2 flex-wrap"
      aria-label={`Sources: ${sources.join(', ')}`}
    >
      <span className="text-[9px] uppercase tracking-[0.18em] text-white/30 flex-shrink-0">Sources</span>
      {sources.map(s => (
        <span key={s} className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/55 backdrop-blur-md">
          {SOURCE_CHIP[s] ?? s}
        </span>
      ))}
    </motion.div>
  );
});
// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = memo(function Skeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.15)] p-6 z-10 mb-6"
      aria-hidden="true"
    >
      <div className="flex gap-4">
        <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-400/15 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="flex gap-2">
            <div className="h-2 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="h-2 w-14 rounded-full bg-white/6  animate-pulse" />
          </div>
          {['100%','94%','97%','78%'].map((w,i) => (
            <div key={i} className="h-2.5 rounded-full bg-white/8 animate-pulse" style={{ width: w }} />
          ))}
          <div className="flex gap-2 pt-1">
            {['w-20','w-24','w-20','w-16','w-24'].map((w,i) => (
              <div key={i} className={`h-8 ${w} rounded-full bg-white/5 animate-pulse`} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Follow-up response bubble ────────────────────────────────────────────────
interface BubbleProps { prompt: string; text: string; isStreaming: boolean; }

const FollowUpBubble = memo(function FollowUpBubble({ prompt, text, isStreaming }: BubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] backdrop-blur-xl rounded-2xl shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)] text-white/90 transition-all duration-300 p-4 mt-3"
    >
      {/* Prompt label */}
      <p className="text-[9px] uppercase tracking-[0.18em] text-violet-400/50 mb-2">{prompt}</p>

      {/* Response text */}
      <p className="text-[13.5px] leading-relaxed text-white/90">
        {text}
        {isStreaming && <StreamCursor />}
      </p>

      {/* Listen + Copy — only when done */}
      {!isStreaming && text && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mt-3 flex-wrap"
        >
          <ListenButton text={text} small />
          <CopyButton   text={text} small />
        </motion.div>
      )}
    </motion.div>
  );
});

// ─── Follow-up panel ─────────────────────────────────────────────────────────
interface FollowUpPanelProps {
  originalQuery:   string;
  contextSnippets: string[];
  originalSummary: string;
}

const FollowUpPanel = memo(function FollowUpPanel({ originalQuery, contextSnippets, originalSummary }: FollowUpPanelProps) {
  const [input,    setInput]    = useState('');
  const [fuState,  setFuState]  = useState<FollowUpState>('idle');
  const [respText, setRespText] = useState('');
  const [prompt,   setPrompt]   = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const isActive = fuState === 'loading' || fuState === 'streaming';

  const submit = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || isActive) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setPrompt(trimmed);
    setRespText('');
    setFuState('loading');

    const snippets = [
      ...(originalSummary ? [`Context: ${originalSummary.slice(0, 500)}`] : []),
      ...contextSnippets.slice(0, 5),
    ];

    try {
      const res = await fetch('/api/ai-summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: `${trimmed} (about: ${originalQuery})`, contextSnippets: snippets, stream: true }),
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('no body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setFuState('streaming');

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const msg = JSON.parse(raw) as { token?: string; done?: boolean };
            if (msg.token) { acc += msg.token; setRespText(acc); }
            if (msg.done)  { setFuState('done'); break outer; }
          } catch { /* skip */ }
        }
      }
      setFuState(p => p === 'streaming' ? 'done' : p);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      setFuState('error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, originalQuery, originalSummary]);

  const handleSubmit = useCallback(() => {
    const q = input.trim();
    if (q) { submit(q); setInput(''); }
  }, [input, submit]);

  const handleChip = useCallback((chip: string) => { setInput(''); submit(chip); }, [submit]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return (
    <div className="mt-5 pt-5 border-t border-white/8">
      {/* Quick prompt chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PROMPTS.map(chip => (
          <button
            key={chip}
            onClick={() => handleChip(chip)}
            disabled={isActive}
            className={`${CHIP_SM} text-white/90`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 rounded-2xl px-4 py-3 transition-all duration-200 focus-within:border-violet-400/30"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask a follow-up…"
          disabled={isActive}
          maxLength={300}
          className="flex-1 bg-transparent outline-none text-[13px] text-white/80 placeholder-white/25 leading-relaxed tracking-wide"
          aria-label="Ask a follow-up question"
        />
        <button
          onClick={handleSubmit}
          disabled={isActive || !input.trim()}
          className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
                      bg-violet-500/20 border border-violet-400/20 text-violet-300
                      hover:bg-violet-500/35 hover:border-violet-400/40
                      disabled:opacity-30 disabled:cursor-not-allowed
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50`}
          aria-label="Submit follow-up"
        >
          {isActive
            ? <Spinner size={13} color="border-violet-400" />
            : <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {/* Response area */}
      <AnimatePresence mode="wait">
        {fuState === 'loading' && (
          <motion.div key="fu-skeleton" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-3 space-y-2" aria-hidden="true">
            {['95%','85%','65%'].map((w,i) => (
              <div key={i} className="h-2.5 rounded-full bg-white/8 animate-pulse" style={{ width: w }} />
            ))}
          </motion.div>
        )}

        {(fuState === 'streaming' || fuState === 'done') && respText && (
          <FollowUpBubble key="fu-bubble" prompt={prompt} text={respText} isStreaming={fuState === 'streaming'} />
        )}

        {fuState === 'error' && (
          <motion.p key="fu-error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="mt-3 text-[12px] text-red-400/70" role="alert">
            Couldn't generate a follow-up. Please try again.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
const AISummary = memo(function AISummary({ query, sections }: Props) {
  const [summaryState,    setSummaryState]    = useState<SummaryState>('idle');
  const [text,            setText]            = useState('');
  const [confidenceLabel, setConfidenceLabel] = useState<ConfidenceLabel | null>(null);

  const abortRef      = useRef<AbortController | null>(null);
  const fetchStateRef = useRef<{ query: string; hadContext: boolean } | null>(null);
  const usedSourcesRef = useRef<string[]>([]);
  const containerRef  = useRef<HTMLDivElement | null>(null);

  // ── Derived sources ──────────────────────────────────────────────────────
  const usedSources = useMemo<string[]>(() => {
    if (!sections) return [];
    const seen = new Set<string>();
    sections.wikipedia.slice(0,3).forEach(it => { if (it.description) seen.add('Wikipedia'); });
    sections.research.slice(0,4).forEach(it  => {
      const l = SOURCE_LABELS[it.source]; if (it.description && l) seen.add(l);
    });
    sections.nasa.slice(0,2).forEach(it  => { if (it.description) seen.add('NASA'); });
    sections.esa.slice(0,2).forEach(it   => { if (it.description) seen.add('ESA Hubble'); });
    sections.books?.slice(0,2).forEach(it => { if (it.description) seen.add('OpenAlex'); });
    return SOURCE_ORDER.filter(s => seen.has(s));
  }, [sections]);

  usedSourcesRef.current = usedSources;

  // ── Context snippets ─────────────────────────────────────────────────────
  const contextSnippets = useMemo<string[]>(() => {
    if (!sections) return [];
    const out: string[] = [];
    sections.wikipedia.slice(0,3).forEach(it => it.description && out.push(it.description.slice(0,380)));
    sections.research.slice(0,4).forEach(it  => it.description && out.push(it.description.slice(0,380)));
    sections.nasa.slice(0,2).forEach(it      => it.description && out.push(it.description.slice(0,240)));
    sections.esa.slice(0,2).forEach(it       => it.description && out.push(it.description.slice(0,240)));
    return out.slice(0,8);
  }, [sections]);

  // ── Core streaming fetch ─────────────────────────────────────────────────
  const doFetch = useCallback(async (q: string, snippets: string[]) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSummaryState('loading'); setText(''); setConfidenceLabel(null);

    try {
      const res = await fetch('/api/ai-summary', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q, contextSnippets: snippets, stream: true }),
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('no body');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setSummaryState('streaming');

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const msg = JSON.parse(raw) as { token?: string; done?: boolean; confidenceLabel?: ConfidenceLabel };
            if (msg.token) { acc += msg.token; setText(acc); }
            if (msg.done) {
              const lbl = msg.confidenceLabel ?? null;
              setConfidenceLabel(lbl);
              setSummaryState('done');
              if (acc) setCached(q.toLowerCase().trim(), { text: acc, confidenceLabel: lbl, usedSources: usedSourcesRef.current });
              break outer;
            }
          } catch { /* malformed SSE */ }
        }
      }
      setSummaryState(p => p === 'streaming' ? 'done' : p);
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
      setSummaryState('idle'); setText(''); setConfidenceLabel(null);
      fetchStateRef.current = null; return;
    }
    if (fetchStateRef.current?.query === trimmed) return;
    abortRef.current?.abort();
    fetchStateRef.current = { query: trimmed, hadContext: false };

    const cached = getCached(trimmed.toLowerCase());
    if (cached) {
      setText(cached.text); setConfidenceLabel(cached.confidenceLabel);
      setSummaryState('done');
      fetchStateRef.current = { query: trimmed, hadContext: true };
      return;
    }
    fetchStateRef.current = { query: trimmed, hadContext: contextSnippets.length > 0 };
    doFetch(trimmed, contextSnippets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Effect 2: sections loaded after zero-context fetch ───────────────────
  useEffect(() => {
    if (contextSnippets.length === 0) return;
    const fs = fetchStateRef.current;
    if (!fs || fs.hadContext) return;
    if (summaryState === 'streaming') return;
    fetchStateRef.current = { query: fs.query, hadContext: true };
    if (getCached(fs.query.toLowerCase())) return;
    doFetch(fs.query, contextSnippets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSnippets.length]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  if (summaryState === 'idle') return null;

  return (
    <div ref={containerRef} style={{ contentVisibility: 'auto' }}>
      <AnimatePresence mode="wait">

        {summaryState === 'loading' && <Skeleton key="sk" />}

        {(summaryState === 'streaming' || summaryState === 'done') && text && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2rem] bg-[#050505] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.15)] p-6 z-10 mb-6"
            role="region"
            aria-label="AI Overview"
          >
            {/* Ambient glow behind card — neutral white, not violet, so it can't bleed color onto the pure-dark card */}
            <motion.div
              className="absolute -inset-px rounded-[2rem] pointer-events-none -z-10"
              animate={{ opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04), rgba(255,255,255,0.18))',
                filter: 'blur(1px)',
              }}
            />

            {/* Top-edge highlight */}
            <div className="absolute top-0 left-12 right-12 h-px pointer-events-none" aria-hidden="true"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

            {/* Inner radial glow — neutral white */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
              style={{ background: 'radial-gradient(ellipse at 10% 5%, rgba(255,255,255,0.06), transparent 55%)' }} />

            {/* Content — padding now lives on the card wrapper itself (p-6), not here */}
            <div className="relative">
              <div className="flex gap-4 items-start">
                {/* Icon */}
                <div aria-hidden="true" className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 bg-violet-500/15 border border-violet-400/20"
                  style={{ boxShadow: '0 0 18px rgba(139,92,246,0.25)' }}>
                  <Sparkles size={15} strokeWidth={2} className="text-violet-300" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <p className="text-[10px] uppercase tracking-[0.26em] font-semibold text-violet-300/80 flex-shrink-0">
                      AI Overview
                    </p>

                    {summaryState === 'streaming' && (
                      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/12 border border-violet-400/18 text-violet-300/80">
                        <Zap size={8} strokeWidth={2.5} aria-hidden="true" />
                        <span className="text-[8.5px] font-semibold tracking-widest uppercase">Live</span>
                      </motion.div>
                    )}

                    {summaryState === 'done' && confidenceLabel && (() => {
                      const cfg  = CONF[confidenceLabel];
                      const Icon = cfg.icon;
                      return (
                        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.22 }}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-semibold tracking-wide ${cfg.cls}`}>
                          <Icon size={9} strokeWidth={2.5} aria-hidden="true" />
                          <span>{confidenceLabel}</span>
                        </motion.div>
                      );
                    })()}

                    {summaryState === 'done' && usedSources.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.22 }}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-white/45">
                        {usedSources.length} source{usedSources.length !== 1 ? 's' : ''}
                      </motion.div>
                    )}
                  </div>

                  {/* Summary text */}
                  <StreamingText text={text} isStreaming={summaryState === 'streaming'} />
                </div>
              </div>

              {/* Footer */}
              {summaryState === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.3 }}
                  className="mt-5 pt-4 border-t border-white/8 flex flex-col gap-3"
                >
                  <SourceChips sources={usedSources} />

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <ListenButton text={text} />
                    <CopyButton   text={text} />
                  </div>

                  <span className="text-[8.5px] uppercase tracking-[0.16em] text-white/25">
                    Groq · llama-3.3-70b · Verify with primary sources
                  </span>
                </motion.div>
              )}

              {/* Follow-up panel */}
              {summaryState === 'done' && (
                <FollowUpPanel
                  originalQuery={query}
                  contextSnippets={contextSnippets}
                  originalSummary={text}
                />
              )}
            </div>
          </motion.div>
        )}

        {summaryState === 'done' && !text && (
          <motion.div key="empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 px-4 py-3 mb-6 rounded-2xl bg-white/4 border border-white/8 text-[11.5px] text-white/40"
            role="status">
            <Sparkles size={12} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
            AI summary unavailable.
          </motion.div>
        )}

        {summaryState === 'error' && (
          <motion.div key="err" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5 px-4 py-3 mb-6 rounded-2xl bg-red-500/5 border border-red-500/12 text-[11.5px] text-red-400/60"
            role="alert">
            <Sparkles size={12} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
            AI Overview unavailable — search results are unaffected
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
});

export default AISummary;