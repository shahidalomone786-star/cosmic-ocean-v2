/**
 * SingularityChat — Full-screen immersive DeepSeek R1 chat
 * ─────────────────────────────────────────────────────────
 * Full-screen solid dark background (bg-[#09090b]), centered max-w-3xl
 * content column, neural TTS "Listen" button on every AI message.
 */

import { useState, useRef, useEffect, useCallback, memo, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Send, Sparkles, BrainCircuit, X, ChevronDown,
  Square, Copy, Check, RotateCcw, ArrowDown, Volume2,
  BookmarkPlus, Bookmark, Share2, Wand2, Plus, Image, FileText, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { WorkspacePanel, useWorkspace } from './WorkspacePanel';
import { useDocumentIngestion } from '@/hooks/useDocumentIngestion';
import { useImageAttachments } from '@/hooks/useImageAttachments';
import { ImageAttachmentGrid } from './ImageAttachmentGrid';
import { DocumentChip } from './DocumentChip';
import { selectRelevantChunks } from '@/lib/contextSelector';
import { buildDocumentPrompt } from '@/lib/promptBuilder';
import type { DocumentRecord } from '@/lib/documentStore';
import type { ImageAttachment } from '@/lib/attachmentTypes';
import { sanitizeVisibleResponse } from '@/lib/responseSanitizer';
import { MobileHistoryButton, SingularitySidebar } from './SingularitySidebar';
import {
  createChatSession,
  deriveChatTitle,
  deriveSmartChatTitle,
  chatSessionToMarkdown,
  chatSessionToText,
  countPinnedChatSessions,
  createImportEnvelope,
  flushPendingHistoryWrites,
  loadChatSessions,
  loadChatSession,
  listChatSessionSummaries,
  onPendingHistoryWrites,
  prepareChatHistoryRepository,
  saveChatSession,
  softDeleteChatSession,
  type ChatExportFormat,
  type ChatSession,
} from '@/lib/singularityChatHistory';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedDocument?: DocumentRecord | null;
  attachedImages?: ImageAttachment[];
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
    utterance.rate = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error('Browser speech failed'));
    window.speechSynthesis.speak(utterance);
  });
}

// ─── Markdown renderer ──────────────────────────────────────────────────────
const markdownComponents = {
  // ── Block elements ─────────────────────────────────────────────────────────
  p: ({ children }: any) => (
    <p className="mb-[1.1em] last:mb-0 leading-[1.8] text-white/85">{children}</p>
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
    <ul className="list-disc ml-6 mb-[1.1em] space-y-[0.45em] marker:text-white/30">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal ml-6 mb-[1.1em] space-y-[0.45em] marker:text-white/35">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-[1.8] text-white/83">{children}</li>
  ),
  // ── Headings — document-grade hierarchy ───────────────────────────────────
  h1: ({ children }: any) => (
    <h1 className="text-[22px] font-bold mt-9 mb-4 first:mt-0 text-white
      tracking-[-0.02em] border-b border-white/[0.08] pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-[19px] font-semibold mt-8 mb-3 first:mt-0 text-white/97 tracking-[-0.015em]">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[16px] font-semibold mt-6 mb-2.5 first:mt-0 text-white/90 tracking-[-0.01em]">
      {children}
    </h3>
  ),
  // ── Blockquote — elegant left accent ──────────────────────────────────────
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-[3px] border-violet-400/40 pl-5 pr-2 py-1
      italic text-white/55 my-5 bg-white/[0.015] rounded-r-lg">
      {children}
    </blockquote>
  ),
  // ── Code blocks — refined dark surface ────────────────────────────────────
  pre: ({ children }: any) => (
    <pre className="relative bg-[#08080b] border border-white/[0.08] rounded-xl
      px-5 py-4 overflow-x-auto my-5 text-[13px] leading-[1.7]
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
        px-1.5 py-[2px] rounded-md text-[13px] font-mono">
        {children}
      </code>
    );
  },
  // ── Table support ─────────────────────────────────────────────────────────
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-5 rounded-xl border border-white/[0.07]">
      <table className="w-full text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="border-b border-white/[0.07] bg-white/[0.025]">{children}</thead>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.12em]
      font-semibold text-white/40">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-white/80 border-t border-white/[0.04]">{children}</td>
  ),
};

const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  const visibleContent = sanitizeVisibleResponse(content);
  return (
    <div className="text-[15px] leading-[1.75] tracking-[0.005em] text-white/85
      overflow-x-auto overflow-y-hidden max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {formatMath(visibleContent)}
      </ReactMarkdown>
    </div>
  );
});

// ─── Save-to-workspace button ────────────────────────────────────────────────
const SaveButton = memo(function SaveButton({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = useCallback(() => {
    onSave();
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 1800);
  }, [onSave]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
        transition-all duration-150 active:scale-95
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 ${
        saved
          ? 'text-violet-400 bg-violet-400/[0.09] border border-violet-400/[0.18]'
          : 'text-white/35 hover:text-white/70 hover:bg-white/[0.07] border border-transparent'
      }`}
      aria-label={saved ? 'Saved to workspace' : 'Save to workspace'}
    >
      {saved
        ? <Check size={11} strokeWidth={2.5} />
        : <BookmarkPlus size={11} strokeWidth={2} />
      }
      {saved ? 'Saved' : 'Save'}
    </button>
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
        active:scale-95 active:bg-white/[0.10]
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
      aria-label={copied ? 'Copied' : 'Copy response'}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
});

// ─── Share button ────────────────────────────────────────────────────────────
const ShareButton = memo(function ShareButton({ text }: { text: string }) {
  const [shared, setShared] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handle = useCallback(() => {
    const excerpt = text.length > 800 ? `${text.slice(0, 800)}…` : text;
    navigator.clipboard.writeText(`Singularity answered:\n\n${excerpt}`).then(() => {
      setShared(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShared(false), 2000);
    }).catch(() => {});
  }, [text]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return (
    <button
      onClick={handle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
        transition-all duration-150 active:scale-95
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25 ${
        shared
          ? 'text-sky-400/80 bg-sky-400/[0.08] border border-sky-400/[0.15]'
          : 'text-white/35 hover:text-white/70 hover:bg-white/[0.07] border border-transparent'
      }`}
      aria-label={shared ? 'Copied to clipboard' : 'Share this answer'}
    >
      {shared ? <Check size={11} strokeWidth={2.5} /> : <Share2 size={11} strokeWidth={2} />}
      {shared ? 'Copied' : 'Share'}
    </button>
  );
});

// ─── Listen (TTS) button ────────────────────────────────────────────────────
const ListenButton = memo(function ListenButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const audioCacheRef  = useRef<Map<string, string>>(new Map());
  const listenersRef   = useRef<{ onEnded: () => void; onError: () => void } | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
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
      const clean = cleanTtsText(text);

      let url = audioCacheRef.current.get(clean);
      if (!url) {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: clean }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        audioCacheRef.current.set(clean, url);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        listenersRef.current = null;
        audioRef.current = null;
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
      if (err?.name === 'AbortError') { setState('idle'); return; }
      try {
        setState('playing');
        await speakWithBrowser(cleanTtsText(text));
        setState('idle');
      } catch {
        setState('idle');
      }
    }
  }, [text, state, stop]);

  useEffect(() => () => {
    stop();
    audioCacheRef.current.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
    audioCacheRef.current.clear();
  }, [stop]);

  return (
    <button
      onClick={play}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
        transition-all duration-200 active:scale-95
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/30 ${
        state === 'playing'
          ? 'text-emerald-400 bg-emerald-400/[0.11] border border-emerald-400/[0.28] shadow-[0_0_12px_rgba(52,211,153,0.10)]'
          : state === 'loading'
          ? 'text-emerald-400/70 bg-emerald-400/[0.07] border border-emerald-400/[0.14]'
          : 'text-white/35 hover:text-white/70 hover:bg-white/[0.07] border border-transparent'
      }`}
      aria-label={
        state === 'playing' ? 'Stop audio'
          : state === 'loading' ? 'Generating audio…'
          : 'Listen to response'
      }
    >
      {state === 'playing' ? (
        <><AudioWave />Stop</>
      ) : state === 'loading' ? (
        <>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            <Volume2 size={11} strokeWidth={2} />
          </motion.div>
          Generating…
        </>
      ) : (
        <><Volume2 size={11} strokeWidth={2} />Listen</>
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
          text-white/28 hover:text-white/55 hover:bg-white/[0.04]
          border border-transparent hover:border-white/[0.06]
          transition-all duration-150 active:scale-95
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/25"
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
            <div className="relative mt-1.5 ml-1 pl-3.5 pr-3 py-3 border-l-[2px]
              border-violet-500/[0.14] bg-white/[0.018] rounded-r-xl
              text-[12px] leading-[1.75] text-white/38 italic
              max-h-48 overflow-y-auto">
              {reasoning}
              {/* Fade-out gradient at bottom to hint scrollability */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6
                bg-gradient-to-t from-[#0f0f11]/80 to-transparent rounded-br-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Audio waveform ──────────────────────────────────────────────────────────
const WAVE_BARS: Array<{ delay: number; dur: number; peak: number }> = [
  { delay: 0,    dur: 0.62, peak: 0.80 },
  { delay: 0.11, dur: 0.78, peak: 1.00 },
  { delay: 0.05, dur: 0.52, peak: 0.58 },
  { delay: 0.19, dur: 0.74, peak: 0.92 },
  { delay: 0.08, dur: 0.66, peak: 0.70 },
  { delay: 0.14, dur: 0.58, peak: 0.48 },
];
const AudioWave = memo(function AudioWave() {
  return (
    <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
      {WAVE_BARS.map((bar, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full bg-emerald-400/85"
          style={{ minHeight: '3px', originY: 1 }}
          animate={{ scaleY: [0.15, bar.peak, 0.22, bar.peak * 0.78, 0.15] }}
          transition={{ duration: bar.dur, repeat: Infinity, delay: bar.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
});

// ─── Thinking indicator ───────────────────────────────────────────────────────
const ThinkingDots = memo(function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93, y: 4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="self-start flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-bl-sm
        bg-[#0d1a14] border border-emerald-500/[0.18]
        shadow-[0_0_24px_rgba(16,185,129,0.10),0_4px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(16,185,129,0.06)]"
      aria-label="Singularity is thinking"
    >
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
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
                  hover:bg-white/[0.07] hover:border-white/[0.12]
                  hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]
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

interface SingularityCapabilities {
  canRouteImages: boolean;
  activeModelSupportsVision: boolean;
  activeModel: string;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SingularityChat({ onClose }: { onClose?: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const stored = loadChatSessions();
    return stored.length > 0 ? [stored[0]] : [createChatSession(INITIAL_MESSAGE)];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const stored = loadChatSessions();
    return stored[0]?.id ?? '';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = loadChatSessions();
    return stored[0]?.messages ?? [INITIAL_MESSAGE];
  });
  const [input, setInput]               = useState('');
  const [isThinking, setIsThinking]     = useState(false);
  const [isStreaming, setIsStreaming]   = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [apiError, setApiError]         = useState<ApiError | null>(null);
  const [attachOpen, setAttachOpen]     = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);
  const [visionSupported, setVisionSupported] = useState<boolean | null>(null);
  const [replaceImageIndex, setReplaceImageIndex] = useState<number | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [deletedSession, setDeletedSession] = useState<ChatSession | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [pendingHistoryWrites, setPendingHistoryWrites] = useState(0);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const workspace                       = useWorkspace();
  const attachRef                       = useRef<HTMLDivElement>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const imageInputRef                   = useRef<HTMLInputElement>(null);

  const {
    processFile,
    isProcessing,
    error: docError,
    attachedDoc,
    clearDocument,
    clearError,
  } = useDocumentIngestion();
  const {
    images,
    isProcessing: isProcessingImages,
    error: imageError,
    processFiles: processImageFiles,
    removeImage,
    clearImages,
    clearError: clearImageError,
  } = useImageAttachments();

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const scrollBoxRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartRef = useRef<number>(0);
  const stickToBottomRef = useRef(true);

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    void prepareChatHistoryRepository().then(async () => {
      if (isThinking || messages.length > 1) return;
      const stored = loadChatSessions();
      const page = await listChatSessionSummaries(null, 1);
      const first = page.sessions[0];
      if (!first || stored[0]?.id === first.id) return;
      const hydrated = await loadChatSession(first.id);
      if (!hydrated) return;
      setSessions([hydrated]);
      setActiveSessionId(hydrated.id);
      setMessages(hydrated.messages);
    });
    const unsubscribe = onPendingHistoryWrites(setPendingHistoryWrites);
    const goOnline = () => {
      setIsOffline(false);
      flushPendingHistoryWrites();
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      unsubscribe();
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Persist the active conversation without touching the streaming transport.
  useEffect(() => {
    if (activeSessionId || sessions.length === 0) return;
    setActiveSessionId(sessions[0].id);
    setMessages(sessions[0].messages);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(previous => {
      const existing = previous.find(session => session.id === activeSessionId);
      if (!existing) return previous;
      const updated: ChatSession = {
        ...existing,
          title: existing.manualTitle
          ? existing.title
            : (!isStreaming ? (deriveSmartChatTitle(messages) ?? deriveChatTitle(messages)) : existing.title),
        messages,
        updatedAt: messages.length > 1 ? Date.now() : existing.updatedAt,
      };
      const next = [updated, ...previous.filter(session => session.id !== activeSessionId)]
        .sort((a, b) => b.updatedAt - a.updatedAt);
      if (!isStreaming) {
        void saveChatSession(updated).catch(() => {
          setHistoryNotice('Saved locally. Sync will retry automatically.');
        });
        setHistoryRefreshToken(value => value + 1);
      }
      return next;
    });
  }, [activeSessionId, isStreaming, messages]);

  useEffect(() => {
    if (!historyNotice) return;
    const timer = window.setTimeout(() => {
      setHistoryNotice(null);
      setDeletedSession(null);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [historyNotice]);

  const handleNewChat = useCallback(() => {
    if (isThinking) return;
    const session = createChatSession(INITIAL_MESSAGE);
    setSessions(previous => [session, ...previous.filter(item => item.id !== session.id)]);
    void saveChatSession(session).catch(() => setHistoryNotice('Saved locally. Sync will retry automatically.'));
    setHistoryRefreshToken(value => value + 1);
    setActiveSessionId(session.id);
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setApiError(null);
    clearDocument();
    clearImages();
    stickToBottomRef.current = true;
    setMobileHistoryOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, [clearDocument, clearImages, isThinking]);

  const resolveSession = useCallback(async (sessionId: string): Promise<ChatSession | null> => {
    const cached = sessions.find(item => item.id === sessionId);
    if (cached) return cached;
    const loaded = await loadChatSession(sessionId);
    if (loaded) {
      setSessions(previous => [loaded, ...previous.filter(item => item.id !== sessionId)].slice(0, 12));
    }
    return loaded;
  }, [sessions]);

  const persistUpdatedSession = useCallback((session: ChatSession) => {
    setSessions(previous => [session, ...previous.filter(item => item.id !== session.id)].slice(0, 12));
    setHistoryRefreshToken(value => value + 1);
    void saveChatSession(session).catch(() => setHistoryNotice('Saved locally. Sync will retry automatically.'));
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (isThinking || sessionId === activeSessionId) return;
    const session = await resolveSession(sessionId);
    if (!session) return;
    setActiveSessionId(sessionId);
    setMessages(session.messages);
    setInput('');
    setApiError(null);
    clearDocument();
    clearImages();
    stickToBottomRef.current = true;
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, [activeSessionId, clearDocument, clearImages, isThinking, resolveSession]);

  const handleRenameSession = useCallback(async (sessionId: string, title: string) => {
    const target = await resolveSession(sessionId);
    if (!target) return;
    persistUpdatedSession({ ...target, title, manualTitle: true, updatedAt: Date.now() });
  }, [persistUpdatedSession, resolveSession]);

  const handleTogglePin = useCallback(async (sessionId: string) => {
    const target = await resolveSession(sessionId);
    if (!target) return;
    if (!target.pinned && await countPinnedChatSessions() >= 10) {
      setHistoryNotice('You can pin up to 10 chats.');
      return;
    }
    persistUpdatedSession({ ...target, pinned: !target.pinned, updatedAt: Date.now() });
  }, [persistUpdatedSession, resolveSession]);

  const handleToggleFavorite = useCallback(async (sessionId: string) => {
    const target = await resolveSession(sessionId);
    if (!target) return;
    persistUpdatedSession({ ...target, favorite: !target.favorite, updatedAt: Date.now() });
  }, [persistUpdatedSession, resolveSession]);

  const handleToggleArchive = useCallback(async (sessionId: string) => {
    const target = await resolveSession(sessionId);
    if (!target) return;
    const nextArchived = !target.archived;
    persistUpdatedSession({ ...target, archived: nextArchived, updatedAt: Date.now() });
    if (nextArchived && sessionId === activeSessionId) {
      const nextSession = sessions.find(session => session.id !== sessionId && !session.archived);
      if (nextSession) {
        setActiveSessionId(nextSession.id);
        setMessages(nextSession.messages);
      }
    }
    setHistoryNotice(nextArchived ? 'Chat archived.' : 'Chat restored.');
  }, [activeSessionId, persistUpdatedSession, resolveSession, sessions]);

  const handleDuplicateSession = useCallback(async (sessionId: string) => {
    const source = await resolveSession(sessionId);
    if (!source) return;
    const now = Date.now();
    const duplicate: ChatSession = {
      ...source,
      id: `chat-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${source.title} copy`,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      favorite: false,
      archived: false,
      manualTitle: true,
      messages: source.messages.map(message => ({ ...message, id: `${message.id}-${now}` })),
    };
    persistUpdatedSession(duplicate);
    setActiveSessionId(duplicate.id);
    setMessages(duplicate.messages);
    setHistoryNotice('Chat duplicated.');
  }, [persistUpdatedSession, resolveSession]);

  const handleExportSession = useCallback(async (sessionId: string, format: ChatExportFormat) => {
    const session = await resolveSession(sessionId);
    if (!session) return;
    const filenameBase = session.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'singularity-chat';
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
      if (!printWindow) {
        setHistoryNotice('Allow pop-ups to export a PDF.');
        return;
      }
      const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
      printWindow.document.write(`<html><head><title>${escapeHtml(session.title)}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:48px auto;color:#17131f;line-height:1.6}h1{font-size:28px}h2{font-size:16px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}.message{white-space:pre-wrap;margin-bottom:20px}</style></head><body><h1>${escapeHtml(session.title)}</h1>${session.messages.map(message => `<h2>${message.role === 'user' ? 'You' : 'Singularity'}</h2><div class="message">${escapeHtml(message.content)}</div>`).join('')}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setHistoryNotice('PDF export opened for printing.');
      return;
    }
    const content = format === 'json'
      ? JSON.stringify(createImportEnvelope(session), null, 2)
      : format === 'markdown' ? chatSessionToMarkdown(session) : chatSessionToText(session);
    const extension = format === 'markdown' ? 'md' : format;
    const mime = format === 'json' ? 'application/json' : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filenameBase}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setHistoryNotice(`${format.toUpperCase()} export downloaded.`);
  }, [resolveSession]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const target = await resolveSession(sessionId);
    if (!target) return;
    setDeletedSession(target);
    setSessions(previous => previous.filter(session => session.id !== sessionId));
    void saveChatSession({ ...target, deletedAt: Date.now() }).catch(() => setHistoryNotice('Delete queued. Sync will retry automatically.'));
    setHistoryRefreshToken(value => value + 1);
    setHistoryNotice(`“${target.title}” deleted.`);

    if (sessionId === activeSessionId) {
      const nextSession = sessions.find(session => session.id !== sessionId && !session.archived);
      if (nextSession) {
        setActiveSessionId(nextSession.id);
        setMessages(nextSession.messages);
      } else {
        const fresh = createChatSession(INITIAL_MESSAGE);
        setSessions(previous => [fresh, ...previous]);
        setActiveSessionId(fresh.id);
        setMessages(fresh.messages);
      }
    }
  }, [activeSessionId, resolveSession, sessions]);

  const handleUndoDelete = useCallback(() => {
    if (!deletedSession) return;
    setSessions(previous => [deletedSession, ...previous.filter(session => session.id !== deletedSession.id)]);
    void saveChatSession({ ...deletedSession, deletedAt: undefined }).catch(() => setHistoryNotice('Restore queued. Sync will retry automatically.'));
    setHistoryRefreshToken(value => value + 1);
    setActiveSessionId(deletedSession.id);
    setMessages(deletedSession.messages);
    setDeletedSession(null);
    setHistoryNotice('Chat restored.');
  }, [deletedSession]);

  // History shortcuts are global so they also work while the mobile drawer is closed.
  useEffect(() => {
    const onHistoryShortcut = (event: globalThis.KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        handleNewChat();
        return;
      }
    };
    window.addEventListener('keydown', onHistoryShortcut);
    return () => window.removeEventListener('keydown', onHistoryShortcut);
  }, [handleNewChat, mobileHistoryOpen]);

  // Autofocus on open
  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/singularity/capabilities')
      .then(response => response.ok ? response.json() as Promise<SingularityCapabilities> : null)
      .then(capabilities => {
        if (active && capabilities) setVisionSupported(capabilities.canRouteImages);
      })
      .catch(() => {
        if (active) setVisionSupported(null);
      });
    return () => { active = false; };
  }, []);

  // Close attach popover on outside click
  useEffect(() => {
    if (!attachOpen) return;
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [attachOpen]);

  const showImagePicker = useCallback(() => {
    setAttachOpen(false);
    imageInputRef.current?.click();
  }, []);

  const handleDocumentUploadClick = useCallback(() => {
    setAttachOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      // Reset so the same file can be re-selected after "Replace"
      e.target.value = '';
    },
    [processFile],
  );

  const handleImagesSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      if (selected.length) void processImageFiles(selected, replaceImageIndex ?? undefined);
      setReplaceImageIndex(null);
      event.target.value = '';
    },
    [processImageFiles, replaceImageIndex],
  );

  const handleReplaceImage = useCallback((index: number) => {
    setReplaceImageIndex(index);
    imageInputRef.current?.click();
  }, []);

  const isImageFile = useCallback((file: File) => {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extension)
      || ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the container, not when moving to a child element
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      const imageFiles = files.filter(isImageFile);
      const documentFile = files.find(file => !isImageFile(file));
      if (imageFiles.length) void processImageFiles(imageFiles);
      if (documentFile) void processFile(documentFile);
    },
    [isImageFile, processFile, processImageFiles],
  );

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files ?? []).filter(isImageFile);
    if (!files.length) return;
    event.preventDefault();
    void processImageFiles(files);
  }, [isImageFile, processImageFiles]);

  // Escape to close
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mobileHistoryOpen) {
        setMobileHistoryOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileHistoryOpen, onClose]);

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

  // Refocus textarea once the document chip appears (extraction done)
  useEffect(() => {
    if (!attachedDoc) return;
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [attachedDoc]);

  // ── Core generation ──────────────────────────────────────────────────────
  const generateResponse = useCallback(async (userText: string, requestImages: ImageAttachment[] = []) => {
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

    const latestImageMessageId = [...messages]
      .reverse()
      .find(m => m.attachedImages?.length)?.id;
    const safeHistory = messages
      .filter(m => m.id !== 'welcome' && !m.error && m.content.trim().length > 0)
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.trim(),
        // Re-send only the latest prior image turn. The UI keeps every image
        // in history, while the request stays bounded and responsive.
        ...(m.id === latestImageMessageId && m.attachedImages?.length
          ? { images: m.attachedImages.map(image => ({
              filename: image.filename,
              mimeType: image.mimeType,
              dataUrl: image.dataUrl,
            })) }
          : {}),
      }));

    try {
      const res = await fetch('/api/singularity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
         body:    JSON.stringify({
           message: userText,
           history: safeHistory,
           images: requestImages.map(image => ({
             filename: image.filename,
             mimeType: image.mimeType,
             dataUrl: image.dataUrl,
           })),
         }),
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
                    content:          typeof data.content   === 'string'
                      ? sanitizeVisibleResponse(data.content)
                      : (m.content ?? ''),
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
    const typedText = (overrideText ?? input).trim();
    if ((!typedText && images.length === 0) || isThinking) return;
    const text = typedText || 'Please analyze the attached image(s).';

    // The current attachment belongs to this user turn. Once it is moved into
    // the message, the composer can reset without losing document context.
    const latestDocument =
      attachedDoc ??
      [...messages]
        .reverse()
        .find(message => message.attachedDocument)?.attachedDocument ??
      null;

    // Build the enriched AI prompt — document context injected here, never in the textarea.
    // The user's visible message is always the clean, unmodified `text`.
    let aiPrompt = text;
    if (latestDocument && latestDocument.chunks.length > 0) {
      const relevantChunks = selectRelevantChunks(text, latestDocument.chunks);
      aiPrompt = buildDocumentPrompt(text, relevantChunks, latestDocument.filename);
    }

    setMessages(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        attachedDocument: attachedDoc,
        attachedImages: images,
        ts: Date.now(),
      },
    ]);
    setInput('');
    clearDocument();
    clearImages();
    stickToBottomRef.current = true;
    generateResponse(aiPrompt, images);
  }, [input, isThinking, generateResponse, attachedDoc, images, messages, clearDocument, clearImages]);

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
    generateResponse(lastUser.content, lastUser.attachedImages ?? []);
  }, [messages, isThinking, generateResponse]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isFreshChat = messages.length === 1;
  const isProcessingAttachment = isProcessing || isProcessingImages;
  const attachmentError = imageError || docError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex h-[100dvh] w-full flex-row overflow-hidden bg-[#09090b]"
    >
      <SingularitySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        mobileOpen={mobileHistoryOpen}
        onMobileOpenChange={setMobileHistoryOpen}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onTogglePin={handleTogglePin}
        onToggleFavorite={handleToggleFavorite}
        onToggleArchive={handleToggleArchive}
        onDuplicateSession={handleDuplicateSession}
        onExportSession={handleExportSession}
        onUndoDelete={handleUndoDelete}
        undoTitle={deletedSession?.title ?? null}
        historyNotice={historyNotice}
        historyRefreshToken={historyRefreshToken}
        pendingHistoryWrites={pendingHistoryWrites}
        isOffline={isOffline}
        disabled={isThinking}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
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
            <MobileHistoryButton onClick={() => setMobileHistoryOpen(true)} />
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

          {/* Right side: status + workspace + close */}
          <div className="flex items-center gap-3">
            <StatusPill phase={isThinking ? 'thinking' : isStreaming ? 'streaming' : 'idle'} />

            {/* Research Workspace toggle */}
            <button
              onClick={() => workspace.setOpen(true)}
              className="relative flex items-center justify-center p-2 rounded-full
                text-white/30 hover:text-white/65 hover:bg-white/[0.07]
                transition-all duration-150 active:scale-95"
              aria-label="Open research workspace"
            >
              <Bookmark size={15} strokeWidth={1.7} />
              {workspace.items.length > 0 && (
                <span className="absolute -top-[3px] -right-[3px] min-w-[14px] h-[14px]
                  rounded-full bg-violet-500/90 text-[7.5px] text-white font-bold
                  flex items-center justify-center leading-none px-[3px]">
                  {workspace.items.length > 9 ? '9+' : workspace.items.length}
                </span>
              )}
            </button>

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

      {/* ── Research Workspace Panel ─────────────────────────────────────── */}
      <WorkspacePanel
        open={workspace.open}
        onClose={() => workspace.setOpen(false)}
        items={workspace.items}
        onRemove={workspace.remove}
        onNoteChange={workspace.updateNote}
      />

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
          <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 py-8 flex flex-col gap-0">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full flex flex-col ${msg.role === 'user' ? 'items-end mb-6' : 'items-start mb-8'}`}
                  >
                    {/* ── User message: premium glass bubble ──────────────── */}
                    {msg.role === 'user' && (
                      <div className="bg-white/[0.08] border border-white/[0.13] text-white/93
                        rounded-2xl rounded-br-[4px] px-4 py-3 max-w-[82%] ml-auto
                        text-[13.5px] leading-[1.72] font-[450]
                        shadow-[0_4px_20px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.10)]">
                        {msg.attachedImages?.length ? (
                          <div className="mb-2.5">
                            <ImageAttachmentGrid images={msg.attachedImages} readOnly />
                          </div>
                        ) : null}
                        {msg.attachedDocument && (
                          <DocumentChip
                            record={msg.attachedDocument}
                            isThinking={false}
                            readOnly
                          />
                        )}
                        {msg.content}
                      </div>
                    )}

                    {/* ── Error message: red-tinted surface ───────────────── */}
                    {msg.role === 'assistant' && msg.error && (
                      <>
                        <div className="bg-red-500/[0.06] border border-red-500/[0.16] text-red-300/90
                          rounded-2xl rounded-bl-[4px] text-[13.5px] leading-relaxed px-5 py-4 max-w-[85%]
                          shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
                          <MessageContent content={msg.content} />
                        </div>
                        <button
                          onClick={handleRegenerate}
                          className="mt-1.5 text-[11px] text-red-300/60 hover:text-red-200 underline underline-offset-2"
                        >
                          Retry
                        </button>
                      </>
                    )}

                    {/* ── Assistant message: plain document layout ─────────── */}
                    {msg.role === 'assistant' && !msg.error && (
                      <>
                        {/* Reasoning block */}
                        {msg.reasoning && msg.reasoning.trim() && (
                          <div className="w-full mb-3">
                            <ReasoningBlock reasoning={msg.reasoning} seconds={msg.reasoningSeconds} />
                          </div>
                        )}

                        {/* Content — no card, no border, no background */}
                        <div className={`w-full pt-1 pb-2 ${isGenerating ? 'stream-pulse-text' : 'animate-cosmos-fade'}`}>
                          <MessageContent
                            content={msg.content || (isThinking && i === messages.length - 1 ? '' : '…')}
                          />
                        </div>

                        {/* Divider below response */}
                        {!isGenerating && msg.id !== 'welcome' && (
                          <div className="w-full border-b border-white/[0.05] mt-1 mb-3" />
                        )}

                        {/* Action row — below content, never inside a card */}
                        {showActions && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-0.5 flex-wrap"
                          >
                            <ListenButton text={msg.content} />
                            <CopyButton text={msg.content} />
                            <ShareButton text={msg.content} />
                            <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-white/[0.09] self-center flex-shrink-0" />
                            <SaveButton onSave={() => workspace.save(msg.content)} />
                            {isLastAsst && (
                              <>
                                <button
                                  onClick={() => handleSend('Can you explain that in simpler terms?')}
                                  disabled={isThinking}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                                    text-white/30 hover:text-white/65 hover:bg-white/[0.07] border border-transparent
                                    transition-all duration-150 active:scale-95
                                    disabled:opacity-40 disabled:cursor-not-allowed
                                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
                                  aria-label="Ask Singularity to explain more simply"
                                >
                                  <Wand2 size={11} strokeWidth={2} />
                                  Simplify
                                </button>
                                <button
                                  onClick={handleRegenerate}
                                  disabled={isThinking}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                                    text-white/30 hover:text-white/65 hover:bg-white/[0.07] border border-transparent
                                    transition-all duration-150 active:scale-95
                                    disabled:opacity-40 disabled:cursor-not-allowed
                                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
                                  aria-label="Regenerate response"
                                >
                                  <RotateCcw size={11} strokeWidth={2} />
                                  Regenerate
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}

                        {/* Welcome message — listen button only */}
                        {msg.id === 'welcome' && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-0.5 mt-1"
                          >
                             <ListenButton text={msg.content} />
                          </motion.div>
                        )}
                      </>
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
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex flex-col gap-2.5"
              >
                <p className="text-[9.5px] uppercase tracking-[0.22em] text-white/20 mb-1">
                  Try asking
                </p>
                {STARTER_PROMPTS.map((p, idx) => (
                  <motion.button
                    key={p}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + idx * 0.06, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => handleSend(p)}
                    className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                      text-[13.5px] text-white/55 hover:bg-white/[0.06] hover:text-white/85
                      hover:border-white/[0.11] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
                      transition-all duration-200 active:scale-[0.98] active:bg-white/[0.08]
                      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
                  >
                    {p}
                  </motion.button>
                ))}

                {/* Capability hint — subtle feature summary */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="text-center text-[10.5px] text-white/[0.15] mt-1 tracking-[0.05em]
                    leading-relaxed select-none"
                >
                  Deep reasoning · LaTeX math · Multi-step science · Voice narration
                </motion.p>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Scroll to bottom pill */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full
                bg-white/[0.10] border border-white/[0.14] backdrop-blur-md flex items-center gap-2
                text-white/60 text-[12px] hover:bg-white/[0.16] hover:text-white/80
                shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-colors duration-150"
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

          {/* Hidden file input — triggered by "Upload Document" button or Replace */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.pdf,text/plain,text/markdown,text/csv,application/json,application/pdf"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleFileSelected}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={handleImagesSelected}
          />

          {/* ── Unified input shell: chips + textarea + send ─────────────── */}
          <div
            className={`relative rounded-2xl bg-[#0d0d12] border transition-all duration-300 ${
              isDragOver
                ? 'border-sky-400/40 shadow-[0_0_0_2px_rgba(56,189,248,0.12),0_8px_40px_rgba(0,0,0,0.55)]'
                : 'border-white/[0.09] shadow-[0_-1px_0_rgba(255,255,255,0.025),0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-white/[0.16] focus-within:shadow-[0_-1px_0_rgba(255,255,255,0.025),0_0_0_1px_rgba(139,92,246,0.13),0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label={isDragOver ? 'Drop to attach document' : undefined}
          >
            {/* Drag-over highlight overlay */}
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 rounded-2xl pointer-events-none z-10
                    bg-sky-400/[0.03] border border-dashed border-sky-400/30"
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>

            {/* Document chip — shown when a document is attached */}
            <AnimatePresence>
              {attachedDoc && (
                <DocumentChip
                  record={attachedDoc}
                  isThinking={isThinking}
                  onRemove={clearDocument}
                  onReplace={() => fileInputRef.current?.click()}
                />
              )}
            </AnimatePresence>

            {/* Optimized image attachments — data stays out of the textarea. */}
            <AnimatePresence>
              {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-3 pt-3"
                >
                  <ImageAttachmentGrid
                    images={images}
                    onRemove={removeImage}
                    onReplace={handleReplaceImage}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick-action chips (hide while AI is active or input long) */}
            <QuickChips input={input} onChip={applyChip} disabled={isThinking} />

            {/* Textarea + controls row */}
            <div className="flex items-end gap-2.5 px-3 py-3">

              {/* ── Attachment '+' button with popover ── */}
              <div ref={attachRef} className="relative flex-shrink-0 mb-0.5">
                <button
                  onClick={() => setAttachOpen(o => !o)}
                  className="w-8 h-8 rounded-full flex items-center justify-center
                    text-white/35 hover:text-white/70 hover:bg-white/10
                    transition-colors duration-150 active:scale-90"
                  aria-label="Attach file"
                  aria-expanded={attachOpen}
                  aria-haspopup="menu"
                >
                  <Plus size={16} strokeWidth={2} />
                </button>

                {/* Popover — anchored above the button */}
                <AnimatePresence>
                  {attachOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, scale: 0.92, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 6 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute bottom-full left-0 mb-2 w-52 z-50
                        bg-[#18181b]/90 backdrop-blur-md
                        border border-white/10 rounded-xl shadow-2xl
                        overflow-hidden"
                    >
                      <div className="px-1 py-1">
                        <button
                          role="menuitem"
                           onClick={showImagePicker}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-white/75 hover:text-white hover:bg-white/[0.07]
                            transition-colors duration-120 text-left"
                        >
                          <Image size={15} strokeWidth={1.7} className="text-violet-400/80 flex-shrink-0" />
                          <span className="text-[13px] font-medium">Upload Image</span>
                        </button>
                        <button
                          role="menuitem"
                          onClick={handleDocumentUploadClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-white/75 hover:text-white hover:bg-white/[0.07]
                            transition-colors duration-120 text-left"
                          aria-label="Upload document (.txt, .md, .csv, .json, .pdf — max 5 MB)"
                        >
                          <FileText size={15} strokeWidth={1.7} className="text-sky-400/80 flex-shrink-0" />
                          <span className="text-[13px] font-medium">Upload Document</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => {
                  setTimeout(() => textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
                }}
                placeholder={
                  isProcessingAttachment
                    ? 'Preparing attachment…'
                    : images.length && !input.trim()
                      ? 'Add a question about these images…'
                      : 'Ask Singularity anything…'
                }
                rows={1}
                disabled={isProcessingAttachment}
                className="flex-1 resize-none bg-transparent text-[14px] text-white/90
                  placeholder:text-white/22 outline-none max-h-[160px] min-h-[26px]
                  leading-relaxed py-[2px] disabled:opacity-60"
                aria-label="Message Singularity"
                aria-busy={isProcessingAttachment}
              />
              <button
                onClick={() => (isThinking ? handleStop() : handleSend())}
                disabled={!isThinking && ((!input.trim() && images.length === 0) || isProcessingAttachment || visionSupported === false && images.length > 0)}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                  transition-all duration-200 mb-0.5 active:scale-90 ${
                  isThinking
                    ? 'bg-white/90 text-black shadow-[0_0_16px_rgba(255,255,255,0.22)]'
                    : ((input.trim() || images.length > 0) && !isProcessingAttachment && !(visionSupported === false && images.length > 0))
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.28)]'
                      : 'bg-white/[0.06] text-white/18 cursor-not-allowed'
                }`}
                aria-label={isThinking ? 'Stop generating' : 'Send message'}
              >
                {isProcessingAttachment
                  ? <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
                  : isThinking
                    ? <Square size={11} strokeWidth={2.5} fill="currentColor" />
                    : <Send size={13} strokeWidth={2.5} className={(input.trim() && !isProcessing) ? 'ml-[1px]' : ''} />
                }
              </button>
            </div>

            {/* Extraction progress indicator */}
            <AnimatePresence>
              {isProcessingAttachment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 pb-2.5">
                    <Loader2 size={11} strokeWidth={2.5} className="animate-spin text-sky-400/70 flex-shrink-0" />
                    <span className="text-[11.5px] text-white/40" aria-live="polite">
                      {isProcessingImages ? 'Optimizing image…' : 'Extracting document…'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {visionSupported === false && images.length > 0 && (
            <p role="status" className="mt-2 text-center text-[11px] text-amber-200/75">
              This model currently supports text only.
            </p>
          )}

          {/* Disclaimer */}
          <p className="text-center text-[10px] text-white/[0.11] mt-3 tracking-[0.04em] leading-relaxed">
            Singularity reasons deeply but can err on cutting-edge science
            <span className="mx-1.5 opacity-40">·</span>
            always verify critical claims
          </p>

          {/* Document extraction error */}
          <AnimatePresence>
            {attachmentError && (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm
                  bg-[#1a0a0a]/95 backdrop-blur-md border border-red-500/25
                  rounded-xl px-4 py-3 shadow-2xl z-50 flex items-start gap-2.5"
              >
                <X size={13} strokeWidth={2.5} className="text-red-400/80 flex-shrink-0 mt-[1px]" />
                 <p className="flex-1 text-[12.5px] text-red-200/90 leading-snug">{attachmentError}</p>
                <button
                   onClick={() => {
                     clearError();
                     clearImageError();
                   }}
                  className="flex-shrink-0 text-red-400/50 hover:text-red-300
                    transition-colors duration-150 ml-1 focus-visible:outline-none
                    focus-visible:ring-1 focus-visible:ring-red-400/50 rounded"
                  aria-label="Dismiss error"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </main>
    </motion.div>
  );
}
