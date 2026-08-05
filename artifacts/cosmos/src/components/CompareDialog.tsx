/**
 * CompareDialog — side-by-side paper comparison with Singularity AI Analysis
 *
 * Features:
 *   1. AI Analysis — auto-triggered on open, streams from /api/singularity
 *   2. TTS Listen — neural voice via /api/tts
 *   3. Comparison table — horizontally scrollable on mobile (min-w-[480px])
 *
 * Lazy-mounted: parent only renders this when `open` has been true at least once.
 * z-index: 102 (above drawer at 99, above drawer backdrop at 98).
 */

import {
  memo, useEffect, useRef, useState, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowLeftRight, Sparkles, Volume2, VolumeX,
  BrainCircuit, ChevronDown, ChevronUp, Send,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { SectionItem } from './NasaSearch';
import { getYear, getSourceName, getAuthors } from '../utils/citationFormatters';

const formatMath = (text: string) => {
  if (!text) return text;
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
};

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
    utterance.rate = 0.92;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser speech failed'));
    window.speechSynthesis.speak(utterance);
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompareField {
  label:     string;
  valueA:    string;
  valueB:    string;
  multiLine: boolean;
}

interface CompareDialogProps {
  open:    boolean;
  items:   [SectionItem, SectionItem] | null;
  onClose: () => void;
  lm?:     boolean;
}

// ─── Field builder ────────────────────────────────────────────────────────────

function buildFields(a: SectionItem, b: SectionItem): CompareField[] {
  const field = (label: string, vA: string, vB: string, multiLine = false): CompareField =>
    ({ label, valueA: vA || '—', valueB: vB || '—', multiLine });

  const authStr = (item: SectionItem) => {
    const authors = getAuthors(item);
    if (authors.length === 0) return '—';
    return authors.slice(0, 5).join(', ') + (authors.length > 5 ? ` +${authors.length - 5} more` : '');
  };

  return [
    field('Title',     a.title,              b.title,              false),
    field('Authors',   authStr(a),            authStr(b),           false),
    field('Year',      getYear(a),            getYear(b),           false),
    field('Source',    getSourceName(a),      getSourceName(b),     false),
    field('Citations',
      a.citationCount != null ? String(a.citationCount) : '—',
      b.citationCount != null ? String(b.citationCount) : '—',
      false,
    ),
    field('URL / DOI', a.url ?? '',           b.url ?? '',          false),
    field('Abstract',  a.description ?? '',  b.description ?? '',  true),
  ];
}

// ─── AI prompt builder ────────────────────────────────────────────────────────

function buildComparePrompt(a: SectionItem, b: SectionItem): string {
  const fmt = (item: SectionItem, label: string) =>
    `**Paper ${label}**\nTitle: ${item.title}\nYear: ${getYear(item) || 'Unknown'}\nAbstract: ${
      item.description?.trim() || '(no abstract available)'
    }`;

  return [
    fmt(a, 'A'),
    '',
    fmt(b, 'B'),
    '',
    'Provide a concise, deep analytical summary comparing these two papers. Highlight their intersection, ' +
    'theoretical differences, and key takeaways. Format cleanly. End with exactly 3 short follow-up questions.',
  ].join('\n');
}

// ─── Value cell ───────────────────────────────────────────────────────────────

const ValueCell = memo(function ValueCell({
  value, differs, multiLine, side, lm,
}: {
  value:     string;
  differs:   boolean;
  multiLine: boolean;
  side:      'a' | 'b';
  lm?:       boolean;
}) {
  const baseText  = lm ? 'text-gray-800' : 'text-white/82';
  const emptyText = lm ? 'text-gray-300 italic' : 'text-white/22 italic';
  const isUrl     = value.startsWith('http');
  const isEmpty   = value === '—';

  const diffBg = differs
    ? lm
      ? side === 'a'
        ? 'bg-amber-50/80 border border-amber-200/60 ring-1 ring-amber-200/40'
        : 'bg-sky-50/80 border border-sky-200/60 ring-1 ring-sky-200/40'
      : side === 'a'
        ? 'bg-amber-500/[0.07] border border-amber-400/[0.18]'
        : 'bg-sky-500/[0.07] border border-sky-400/[0.18]'
    : '';

  return (
    <div className={`rounded-lg px-2.5 py-2 text-[11.5px] leading-relaxed ${
      multiLine ? '' : 'flex items-center'
    } ${diffBg || (lm ? 'bg-gray-50/60' : 'bg-white/[0.025]')}`}>
      {isUrl && !isEmpty ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={`truncate underline decoration-dotted ${lm ? 'text-violet-700' : 'text-violet-300'}`}
        >
          {value}
        </a>
      ) : (
        <span className={`${isEmpty ? emptyText : baseText} ${multiLine ? 'line-clamp-5' : 'truncate'}`}>
          {value}
        </span>
      )}
    </div>
  );
});

// ─── TTS listen button ────────────────────────────────────────────────────────

const ListenButton = memo(function ListenButton({ text, lm }: { text: string; lm?: boolean }) {
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  // Blob URL cache — avoids re-fetching the same synthesized audio
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  // Named listener refs so stop() can remove them from any detached Audio node
  const listenersRef  = useRef<{ onEnded: () => void; onError: () => void } | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      // Explicitly remove listeners before detaching — prevents ghost callbacks
      // from a still-active Audio node after we null the ref
      if (listenersRef.current) {
        audioRef.current.removeEventListener('ended', listenersRef.current.onEnded);
        audioRef.current.removeEventListener('error', listenersRef.current.onError);
        listenersRef.current = null;
      }
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setTtsState('idle');
  }, []);

  const play = useCallback(async () => {
    if (ttsState === 'playing' || ttsState === 'loading') { stop(); return; }

    setTtsState('loading');
    abortRef.current = new AbortController();

    try {
      // Strip markdown / LaTeX for cleaner speech (mirrors SingularityChat)
      const clean = cleanTtsText(text);

        // Cache hit — reuse the existing synthesized audio
      let url = audioCacheRef.current.get(clean);

      if (!url) {
        // Voice choice is server-side; frontend sends text only
        const res = await fetch('/api/tts', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text: clean }),
          signal:  abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        audioCacheRef.current.set(clean, url);  // store for replay
      }

      // Lazy-mount: Audio object is created only on first play
      const audio = new Audio(url);
      audioRef.current = audio;

      // Named listeners so they can be removed by stop() if user cancels mid-play
      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        listenersRef.current = null;
        audioRef.current = null;   // release the Audio object; blob URL stays cached
        setTtsState('idle');
      };
      const onError = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        listenersRef.current = null;
        audioRef.current = null;
        setTtsState('idle');
      };
      listenersRef.current = { onEnded, onError };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      setTtsState('playing');
      await audio.play();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      try {
        setTtsState('playing');
        await speakWithBrowser(text);
        setTtsState('idle');
      } catch {
        setTtsState('idle');
      }
    }
  }, [text, ttsState, stop]);

  // Cleanup on unmount — stop playback and revoke all cached blob URLs
  useEffect(() => () => {
    stop();
    audioCacheRef.current.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    audioCacheRef.current.clear();
  }, [stop]);

  const isActive = ttsState === 'playing' || ttsState === 'loading';

  return (
    <button
      onClick={play}
      title={isActive ? 'Stop audio' : 'Listen to AI analysis'}
      aria-label={isActive ? 'Stop audio' : 'Listen to AI analysis'}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] uppercase tracking-[0.10em] font-medium transition-all duration-200 ${
        isActive
          ? lm
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
          : lm
            ? 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            : 'border-white/[0.09] text-white/42 hover:border-white/[0.18] hover:bg-white/[0.06]'
      }`}
    >
      {ttsState === 'playing' ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <VolumeX size={9} strokeWidth={2} />
          </motion.div>
          Stop
        </>
      ) : ttsState === 'loading' ? (
        <>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Volume2 size={9} strokeWidth={2} />
          </motion.div>
          Generating…
        </>
      ) : (
        <>
          <Volume2 size={9} strokeWidth={2} />
          Listen
        </>
      )}
    </button>
  );
});

// ─── Reasoning accordion (collapsed view after </think> closes) ───────────────

const ReasoningAccordion = memo(function ReasoningAccordion({
  reasoning, seconds, lm,
}: { reasoning: string; seconds: number; lm?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2.5">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8.5px] uppercase tracking-[0.13em] font-semibold transition-all duration-150 ${
          lm
            ? 'text-emerald-600/70 hover:text-emerald-700 hover:bg-emerald-50'
            : 'text-emerald-400/50 hover:text-emerald-300/80 hover:bg-emerald-500/[0.07]'
        }`}
      >
        <BrainCircuit size={10} strokeWidth={2} />
        Thought for {seconds}s
        {open
          ? <ChevronUp size={9} strokeWidth={2.5} />
          : <ChevronDown size={9} strokeWidth={2.5} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="reasoning-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`mt-1 text-[11px] italic leading-relaxed pl-3 pr-2 py-2 border-l-2 rounded-r-lg max-h-32 overflow-y-auto overscroll-contain ${
              lm
                ? 'text-gray-400 border-emerald-300/50 bg-emerald-50/50'
                : 'text-white/30 border-emerald-500/25 bg-emerald-500/[0.04]'
            }`}>
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── AI Analysis section ──────────────────────────────────────────────────────

interface AISectionProps {
  items: [SectionItem, SectionItem];
  open:  boolean;
  lm?:   boolean;
}

interface ApiError {
  error:   string;
  status:  number;
  details: unknown;
}

interface FollowUp {
  id:       string;
  question: string;
  answer:   string;
}

// ── Shared SSE streaming helper ────────────────────────────────────────────────

async function streamSingularity(
  message:     string,
  history:     Array<{ role: string; content: string }>,
  signal:      AbortSignal,
  onReasoning: (r: string) => void,
  onContent:   (c: string) => void,
  onError:     (e: ApiError) => void,
): Promise<boolean> {
  const res = await fetch('/api/singularity', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message, history }),
    signal,
  });

  if (!res.ok) {
    const errJson: ApiError = await res.json().catch(() => ({
      error: `HTTP ${res.status}`, status: res.status, details: null,
    }));
    onError(errJson);
    return false;
  }
  if (!res.body) {
    onError({ error: 'No response body', status: 0, details: null });
    return false;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let sawFirstToken = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (!sawFirstToken) onError({ error: 'STREAM TERMINATED — no tokens received', status: 0, details: null });
      break;
    }
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      let data: Record<string, unknown>;
      try { data = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }
      if (data.error) {
        onError({ error: String(data.message ?? 'STREAM TERMINATED'), status: 0, details: data });
        return false;
      }
      if (data.done) continue;
      sawFirstToken = true;
      if (typeof data.reasoning === 'string') onReasoning(data.reasoning);
      if (typeof data.content   === 'string') onContent(data.content);
    }
  }
  return true;
}

// ── AIAnalysisSection ─────────────────────────────────────────────────────────

const AIAnalysisSection = memo(function AIAnalysisSection({ items, open, lm }: AISectionProps) {
  const [generating,       setGenerating]       = useState(false);
  const [reasoningRaw,     setReasoningRaw]     = useState('');
  const [contentRaw,       setContentRaw]       = useState('');
  const [apiError,         setApiError]         = useState<ApiError | null>(null);
  const [followUps,        setFollowUps]        = useState<FollowUp[]>([]);
  const [followInput,      setFollowInput]      = useState('');
  const [followGenerating, setFollowGenerating] = useState(false);

  const abortRef       = useRef<AbortController | null>(null);
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedKeyRef  = useRef<string | null>(null);
  const followInputRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRawRef  = useRef('');
  const followUpsRef   = useRef<FollowUp[]>([]);

  // Keep refs in sync so follow-up handler reads current values without stale closure
  useEffect(() => { contentRawRef.current = contentRaw; }, [contentRaw]);
  useEffect(() => { followUpsRef.current = followUps; }, [followUps]);

  const fetchAnalysis = useCallback(async (a: SectionItem, b: SectionItem, key: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => abortRef.current?.abort('timeout'), 60_000);

    setReasoningRaw(''); setContentRaw(''); setApiError(null);
    setFollowUps([]); setFollowInput('');
    setGenerating(true);
    contentRawRef.current = '';
    followUpsRef.current  = [];

    try {
      await streamSingularity(
        buildComparePrompt(a, b), [],
        abortRef.current.signal,
        r => setReasoningRaw(r),
        c => { setContentRaw(c); contentRawRef.current = c; },
        e => { setApiError(e); fetchedKeyRef.current = key; },
      );
      fetchedKeyRef.current = key;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if ((err as any)?.message === 'timeout') {
          setApiError({ error: 'Request timed out after 60 seconds.', status: 504, details: null });
          fetchedKeyRef.current = key;
        }
        return;
      }
      const msg = String((err as Error)?.message ?? err);
      setApiError({ error: msg, status: 0, details: null });
      fetchedKeyRef.current = key;
    } finally {
      setGenerating(false);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, []);

  const handleFollowUp = useCallback(async () => {
    const q = followInput.trim();
    if (!q || followGenerating || generating) return;
    setFollowInput('');

    const fid = `fu-${Date.now()}`;
    setFollowUps(prev => [...prev, { id: fid, question: q, answer: '' }]);
    setFollowGenerating(true);

    // Build history: initial prompt + response + any previous follow-ups
    const [a, b] = items;
    const history: Array<{ role: string; content: string }> = [
      { role: 'user',      content: buildComparePrompt(a, b) },
      { role: 'assistant', content: contentRawRef.current },
      ...followUpsRef.current.flatMap(fu => [
        { role: 'user',      content: fu.question },
        { role: 'assistant', content: fu.answer },
      ]),
    ];

    const fuAbort   = new AbortController();
    const fuTimeout = setTimeout(() => fuAbort.abort('timeout'), 60_000);
    try {
      await streamSingularity(
        q, history,
        fuAbort.signal,
        () => {},  // ignore reasoning for follow-ups
        c  => setFollowUps(prev => prev.map(fu => fu.id === fid ? { ...fu, answer: c } : fu)),
        e  => setFollowUps(prev => prev.map(fu => fu.id === fid ? { ...fu, answer: `Error: ${e.error}` } : fu)),
      );
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        const msg = String((err as Error)?.message ?? err);
        setFollowUps(prev => prev.map(fu => fu.id === fid ? { ...fu, answer: `Error: ${msg}` } : fu));
      }
    } finally {
      setFollowGenerating(false);
      clearTimeout(fuTimeout);
    }
  }, [followInput, followGenerating, generating, items]);

  // Auto-trigger on open
  useEffect(() => {
    if (!open || !items) return;
    const [a, b] = items;
    const key = `${a.title}|||${b.title}`;
    if (fetchedKeyRef.current === key) return;
    void fetchAnalysis(a, b, key);
  }, [open, items, fetchAnalysis]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const isDone = !generating && !!contentRaw;

  return (
    <div className={`flex-shrink-0 border-b ${lm ? 'border-gray-100' : 'border-white/[0.055]'}`}>

      {/* ── Section label row ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-2">
        <Sparkles size={11} strokeWidth={2}
          className={`flex-shrink-0 ${lm ? 'text-violet-500' : 'text-violet-300/80'}`}
        />
        <span className={`text-[8.5px] uppercase tracking-[0.18em] font-semibold flex-1 ${
          lm ? 'text-violet-600' : 'text-violet-300/80'
        }`}>
          Singularity AI Analysis
        </span>
        {generating && (
          <span className={`text-[7.5px] uppercase tracking-[0.15em] font-medium ${
            lm ? 'text-emerald-500/80' : 'text-emerald-400/55'
          }`}>
            {contentRaw ? 'Writing…' : 'Reasoning…'}
          </span>
        )}
        {contentRaw && !generating && <ListenButton text={contentRaw} lm={lm} />}
      </div>

      {/* ── Content area — enlarged to 65vh ──────────────────────────────── */}
      <div className="px-5 pb-3 max-h-[65vh] overflow-y-auto overscroll-contain scroll-smooth space-y-2">

        {/* Error */}
        {apiError && (
          <div className={`p-3 rounded-xl border-2 font-mono text-[10.5px] space-y-1.5 ${
            lm ? 'bg-red-50 border-red-300 text-red-900' : 'bg-red-950/80 border-red-500/70 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-[11px] ${lm ? 'text-red-700' : 'text-red-400'}`}>Error</span>
              <button onClick={() => setApiError(null)}
                className={`text-[9px] underline ${lm ? 'text-red-400' : 'text-white/30 hover:text-white/60'}`}>
                Dismiss
              </button>
            </div>
            <div>
              <span className={lm ? 'text-red-400' : 'text-white/45'}>Status: </span>
              <span className={`font-bold ${lm ? 'text-red-800' : 'text-red-300'}`}>{apiError.status || 'unknown'}</span>
            </div>
            <div>
              <span className={lm ? 'text-red-400' : 'text-white/45'}>Message: </span>
              <span className={lm ? 'text-red-800' : 'text-red-200'}>{apiError.error}</span>
            </div>
          </div>
        )}

        {/* Initial analysis */}
        {(generating || reasoningRaw || contentRaw) && (
          <div className="space-y-2">
            {generating && !reasoningRaw && !contentRaw && (
              <div className={`text-[11px] ${lm ? 'text-emerald-600/70' : 'text-emerald-400/60'}`}>
                Connecting to Singularity…
              </div>
            )}
            {reasoningRaw && <ReasoningAccordion reasoning={reasoningRaw} seconds={1} lm={lm} />}
            {contentRaw && (
              <div className={`text-[12px] leading-relaxed overflow-x-auto overflow-y-hidden max-w-full ${
                lm ? 'text-gray-800' : 'text-white/88'
              }`}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMath(contentRaw)}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Follow-up exchanges */}
        {followUps.map(fu => (
          <div key={fu.id} className="space-y-1.5 pt-2 border-t border-white/[0.05]">
            {/* User question bubble */}
            <div className={`flex items-start gap-2 px-3 py-2 rounded-xl ${
              lm
                ? 'bg-violet-50 border border-violet-100'
                : 'bg-violet-500/[0.07] border border-violet-400/[0.12]'
            }`}>
              <span className={`text-[8px] uppercase tracking-widest font-bold mt-0.5 flex-shrink-0 ${
                lm ? 'text-violet-500' : 'text-violet-300/70'
              }`}>You</span>
              <p className={`text-[12px] leading-relaxed ${lm ? 'text-violet-900' : 'text-white/85'}`}>
                {fu.question}
              </p>
            </div>
            {/* Answer or loading dots */}
            {fu.answer ? (
              <div className={`text-[12px] leading-relaxed overflow-x-auto overflow-y-hidden max-w-full pl-1 ${
                lm ? 'text-gray-800' : 'text-white/88'
              }`}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{formatMath(fu.answer)}</ReactMarkdown>
              </div>
            ) : followGenerating && (
              <div className="flex gap-1 pl-3 pt-1">
                {[0, 0.2, 0.4].map(d => (
                  <motion.div
                    key={d}
                    animate={{ opacity: [0.25, 0.9, 0.25] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: d }}
                    className={`w-1.5 h-1.5 rounded-full ${lm ? 'bg-gray-400' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Idle placeholder */}
        {!generating && !apiError && !reasoningRaw && !contentRaw && (
          <div className={`text-[10px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            Initializing analysis…
          </div>
        )}
      </div>

      {/* ── Follow-up input — appears after initial analysis completes ─────── */}
      <AnimatePresence initial={false}>
        {isDone && (
          <motion.div
            key="followup-input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`px-5 pt-1 pb-4`}>
              <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${
                lm
                  ? 'border-gray-200 bg-gray-50/80 focus-within:border-violet-300 focus-within:shadow-[0_0_0_1px_rgba(139,92,246,0.15)]'
                  : 'border-white/[0.09] bg-white/[0.03] focus-within:border-violet-400/30 focus-within:shadow-[0_0_0_1px_rgba(139,92,246,0.10),0_0_16px_rgba(139,92,246,0.06)]'
              }`}>
                <textarea
                  ref={followInputRef}
                  value={followInput}
                  onChange={e => {
                    setFollowInput(e.target.value);
                    // auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleFollowUp(); }
                  }}
                  placeholder="Ask a follow-up question…"
                  rows={1}
                  disabled={followGenerating}
                  className={`flex-1 resize-none bg-transparent text-[12px] leading-relaxed outline-none ${
                    lm
                      ? 'text-gray-800 placeholder:text-gray-400'
                      : 'text-white/85 placeholder:text-white/22'
                  }`}
                  style={{ maxHeight: 80, overflowY: 'auto' }}
                />
                <button
                  onClick={() => void handleFollowUp()}
                  disabled={!followInput.trim() || followGenerating}
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                    followInput.trim() && !followGenerating
                      ? lm
                        ? 'bg-violet-600 text-white hover:bg-violet-700 active:scale-90'
                        : 'bg-violet-500/80 text-white hover:bg-violet-500 active:scale-90'
                      : lm
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white/[0.06] text-white/25 cursor-not-allowed'
                  }`}
                  aria-label="Send follow-up"
                >
                  <Send size={11} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Compare dialog ───────────────────────────────────────────────────────────

const CompareDialog = memo(function CompareDialog({ open, items, onClose, lm }: CompareDialogProps) {
  const dialogRef   = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Auto-focus close button on open
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const sel = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const dlg = dialogRef.current;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(dlg.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (!els.length) return;
      const [first, last] = [els[0], els[els.length - 1]];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  if (!items) return null;

  const [a, b] = items;
  const fields  = buildFields(a, b);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[101] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${lm ? 'bg-black/30' : 'bg-black/72'} backdrop-blur-sm`}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paper comparison"
        className={[
          'fixed z-[102] inset-x-3 top-4 bottom-4',
          'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2',
          'sm:top-6 sm:bottom-6 sm:w-[min(1140px,90vw)]',
          'flex flex-col rounded-2xl border overflow-hidden',
          'transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-[0.97] pointer-events-none',
          lm
            ? 'bg-white border-gray-200 shadow-[0_24px_80px_rgba(0,0,0,0.16)]'
            : 'bg-[rgba(7,7,16,0.97)] border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.90)] backdrop-blur-2xl',
        ].join(' ')}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b ${
          lm ? 'border-gray-100' : 'border-white/[0.055]'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/10 border border-violet-400/18'
          }`}>
            <ArrowLeftRight size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-[13px] font-semibold ${lm ? 'text-gray-900' : 'text-white/90'}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}
            >
              Compare Papers
            </p>
            <p className={`text-[8.5px] uppercase tracking-[0.2em] ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              Differences highlighted · AI powered
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close comparison"
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors duration-150 ${
              lm
                ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                : 'border-white/[0.09] bg-white/[0.04] text-white/42 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        {/* ── Singularity AI Analysis — auto-triggered on open ──────────── */}
        {/* Pass `items` directly (not `[a, b]`) so the reference is stable across renders */}
        <AIAnalysisSection items={items} open={open} lm={lm} />

        {/* ── Column headers — sticky, horizontally scrollable on mobile ── */}
        <div className={`flex-shrink-0 overflow-x-auto border-b ${
          lm ? 'border-gray-100' : 'border-white/[0.055]'
        }`}>
          <div
            className={`grid gap-3 px-5 py-3 min-w-[480px] ${
              lm ? 'bg-gray-50/60' : 'bg-white/[0.015]'
            }`}
            style={{ gridTemplateColumns: '120px 1fr 1fr' }}
          >
            <div /> {/* label spacer */}
            {[a, b].map((item, i) => (
              <div key={i} className="flex items-center gap-2 min-w-0">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  i === 0
                    ? lm ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-300'
                    : lm ? 'bg-sky-100 text-sky-700'    : 'bg-sky-500/15 text-sky-300'
                }`}>
                  {i === 0 ? 'A' : 'B'}
                </span>
                <p
                  className={`text-[10.5px] font-semibold leading-snug line-clamp-2 min-w-0 ${
                    lm ? 'text-gray-800' : 'text-white/80'
                  }`}
                  style={{ fontFamily: 'var(--app-font-heading)' }}
                >
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison rows — scrollable body ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* overflow-x-auto wraps the fixed-min-width grid for mobile */}
          <div className="overflow-x-auto">
            <div className="flex flex-col min-w-[480px]">
              {fields.map(({ label, valueA, valueB, multiLine }) => {
                const differs = valueA !== valueB && valueA !== '—' && valueB !== '—';
                return (
                  <div
                    key={label}
                    className={`grid gap-3 px-5 py-3 border-b ${
                      lm ? 'border-gray-50' : 'border-white/[0.035]'
                    }`}
                    style={{ gridTemplateColumns: '120px 1fr 1fr' }}
                  >
                    {/* Field label */}
                    <div className="flex items-start pt-2">
                      <span className={`text-[8.5px] uppercase tracking-[0.16em] font-semibold ${
                        lm ? 'text-gray-400' : 'text-white/30'
                      }`}>
                        {label}
                      </span>
                      {differs && (
                        <span className={`ml-1.5 mt-[1px] text-[7px] px-1 py-[1px] rounded-full font-semibold ${
                          lm ? 'bg-rose-50 text-rose-500 border border-rose-200' : 'bg-rose-500/10 text-rose-400/70 border border-rose-400/20'
                        }`}>
                          diff
                        </span>
                      )}
                    </div>
                    {/* Paper A */}
                    <ValueCell value={valueA} differs={differs} multiLine={multiLine} side="a" lm={lm} />
                    {/* Paper B */}
                    <ValueCell value={valueB} differs={differs} multiLine={multiLine} side="b" lm={lm} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Legend footer ───────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 flex items-center gap-4 px-5 py-3 border-t ${
          lm ? 'border-gray-100 bg-gray-50/60' : 'border-white/[0.055] bg-white/[0.01]'
        }`}>
          <span className={`text-[8.5px] uppercase tracking-[0.16em] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
            Legend
          </span>
          {[
            { letter: 'A', dk: 'bg-amber-500/10 border-amber-400/20 text-amber-300', lmC: 'bg-amber-50 border-amber-200 text-amber-700' },
            { letter: 'B', dk: 'bg-sky-500/10 border-sky-400/20 text-sky-300',       lmC: 'bg-sky-50 border-sky-200 text-sky-700' },
          ].map(({ letter, dk, lmC }) => (
            <span
              key={letter}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8.5px] ${lm ? lmC : dk}`}
            >
              <span className="font-bold">{letter}</span>
              <span className="font-normal">= Paper {letter}</span>
            </span>
          ))}
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8.5px] ${
            lm ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-500/10 border-rose-400/20 text-rose-400/80'
          }`}>
            <span className="font-semibold">diff</span> = fields differ
          </span>
        </div>
      </div>
    </>
  );
});

export default CompareDialog;
