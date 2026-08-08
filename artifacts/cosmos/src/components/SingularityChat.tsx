/**
 * SingularityChat — Full-screen immersive GPT-OSS-120B chat
 * ─────────────────────────────────────────────────────────
 * Full-screen solid dark background (bg-[#09090b]), centered max-w-3xl
 * content column, neural TTS "Listen" button on every AI message.
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Send, Sparkles, BrainCircuit, X, ChevronDown,
  Square, Copy, Check, Pencil, RotateCcw, ArrowDown, Volume2, Mic2,
  BookmarkPlus, Bookmark, Share2, Wand2, Plus, Image, FileText, Loader2, Mic, MicOff,
  ExternalLink, PanelRightOpen,
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
import type { VisualReferencesState } from '@/lib/visualReferences';
import type { SearchImage } from './SearchHeroCarousel';
import { sanitizeVisibleResponse } from '@/lib/responseSanitizer';
import {
  chunkTtsText,
  getTtsPrefetchStatus,
  prefetchTtsAudio,
  primeListenAudio,
  primeVoiceAudio,
  releaseVoiceAudio,
  TtsPlaybackQueue,
  TtsStreamingQueue,
} from '@/lib/edgeTts';
import VoiceModeOverlay, { type VoiceModeState } from './VoiceModeOverlay';
import SingularityModeSelector from './SingularityModeSelector';
import { toast } from '@/hooks/use-toast';
import {
  loadSingularityMode,
  saveSingularityMode,
  type SingularityResponseMetadata,
  type SingularityMode,
} from '@/lib/singularityModes';
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
  visualReferences?: VisualReferencesState;
  modeMetadata?: SingularityResponseMetadata;
  ts: number;
}


// ─── Constants ──────────────────────────────────────────────────────────────

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Singularity',
  ts: Date.now(),
};

const formatMath = (text: string) => {
  if (!text) return text;
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
};

const markdownRemarkPlugins = [remarkGfm, remarkMath];
const markdownRehypePlugins = [rehypeKatex];

// ─── Markdown renderer ──────────────────────────────────────────────────────
const markdownComponents = {
  // ── Block elements ─────────────────────────────────────────────────────────
  p: ({ children }: any) => (
    <p className="mb-5 last:mb-0 text-[15px] leading-[1.72] tracking-[0.002em] text-white/80">
      {children}
    </p>
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
      className="text-violet-200/90 underline underline-offset-[3px] decoration-violet-300/35
        transition-colors duration-150 hover:text-violet-100 hover:decoration-violet-200/65
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45 focus-visible:rounded-sm"
    >
      {children}
    </a>
  ),
  ul: ({ children }: any) => (
    <ul className="my-6 ml-6 list-disc space-y-2.5 marker:text-white/30">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-6 ml-6 list-decimal space-y-2.5 marker:text-white/35">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="pl-1 text-[15px] leading-[1.72] text-white/80">{children}</li>
  ),
  // ── Headings — document-grade hierarchy ───────────────────────────────────
  h1: ({ children }: any) => (
    <h1 className="mt-12 mb-6 text-[36px] font-bold leading-[1.15] tracking-[-0.035em]
      text-white first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mt-12 mb-5 text-[28px] font-semibold leading-[1.2] tracking-[-0.028em]
      text-white/97 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mt-9 mb-4 text-[22px] font-semibold leading-[1.3] tracking-[-0.018em]
      text-white/90 first:mt-0">
      {children}
    </h3>
  ),
  // ── Blockquote — elegant left accent ──────────────────────────────────────
  blockquote: ({ children }: any) => (
    <blockquote className="my-8 rounded-r-xl border-l-2 border-sky-200/40 bg-sky-200/[0.025]
      px-5 py-4 text-[16px] leading-[1.75] text-white/64 shadow-[inset_1px_0_rgba(255,255,255,0.025)]">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-12 border-0 border-t border-white/[0.08]" />
  ),
  // ── Code blocks — refined dark surface ────────────────────────────────────
  pre: ({ children }: any) => (
    <pre className="relative my-8 overflow-x-auto rounded-2xl border border-white/[0.10]
      bg-[#0b0b11] px-5 py-5 text-[14px] leading-[1.7]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </pre>
  ),
  code: ({ className, children }: any) => {
    const isBlock = /language-/.test(className || '');
    return isBlock ? (
      <code className={`font-mono text-white/80 ${className || ''}`}>{children}</code>
    ) : (
      <code className="rounded-md border border-white/[0.08] bg-white/[0.07] px-1.5 py-[2px]
        font-mono text-[14px] text-violet-200/90">
        {children}
      </code>
    );
  },
  // ── Table support ─────────────────────────────────────────────────────────
  table: ({ children }: any) => (
    <div className="my-8 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full min-w-[34rem] text-[15px] leading-[1.6]">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="border-b border-white/[0.08] bg-white/[0.035]">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="[&_tr:nth-child(even)]:bg-white/[0.012]">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="border-b border-white/[0.045] last:border-b-0">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-5 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.12em]
      text-white/48">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-5 py-4 align-top text-white/78">{children}</td>
  ),
};

const MessageContent = memo(function MessageContent({
  content,
  className = '',
}: {
  content: string;
  className?: string;
}) {
  const visibleContent = useMemo(() => sanitizeVisibleResponse(content), [content]);
  const markdownSource = useMemo(() => formatMath(visibleContent), [visibleContent]);
  return (
    <div className={`mx-auto w-full max-w-[70ch] overflow-x-auto overflow-y-hidden
      text-white/82 ${className}`}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={markdownComponents}
      >
        {markdownSource}
      </ReactMarkdown>
    </div>
  );
});

const VisualReferences = memo(function VisualReferences({
  state,
  reducedMotion,
}: {
  state?: VisualReferencesState;
  reducedMotion: boolean;
}) {
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFailedIds(new Set());
  }, [state?.references]);

  if (!state) return null;

  if (state.status === 'loading') {
    return (
      <section
        className="mx-auto mt-8 w-full max-w-[70ch]"
        aria-label="Loading visual references"
        data-testid="visual-references-loading"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-sky-300/65" />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
            Visual References
          </span>
        </div>
        <div className="flex gap-4 overflow-hidden sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(index => (
            <div
              key={index}
              className="min-w-[82%] animate-pulse overflow-hidden rounded-2xl border border-white/[0.07]
                bg-white/[0.025] sm:min-w-0"
              aria-hidden="true"
            >
              <div className="aspect-[16/10] bg-white/[0.06]" />
              <div className="space-y-2 p-4">
                <div className="h-3 w-3/4 rounded bg-white/[0.08]" />
                <div className="h-2.5 w-full rounded bg-white/[0.05]" />
                <div className="h-2.5 w-2/3 rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const visibleReferences = (state.references ?? []).filter(reference => !failedIds.has(reference.id));

  if (visibleReferences.length === 0) return null;

  return (
    <section
      className="mx-auto mt-8 w-full max-w-[70ch]"
      aria-labelledby={`visual-references-title-${visibleReferences[0].id}`}
      data-testid="visual-references"
    >
      <div className="mb-4 flex items-end justify-between gap-4">
             <div className="min-w-0">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-200/45">
            Visual evidence
          </p>
          <h3
            id={`visual-references-title-${visibleReferences[0].id}`}
            className="text-[18px] font-semibold tracking-[-0.018em] text-white/90"
          >
            Visual References
          </h3>
        </div>
        <span className="hidden text-[11px] text-white/30 sm:block">
          {visibleReferences.length} {visibleReferences.length === 1 ? 'reference' : 'references'}
        </span>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scrollbar-hide
        sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {visibleReferences.map(reference => (
          <article
            key={reference.id}
            className="group min-w-[84%] snap-start overflow-hidden rounded-2xl border border-white/[0.09]
              bg-white/[0.025] shadow-[0_10px_30px_rgba(0,0,0,0.24)]
              transition-colors duration-200 hover:border-white/[0.16] sm:min-w-0"
            data-testid={`card-visual-reference-${reference.id}`}
          >
            <a
              href={reference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-inset"
              aria-label={`Open source for ${reference.title}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.04]">
                {!failedIds.has(reference.id) && (
                  <img
                    src={reference.imageUrl}
                    alt={reference.alt}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition duration-500 ${
                      reducedMotion ? '' : 'group-hover:scale-[1.025]'
                    }`}
                    onError={() => setFailedIds(previous => new Set(previous).add(reference.id))}
                  />
                )}
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white/65 backdrop-blur-sm">
                  {reference.source}
                </span>
              </div>
              <div className="p-4">
                <h4 className="line-clamp-2 text-[13px] font-medium leading-[1.4] text-white/88">
                  {reference.title}
                </h4>
                <p className="mt-2 line-clamp-3 text-[12px] leading-[1.55] text-white/48">
                  {reference.caption}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] text-sky-200/55">
                  Source <ExternalLink size={10} aria-hidden="true" />
                </span>
              </div>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
});

const ModeResponseSignature = memo(function ModeResponseSignature({
  metadata,
  onFollowUp,
}: {
  metadata?: SingularityResponseMetadata;
  onFollowUp: (question: string) => void;
}) {
  if (!metadata) return null;

  if (metadata.kind === 'followups') {
    return (
      <section className="mx-auto mt-5 w-full max-w-[70ch]" aria-label="Suggested follow-up questions">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-sky-200/45">
          Continue exploring
        </p>
        <div className="flex flex-wrap gap-2">
          {metadata.questions.map(question => (
            <button
              key={question}
              type="button"
              onClick={() => onFollowUp(question)}
              className="rounded-full border border-sky-200/[0.16] bg-sky-200/[0.045] px-3 py-2 text-left text-[11px] leading-4 text-sky-100/65 transition-colors hover:border-sky-200/35 hover:bg-sky-200/[0.09] hover:text-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/45"
            >
              {question}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto mt-5 w-full max-w-[70ch] rounded-xl border border-emerald-200/[0.13] bg-emerald-200/[0.035] px-4 py-3"
      aria-label="Research evidence summary"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100/48">
        <span>Evidence note</span>
        <span>Confidence: <strong className="font-medium text-emerald-100/75">{metadata.confidence}</strong></span>
        <span>Quality: <strong className="font-medium text-emerald-100/75">{metadata.evidenceQuality}</strong></span>
      </div>
      {metadata.assumptions.length > 0 && (
        <p className="mt-2 text-[11px] leading-4 text-white/48">
          <span className="text-white/65">Assumptions:</span> {metadata.assumptions.join(' · ')}
        </p>
      )}
      <p className="mt-1 text-[11px] leading-4 text-white/48">
        <span className="text-white/65">Uncertainty:</span> {metadata.uncertainty}
      </p>
    </section>
  );
});

const WelcomeHero = memo(function WelcomeHero({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.section
      aria-labelledby="singularity-hero-title"
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion
        ? { duration: 0 }
        : { duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[40rem] px-5 text-center -translate-y-2 sm:-translate-y-4"
    >
      <h1
        id="singularity-hero-title"
        className="pt-1 text-[clamp(2.75rem,8vw,5.25rem)] font-extrabold leading-[1.05]
          tracking-[-0.07em] text-white"
        style={{ fontFamily: 'var(--app-font-heading)' }}
      >
        Singularity
      </h1>

      <p className="mt-7 text-[clamp(1.125rem,2.2vw,1.5rem)] font-medium leading-[1.55]
        tracking-[-0.018em] text-white/72">
        Think deeper.
        <br />
        Explore further.
        <br />
        Create without limits.
      </p>

      <p className="mt-9 text-[10px] font-medium leading-[1.9]
        tracking-[0.22em] text-white/32 sm:text-[11px]">
        Powered by GPT-OSS-120B
        <br />
        <span className="normal-case tracking-[0.12em] text-white/28">
          Designed for research,
          <br />
          creativity,
          <br />
          and intelligent conversations.
        </span>
      </p>
    </motion.section>
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
        transition-gpu active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45 ${
        saved
          ? 'text-violet-400 bg-violet-400/[0.09] border border-violet-400/[0.18]'
           : 'text-white/35 hover:text-white/80 hover:bg-white/[0.065] border border-transparent'
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

function isWorkspaceCandidate(content: string): boolean {
  return content.trim().length >= 420
    || /```|^\s*[-*]\s|^\s*\|.+\|/m.test(content)
    || /\\begin\{|\\\[|\$\$|deriv|proof|research|algorithm|analysis|draft/i.test(content);
}

const WorkspaceButton = memo(function WorkspaceButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="button-open-workspace-response"
      className="flex items-center gap-1.5 rounded-lg border border-violet-300/[0.16] bg-violet-300/[0.06] px-2.5 py-1.5 text-[11px] text-violet-100/70 transition-gpu hover:border-violet-200/35 hover:bg-violet-200/[0.12] hover:text-violet-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
      aria-label="Open this response in Workspace"
    >
      <PanelRightOpen size={11} strokeWidth={1.9} />
      Workspace
    </button>
  );
});

// ─── Copy button ────────────────────────────────────────────────────────────
const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, 2000);
    }).catch(() => {});
  }, [text]);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-white/35
        hover:text-white/80 hover:bg-white/[0.065] transition-gpu
        active:scale-95 active:bg-white/[0.10]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45"
      aria-label={copied ? 'Copied' : 'Copy response'}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
});

const UserMessageActions = memo(function UserMessageActions({
  text,
  onEdit,
  disabled,
  children,
}: {
  text: string;
  onEdit: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const suppressContextMenuUntilRef = useRef(0);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setOpen(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }, [text]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  return (
    <div
      className="relative ml-auto max-w-[82%]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!longPressTriggeredRef.current) setOpen(false);
      }}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
      onTouchStart={event => {
        const touch = event.touches[0];
        if (!touch) return;
        touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
        longPressTriggeredRef.current = false;
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true;
          suppressContextMenuUntilRef.current = Date.now() + 900;
          setOpen(true);
        }, 400);
      }}
      onTouchMove={event => {
        const touch = event.touches[0];
        const origin = touchOriginRef.current;
        if (!touch || !origin) return;
        if (Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > 8) {
          if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          touchOriginRef.current = null;
        }
      }}
      onTouchEnd={event => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchOriginRef.current = null;
        if (longPressTriggeredRef.current) {
          event.preventDefault();
          window.setTimeout(() => {
            longPressTriggeredRef.current = false;
          }, 0);
        }
      }}
      onTouchCancel={() => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchOriginRef.current = null;
        longPressTriggeredRef.current = false;
      }}
      onContextMenu={event => {
        if (longPressTriggeredRef.current || Date.now() < suppressContextMenuUntilRef.current) {
          event.preventDefault();
        }
      }}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-1 top-full z-10 mt-1 flex origin-top-right items-center gap-0.5 rounded-lg border border-white/[0.09]
              bg-[#18181f]/95 p-0.5 shadow-xl backdrop-blur-md"
            aria-label="Message actions"
          >
            <button
              type="button"
              onClick={handleCopy}
               className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] text-white/45 transition-gpu hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
              aria-label={copied ? 'Copied message' : 'Copy message'}
            >
              {copied ? <Check size={11} strokeWidth={2.5} className="text-emerald-300" /> : <Copy size={11} strokeWidth={2} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
               className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[10px] text-white/45 transition-gpu hover:bg-white/[0.08] hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50"
              aria-label="Edit message"
            >
              <Pencil size={11} strokeWidth={2} />
              Edit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        transition-gpu active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/45 ${
        shared
          ? 'text-sky-400/80 bg-sky-400/[0.08] border border-sky-400/[0.15]'
           : 'text-white/35 hover:text-white/80 hover:bg-white/[0.065] border border-transparent'
      }`}
      aria-label={shared ? 'Copied to clipboard' : 'Share this answer'}
    >
      {shared ? <Check size={11} strokeWidth={2.5} /> : <Share2 size={11} strokeWidth={2} />}
      {shared ? 'Copied' : 'Share'}
    </button>
  );
});

// ─── Listen (TTS) button ────────────────────────────────────────────────────
const ListenButton = memo(function ListenButton({
  messageId,
  text,
}: {
  messageId: string;
  text: string;
}) {
  const [state, setState] = useState<'idle' | 'preparing' | 'playing'>('idle');
  const queueRef = useRef<TtsPlaybackQueue | null>(null);

  const stop = useCallback(() => {
    queueRef.current?.stop();
    queueRef.current = null;
    setState('idle');
  }, []);

  const play = useCallback(async () => {
    if (state === 'playing' || state === 'preparing') { stop(); return; }

    // Must happen synchronously in the trusted Listen click before any TTS
    // fetch can complete and before the browser revokes the gesture grant.
    primeListenAudio();
    const queue = new TtsPlaybackQueue();
    queueRef.current = queue;
    const prefetchStatus = getTtsPrefetchStatus(messageId, text);
    // Keep the preparing label only while the background first chunk is
    // pending. A ready cache starts playback without another network wait.
    setState(prefetchStatus === 'pending' || prefetchStatus === 'missing' ? 'preparing' : 'playing');

    try {
      await queue.play(text, messageId, () => setState('playing'));
      if (queueRef.current === queue) setState('idle');
    } catch (error: unknown) {
      if ((error as Error)?.name !== 'AbortError') {
        toast({
          title: 'Audio unavailable',
          description: error instanceof Error ? error.message : 'Edge TTS could not synthesize this response.',
          variant: 'destructive',
        });
      }
      if (queueRef.current === queue) {
        queueRef.current = null;
        setState('idle');
      }
    }
  }, [messageId, text, state, stop]);

  useEffect(() => () => {
    stop();
  }, [stop]);

  return (
    <button
      onClick={play}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
        transition-gpu active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/45 ${
        state === 'playing'
          ? 'text-emerald-400 bg-emerald-400/[0.11] border border-emerald-400/[0.28] shadow-[0_0_12px_rgba(52,211,153,0.10)]'
           : state === 'preparing'
          ? 'text-emerald-400/70 bg-emerald-400/[0.07] border border-emerald-400/[0.14]'
           : 'text-white/35 hover:text-white/80 hover:bg-white/[0.065] border border-transparent'
      }`}
      aria-label={
         state === 'playing' ? 'Stop audio'
           : state === 'preparing' ? 'Preparing audio…'
          : 'Listen to response'
      }
    >
      {state === 'playing' ? (
        <><AudioWave />Stop</>
      ) : state === 'preparing' ? (
        <>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            <Volume2 size={11} strokeWidth={2} />
          </motion.div>
          Preparing…
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
          text-white/32 hover:text-white/72 hover:bg-white/[0.045]
          border border-transparent hover:border-white/[0.06]
          transition-gpu active:scale-95
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/35"
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

// ─── Voice composer control ──────────────────────────────────────────────────
// The control is intentionally transport-agnostic. A parent can own `state` and
// connect the start/stop callbacks to MediaRecorder, while the uncontrolled
// mode keeps the interaction demonstrable until that transport is available.
type MicrophoneState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

interface MicrophoneControlProps {
  disabled?: boolean;
  state?: MicrophoneState;
  errorMessage?: string;
  onStateChange?: (state: MicrophoneState) => void;
  onRecordingStart?: () => void | Promise<void>;
  onRecordingStop?: () => void | Promise<void>;
  onRetry?: () => void;
}

const VOICE_WAVE_BARS = [0.42, 0.78, 0.58, 1, 0.68, 0.9, 0.5, 0.74, 0.38];

const VoiceWaveform = memo(function VoiceWaveform({
  state,
}: { state: MicrophoneState }) {
  const active = state === 'recording';
  const processing = state === 'processing';
  return (
    <div className="flex h-3.5 items-center gap-[2px]" aria-hidden="true">
      {VOICE_WAVE_BARS.map((peak, index) => (
        <motion.span
          key={index}
          className={`w-[2px] origin-center rounded-full ${
            active ? 'bg-rose-300/90' : processing ? 'bg-sky-300/70' : 'bg-white/35'
          }`}
          style={{ height: `${Math.max(3, peak * 13)}px` }}
          animate={active
            ? { scaleY: [0.35, peak, 0.5, peak * 0.82, 0.35], opacity: [0.62, 1, 0.7, 1, 0.62] }
            : processing
              ? { scaleY: [0.62, 1, 0.62], opacity: [0.45, 0.9, 0.45] }
              : { scaleY: 0.72, opacity: 0.62 }}
          transition={active
            ? { duration: 0.76 + (index % 3) * 0.12, repeat: Infinity, delay: index * 0.045, ease: 'easeInOut' }
            : processing
              ? { duration: 0.9, repeat: Infinity, delay: index * 0.06, ease: 'easeInOut' }
              : { duration: 0.16 }}
        />
      ))}
    </div>
  );
});

const formatVoiceTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

interface VoiceLatencyTiming {
  speechEndedAt: number;
  sttResultAt?: number;
  llmRequestAt?: number;
  firstTokenAt?: number;
  ttsStartAt?: number;
  firstAudioAt?: number;
  audibleAt?: number;
}

function logVoiceLatency(timing: VoiceLatencyTiming, event: string): void {
  const duration = (start?: number, end?: number) =>
    start !== undefined && end !== undefined ? Math.round(end - start) : undefined;
  console.info(`[VoiceMode timing] ${event}`, {
    speech_end_to_stt_complete_ms: duration(timing.speechEndedAt, timing.sttResultAt),
    stt_complete_to_llm_request_ms: duration(timing.sttResultAt, timing.llmRequestAt),
    llm_request_to_first_token_ms: duration(timing.llmRequestAt, timing.firstTokenAt),
    first_token_to_tts_start_ms: duration(timing.firstTokenAt, timing.ttsStartAt),
    tts_start_to_first_audio_ready_ms: duration(timing.ttsStartAt, timing.firstAudioAt),
    first_audio_ready_to_first_audio_play_ms: duration(timing.firstAudioAt, timing.audibleAt),
  });
}

async function preprocessRecordedAudio(recording: Blob): Promise<{
  blob: Blob;
  filename: string;
  meaningfulSpeech: boolean;
}> {
  if (recording.size < 512) {
    return {
      blob: recording,
      filename: 'singularity-recording.webm',
      meaningfulSpeech: false,
    };
  }
  const fallback = {
    blob: recording,
    filename: recording.type.includes('mp4')
      ? 'singularity-recording.m4a'
      : recording.type.includes('ogg')
        ? 'singularity-recording.ogg'
        : 'singularity-recording.webm',
    meaningfulSpeech: true,
  };
  const AudioContextClass = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return fallback;

  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    const sampleRate = decoded.sampleRate;
    const frameCount = decoded.length;
    const channels = decoded.numberOfChannels;
    const amplitudeAt = (frame: number) => {
      let peak = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        peak = Math.max(peak, Math.abs(decoded.getChannelData(channel)[frame] ?? 0));
      }
      return peak;
    };
    const silenceThreshold = 0.018;
    let start = 0;
    let end = frameCount;
    while (start < end && amplitudeAt(start) < silenceThreshold) start += 1;
    while (end > start && amplitudeAt(end - 1) < silenceThreshold) end -= 1;
    const padding = Math.floor(sampleRate * 0.08);
    start = Math.max(0, start - padding);
    end = Math.min(frameCount, end + padding);
    if (end - start < Math.floor(sampleRate * 0.08)) {
      return { ...fallback, meaningfulSpeech: false };
    }

    const mono = new Float32Array(end - start);
    let peak = 0;
    let energy = 0;
    const channelData = Array.from({ length: channels }, (_, channel) => decoded.getChannelData(channel));
    for (let frame = start; frame < end; frame += 1) {
      let sample = 0;
      for (const channel of channelData) sample += channel[frame] ?? 0;
      sample /= Math.max(1, channelData.length);
      mono[frame - start] = sample;
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    const rms = Math.sqrt(energy / Math.max(1, mono.length));
    const meaningfulSpeech = peak >= 0.018 && rms >= 0.004;

    const gain = peak > 0.001 ? Math.min(1.8, 0.92 / peak) : 1;
    const wavBuffer = new ArrayBuffer(44 + mono.length * 2);
    const view = new DataView(wavBuffer);
    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + mono.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, mono.length * 2, true);
    for (let index = 0; index < mono.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, mono[index] * gain));
      view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    const normalized = new Blob([wavBuffer], { type: 'audio/wav' });
    return normalized.size <= 16 * 1024 * 1024
      ? { blob: normalized, filename: 'singularity-recording.wav', meaningfulSpeech }
      : fallback;
  } catch {
    return fallback;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export const MicrophoneControl = memo(function MicrophoneControl({
  disabled = false,
  state: controlledState,
  errorMessage = 'Voice capture failed',
  onStateChange,
  onRecordingStart,
  onRecordingStop,
  onRetry,
}: MicrophoneControlProps) {
  const [localState, setLocalState] = useState<MicrophoneState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const state = controlledState ?? localState;
  const isControlled = controlledState !== undefined;
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdActiveRef = useRef(false);
  const suppressClickRef = useRef(false);

  const updateState = useCallback((next: MicrophoneState) => {
    setLocalState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  useEffect(() => {
    if (state !== 'recording') {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      if (state !== 'success') setElapsed(0);
      return;
    }

    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 250);

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [state]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, []);

  const handleStart = useCallback(async () => {
    if (disabled) return;
    updateState('recording');
    try {
      await onRecordingStart?.();
    } catch {
      updateState('error');
    }
  }, [disabled, onRecordingStart, updateState]);

  const handleStop = useCallback(async () => {
    if (disabled) return;
    updateState('processing');
    try {
      const callbackResult = onRecordingStop?.();
      if (callbackResult && typeof (callbackResult as Promise<void>).then === 'function') {
        await callbackResult;
      } else if (!isControlled) {
        await new Promise<void>(resolve => {
          settleRef.current = window.setTimeout(resolve, 720);
        });
      }
      if (!isControlled) updateState('success');
    } catch {
      updateState('error');
    }
  }, [disabled, isControlled, onRecordingStop, updateState]);

  const handlePress = useCallback(async () => {
    if (disabled) return;

    if (state === 'error') {
      onRetry?.();
      updateState('idle');
      return;
    }

    if (state === 'success') {
      updateState('idle');
      return;
    }

    if (state === 'idle') {
      await handleStart();
      return;
    }

    if (state === 'recording') {
      await handleStop();
    }
  }, [disabled, handleStart, handleStop, onRetry, state, updateState]);

  const handlePointerDown = useCallback(() => {
    if (disabled || state !== 'idle') return;
    holdTimerRef.current = window.setTimeout(() => {
      holdActiveRef.current = true;
      suppressClickRef.current = true;
      void handleStart();
    }, 450);
  }, [disabled, handleStart, state]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdActiveRef.current) {
      holdActiveRef.current = false;
      void handleStop();
    }
  }, [handleStop]);

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    void handlePress();
  }, [handlePress]);

  const stateCopy: Record<MicrophoneState, { label: string; detail: string }> = {
    idle: { label: 'Voice input', detail: 'Tap to speak' },
    recording: { label: 'Listening', detail: formatVoiceTime(elapsed) },
    processing: { label: 'Transcribing', detail: 'Working' },
    success: { label: 'Captured', detail: 'Tap to speak again' },
    error: { label: 'Voice unavailable', detail: 'Tap to retry' },
  };
  const copy = stateCopy[state];
  const isActive = state === 'recording' || state === 'processing';

  return (
    <div className="singularity-composer-mic relative flex min-w-0 items-center gap-2" aria-live="polite">
      <AnimatePresence initial={false} mode="wait">
        {isActive && (
          <motion.div
            key="voice-status"
            initial={{ opacity: 0, x: 5, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 5, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="singularity-composer-voice-status flex items-center gap-1.5 rounded-full border
              bg-white/[0.035] px-2.5 py-1.5 sm:flex"
          >
            <VoiceWaveform state={state} />
            <span className="font-mono text-[10px] tabular-nums tracking-[0.08em] text-white/48">
              {copy.detail}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        disabled={disabled || state === 'processing'}
        aria-label={`${copy.label}. ${copy.detail}`}
        aria-pressed={state === 'recording'}
        title={`${copy.label} · ${copy.detail}`}
        className={`singularity-composer-mic-button is-${state} group relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
          border transition-all duration-200 active:scale-90
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d12]
          disabled:cursor-not-allowed disabled:opacity-35 ${
            state === 'recording'
              ? 'border-rose-300/45 bg-rose-300/[0.13] text-rose-200 shadow-[0_0_0_4px_rgba(251,113,133,0.07),0_0_20px_rgba(251,113,133,0.16)] focus-visible:ring-rose-300/60'
              : state === 'processing'
                ? 'border-sky-300/30 bg-sky-300/[0.09] text-sky-200 focus-visible:ring-sky-300/50'
                : state === 'success'
                  ? 'border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-200 focus-visible:ring-emerald-300/50'
                  : state === 'error'
                    ? 'border-amber-300/35 bg-amber-300/[0.09] text-amber-200 focus-visible:ring-amber-300/50'
                    : 'border-white/[0.09] bg-white/[0.045] text-white/42 hover:border-white/[0.17] hover:bg-white/[0.09] hover:text-white/78 focus-visible:ring-white/40'
          }`}
      >
        {state === 'recording'
          ? <MicOff size={14} strokeWidth={2} />
          : state === 'processing'
            ? <VoiceWaveform state={state} />
            : <Mic size={14} strokeWidth={1.9} />}
        {state === 'recording' && (
          <motion.span
            className="absolute inset-[-4px] rounded-full border border-rose-300/30"
            animate={{ opacity: [0, 0.7, 0], scale: [0.9, 1.18, 1.3] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            aria-hidden="true"
          />
        )}
      </button>

      <span className="sr-only">
        {state === 'error' ? `${errorMessage}. ${copy.detail}.` : `${copy.label}. ${copy.detail}.`}
      </span>
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
      className="self-start flex items-center gap-2.5 rounded-2xl rounded-bl-sm border
        border-emerald-300/[0.18] bg-emerald-300/[0.055] px-4 py-3
        shadow-[0_10px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Singularity is thinking"
    >
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
      <div className="thinking-dot w-1.5 h-1.5 bg-emerald-400/75 rounded-full" />
    </motion.div>
  );
});

interface MessageRowProps {
  message: Message;
  isUserActionDisabled: boolean;
  isLastAssistant: boolean;
  isGenerating: boolean;
  showActions: boolean;
  prefersReducedMotion: boolean;
  onEdit: (messageId: string) => void;
  onSimplify: () => void;
  onRegenerate: () => void;
  onSave: (content: string) => void;
  onOpenWorkspace: (content: string) => void;
  onFollowUp: (question: string) => void;
}

const MessageRow = memo(function MessageRow({
  message: msg,
  isUserActionDisabled,
  isLastAssistant,
  isGenerating,
  showActions,
  prefersReducedMotion,
  onEdit,
  onSimplify,
  onRegenerate,
  onSave,
  onOpenWorkspace,
  onFollowUp,
}: MessageRowProps) {
  const handleEdit = useCallback(() => onEdit(msg.id), [msg.id, onEdit]);
  const handleSave = useCallback(() => onSave(msg.content), [msg.content, onSave]);

  return (
    <motion.div
      initial={msg.id === 'welcome' || prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 220px' }}
      className={`w-full flex flex-col ${
        msg.id === 'welcome'
          ? 'items-center mb-0'
          : msg.role === 'user'
            ? 'items-end mb-9 sm:mb-10'
            : 'items-start mb-7 sm:mb-8'
      } ${msg.role === 'user' ? 'group' : ''}`}
    >
      {msg.role === 'user' && (
        <UserMessageActions
          text={msg.content}
          onEdit={handleEdit}
          disabled={isUserActionDisabled}
        >
          <div className="bg-white/[0.075] border border-white/[0.14] text-white/92
            rounded-2xl rounded-br-[4px] px-4 py-3.5
            text-[15px] leading-[1.6] font-[450]
            shadow-[0_8px_24px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.10)]">
            {msg.attachedImages?.length ? (
              <div className="mb-2.5">
                <ImageAttachmentGrid images={msg.attachedImages} readOnly />
              </div>
            ) : null}
            {msg.attachedDocument && (
              <DocumentChip record={msg.attachedDocument} isThinking={false} readOnly />
            )}
            {msg.content}
          </div>
        </UserMessageActions>
      )}

      {msg.role === 'assistant' && msg.error && (
        <>
          <div className="bg-red-400/[0.055] border border-red-300/[0.18] text-red-200/90
            rounded-2xl rounded-bl-[4px] text-[13.5px] leading-relaxed px-5 py-4 max-w-[85%]
            shadow-[0_8px_22px_rgba(0,0,0,0.24)]">
            <MessageContent content={msg.content} />
          </div>
          <button
            onClick={onRegenerate}
            className="mt-1.5 rounded px-1 text-[11px] text-red-300/65 underline underline-offset-2
              transition-colors hover:bg-red-300/[0.07] hover:text-red-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/45"
          >
            Retry
          </button>
        </>
      )}

      {msg.role === 'assistant' && !msg.error && (
        msg.id === 'welcome' ? (
          <WelcomeHero reducedMotion={Boolean(prefersReducedMotion)} />
        ) : (
          <>
            {msg.reasoning && msg.reasoning.trim() && (
              <div className="w-full mb-3">
                <ReasoningBlock reasoning={msg.reasoning} seconds={msg.reasoningSeconds} />
              </div>
            )}

            <div className={`w-full pt-1 pb-2 ${isGenerating ? 'stream-pulse-text' : 'animate-cosmos-fade'}`}>
              <MessageContent content={msg.content || (isGenerating ? '' : '…')} />
            </div>

            {!isGenerating && msg.content.trim() && (
              <ModeResponseSignature metadata={msg.modeMetadata} onFollowUp={onFollowUp} />
            )}

            {!isGenerating && (
              <div className="w-full border-b border-white/[0.05] mt-1 mb-3" />
            )}

            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-0.5 flex-wrap"
              >
                <ListenButton messageId={msg.id} text={msg.content} />
                <CopyButton text={msg.content} />
                <ShareButton text={msg.content} />
                <span aria-hidden="true" className="mx-1 h-3.5 w-px bg-white/[0.09] self-center flex-shrink-0" />
                <SaveButton onSave={handleSave} />
                {isWorkspaceCandidate(msg.content) && (
                  <WorkspaceButton onOpen={() => onOpenWorkspace(msg.content)} />
                )}
                {isLastAssistant && (
                  <>
                    <button
                      onClick={onSimplify}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                        text-white/32 hover:text-white/80 hover:bg-white/[0.065] border border-transparent
                        transition-gpu active:scale-95
                        disabled:opacity-40 disabled:cursor-not-allowed
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45"
                      aria-label="Ask Singularity to explain more simply"
                    >
                      <Wand2 size={11} strokeWidth={2} />
                      Simplify
                    </button>
                    <button
                      onClick={onRegenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]
                        text-white/32 hover:text-white/80 hover:bg-white/[0.065] border border-transparent
                        transition-gpu active:scale-95
                        disabled:opacity-40 disabled:cursor-not-allowed
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45"
                      aria-label="Regenerate response"
                    >
                      <RotateCcw size={11} strokeWidth={2} />
                      Regenerate
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </>
        )
      )}
    </motion.div>
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
export default function SingularityChat({
  onClose,
  onOpenSettings,
  pendingImage,
  onPendingImageConsumed,
}: {
  onClose?: () => void;
  onOpenSettings?: () => void;
  pendingImage?: SearchImage;
  onPendingImageConsumed?: () => void;
}) {
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
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownNow, setCooldownNow] = useState(() => Date.now());
  const [mode, setMode] = useState<SingularityMode>(() => loadSingularityMode());
  const [voiceState, setVoiceState] = useState<MicrophoneState>('idle');
  const [voiceError, setVoiceError] = useState('');
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [voiceModeState, setVoiceModeState] = useState<VoiceModeState>('idle');
  const [voiceStatusText, setVoiceStatusText] = useState('Ready when you are.');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceAssistantText, setVoiceAssistantText] = useState('');
  const [voiceMicLevel, setVoiceMicLevel] = useState(0);
  const [voiceOutputLevel, setVoiceOutputLevel] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceSpeakerEnabled, setVoiceSpeakerEnabled] = useState(true);
  const workspace                       = useWorkspace();
  const attachRef                       = useRef<HTMLDivElement>(null);
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const imageInputRef                   = useRef<HTMLInputElement>(null);
  const pendingImageIdRef               = useRef<string | null>(null);

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

  // A search result enters through the same optimized attachment pipeline as a
  // local upload. It is consumed once and remains a draft until the user sends.
  useEffect(() => {
    if (!pendingImage || pendingImageIdRef.current === pendingImage.id) return;
    pendingImageIdRef.current = pendingImage.id;
    let cancelled = false;
    const attachSearchImage = async () => {
      try {
        const response = await fetch(pendingImage.proxyUrl || pendingImage.imageUrl);
        if (!response.ok) throw new Error(`Image download returned ${response.status}`);
        const blob = await response.blob();
        if (cancelled) return;
        const type = blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
        const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
        const file = new File([blob], `singularity-search-${pendingImage.id}.${extension}`, { type });
        await processImageFiles([file]);
      } catch {
        // The attachment hook owns visible processing errors. A failed remote
        // fetch should not block the normal composer or chat transport.
      } finally {
        if (!cancelled) onPendingImageConsumed?.();
      }
    };
    void attachSearchImage();
    return () => { cancelled = true; };
  }, [onPendingImageConsumed, pendingImage, processImageFiles]);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const composerShellRef = useRef<HTMLDivElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingStartRef = useRef<number>(0);
  const stickToBottomRef = useRef(true);
  const cooldownUntilRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingVadTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const recordingSilenceStartedAtRef = useRef<number | null>(null);
  const recordingFinalizingRef = useRef(false);
  const recordingRequestAbortRef = useRef<AbortController | null>(null);
  const recordingTranscriptionTimeoutRef = useRef<number | null>(null);
  const voiceResetTimerRef = useRef<number | null>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceRecordingStreamRef = useRef<MediaStream | null>(null);
  const voiceRecordingChunksRef = useRef<Blob[]>([]);
  const voiceRecordingAnalyserRef = useRef<AnalyserNode | null>(null);
  const voiceRecordingAudioContextRef = useRef<AudioContext | null>(null);
  const voiceRecordingVadTimerRef = useRef<number | null>(null);
  const voiceRecordingMeterFrameRef = useRef<number | null>(null);
  const voiceMicLevelRef = useRef(0);
  const voiceRecordingStartedAtRef = useRef(0);
  const voiceSpeechStartedRef = useRef(false);
  const voiceSilenceStartedAtRef = useRef<number | null>(null);
  const voiceInterruptSpeechFramesRef = useRef(0);
  const voiceFinalizingRef = useRef(false);
  const voiceRecordingModeRef = useRef<'turn' | 'interrupt'>('turn');
  const voiceWasInterruptedRef = useRef(false);
  const voicePlaybackGuardUntilRef = useRef(0);
  const voiceSessionRef = useRef(0);
  const voiceRequestAbortRef = useRef<AbortController | null>(null);
  const voiceTranscriptionTimeoutRef = useRef<number | null>(null);
  const voiceLatencyTimingRef = useRef<VoiceLatencyTiming | null>(null);
  const mountedRef = useRef(true);
  const voiceTtsQueueRef = useRef<TtsStreamingQueue | null>(null);
  const voiceSentenceBufferRef = useRef('');
  const voiceLastAssistantContentRef = useRef('');
  const voiceFinalizeRef = useRef<(() => void) | null>(null);
  const voiceInterruptRef = useRef<((preserveRecording?: boolean) => void) | null>(null);
  const voiceTurnRef = useRef<(text: string) => void>(() => undefined);
  const voiceRestartTimerRef = useRef<number | null>(null);
  const composerFocusTimerRef = useRef<number | null>(null);
  const composerScrollTimerRef = useRef<number | null>(null);
  const streamUpdateFrameRef = useRef<number | null>(null);
  const scrollMetricsFrameRef = useRef<number | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const showScrollButtonRef = useRef(false);
  const pendingStreamUpdateRef = useRef<{
    messageId: string;
    reasoning?: string;
    content?: string;
    reasoningSeconds: number;
  } | null>(null);
  const voiceRestartRecordingRef = useRef<(sessionId: number) => void>(() => undefined);
  const voiceModeOpenRef = useRef(false);
  const voiceMutedRef = useRef(false);
  const voiceSpeakerEnabledRef = useRef(true);
  const messagesRef = useRef(messages);
  const inputRef = useRef(input);
  const imagesRef = useRef(images);
  const attachedDocRef = useRef(attachedDoc);
  const isThinkingRef = useRef(isThinking);
  const voiceModeStateRef = useRef(voiceModeState);
  messagesRef.current = messages;
  inputRef.current = input;
  imagesRef.current = images;
  attachedDocRef.current = attachedDoc;
  isThinkingRef.current = isThinking;
  voiceModeStateRef.current = voiceModeState;
  voiceModeOpenRef.current = voiceModeOpen;
  voiceMutedRef.current = voiceMuted;
  voiceSpeakerEnabledRef.current = voiceSpeakerEnabled;

  const commitStreamUpdate = useCallback((update: {
    messageId: string;
    reasoning?: string;
    content?: string;
    reasoningSeconds: number;
  }) => {
    setMessages(previous => {
      const index = previous.findIndex(message => message.id === update.messageId);
      if (index < 0) return previous;
      const message = previous[index];
      const nextReasoning = update.reasoning ?? message.reasoning ?? '';
      const nextContent = update.content ?? message.content ?? '';
      if (
        message.reasoning === nextReasoning
        && message.content === nextContent
        && message.reasoningSeconds === update.reasoningSeconds
      ) {
        return previous;
      }
      const next = [...previous];
      next[index] = {
        ...message,
        reasoning: nextReasoning,
        content: nextContent,
        reasoningSeconds: update.reasoningSeconds,
      };
      return next;
    });
  }, []);

  const flushStreamUpdate = useCallback(() => {
    if (streamUpdateFrameRef.current !== null) {
      window.cancelAnimationFrame(streamUpdateFrameRef.current);
      streamUpdateFrameRef.current = null;
    }
    const update = pendingStreamUpdateRef.current;
    pendingStreamUpdateRef.current = null;
    if (update) commitStreamUpdate(update);
  }, [commitStreamUpdate]);

  const scheduleStreamUpdate = useCallback((
    messageId: string,
    reasoning: string | undefined,
    content: string | undefined,
    reasoningSeconds: number,
  ) => {
    pendingStreamUpdateRef.current = { messageId, reasoning, content, reasoningSeconds };
    if (streamUpdateFrameRef.current !== null) return;
    streamUpdateFrameRef.current = window.requestAnimationFrame(() => {
      streamUpdateFrameRef.current = null;
      const update = pendingStreamUpdateRef.current;
      pendingStreamUpdateRef.current = null;
      if (update) commitStreamUpdate(update);
    });
  }, [commitStreamUpdate]);

  const prefersReducedMotion = useReducedMotion();
  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - cooldownNow) / 1000));

  useEffect(() => {
    if (!cooldownUntil) return;
    const updateCooldown = () => {
      const now = Date.now();
      setCooldownNow(now);
      if (now >= cooldownUntilRef.current) {
        cooldownUntilRef.current = 0;
        setCooldownUntil(0);
      }
    };
    updateCooldown();
    const timer = window.setInterval(updateCooldown, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const beginMessageCooldown = useCallback((seconds = 15) => {
    const until = Date.now() + seconds * 1000;
    cooldownUntilRef.current = until;
    setCooldownUntil(until);
    setCooldownNow(Date.now());
  }, []);

  const clearMessageCooldown = useCallback(() => {
    cooldownUntilRef.current = 0;
    setCooldownUntil(0);
    setCooldownNow(Date.now());
  }, []);

  const stopRecordingResources = useCallback(() => {
    if (recordingVadTimerRef.current !== null) {
      window.clearInterval(recordingVadTimerRef.current);
      recordingVadTimerRef.current = null;
    }
    recordingAnalyserRef.current?.disconnect();
    recordingAnalyserRef.current = null;
    void recordingAudioContextRef.current?.close().catch(() => undefined);
    recordingAudioContextRef.current = null;
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const setVoiceFailure = useCallback((message: string) => {
    if (!mountedRef.current) return;
    stopRecordingResources();
    recorderRef.current = null;
    recordingFinalizingRef.current = false;
    setVoiceError(message);
    setVoiceState('error');
  }, [stopRecordingResources]);

  const stopVoiceModeResources = useCallback(() => {
    const recorder = voiceRecorderRef.current;
    if (recorder?.state === 'recording') {
      try {
        recorder.stop();
      } catch {
        // The recorder may already be closing as the browser tears down the stream.
      }
    }
    if (voiceRecordingVadTimerRef.current !== null) {
      window.clearInterval(voiceRecordingVadTimerRef.current);
      voiceRecordingVadTimerRef.current = null;
    }
    if (voiceRecordingMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceRecordingMeterFrameRef.current);
      voiceRecordingMeterFrameRef.current = null;
    }
    voiceRecordingAnalyserRef.current?.disconnect();
    voiceRecordingAnalyserRef.current = null;
    void voiceRecordingAudioContextRef.current?.close().catch(() => undefined);
    voiceRecordingAudioContextRef.current = null;
    voiceRecordingStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceRecordingStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceRecordingChunksRef.current = [];
    voiceSilenceStartedAtRef.current = null;
    voiceInterruptSpeechFramesRef.current = 0;
    setVoiceMicLevel(0);
  }, []);

  const stopVoiceMode = useCallback((preserveRecording = false) => {
    voiceSessionRef.current += 1;
    if (voiceRestartTimerRef.current !== null) {
      window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }
    voiceRequestAbortRef.current?.abort();
    voiceRequestAbortRef.current = null;
    voiceTtsQueueRef.current?.stop();
    voiceTtsQueueRef.current = null;
    releaseVoiceAudio();
    voiceSentenceBufferRef.current = '';
    voiceFinalizingRef.current = false;
    voiceFinalizeRef.current = null;
    voicePlaybackGuardUntilRef.current = 0;
    if (!preserveRecording) {
      stopVoiceModeResources();
    }
    setVoiceModeState('idle');
    setVoiceStatusText('Voice mode closed.');
  }, [stopVoiceModeResources]);

  const finishVoiceRecording = useCallback(async () => {
    if (voiceFinalizingRef.current) return;
    const recorder = voiceRecorderRef.current;
    if (!recorder) return;
    const sessionId = voiceSessionRef.current;
    const timing: VoiceLatencyTiming = { speechEndedAt: performance.now() };
    voiceLatencyTimingRef.current = timing;
    logVoiceLatency(timing, 'speech_end');
    voiceFinalizingRef.current = true;
    if (voiceRecordingVadTimerRef.current !== null) {
      window.clearInterval(voiceRecordingVadTimerRef.current);
      voiceRecordingVadTimerRef.current = null;
    }
    const blob = await new Promise<Blob | null>(resolve => {
      let stopSeen = recorder.state === 'inactive';
      let finalDataSeen = recorder.state === 'inactive';
      let settled = false;
      const cleanup = () => {
        recorder.removeEventListener('dataavailable', onDataAvailable);
        recorder.removeEventListener('stop', onStop);
        recorder.removeEventListener('error', onError);
      };
      const finish = () => {
        if (settled || !stopSeen || !finalDataSeen) return;
        settled = true;
        cleanup();
        resolve(new Blob([...voiceRecordingChunksRef.current], {
          type: recorder.mimeType || 'audio/webm',
        }));
      };
      const onDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0 && !voiceRecordingChunksRef.current.includes(event.data)) {
          voiceRecordingChunksRef.current.push(event.data);
        }
        // The MediaRecorder stop event is dispatched after the terminal
        // dataavailable event. Marking this here ensures the final chunk is
        // collected before stop resolves the upload blob.
        finalDataSeen = true;
        finish();
      };
      const onStop = () => {
        stopSeen = true;
        finish();
      };
      const onError = () => {
        cleanup();
        resolve(null);
      };
      recorder.addEventListener('dataavailable', onDataAvailable);
      recorder.addEventListener('stop', onStop, { once: true });
      recorder.addEventListener('error', onError, { once: true });
      if (recorder.state === 'recording' || recorder.state === 'paused') recorder.stop();
      else finish();
    });
    stopVoiceModeResources();
    voiceFinalizingRef.current = false;
    voiceFinalizeRef.current = null;
    const resumeListening = () => {
      if (voiceModeOpenRef.current && sessionId === voiceSessionRef.current) {
        setVoiceModeState('listening');
        setVoiceStatusText('Listening…');
        if (voiceRestartTimerRef.current !== null) window.clearTimeout(voiceRestartTimerRef.current);
        voiceRestartTimerRef.current = window.setTimeout(() => {
          voiceRestartTimerRef.current = null;
          if (voiceModeOpenRef.current && sessionId === voiceSessionRef.current) {
            voiceRestartRecordingRef.current(sessionId);
          }
        }, 120);
      }
    };
    if (!blob || blob.size === 0 || blob.size > 16 * 1024 * 1024) {
      resumeListening();
      return;
    }

    setVoiceModeState('understanding');
    setVoiceStatusText('Understanding your question…');
    try {
      const preparedAudio = await preprocessRecordedAudio(blob);
      if (!preparedAudio.meaningfulSpeech) {
        resumeListening();
        return;
      }
      const controller = new AbortController();
      voiceRequestAbortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 30_000);
      voiceTranscriptionTimeoutRef.current = timeout;
      const form = new FormData();
      form.append('audio', preparedAudio.blob, preparedAudio.filename);
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (voiceTranscriptionTimeoutRef.current === timeout) {
        voiceTranscriptionTimeoutRef.current = null;
      }
      const result = await response.json().catch(() => ({})) as { text?: unknown; error?: unknown };
      const text = typeof result.text === 'string' ? result.text.trim() : '';
      if (sessionId !== voiceSessionRef.current) return;
      if (!response.ok || !text) {
        resumeListening();
        return;
      }
      timing.sttResultAt = performance.now();
      logVoiceLatency(timing, 'stt_complete');
      setVoiceTranscript(text);
      voiceRequestAbortRef.current = null;
      voiceTurnRef.current(text);
    } catch (error: unknown) {
      if (sessionId !== voiceSessionRef.current) return;
      console.error('[SingularityChat] Voice Mode transcription pipeline failed:', error);
      resumeListening();
    } finally {
      if (voiceTranscriptionTimeoutRef.current !== null) {
        window.clearTimeout(voiceTranscriptionTimeoutRef.current);
        voiceTranscriptionTimeoutRef.current = null;
      }
      voiceRequestAbortRef.current = null;
    }
  }, [stopVoiceModeResources]);

  const startVoiceRecording = useCallback(async (monitorForInterruption = false, expectedSession = voiceSessionRef.current) => {
    if (!voiceModeOpenRef.current || expectedSession !== voiceSessionRef.current || voiceFinalizingRef.current || voiceRecorderRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceModeState('offline');
      setVoiceStatusText('This browser does not support microphone recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48_000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!voiceModeOpenRef.current || expectedSession !== voiceSessionRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('No supported recording format is available.');
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 });
      voiceRecordingStreamRef.current = stream;
      voiceRecordingChunksRef.current = [];
      voiceRecordingStartedAtRef.current = Date.now();
      voiceSpeechStartedRef.current = false;
       voiceRecordingModeRef.current = monitorForInterruption ? 'interrupt' : 'turn';
      voiceWasInterruptedRef.current = false;
       voiceSilenceStartedAtRef.current = null;
       voiceInterruptSpeechFramesRef.current = 0;
      voiceRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) voiceRecordingChunksRef.current.push(event.data);
      };
      recorder.start(200);
      if (!monitorForInterruption) {
        setVoiceModeState('listening');
        setVoiceStatusText('Listening… speak naturally.');
      }

      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        void context.resume().catch(() => undefined);
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        voiceRecordingAudioContextRef.current = context;
        voiceRecordingAnalyserRef.current = analyser;
        const samples = new Uint8Array(analyser.fftSize);
        const measure = () => {
          if (voiceRecordingAnalyserRef.current !== analyser) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, sample) => {
            const normalized = (sample - 128) / 128;
            return sum + normalized * normalized;
          }, 0) / samples.length);
          const level = Math.min(1, rms * 4.2);
          voiceMicLevelRef.current = level;
          setVoiceMicLevel(level);
           if (voiceMutedRef.current) {
             voiceSilenceStartedAtRef.current = null;
             voiceInterruptSpeechFramesRef.current = 0;
           } else if (voiceRecordingModeRef.current === 'interrupt') {
             if (Date.now() >= voicePlaybackGuardUntilRef.current && level > 0.14) {
               voiceInterruptSpeechFramesRef.current += 1;
               if (voiceInterruptSpeechFramesRef.current >= 3) {
                 voiceInterruptRef.current?.(true);
                 voiceInterruptSpeechFramesRef.current = 0;
               }
             } else if (level < 0.08) {
               voiceInterruptSpeechFramesRef.current = 0;
             }
           } else if (level > 0.075) {
             voiceSpeechStartedRef.current = true;
             voiceSilenceStartedAtRef.current = null;
          }
          voiceRecordingMeterFrameRef.current = window.requestAnimationFrame(measure);
        };
        measure();
        voiceRecordingVadTimerRef.current = window.setInterval(() => {
          const elapsed = Date.now() - voiceRecordingStartedAtRef.current;
          if (elapsed >= 60_000) {
            void finishVoiceRecording();
            return;
          }
           if (voiceRecordingModeRef.current === 'turn' && voiceSpeechStartedRef.current && !voiceMutedRef.current) {
             if (voiceMicLevelRef.current < 0.045) {
               voiceSilenceStartedAtRef.current ??= Date.now();
                // Keep the hold long enough for natural word boundaries, but
                // do not make every turn wait multiple seconds before STT.
                if (Date.now() - voiceSilenceStartedAtRef.current >= 800) void finishVoiceRecording();
             } else if (voiceMicLevelRef.current > 0.065) {
               voiceSilenceStartedAtRef.current = null;
             }
          }
        }, 160);
      }
    } catch (error: unknown) {
      if (!voiceModeOpenRef.current || expectedSession !== voiceSessionRef.current) return;
      setVoiceModeState(navigator.onLine ? 'idle' : 'offline');
      const permissionDenied = error instanceof DOMException && error.name === 'NotAllowedError';
      setVoiceModeState(permissionDenied ? 'error' : (navigator.onLine ? 'idle' : 'offline'));
      setVoiceStatusText(permissionDenied
        ? 'Microphone access is off. Allow access, then try again.'
        : error instanceof DOMException && error.name === 'NotFoundError'
          ? 'No microphone was found on this device.'
          : error instanceof Error ? error.message : 'Microphone could not be started.');
    }
  }, [finishVoiceRecording]);

  const handleRetryVoiceMicrophone = useCallback(() => {
    if (!voiceModeOpenRef.current || voiceSessionRef.current <= 0) return;
    setVoiceModeState('listening');
    setVoiceStatusText('Listening…');
    void startVoiceRecording(false, voiceSessionRef.current);
  }, [startVoiceRecording]);

  voiceRestartRecordingRef.current = (sessionId: number) => {
    if (!voiceModeOpenRef.current || sessionId !== voiceSessionRef.current) return;
    void startVoiceRecording(false, sessionId);
  };

  voiceFinalizeRef.current = finishVoiceRecording;

  const handleVoiceInterrupt = useCallback((preserveRecording = false) => {
    voiceRequestAbortRef.current?.abort();
    voiceRequestAbortRef.current = null;
    voiceTtsQueueRef.current?.stop();
    voiceTtsQueueRef.current = null;
    voiceSentenceBufferRef.current = '';
    if (preserveRecording && voiceRecorderRef.current?.state === 'recording') {
      voiceWasInterruptedRef.current = true;
      voiceRecordingModeRef.current = 'turn';
      voiceSpeechStartedRef.current = true;
      voiceSilenceStartedAtRef.current = null;
      setVoiceModeState('listening');
      setVoiceStatusText('Listening…');
      return;
    }
    stopVoiceModeResources();
    setVoiceModeState('interrupted');
    setVoiceStatusText('Listening again…');
    if (voiceModeOpenRef.current) {
      if (voiceRestartTimerRef.current !== null) window.clearTimeout(voiceRestartTimerRef.current);
      const sessionId = voiceSessionRef.current;
      voiceRestartTimerRef.current = window.setTimeout(() => {
        voiceRestartTimerRef.current = null;
        if (voiceModeOpenRef.current && sessionId === voiceSessionRef.current) void startVoiceRecording(false, sessionId);
      }, 120);
    }
  }, [startVoiceRecording, stopVoiceModeResources]);

  voiceInterruptRef.current = handleVoiceInterrupt;

  const handleOpenVoiceMode = useCallback(() => {
    if (isThinking || isOffline) {
      setVoiceModeState(isOffline ? 'offline' : 'reconnecting');
      setVoiceStatusText(isOffline ? 'You are offline. Voice mode will reconnect when signal returns.' : 'Finish the current response before opening Voice Mode.');
      return;
    }
    voiceSessionRef.current += 1;
    const sessionId = voiceSessionRef.current;
    voiceModeOpenRef.current = true;
    primeVoiceAudio();
    setVoiceModeOpen(true);
    setVoiceModeState('listening');
    setVoiceStatusText('Listening…');
    setVoiceTranscript('');
    setVoiceAssistantText('');
    void startVoiceRecording(false, sessionId);
  }, [isOffline, isThinking, startVoiceRecording]);

  const handleCloseVoiceMode = useCallback(() => {
    voiceModeOpenRef.current = false;
    setVoiceModeOpen(false);
    if (voiceRecordingStreamRef.current) {
      voiceRecordingStreamRef.current.getTracks().forEach(track => track.stop());
      voiceRecordingStreamRef.current = null;
    }
    stopVoiceMode();
  }, [stopVoiceMode]);

  const handleToggleVoiceMute = useCallback(() => {
    const muted = !voiceMutedRef.current;
    voiceMutedRef.current = muted;
    voiceRecordingStreamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
    setVoiceMuted(muted);
  }, []);

  const handleToggleVoiceSpeaker = useCallback(() => {
    const enabled = !voiceSpeakerEnabledRef.current;
    voiceSpeakerEnabledRef.current = enabled;
    voiceTtsQueueRef.current?.setSpeakerEnabled(enabled);
    setVoiceSpeakerEnabled(enabled);
  }, []);

  const handleVoiceStart = useCallback(async () => {
    setVoiceError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceFailure('This browser does not support microphone recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48_000 },
          sampleSize: { ideal: 16 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) {
        stream.getTracks().forEach(track => track.stop());
        setVoiceFailure('No supported recording format is available.');
        return;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128_000,
      });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      recordingSilenceStartedAtRef.current = null;
      recordingFinalizingRef.current = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.start(250);

      const AudioContextClass = window.AudioContext
        || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        recordingAudioContextRef.current = context;
        recordingAnalyserRef.current = analyser;
        const samples = new Uint8Array(analyser.fftSize);
        recordingVadTimerRef.current = window.setInterval(() => {
          const currentRecorder = recorderRef.current;
          if (!currentRecorder || currentRecorder.state !== 'recording') return;
          const elapsed = Date.now() - recordingStartedAtRef.current;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((sum, sample) => {
              const normalized = (sample - 128) / 128;
              return sum + normalized * normalized;
            }, 0) / samples.length,
          );
          if (rms < 0.018 && elapsed > 650) {
            recordingSilenceStartedAtRef.current ??= Date.now();
            if (Date.now() - recordingSilenceStartedAtRef.current >= 2_000) {
              void handleVoiceStop();
            }
          } else {
            recordingSilenceStartedAtRef.current = null;
          }
          if (elapsed >= 60_000) void handleVoiceStop();
        }, 100);
      }
    } catch (error: unknown) {
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow access and try again.'
        : error instanceof DOMException && error.name === 'NotFoundError'
          ? 'No microphone was found on this device.'
          : 'Microphone could not be started.';
      setVoiceFailure(message);
    }
  }, [setVoiceFailure]);

  const handleVoiceStop = useCallback(async () => {
    if (recordingFinalizingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder) {
      setVoiceFailure('No active recording was found.');
      return;
    }
    recordingFinalizingRef.current = true;
    setVoiceState('processing');
    stopRecordingResources();
    const blob = await new Promise<Blob>((resolve, reject) => {
      let stopSeen = recorder.state === 'inactive';
      let finalDataSeen = recorder.state === 'inactive';
      let settled = false;
      const cleanup = () => {
        recorder.removeEventListener('dataavailable', onDataAvailable);
        recorder.removeEventListener('stop', onStop);
        recorder.removeEventListener('error', onError);
      };
      const finish = () => {
        if (settled || !stopSeen || !finalDataSeen) return;
        settled = true;
        cleanup();
        resolve(new Blob([...recordingChunksRef.current], {
          type: recorder.mimeType || 'audio/webm',
        }));
      };
      const onDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0 && !recordingChunksRef.current.includes(event.data)) {
          recordingChunksRef.current.push(event.data);
        }
        finalDataSeen = true;
        finish();
      };
      const onStop = () => {
        stopSeen = true;
        finish();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Recording failed.'));
      };
      recorder.addEventListener('dataavailable', onDataAvailable);
      recorder.addEventListener('stop', onStop, { once: true });
      recorder.addEventListener('error', onError, { once: true });
      if (recorder.state === 'recording' || recorder.state === 'paused') recorder.stop();
      else finish();
    }).catch(() => null);
    recorderRef.current = null;

    if (!blob || blob.size === 0 || blob.size > 16 * 1024 * 1024) {
      setVoiceFailure('The recording was empty or too large.');
      return;
    }

    setVoiceError('');
    let timeout: number | null = null;
    let controller: AbortController | null = null;
    try {
      const preparedAudio = await preprocessRecordedAudio(blob);
      const requestController = new AbortController();
      controller = requestController;
      recordingRequestAbortRef.current = requestController;
      timeout = window.setTimeout(() => requestController.abort(), 30_000);
      recordingTranscriptionTimeoutRef.current = timeout;
      const form = new FormData();
      form.append('audio', preparedAudio.blob, preparedAudio.filename);
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: form,
        signal: requestController.signal,
      });
      const result = await response.json().catch(() => ({})) as { text?: unknown; error?: unknown };
      const transcribedText = typeof result.text === 'string' ? result.text.trim() : '';
      if (!response.ok || !transcribedText) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Transcription failed.');
      }
      setInput(previous => previous.trim() ? `${previous.trim()} ${transcribedText}` : transcribedText);
      setVoiceState('success');
      textareaRef.current?.focus();
      if (voiceResetTimerRef.current !== null) window.clearTimeout(voiceResetTimerRef.current);
      voiceResetTimerRef.current = window.setTimeout(() => setVoiceState('idle'), 2_200);
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      setVoiceFailure(error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
        ? 'Transcription timed out. Please try again.'
        : error instanceof Error ? error.message : 'Transcription failed. Please try again.');
    } finally {
      if (timeout !== null) window.clearTimeout(timeout);
      if (recordingTranscriptionTimeoutRef.current === timeout) {
        recordingTranscriptionTimeoutRef.current = null;
      }
      if (recordingRequestAbortRef.current === controller) {
        recordingRequestAbortRef.current = null;
      }
    }
  }, [setVoiceFailure, stopRecordingResources]);

  useEffect(() => {
    mountedRef.current = true;
    const stopIfInterrupted = () => {
      if (recorderRef.current?.state === 'recording') void handleVoiceStop();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopIfInterrupted();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', stopIfInterrupted);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', stopIfInterrupted);
      recordingRequestAbortRef.current?.abort();
      recordingRequestAbortRef.current = null;
      if (recordingTranscriptionTimeoutRef.current !== null) {
        window.clearTimeout(recordingTranscriptionTimeoutRef.current);
        recordingTranscriptionTimeoutRef.current = null;
      }
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        if (recorder.state === 'recording' || recorder.state === 'paused') {
          try {
            recorder.stop();
          } catch {
            // The recorder may already be inactive during page teardown.
          }
        }
      }
      recorderRef.current = null;
      stopRecordingResources();
      if (voiceResetTimerRef.current !== null) window.clearTimeout(voiceResetTimerRef.current);
      voiceResetTimerRef.current = null;
    };
  }, [handleVoiceStop, stopRecordingResources]);

  useEffect(() => {
    if (!voiceModeOpen) return;
    const handleOnline = () => {
      setVoiceModeState('reconnecting');
      setVoiceStatusText('Reconnecting…');
      if (voiceRestartTimerRef.current !== null) window.clearTimeout(voiceRestartTimerRef.current);
      const sessionId = voiceSessionRef.current;
      voiceRestartTimerRef.current = window.setTimeout(() => {
        voiceRestartTimerRef.current = null;
        if (voiceModeOpenRef.current && sessionId === voiceSessionRef.current && !voiceRecorderRef.current && !voiceRequestAbortRef.current) {
          void startVoiceRecording(false, sessionId);
        }
      }, 250);
    };
    const handleOffline = () => {
      voiceSessionRef.current += 1;
      setVoiceModeState('offline');
      setVoiceStatusText('Reconnecting…');
      voiceRequestAbortRef.current?.abort();
      voiceRequestAbortRef.current = null;
      voiceTtsQueueRef.current?.stop();
      voiceTtsQueueRef.current = null;
      releaseVoiceAudio();
      if (voiceRestartTimerRef.current !== null) {
        window.clearTimeout(voiceRestartTimerRef.current);
        voiceRestartTimerRef.current = null;
      }
      stopVoiceModeResources();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [startVoiceRecording, stopVoiceModeResources, voiceModeOpen]);

  useEffect(() => () => {
    voiceSessionRef.current += 1;
    voiceRequestAbortRef.current?.abort();
    voiceRequestAbortRef.current = null;
    if (voiceTranscriptionTimeoutRef.current !== null) {
      window.clearTimeout(voiceTranscriptionTimeoutRef.current);
      voiceTranscriptionTimeoutRef.current = null;
    }
    voiceTtsQueueRef.current?.stop();
    voiceTtsQueueRef.current = null;
    if (voiceRestartTimerRef.current !== null) {
      window.clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }
    releaseVoiceAudio();
    if (voiceRecordingStreamRef.current) {
      voiceRecordingStreamRef.current.getTracks().forEach(track => track.stop());
      voiceRecordingStreamRef.current = null;
    }
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.ondataavailable = null;
    }
    stopVoiceModeResources();
  }, [stopVoiceModeResources]);

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
    if (
      !activeSessionId
      || isStreaming
      || voiceModeState === 'reasoning'
      || voiceModeState === 'generating'
      || voiceModeState === 'speaking'
    ) return;
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
  }, [activeSessionId, isStreaming, messages, voiceModeState]);

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
    if (composerFocusTimerRef.current !== null) window.clearTimeout(composerFocusTimerRef.current);
    composerFocusTimerRef.current = window.setTimeout(() => {
      composerFocusTimerRef.current = null;
      textareaRef.current?.focus();
    }, 40);
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
    if (composerFocusTimerRef.current !== null) window.clearTimeout(composerFocusTimerRef.current);
    composerFocusTimerRef.current = window.setTimeout(() => {
      composerFocusTimerRef.current = null;
      textareaRef.current?.focus();
    }, 40);
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

  const updateScrollMetrics = useCallback(() => {
    scrollMetricsFrameRef.current = null;
    const el = scrollBoxRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = dist < 80;
    const shouldShow = dist > 160;
    if (showScrollButtonRef.current !== shouldShow) {
      showScrollButtonRef.current = shouldShow;
      setShowScrollBtn(shouldShow);
    }
  }, []);

  // Scroll events can arrive faster than React can render. Keep the listener
  // passive and do one layout read per animation frame instead of one per event.
  const handleScroll = useCallback(() => {
    if (scrollMetricsFrameRef.current !== null) return;
    scrollMetricsFrameRef.current = window.requestAnimationFrame(updateScrollMetrics);
  }, [updateScrollMetrics]);

  useEffect(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollMetrics();
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (scrollMetricsFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollMetricsFrameRef.current);
        scrollMetricsFrameRef.current = null;
      }
    };
  }, [handleScroll, updateScrollMetrics]);

  // Smart auto-scroll — one compositor-aligned write per frame while the user
  // is at the bottom. This follows streamed layout growth without fighting a
  // user who has scrolled up.
  const requestAutoScroll = useCallback(() => {
    if (!stickToBottomRef.current || autoScrollFrameRef.current !== null) return;
    autoScrollFrameRef.current = window.requestAnimationFrame(() => {
      autoScrollFrameRef.current = null;
      if (!stickToBottomRef.current) return;
      const el = scrollBoxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    requestAutoScroll();
  }, [messages, isThinking, requestAutoScroll]);

  // Markdown, KaTeX, code blocks, and lazy images can expand after the React
  // commit. Follow those layout changes only when the user is already at the
  // bottom, without polling or forcing layout reads on every streamed token.
  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(requestAutoScroll);
    observer.observe(content);
    return () => observer.disconnect();
  }, [requestAutoScroll]);

  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (composerFocusTimerRef.current !== null) {
      window.clearTimeout(composerFocusTimerRef.current);
    }
    if (composerScrollTimerRef.current !== null) {
      window.clearTimeout(composerScrollTimerRef.current);
    }
    if (streamUpdateFrameRef.current !== null) {
      window.cancelAnimationFrame(streamUpdateFrameRef.current);
    }
    if (scrollMetricsFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollMetricsFrameRef.current);
    }
    if (autoScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
    }
    pendingStreamUpdateRef.current = null;
  }, []);

  // Refocus textarea once the document chip appears (extraction done)
  useEffect(() => {
    if (!attachedDoc) return;
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [attachedDoc]);

  // ── Core generation ──────────────────────────────────────────────────────
  const loadVisualReferences = useCallback(async (
    messageId: string,
    query: string,
    responseText: string,
  ) => {
    setMessages(previous => previous.map(message =>
      message.id === messageId
        ? {
            ...message,
            visualReferences: { status: 'loading', references: [] },
          }
        : message
    ));

    try {
      const response = await fetch('/api/visual-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, response: responseText }),
      });
      const payload = await response.json().catch(() => null) as {
        enabled?: boolean;
        references?: VisualReferencesState['references'];
        query?: string;
        category?: string;
        confidence?: number;
      } | null;

      if (!response.ok) {
        setMessages(previous => previous.map(message =>
          message.id === messageId
            ? {
                ...message,
                visualReferences: undefined,
              }
            : message
        ));
        return;
      }

      setMessages(previous => previous.map(message =>
        message.id === messageId
          ? {
              ...message,
              visualReferences: payload?.enabled
                ? {
                    status: 'ready',
                    references: payload.references ?? [],
                    query: payload.query,
                    category: payload.category,
                    confidence: payload.confidence,
                  }
                : undefined,
            }
          : message
      ));
    } catch {
      setMessages(previous => previous.map(message =>
        message.id === messageId
          ? {
              ...message,
              visualReferences: undefined,
            }
          : message
      ));
    }
  }, []);

  const generateResponse = useCallback(async (
    userText: string,
    requestImages: ImageAttachment[] = [],
    voiceMode = false,
  ) => {
    if (!voiceMode) {
      setApiError(null);
      setIsThinking(true);
      setIsStreaming(true);
    }
    thinkingStartRef.current = Date.now();
    const requestController = new AbortController();
    if (voiceMode) {
      voiceRequestAbortRef.current = requestController;
      setVoiceModeState('reasoning');
      setVoiceStatusText('Thinking…');
      setVoiceAssistantText('');
      voiceSentenceBufferRef.current = '';
      voiceLastAssistantContentRef.current = '';
      const queue = new TtsStreamingQueue(
        setVoiceOutputLevel,
        error => {
          if (voiceMode && voiceSessionRef.current > 0) {
            const playbackBlocked = error.name === 'NotAllowedError';
            if (playbackBlocked) {
              console.error('[SingularityChat] Voice Mode audio playback was blocked by the browser:', error);
              setVoiceModeState('listening');
              setVoiceStatusText('Audio playback was blocked. Listening…');
            } else {
              setVoiceModeState('error');
              setVoiceStatusText('Audio unavailable. Reconnecting…');
            }
            voiceTtsQueueRef.current?.stop();
            voiceTtsQueueRef.current = null;
          }
        },
        () => {
          if (voiceMode && voiceSessionRef.current > 0 && voiceModeOpenRef.current) {
            const timing = voiceLatencyTimingRef.current;
            if (timing) {
              timing.audibleAt = performance.now();
              logVoiceLatency(timing, 'first_audio_play');
            }
            setVoiceModeState('speaking');
            setVoiceStatusText('Speaking…');
            voicePlaybackGuardUntilRef.current = Date.now() + 350;
            void startVoiceRecording(true);
          }
        },
        () => {
          const timing = voiceLatencyTimingRef.current;
          if (timing) {
            timing.ttsStartAt = performance.now();
              logVoiceLatency(timing, 'tts_start');
          }
        },
        () => {
          const timing = voiceLatencyTimingRef.current;
          if (timing) {
            timing.firstAudioAt = performance.now();
              logVoiceLatency(timing, 'first_audio_ready');
          }
        },
      );
      queue.unlock();
      queue.setSpeakerEnabled(voiceSpeakerEnabledRef.current);
      voiceTtsQueueRef.current = queue;
    } else {
      abortRef.current = requestController;
    }

    // 60-second hard timeout
    let requestTimeout: number | null = null;
    if (voiceMode) {
      requestTimeout = window.setTimeout(() => requestController.abort('timeout'), 60_000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => requestController.abort('timeout'), 60_000);
    }

    const msgId = `asst-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', reasoning: '', ts: Date.now() },
    ]);

    const currentMessages = messagesRef.current;
    const requestMode = mode;
    // Historical image turns stay as placeholders. Only images attached to
    // this request are eligible for the structured vision payload.
    const activeImages = requestImages;
    const safeHistory = currentMessages
      .filter(m => m.id !== 'welcome' && !m.error && m.content.trim().length > 0)
      .slice(-12)
      .map(m => ({
        role: m.role,
        content: m.content.trim(),
        ...(m.attachedImages?.length ? { content: `${m.content.trim()}\n[Previous image]` } : {}),
      }));

    try {
      if (voiceMode) {
        const timing = voiceLatencyTimingRef.current;
        if (timing) {
          timing.llmRequestAt = performance.now();
          logVoiceLatency(timing, 'llm_request');
        }
      }
      const res = await fetch('/api/singularity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
           body:    JSON.stringify({
           message: userText,
            mode: requestMode,
            ...(requestMode === 'max' ? {} : { history: safeHistory }),
           voiceMode,
            ...(requestMode === 'max'
              ? {}
              : {
                  images: activeImages.map(image => ({
                    filename: image.filename,
                    mimeType: image.mimeType,
                    dataUrl: image.dataUrl,
                  })),
                }),
         }),
         signal:  requestController.signal,
      });

      // ── Non-2xx = JSON error from backend (never a stream) ──
      if (!res.ok) {
        const errJson: ApiError = await res.json().catch(() => ({
          error:   `HTTP ${res.status} — could not parse error body`,
          status:  res.status,
          details: null,
        }));
        if (res.status === 429 && !voiceMode) {
          const retryAfter = typeof (errJson as ApiError & { retryAfter?: unknown }).retryAfter === 'number'
            ? (errJson as ApiError & { retryAfter: number }).retryAfter
            : Number(res.headers.get('Retry-After')) || 15;
          beginMessageCooldown(Math.max(1, Math.min(15, retryAfter)));
        } else if (!voiceMode) {
          clearMessageCooldown();
        }
        console.error('[SingularityChat] API error:', errJson);
        if (voiceMode) {
          setVoiceModeState(res.status === 429 ? 'reconnecting' : 'idle');
          setVoiceStatusText(errJson.error || 'Singularity could not respond.');
        } else {
          setApiError(errJson);
        }
        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, error: true, content: `[${errJson.status}] ${errJson.error}` }
            : m
        ));
        return;
      }

      if (!res.body) {
        const noBody: ApiError = { error: 'Response body is null — cannot stream', status: 0, details: null };
        if (voiceMode) {
          setVoiceModeState('reconnecting');
          setVoiceStatusText(noBody.error);
        } else {
          setApiError(noBody);
        }
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, error: true, content: noBody.error } : m
        ));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let sawFirstToken = false;
      let streamedContent = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        const decoded = sseBuffer + decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = decoded.split('\n');
        if (!done) {
          sseBuffer = lines.pop() ?? '';
        } else {
          sseBuffer = '';
        }
        for (const line of lines) {
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
            if (voiceMode) {
              voiceTtsQueueRef.current?.stop();
              voiceTtsQueueRef.current = null;
              stopVoiceModeResources();
              setVoiceModeState('reconnecting');
              setVoiceStatusText('Reconnecting…');
            } else {
              setApiError(streamErr);
            }
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, error: true, content: streamMsg } : m
            ));
            return;
          }

          if (data.done) continue;

          if (!sawFirstToken) {
            const timing = voiceLatencyTimingRef.current;
            if (voiceMode && timing) {
              timing.firstTokenAt = performance.now();
              logVoiceLatency(timing, 'first_token');
            }
            if (voiceMode) {
              setVoiceModeState('generating');
              setVoiceStatusText('Thinking…');
            } else {
              setIsThinking(false);
            }
            sawFirstToken = true;
          }

          const seconds = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000));
          scheduleStreamUpdate(
            msgId,
            typeof data.reasoning === 'string' ? data.reasoning : undefined,
            typeof data.content === 'string' ? sanitizeVisibleResponse(data.content) : undefined,
            seconds,
          );
          if (data.metadata && (data.metadata.kind === 'followups' || data.metadata.kind === 'evidence')) {
            setMessages(previous => previous.map(message =>
              message.id === msgId ? { ...message, modeMetadata: data.metadata as SingularityResponseMetadata } : message
            ));
          }
          if (typeof data.content === 'string') {
            streamedContent = sanitizeVisibleResponse(data.content);
            if (voiceMode) {
              setVoiceAssistantText(streamedContent);
              const previousContent = voiceLastAssistantContentRef.current;
              const nextDelta = streamedContent.startsWith(previousContent)
                ? streamedContent.slice(previousContent.length)
                : streamedContent;
              voiceLastAssistantContentRef.current = streamedContent;
              voiceSentenceBufferRef.current += nextDelta;
              const queue = voiceTtsQueueRef.current;
              while (queue) {
                const match = voiceSentenceBufferRef.current.match(/^([\s\S]*?(?:[.!?。！？]|\n))/);
                if (match) {
                  const sentence = match[1].trim();
                  voiceSentenceBufferRef.current = voiceSentenceBufferRef.current.slice(match[0].length);
                  chunkTtsText(sentence).forEach(chunk => queue.enqueue(chunk));
                  continue;
                }
                if (voiceSentenceBufferRef.current.length < 210) break;
                const splitAt = voiceSentenceBufferRef.current.lastIndexOf(' ', 180);
                if (splitAt < 80) break;
                chunkTtsText(voiceSentenceBufferRef.current.slice(0, splitAt))
                  .forEach(chunk => queue.enqueue(chunk));
                voiceSentenceBufferRef.current = voiceSentenceBufferRef.current.slice(splitAt + 1);
              }
            }
          }
        }

        if (done) {
          if (!sawFirstToken) {
            // Stream closed without sending any tokens — surface as error
            const streamErr: ApiError = { error: 'STREAM TERMINATED — no tokens received', status: 0, details: null };
            if (voiceMode) {
              voiceTtsQueueRef.current?.stop();
              voiceTtsQueueRef.current = null;
              stopVoiceModeResources();
              setVoiceModeState('reconnecting');
              setVoiceStatusText('Reconnecting…');
            } else {
              setApiError(streamErr);
            }
            setMessages(prev => prev.map(m =>
              m.id === msgId ? { ...m, error: true, content: streamErr.error } : m
            ));
          }
          break;
        }

      }

      if (sawFirstToken && streamedContent.trim()) {
        // Start synthesis as soon as streaming completes. This work is
        // intentionally independent from the Listen queue so a later click
        // can consume the first cached MP3 immediately.
        prefetchTtsAudio(msgId, streamedContent);
      }
      if (voiceMode) {
        const queue = voiceTtsQueueRef.current;
        const remaining = voiceSentenceBufferRef.current.trim();
        if (queue && remaining) {
          chunkTtsText(remaining).forEach(chunk => queue.enqueue(chunk));
          voiceSentenceBufferRef.current = '';
        }
        if (queue) await queue.finish();
        const timing = voiceLatencyTimingRef.current;
        if (timing) logVoiceLatency(timing, 'response_complete');
        if (voiceSessionRef.current > 0 && voiceModeOpenRef.current && !requestController.signal.aborted) {
          const wasInterrupted = voiceWasInterruptedRef.current;
          if (!wasInterrupted) stopVoiceModeResources();
          setVoiceModeState('listening');
          setVoiceStatusText('Listening…');
          if (!wasInterrupted) {
            if (voiceRestartTimerRef.current !== null) window.clearTimeout(voiceRestartTimerRef.current);
            const sessionId = voiceSessionRef.current;
            voiceRestartTimerRef.current = window.setTimeout(() => {
              voiceRestartTimerRef.current = null;
              if (voiceModeOpenRef.current && sessionId === voiceSessionRef.current) void startVoiceRecording(false, sessionId);
            }, 100);
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        const isTimeout = err?.message === 'timeout' || String(err?.message).includes('timeout');
        if (isTimeout) {
          const timeoutErr: ApiError = { error: 'Request timed out after 60 seconds.', status: 504, details: null };
          if (voiceMode) {
            setVoiceModeState('reconnecting');
            setVoiceStatusText(timeoutErr.error);
          } else {
            setApiError(timeoutErr);
          }
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, error: true, content: timeoutErr.error } : m
          ));
        }
        return;
      }
      console.error('[SingularityChat] fetch error:', err?.message, err?.stack);
      const catchErr: ApiError = { error: err?.message ?? String(err), status: 0, details: null };
      if (voiceMode) {
        setVoiceModeState(navigator.onLine ? 'idle' : 'offline');
        setVoiceStatusText(catchErr.error);
      } else {
        setApiError(catchErr);
      }
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, error: true, content: catchErr.error } : m
      ));
    } finally {
      flushStreamUpdate();
      if (!voiceMode) {
        setIsThinking(false);
        setIsStreaming(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      } else if (requestTimeout !== null) {
        window.clearTimeout(requestTimeout);
        if (voiceRequestAbortRef.current === requestController) voiceRequestAbortRef.current = null;
      }
    }
  }, [beginMessageCooldown, clearMessageCooldown, flushStreamUpdate, loadVisualReferences, mode, scheduleStreamUpdate, startVoiceRecording, stopVoiceModeResources, voiceModeOpen]);

  const handleVoiceTurn = useCallback((text: string) => {
    if (!voiceModeOpen || !text.trim() || voiceRequestAbortRef.current) return;
    const cleanText = text.trim();
    setMessages(previous => [
      ...previous,
      { id: `usr-${Date.now()}`, role: 'user', content: cleanText, ts: Date.now() },
    ]);
    setVoiceTranscript(cleanText);
    setVoiceAssistantText('');
    stickToBottomRef.current = true;
    generateResponse(cleanText, [], true);
  }, [generateResponse, voiceModeOpen]);
  voiceTurnRef.current = handleVoiceTurn;

  const handleSend = useCallback((overrideText?: string) => {
    const currentInput = inputRef.current;
    const currentImages = imagesRef.current;
    const currentAttachedDoc = attachedDocRef.current;
    const typedText = (overrideText ?? currentInput).trim();
    if ((!typedText && currentImages.length === 0) || isThinkingRef.current || cooldownUntilRef.current > Date.now()) return;
    const text = typedText || 'Please analyze the attached image(s).';

    // The current attachment belongs to this user turn. Once it is moved into
    // the message, the composer can reset without losing document context.
    const latestDocument =
      currentAttachedDoc ??
      [...messagesRef.current]
        .reverse()
        .find(message => message.attachedDocument)?.attachedDocument ??
      null;

    // Build the enriched AI prompt — document context injected here, never in the textarea.
    // The user's visible message is always the clean, unmodified `text`.
    let aiPrompt = text;
    if (mode !== 'max' && latestDocument && latestDocument.chunks.length > 0) {
      const relevantChunks = selectRelevantChunks(text, latestDocument.chunks);
      aiPrompt = buildDocumentPrompt(text, relevantChunks, latestDocument.filename);
    }

    setMessages(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        attachedDocument: currentAttachedDoc,
        attachedImages: currentImages,
        ts: Date.now(),
      },
    ]);
    setInput('');
    clearDocument();
    clearImages();
    stickToBottomRef.current = true;
    beginMessageCooldown();
    generateResponse(aiPrompt, currentImages);
  }, [beginMessageCooldown, clearDocument, clearImages, generateResponse, mode]);

  const handleModeChange = useCallback((nextMode: SingularityMode) => {
    setMode(nextMode);
    saveSingularityMode(nextMode);
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsThinking(false);
    setIsStreaming(false);
  }, []);

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messagesRef.current].reverse().find(m => m.role === 'user');
    if (!lastUser || isThinkingRef.current || cooldownUntilRef.current > Date.now()) return;
    beginMessageCooldown();
    setMessages(prev => {
      const idx = prev.map(m => m.role).lastIndexOf('assistant');
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    generateResponse(lastUser.content, lastUser.attachedImages ?? []);
  }, [beginMessageCooldown, generateResponse]);

  const handleEditUserMessage = useCallback((messageId: string) => {
    if (isThinkingRef.current) return;
    const currentMessages = messagesRef.current;
    const message = currentMessages.find(item => item.id === messageId);
    if (!message || message.role !== 'user') return;
    const messageIndex = currentMessages.findIndex(item => item.id === messageId);
    if (messageIndex < 0) return;

    // Keep the conversation before this turn, then let the user resubmit
    // the edited prompt through the normal composer/send path.
    setMessages(previous => previous.slice(0, messageIndex));
    setInput(message.content);
    setApiError(null);
    clearDocument();
    clearImages();
    stickToBottomRef.current = true;
    if (composerFocusTimerRef.current !== null) window.clearTimeout(composerFocusTimerRef.current);
    composerFocusTimerRef.current = window.setTimeout(() => {
      composerFocusTimerRef.current = null;
      textareaRef.current?.focus();
    }, 40);
  }, [clearDocument, clearImages]);

  const handleSimplify = useCallback(() => {
    handleSend('Can you explain that in simpler terms?');
  }, [handleSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const isProcessingAttachment = isProcessing || isProcessingImages;
  const attachmentError = imageError || docError;
  const isMessageCooldownActive = cooldownRemaining > 0;
  const composerLocked = isProcessingAttachment || isMessageCooldownActive;
  const showSendControl = isThinking || input.trim().length > 0 || images.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative flex min-h-[100dvh] h-[100dvh] w-full flex-row overflow-hidden bg-[#09090b]"
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
        onOpenSettings={onOpenSettings}
      />

      <main className={`relative flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
        workspace.open ? 'md:pr-[42%]' : ''
      }`}>
      {/* Subtle top radial ambient */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 100%)',
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-shrink-0 border-b border-white/[0.06]
        bg-[#09090b]/[0.96] backdrop-blur-md
        shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-start px-4 py-3.5 sm:px-6">
           <div className="flex min-w-0 flex-1 items-center gap-3">
            <MobileHistoryButton onClick={() => setMobileHistoryOpen(true)} />
            {/* Icon — layered glow ring */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full
              border border-white/[0.10] bg-white/[0.05]
              shadow-[0_8px_22px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]">
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
              <p className="mt-[1px] font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">
                GPT-OSS-120B · Cosmic Intelligence
              </p>
            </div>
             {workspace.items.length > 0 && (
               <button
                 type="button"
                 data-testid="button-open-workspace-library"
                 onClick={() => workspace.setOpen(true)}
                 className="ml-1 hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[10px] text-white/45 transition-gpu hover:border-violet-200/25 hover:bg-violet-200/[0.08] hover:text-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 sm:inline-flex"
                 aria-label="Open saved Workspace library"
               >
                 <PanelRightOpen size={11} strokeWidth={1.8} />
                 Workspace
               </button>
             )}
             </div>
             <SingularityModeSelector
               value={mode}
               onChange={handleModeChange}
               disabled={isThinking}
             />

        </div>
      </div>

      {/* ── Research Workspace Panel ─────────────────────────────────────── */}
      <WorkspacePanel
        open={workspace.open}
        onClose={() => workspace.setOpen(false)}
        items={workspace.items}
        onRemove={workspace.remove}
        onNoteChange={workspace.updateNote}
        seedContent={workspace.seedContent}
      />

      {/* ── GROQ DEBUG PANEL — visible whenever an API error occurs ─────── */}
      {apiError && (
        <div className="flex-shrink-0 mx-4 mt-3 p-4 bg-red-950/90 border-2 border-red-500/70 rounded-xl font-mono text-[11px] space-y-2 z-50">
          <div className="flex items-center justify-between">
            <span className="text-red-400 font-bold text-[12px]">GROQ DEBUG</span>
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
          className="perf-scroll h-full overflow-y-auto px-1 scrollbar-hide sm:px-0"
          aria-live="polite"
        >
          {/* Centered column */}
          <div ref={messagesContentRef} className={`mx-auto flex w-full max-w-4xl flex-col gap-0 px-4 py-7 sm:px-8 sm:py-8 ${
            messages.length === 1 && messages[0]?.id === 'welcome' && !isThinking
              ? 'min-h-full items-center justify-center'
              : ''
          }`}>
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isLastAssistant = message.role === 'assistant' && isLastMessage && !isThinking;
                const isGenerating = isThinking && isLastMessage;
                const showActions = message.role === 'assistant'
                  && !message.error
                  && message.id !== 'welcome'
                  && !isGenerating;

                return (
                  <MessageRow
                    key={message.id}
                    message={message}
                    isUserActionDisabled={message.role === 'user' && isThinking}
                    isLastAssistant={isLastAssistant}
                    isGenerating={isGenerating}
                    showActions={showActions}
                    prefersReducedMotion={Boolean(prefersReducedMotion)}
                    onEdit={handleEditUserMessage}
                    onSimplify={handleSimplify}
                    onRegenerate={handleRegenerate}
                    onSave={workspace.save}
                    onOpenWorkspace={workspace.openWithContent}
                   onFollowUp={handleSend}
                  />
                );
              })}

              {isThinking && <ThinkingDots key="thinking" />}
            </AnimatePresence>

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
      <div className="singularity-composer-region flex-shrink-0 pb-safe">
        <div className="singularity-composer-region-inner mx-auto w-full max-w-3xl">

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
              ref={composerShellRef}
              className={`singularity-composer-shell relative border transition-gpu ${
                isDragOver
                  ? 'is-drag-over'
                  : ''
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

            {/* Textarea + controls row */}
            <div className="singularity-composer-row relative flex min-w-0 items-end">

              {/* ── Attachment '+' button with popover ── */}
              <div ref={attachRef} className="singularity-composer-attach relative z-20">
                <button
                  onClick={() => setAttachOpen(o => !o)}
                  disabled={composerLocked}
                  className="singularity-composer-attach-button flex items-center justify-center rounded-full
                    text-white/45 transition-gpu active:scale-95 focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-white/35 disabled:cursor-not-allowed"
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
                      className="singularity-composer-attachment-popover absolute bottom-full left-0 z-50 mb-2
                        rounded-2xl border bg-[#171720]/[0.98] shadow-[0_16px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl
                        overflow-hidden"
                    >
                      <div className="px-1 py-1">
                        <button
                          role="menuitem"
                           onClick={showImagePicker}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-white/70 hover:bg-white/[0.08] hover:text-white
                            transition-gpu text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 focus-visible:ring-inset"
                        >
                          <Image size={15} strokeWidth={1.7} className="text-violet-400/80 flex-shrink-0" />
                          <span className="text-[13px] font-medium">Upload Image</span>
                        </button>
                        <button
                          role="menuitem"
                          onClick={handleDocumentUploadClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-white/70 hover:bg-white/[0.08] hover:text-white
                            transition-gpu text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 focus-visible:ring-inset"
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
                  if (composerScrollTimerRef.current !== null) {
                    window.clearTimeout(composerScrollTimerRef.current);
                  }
                  composerScrollTimerRef.current = window.setTimeout(() => {
                    composerScrollTimerRef.current = null;
                    composerShellRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'end',
                    });
                  }, 300);
                }}
                placeholder={
                  isProcessingAttachment
                    ? 'Preparing attachment…'
                    : isMessageCooldownActive
                      ? `Recharging… ${cooldownRemaining}s`
                    : images.length && !input.trim()
                      ? 'Add a question about these images…'
                      : 'Ask Singularity anything…'
                }
                rows={1}
                disabled={composerLocked}
                 className="singularity-composer-textarea w-full min-w-0 flex-1 resize-none bg-transparent text-left
                   text-white/90 placeholder:text-white/22 outline-none focus:outline-none focus:ring-0
                   disabled:opacity-60"
                aria-label="Message Singularity"
                aria-busy={composerLocked}
              />
              <div className="singularity-composer-actions flex items-center">
                <MicrophoneControl
                  disabled={composerLocked || isThinking}
                  state={voiceState}
                  errorMessage={voiceError}
                  onStateChange={setVoiceState}
                  onRecordingStart={handleVoiceStart}
                  onRecordingStop={handleVoiceStop}
                  onRetry={() => {
                    setVoiceError('');
                    setVoiceState('idle');
                  }}
                />
                <motion.div
                  layout
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="singularity-composer-action-slot"
                >
                  <AnimatePresence initial={false} mode="wait">
                    {!showSendControl ? (
                      <motion.button
                        key="voice-mode"
                        type="button"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.17, ease: 'easeOut' }}
                        onClick={handleOpenVoiceMode}
                        disabled={composerLocked || isThinking}
                        className="singularity-composer-voice-mode flex flex-shrink-0 items-center justify-center gap-1.5 rounded-full border
                          bg-violet-300/[0.06] text-violet-100/65 transition-gpu
                          hover:border-violet-200/40 hover:bg-violet-200/[0.12] hover:text-violet-50
                          active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50
                          disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Open immersive Voice Mode"
                        data-testid="button-open-voice-mode"
                      >
                        <Mic2 size={15} strokeWidth={1.8} />
                        <span className="hidden sm:inline">Voice Mode</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        key="send"
                        type="button"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.17, ease: 'easeOut' }}
                        onClick={() => (isThinking ? handleStop() : handleSend())}
                        disabled={!isThinking && ((!input.trim() && images.length === 0) || composerLocked || visionSupported === false && images.length > 0)}
                        className={`singularity-composer-send flex-shrink-0 rounded-full flex items-center justify-center
                          transition-gpu active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                          isThinking
                            ? 'is-thinking'
                            : ((input.trim() || images.length > 0) && !composerLocked && !(visionSupported === false && images.length > 0))
                              ? 'is-ready'
                              : 'is-idle'
                        }`}
                        aria-label={
                          isThinking
                            ? 'Stop generating'
                            : isMessageCooldownActive
                              ? `Recharging, ${cooldownRemaining} seconds remaining`
                              : 'Send message'
                        }
                      >
                        {isProcessingAttachment
                          ? <Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
                          : isMessageCooldownActive
                            ? <span className="text-[10px] font-semibold tabular-nums">{cooldownRemaining}s</span>
                          : isThinking
                            ? <Square size={11} strokeWidth={2.5} fill="currentColor" />
                            : <Send size={13} strokeWidth={2.5} className={(input.trim() && !isProcessing) ? 'ml-[1px]' : ''} />
                        }
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>

            <AnimatePresence>
              {isMessageCooldownActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden px-3 pb-2"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] tracking-[0.08em] uppercase text-violet-200/45">
                    <span>Message channel recharging</span>
                    <span className="tabular-nums text-violet-200/65">{cooldownRemaining}s</span>
                  </div>
                  <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full origin-left rounded-full bg-gradient-to-r from-violet-400/80 via-fuchsia-300/80 to-sky-300/80"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: cooldownRemaining / 15 }}
                      transition={{ duration: 0.25, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
      <AnimatePresence>
        {voiceModeOpen && (
          <VoiceModeOverlay
            state={voiceModeState}
            statusText={voiceStatusText}
            transcript={voiceTranscript}
            assistantText={voiceAssistantText}
            micLevel={voiceMicLevel}
            outputLevel={voiceOutputLevel}
            isMuted={voiceMuted}
            speakerEnabled={voiceSpeakerEnabled}
            onClose={handleCloseVoiceMode}
            onToggleMute={handleToggleVoiceMute}
            onToggleSpeaker={handleToggleVoiceSpeaker}
            onRetryMicrophone={handleRetryVoiceMicrophone}
          />
        )}
      </AnimatePresence>
      </main>
    </motion.div>
  );
}
