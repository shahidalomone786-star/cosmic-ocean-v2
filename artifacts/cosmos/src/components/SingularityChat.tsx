/**
 * SingularityChat — Full-screen immersive DeepSeek R1 chat
 * ─────────────────────────────────────────────────────────
 * Full-screen solid dark background (bg-[#09090b]), centered max-w-3xl
 * content column, ElevenLabs TTS "Listen" button on every AI message.
 */

import { useState, useRef, useEffect, useCallback, memo, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Send, Sparkles, BrainCircuit, X, ChevronDown, ChevronUp,
  Square, Copy, Check, RotateCcw, ArrowDown, Volume2, VolumeX,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  reasoningSeconds?: number;
  error?: boolean;
  ts: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  'Derive time dilation from first principles',
  "What actually happens at a black hole's event horizon?",
  'Explain quantum entanglement to a physics undergrad',
  "Why doesn't the EPR paradox violate relativity?",
];

// Quick-action modifier chips shown near the input
const QUICK_CHIPS = [
  { label: 'Explain simply',          suffix: 'Explain this simply.' },
  { label: 'Give examples',           suffix: 'Give concrete examples.' },
  { label: 'Compare concepts',        suffix: 'Compare the key concepts.' },
  { label: 'Latest research',         suffix: 'What does the latest research say?' },
  { label: 'Real-world impact',       suffix: 'What are the real-world applications?' },
] as const;

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'I am Singularity, the cosmic nexus of intelligence. What shall we explore today?',
  ts: Date.now(),
};

// ─── Markdown renderer ──────────────────────────────────────────────────────
const markdownComponents = {
  // ── Block elements ─────────────────────────────────────────────────────────
  p: ({ children }: any) => (
    <p className="mb-[1.05em] last:mb-0 leading-[1.82] text-white/85">{children}</p>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-white/95">{children}</strong>
  ),
  em: ({ children }: any) => <em className="italic text-white/75">{children}</em>,
  a: ({ children, href }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-violet-300/90 underline underline-offset-[3px] decoration-violet-400/40
        hover:text-violet-200 hover:decoration-violet-300/60 transition-colors duration-150"
    >
      {children}
    </a>
  ),
  ul: ({ children }: any) => (
    <ul className="list-disc ml-5 mb-[1em] space-y-[0.35em] marker:text-white/25">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal ml-5 mb-[1em] space-y-[0.35em] marker:text-white/30">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-[1.75] text-white/82">{children}</li>
  ),
  // ── Headings — clear hierarchy, not too loud ───────────────────────────────
  h1: ({ children }: any) => (
    <h1 className="text-[17px] font-semibold mt-7 mb-3 first:mt-0 text-white
      tracking-[-0.01em] border-b border-white/[0.07] pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-[15px] font-semibold mt-6 mb-2.5 first:mt-0 text-white/95 tracking-[-0.01em]">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[13.5px] font-semibold mt-5 mb-2 first:mt-0 text-white/88 tracking-[0.005em] uppercase text-[12px]">
      {children}
    </h3>
  ),
  // ── Blockquote — elegant left accent ──────────────────────────────────────
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-[2px] border-violet-400/35 pl-4 pr-2 py-0.5
      italic text-white/48 my-4 bg-white/[0.015] rounded-r-lg">
      {children}
    </blockquote>
  ),
  // ── Code blocks — refined dark surface ────────────────────────────────────
  pre: ({ children }: any) => (
    <pre className="relative bg-[#08080b] border border-white/[0.08] rounded-xl
      px-4 py-3.5 overflow-x-auto my-4 text-[12px] leading-[1.7]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </pre>
  ),
  code: ({ className, children }: any) => {
    const isBlock = /language-/.test(className || '');
    return isBlock ? (
      <code className={`font-mono text-white/80 ${className || ''}`}>{children}</code>
    ) : (
      <code className="bg-white/[0.07] border border-white/[0.08] text-violet-200/90
        px-1.5 py-[2px] rounded-md text-[12px] font-mono">
        {children}
      </code>
    );
  },
  // ── Table support ─────────────────────────────────────────────────────────
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-white/[0.07]">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="border-b border-white/[0.07] bg-white/[0.025]">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.12em]
      font-semibold text-white/40">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-2.5 text-white/78 border-t border-white/[0.04]">{children}</td>
  ),
};

const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-[14px] leading-[1.82] tracking-[0.008em] text-white/85
      overflow-x-auto overflow-y-hidden max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// ─── Copy button ────────────────────────────────────────────────────────────
const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [text]);
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/35
        hover:text-white/70 hover:bg-white/[0.07] transition-all duration-150
        active:scale-95 active:bg-white/[0.10]"
      aria-label={copied ? 'Copied' : 'Copy response'}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
});

// ─── Listen (TTS) button ────────────────────────────────────────────────────
const ListenButton = memo(function ListenButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const abortRef      = useRef<AbortController | null>(null);
  // Blob URL cache — avoids re-fetching the same audio from ElevenLabs
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  // Named listener refs so stop() can remove them from any detached Audio node
  const listenersRef  = useRef<{ onEnded: () => void; onError: () => void } | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
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
    setState('idle');
  }, []);

  const play = useCallback(async () => {
    if (state === 'playing' || state === 'loading') { stop(); return; }

    setState('loading');
    abortRef.current = new AbortController();

    try {
      // Strip markdown/LaTeX for cleaner speech
      const clean = text
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

      // Cache hit — reuse the existing blob URL (saves an ElevenLabs API call)
      let url = audioCacheRef.current.get(clean);

      if (!url) {
        // Voice choice is server-side; frontend sends text only
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`TTS error ${res.status}`);
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
        setState('idle');
      };
      const onError = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        listenersRef.current = null;
        audioRef.current = null;
        setState('idle');
      };
      listenersRef.current = { onEnded, onError };
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      setState('playing');
      await audio.play();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setState('idle');
    }
  }, [text, state, stop]);

  // Cleanup on unmount — stop playback and revoke all cached blob URLs
  useEffect(() => () => {
    stop();
    audioCacheRef.current.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    audioCacheRef.current.clear();
  }, [stop]);

  const isActive = state === 'playing' || state === 'loading';

  return (
    <button
      onClick={play}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all duration-200
        active:scale-95
        ${isActive
          ? 'text-emerald-400 bg-emerald-400/[0.10] border border-emerald-400/20'
          : 'text-white/35 hover:text-white/70 hover:bg-white/[0.07] border border-transparent'
        }`}
      aria-label={isActive ? 'Stop audio' : 'Listen to response'}
    >
      {state === 'playing' ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <VolumeX size={11} strokeWidth={2} />
          </motion.div>
          Stop
        </>
      ) : state === 'loading' ? (
        <>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Volume2 size={11} strokeWidth={2} />
          </motion.div>
          Loading…
        </>
      ) : (
        <>
          <Volume2 size={11} strokeWidth={2} />
          Listen
        </>
      )}
    </button>
  );
});

// ─── Collapsible reasoning block ─────────────────────────────────────────────
const ReasoningBlock = memo(function ReasoningBlock({
  reasoning, seconds,
}: { reasoning: string; seconds?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2.5 w-full">
      {/* Toggle pill */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          text-white/25 hover:text-white/50 hover:bg-white/[0.04]
          border border-transparent hover:border-white/[0.05]
          transition-all duration-150 active:scale-95"
        aria-expanded={open}
        aria-label={open ? 'Collapse reasoning' : 'Expand reasoning'}
      >
        <BrainCircuit size={11} strokeWidth={1.8} />
        <span className="text-[9px] uppercase tracking-[0.14em] font-semibold">
          {seconds ? `Thought for ${seconds}s` : 'Reasoning'}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown size={10} strokeWidth={2} />
        </motion.div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 ml-1 pl-3.5 pr-3 py-2.5 border-l-[2px]
              border-white/[0.06] bg-white/[0.015] rounded-r-xl
              text-[12px] leading-[1.72] text-white/30 italic
              max-h-44 overflow-y-auto">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Thinking indicator ───────────────────────────────────────────────────────
const ThinkingDots = memo(function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="self-start flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-bl-sm
        bg-[#0d1a14] border border-emerald-500/[0.18]
        shadow-[0_0_18px_rgba(16,185,129,0.08)]"
      aria-label="Singularity is thinking"
    >
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/70 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/70 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/70 rounded-full" />
    </motion.div>
  );
});

// ─── Status pill ─────────────────────────────────────────────────────────────
type ChatPhase = 'idle' | 'thinking' | 'streaming';

const StatusPill = memo(function StatusPill({ phase }: { phase: ChatPhase }) {
  const cfg: Record<ChatPhase, { dotCls: string; label: string; textCls: string }> = {
    idle:      { dotCls: 'bg-emerald-400/50',  label: 'Ready',      textCls: 'text-white/22' },
    thinking:  { dotCls: 'bg-violet-400/80',   label: 'Thinking',   textCls: 'text-violet-300/70' },
    streaming: { dotCls: 'bg-violet-300/60',   label: 'Responding', textCls: 'text-violet-200/55' },
  };
  const { dotCls, label, textCls } = cfg[phase];
  return (
    <div className="flex items-center gap-1.5" aria-live="polite" aria-label={`Status: ${label}`}>
      <motion.div
        className={`w-[5px] h-[5px] rounded-full ${dotCls}`}
        animate={phase !== 'idle'
          ? { opacity: [0.3, 1, 0.3], scale: [0.9, 1.2, 0.9] }
          : { opacity: 0.5 }}
        transition={phase !== 'idle'
          ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
          : {}}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.18 }}
          className={`text-[9px] uppercase tracking-[0.16em] font-mono ${textCls}`}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
});

// ─── Quick-action chips ───────────────────────────────────────────────────────
const QuickChips = memo(function QuickChips({
  input, onChip, disabled,
}: {
  input: string;
  onChip: (text: string) => void;
  disabled: boolean;
}) {
  const visible = !disabled && input.length < 80;
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0.5 overflow-x-auto scrollbar-hide">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => onChip(
                  input.trim()
                    ? `${input.trim()} — ${chip.suffix}`
                    : chip.suffix
                )}
                className="flex-shrink-0 px-3 py-1.5 rounded-full
                  bg-white/[0.04] border border-white/[0.07]
                  text-[11px] text-white/42 hover:text-white/72
                  hover:bg-white/[0.07] hover:border-white/[0.13]
                  transition-all duration-150 active:scale-95 whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ─── API error type ───────────────────────────────────────────────────────────
interface ApiError {
  error:   string;
  status:  number;
  details: unknown;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SingularityChat({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages]         = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput]               = useState('');
  const [isThinking, setIsThinking]     = useState(false);
  const [isStreaming, setIsStreaming]   = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [apiError, setApiError]         = useState<ApiError | null>(null);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const scrollBoxRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartRef = useRef<number>(0);
  const stickToBottomRef = useRef(true);

  const prefersReducedMotion = useReducedMotion();

  // Autofocus on open
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Escape to close
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Smart auto-scroll — instant during streaming to prevent jitter.
  // scrollIntoView(smooth) re-triggers on every token update and fights itself;
  // direct scrollTop assignment is jitter-free and respects the stick-to-bottom gate.
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isThinking]);

  const handleScroll = useCallback(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = dist < 80;
    setShowScrollBtn(dist > 160);
  }, []);

  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // ── Core generation ──────────────────────────────────────────────────────
  const generateResponse = useCallback(async (userText: string) => {
    setApiError(null);
    setIsThinking(true);
    setIsStreaming(true);
    thinkingStartRef.current = Date.now();
    abortRef.current = new AbortController();

    // 60-second hard timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      abortRef.current?.abort('timeout');
    }, 60_000);

    const msgId = `asst-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', reasoning: '', ts: Date.now() },
    ]);

    const safeHistory = messages
      .filter(m => m.id !== 'welcome' && !m.error && m.content.trim().length > 0)
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.trim() }));

    try {
      const res = await fetch('/api/singularity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: userText, history: safeHistory }),
        signal:  abortRef.current.signal,
      });

      // ── Non-2xx = JSON error from backend (never a stream) ──
      if (!res.ok) {
        const errJson: ApiError = await res.json().catch(() => ({
          error:   `HTTP ${res.status} — could not parse error body`,
          status:  res.status,
          details: null,
        }));
        console.error('[SingularityChat] API error:', errJson);
        setApiError(errJson);
        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, error: true, content: `[${errJson.status}] ${errJson.error}` }
            : m
        ));
        return;
      }

      if (!res.body) {
        const noBody: ApiError = { error: 'Response body is null — cannot stream', status: 0, details: null };
        setApiError(noBody);
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, error: true, content: noBody.error } : m
        ));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let sawFirstToken = false;
      let chunkIndex    = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (!sawFirstToken) {
            // Stream closed without sending any tokens — surface as error
            const streamErr: ApiError = { error: 'STREAM TERMINATED — no tokens received', status: 0, details: null };
            setApiError(streamErr);
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, error: true, content: streamErr.error } : m
            ));
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log(`[SingularityChat] chunk #${++chunkIndex}:`, chunk.slice(0, 300));

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let data: any;
          try { data = JSON.parse(raw); } catch { continue; }

          // Stream-level error from backend (mid-stream)
          if (data.error) {
            const streamMsg = data.message ?? 'STREAM TERMINATED';
            console.error('[SingularityChat] stream error event:', data);
            const streamErr: ApiError = { error: streamMsg, status: 0, details: data };
            setApiError(streamErr);
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, error: true, content: streamMsg } : m
            ));
            return;
          }

          if (data.done) continue;

          if (!sawFirstToken) { setIsThinking(false); sawFirstToken = true; }

          const seconds = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000));
          setMessages(prev =>
            prev.map(m =>
              m.id === msgId
                ? {
                    ...m,
                    reasoning:        typeof data.reasoning === 'string' ? data.reasoning : (m.reasoning ?? ''),
                    content:          typeof data.content   === 'string' ? data.content   : (m.content   ?? ''),
                    reasoningSeconds: seconds,
                  }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const isTimeout = err?.message === 'timeout' || String(err?.message).includes('timeout');
        if (isTimeout) {
          const timeoutErr: ApiError = { error: 'Request timed out after 60 seconds.', status: 504, details: null };
          setApiError(timeoutErr);
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, error: true, content: timeoutErr.error } : m
          ));
        }
        return;
      }
      console.error('[SingularityChat] fetch error:', err?.message, err?.stack);
      const catchErr: ApiError = { error: err?.message ?? String(err), status: 0, details: null };
      setApiError(catchErr);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, error: true, content: catchErr.error } : m
      ));
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }, [messages]);

  const handleSend = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;
    setMessages(prev => [
      ...prev,
      { id: `usr-${Date.now()}`, role: 'user', content: text, ts: Date.now() },
    ]);
    setInput('');
    stickToBottomRef.current = true;
    generateResponse(text);
  }, [input, isThinking, generateResponse]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsThinking(false);
    setIsStreaming(false);
  }, []);

  const applyChip = useCallback((text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  }, []);

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || isThinking) return;
    setMessages(prev => {
      const idx = prev.map(m => m.role).lastIndexOf('assistant');
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    generateResponse(lastUser.content);
  }, [messages, isThinking, generateResponse]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isFreshChat = messages.length === 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative h-screen overflow-hidden w-full flex flex-col bg-[#09090b]"
    >
      {/* Subtle top radial ambient */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 100%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-white/[0.04]
        bg-[#09090b]/98 backdrop-blur-md relative z-10
        shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-5 py-[14px]">
          <div className="flex items-center gap-3">
            {/* Icon — layered glow ring */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full
              bg-white/[0.05] border border-white/[0.09]
              shadow-[0_0_14px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Sparkles size={15} strokeWidth={1.7} className="text-white/72" />
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/[0.15]"
                  animate={{ scale: [1, 1.28, 1], opacity: [0, 0.35, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              )}
            </div>

            <div>
              <h2
                className="text-[15px] font-semibold tracking-[-0.01em] text-white/96 leading-tight"
                style={{ fontFamily: 'var(--app-font-heading)' }}
              >
                Singularity
              </h2>
              <p className="text-[9px] uppercase tracking-[0.24em] text-white/28 font-mono mt-[1px]">
                GPT-OSS-120B · Cosmic Intelligence
              </p>
            </div>
          </div>

          {/* Right side: live status + close */}
          <div className="flex items-center gap-4">
            <StatusPill phase={isThinking ? 'thinking' : isStreaming ? 'streaming' : 'idle'} />
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/[0.07] text-white/30 hover:text-white/70
                  transition-all duration-150 active:scale-95"
                aria-label="Close Singularity"
              >
                <X size={17} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 🚨 GROQ DEBUG PANEL — visible whenever an API error occurs ─────── */}
      {apiError && (
        <div className="flex-shrink-0 mx-4 mt-3 p-4 bg-red-950/90 border-2 border-red-500/70 rounded-xl font-mono text-[11px] space-y-2 z-50">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-bold text-[12px]">🚨 GROQ DEBUG</span>
            <button
              onClick={() => setApiError(null)}
              className="text-white/30 hover:text-white/70 text-[10px] underline underline-offset-2"
            >Dismiss</button>
          </div>
          <div className="space-y-1">
            <div><span className="text-white/45">Status: </span><span className="text-red-300 font-bold">{apiError.status || 'unknown'}</span></div>
            <div><span className="text-white/45">Message: </span><span className="text-red-200">{apiError.error}</span></div>
          </div>
          {apiError.details != null && (
            <div>
              <div className="text-white/35 text-[9.5px] uppercase tracking-widest mb-1">Details</div>
              <pre className="text-yellow-300/80 whitespace-pre-wrap break-all max-h-52 overflow-y-auto text-[10px] bg-black/50 p-2.5 rounded-lg border border-yellow-600/20 leading-relaxed">
                {typeof apiError.details === 'string'
                  ? apiError.details
                  : JSON.stringify(apiError.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Chat Area ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollBoxRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide"
          aria-live="polite"
        >
          {/* Centered column */}
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => {
                const isLastAsst = msg.role === 'assistant' && i === messages.length - 1 && !isThinking;
                // showActions gates the entire action row (Listen, Copy, Regenerate).
                // Listen is also gated on isLastAsst-awareness: for the actively-generating
                // last message we suppress the row until the stream is complete.
                const isGenerating = isThinking && i === messages.length - 1;
                const showActions = msg.role === 'assistant' && !msg.error && msg.id !== 'welcome' && !isGenerating;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* Reasoning block (assistant only) */}
                    {msg.reasoning && msg.reasoning.trim() && (
                      <div className="w-full max-w-[85%]">
                        <ReasoningBlock reasoning={msg.reasoning} seconds={msg.reasoningSeconds} />
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl ${
                        msg.role === 'user'
                          // ── User: compact glass chip ───────────────────────
                          ? 'bg-white/[0.07] border border-white/[0.11] text-white/93 rounded-br-[4px] px-4 py-3 max-w-[82%] ml-auto text-[13.5px] leading-[1.72] font-[450] shadow-[0_2px_12px_rgba(0,0,0,0.28)]'
                          : msg.error
                          // ── Error ─────────────────────────────────────────
                            ? 'bg-red-500/[0.06] border border-red-500/[0.16] text-red-300/90 rounded-bl-[4px] text-[13.5px] leading-relaxed px-5 py-4 max-w-[85%]'
                          : isGenerating
                          // ── Streaming: emerald pulse glass ────────────────
                            ? 'bg-gradient-to-b from-[#0c1510]/90 to-[#090d0b]/90 border px-5 py-5 w-full rounded-bl-[4px] stream-pulse-glow shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
                          // ── Done: premium layered glass ───────────────────
                            : 'bg-gradient-to-b from-[#141418] to-[#0f0f13] border border-white/[0.07] px-5 py-5 sm:px-6 sm:py-6 w-full rounded-bl-[4px] shadow-[0_4px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.045)] animate-cosmos-fade'
                      }`}
                    >
                      {msg.role === 'assistant'
                        ? <MessageContent content={msg.content || (isThinking && i === messages.length - 1 ? '' : '…')} />
                        : msg.content
                      }
                    </div>

                    {/* Action row */}
                    {showActions && (
                      <div className="flex items-center gap-0.5 mt-2 ml-1">
                        <ListenButton text={msg.content} />
                        <CopyButton text={msg.content} />
                        {isLastAsst && (
                          <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                              text-white/30 hover:text-white/65 hover:bg-white/[0.07]
                              transition-all duration-150 active:scale-95"
                            aria-label="Regenerate response"
                          >
                            <RotateCcw size={11} strokeWidth={2} />
                            Regenerate
                          </button>
                        )}
                      </div>
                    )}

                    {/* Welcome message — show listen button */}
                    {msg.id === 'welcome' && msg.role === 'assistant' && (
                      <div className="flex items-center gap-0.5 mt-2 ml-1">
                        <ListenButton text={msg.content} />
                      </div>
                    )}

                    {/* Error retry */}
                    {msg.error && (
                      <button
                        onClick={handleRegenerate}
                        className="mt-1.5 text-[11px] text-red-300/60 hover:text-red-200 underline underline-offset-2"
                      >
                        Retry
                      </button>
                    )}
                  </motion.div>
                );
              })}

              {isThinking && <ThinkingDots key="thinking" />}
            </AnimatePresence>

            {/* Starter prompts */}
            {isFreshChat && !isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="flex flex-col gap-2.5"
              >
                <p className="text-[9.5px] uppercase tracking-[0.22em] text-white/20 mb-1">
                  Try asking
                </p>
                {STARTER_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                      text-[13.5px] text-white/55 hover:bg-white/[0.06] hover:text-white/85
                      hover:border-white/[0.12] transition-all duration-200
                      active:scale-[0.98] active:bg-white/[0.08]"
                  >
                    {p}
                  </button>
                ))}
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Scroll to bottom pill */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full
                bg-white/10 border border-white/[0.14] backdrop-blur-md flex items-center gap-2
                text-white/60 text-[12px] hover:bg-white/[0.16] transition-colors"
              aria-label="Scroll to latest"
            >
              <ArrowDown size={13} strokeWidth={2} />
              Latest
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input Area ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t border-white/[0.04] pb-safe"
        style={{ background: 'linear-gradient(to top, #09090b 70%, transparent)' }}
      >
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4">

          {/* ── Unified input shell: chips + textarea + send ─────────────── */}
          <div className="rounded-2xl bg-[#0d0d12] border border-white/[0.09]
            shadow-[0_-1px_0_rgba(255,255,255,0.025),0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]
            focus-within:border-white/[0.16]
            focus-within:shadow-[0_-1px_0_rgba(255,255,255,0.025),0_0_0_1px_rgba(255,255,255,0.055),0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]
            transition-all duration-300">

            {/* Quick-action chips (hide while AI is active or input long) */}
            <QuickChips input={input} onChip={applyChip} disabled={isThinking} />

            {/* Textarea + send button row */}
            <div className="flex items-end gap-3 px-4 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Singularity anything…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-[14px] text-white/90
                  placeholder:text-white/22 outline-none max-h-[160px] min-h-[26px]
                  leading-relaxed py-[2px]"
                aria-label="Message Singularity"
              />
              <button
                onClick={() => (isThinking ? handleStop() : handleSend())}
                disabled={!isThinking && !input.trim()}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200 mb-0.5 active:scale-90 ${
                  isThinking
                    ? 'bg-white/90 text-black shadow-[0_0_16px_rgba(255,255,255,0.22)]'
                    : input.trim()
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.28)]'
                      : 'bg-white/[0.06] text-white/18 cursor-not-allowed'
                }`}
                aria-label={isThinking ? 'Stop generating' : 'Send message'}
              >
                {isThinking
                  ? <Square size={11} strokeWidth={2.5} fill="currentColor" />
                  : <Send size={13} strokeWidth={2.5} className={input.trim() ? 'ml-[1px]' : ''} />
                }
              </button>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-white/12 mt-2.5 tracking-wide">
            Singularity may make mistakes · verify important scientific claims
          </p>
        </div>
      </div>
    </motion.div>
  );
}
