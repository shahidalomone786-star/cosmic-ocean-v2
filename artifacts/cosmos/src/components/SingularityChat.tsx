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
// Rachel — ElevenLabs premium natural female voice
const SINGULARITY_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

const STARTER_PROMPTS = [
  'Derive time dilation from first principles',
  "What actually happens at a black hole's event horizon?",
  'Explain quantum entanglement to a physics undergrad',
  "Why doesn't the EPR paradox violate relativity?",
];

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'I am Singularity, the cosmic nexus of intelligence. What shall we explore today?',
  ts: Date.now(),
};

// ─── Markdown renderer ──────────────────────────────────────────────────────
const markdownComponents = {
  p:      ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  em:     ({ children }: any) => <em className="italic">{children}</em>,
  a:      ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noreferrer"
      className="text-blue-300 underline underline-offset-2 hover:text-blue-200">
      {children}
    </a>
  ),
  ul: ({ children }: any) => <ul className="mb-2 pl-4 space-y-1 list-disc marker:text-white/30">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 pl-4 space-y-1 list-decimal marker:text-white/30">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-[17px] font-semibold mt-4 mb-2 first:mt-0 text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0 text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[14px] font-semibold mt-2 mb-1 first:mt-0 text-white/90">{children}</h3>,
  pre: ({ children }: any) => (
    <pre className="my-3 p-4 rounded-xl bg-white/[0.05] border border-white/[0.08] overflow-x-auto text-[12.5px] leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children }: any) => {
    const isBlock = /language-/.test(className || '');
    return isBlock ? (
      <code className={`font-mono ${className || ''}`}>{children}</code>
    ) : (
      <code className="px-1.5 py-0.5 rounded-md bg-white/[0.10] text-[12px] font-mono text-blue-300/90">
        {children}
      </code>
    );
  },
};

const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-[14.5px] leading-[1.75] tracking-[0.01em] text-white/88">
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
        hover:text-white/70 hover:bg-white/[0.07] transition-colors duration-150"
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
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

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, voiceId: SINGULARITY_VOICE_ID }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`TTS error ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setState('idle');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setState('idle');
      };

      setState('playing');
      await audio.play();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setState('idle');
    }
  }, [text, state, stop]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const isActive = state === 'playing' || state === 'loading';

  return (
    <button
      onClick={play}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all duration-200
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
    <div className="mb-3 w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-1 py-1 text-white/30 hover:text-white/55
          transition-colors duration-150 rounded-lg hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <BrainCircuit size={12} strokeWidth={2} />
        <span className="text-[9.5px] uppercase tracking-widest font-semibold">
          {seconds ? `Thought for ${seconds}s` : 'Reasoning'}
        </span>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="text-[12px] leading-relaxed text-white/35 pl-4 border-l
              border-white/[0.08] italic mt-2 pb-1">
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
      className="self-start flex items-center gap-2 px-4 py-3 rounded-2xl
        bg-white/[0.04] border border-white/[0.06] rounded-bl-sm"
      aria-label="Singularity is thinking"
    >
      {[0, 0.2, 0.4].map(delay => (
        <motion.div
          key={delay}
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{ duration: 1.5, repeat: Infinity, delay }}
          className="w-1.5 h-1.5 bg-white/55 rounded-full"
        />
      ))}
    </motion.div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
export default function SingularityChat({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages]         = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput]               = useState('');
  const [isThinking, setIsThinking]     = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const scrollBoxRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
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

  // Smart auto-scroll
  useEffect(() => {
    if (stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Core generation ──────────────────────────────────────────────────────
  const generateResponse = useCallback(async (userText: string) => {
    // Reset debug states for fresh run
    setIsThinking(true);
    thinkingStartRef.current = Date.now();
    abortRef.current = new AbortController();

    const msgId = `asst-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', reasoning: '', ts: Date.now() },
    ]);

    // Only send history with non-empty content — Groq rejects empty strings
    const safeHistory = messages
      .filter(m =>
        m.id !== 'welcome' &&
        !m.error &&
        m.content.trim().length > 0
      )
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.trim() }));

    try {
      const res = await fetch('/api/singularity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: safeHistory }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '(unreadable)');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let sawFirstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          let data: any;
          try { data = JSON.parse(raw); } catch { continue; }
          if (data.error) throw new Error(`Server stream error: ${JSON.stringify(data)}`);
          if (data.done) continue;

          if (!sawFirstToken) { setIsThinking(false); sawFirstToken = true; }

          // Resilient parser: works for both DeepSeek-style <think> streams AND
          // standard plain-text streams (gpt-oss-120b sends no <think> tags).
          // The backend's splitReasoning() already handles both:
          //   - With <think> tags → { reasoning: '...', content: answer }
          //   - Without <think> tags → { reasoning: '', content: fullText }
          // We push content chunks to the message immediately — no hanging on a
          // </think> that will never arrive.
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
          stickToBottomRef.current = true;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const msg = String(err?.message ?? err);
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? { ...m, error: true, content: 'Cosmic transmission failed. Check your connection and try again.' }
            : m
        )
      );
    } finally {
      setIsThinking(false);
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
      className="relative min-h-screen w-full flex flex-col bg-[#09090b]"
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
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#09090b]/95 backdrop-blur-sm relative z-10">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full
              bg-white/[0.06] border border-white/[0.10]">
              <Sparkles size={16} strokeWidth={1.8} className="text-white/75" />
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full border border-white/[0.18]"
                  animate={{ scale: [1, 1.25, 1], opacity: [0, 0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h2 className="text-[14.5px] font-semibold tracking-wide text-white/95"
                style={{ fontFamily: 'var(--app-font-heading)' }}>
                Singularity
              </h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-mono">
                GPT-OSS-120B · Cosmic Intelligence
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/[0.08] text-white/35 hover:text-white/75
                transition-all duration-150"
              aria-label="Close Singularity"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ── Chat Area ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollBoxRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide"
          aria-live="polite"
        >
          {/* Centered column */}
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-8">
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
                      className={`max-w-[85%] px-5 py-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-white text-black rounded-br-sm shadow-[0_2px_16px_rgba(255,255,255,0.12)] font-medium text-[14px] leading-relaxed'
                          : msg.error
                            ? 'bg-red-500/[0.08] border border-red-500/[0.18] text-red-300/90 rounded-bl-sm text-[14px] leading-relaxed'
                            : 'bg-white/[0.05] border border-white/[0.07] text-white/88 rounded-bl-sm'
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
                              text-white/30 hover:text-white/65 hover:bg-white/[0.07] transition-colors duration-150"
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
                      hover:border-white/[0.12] transition-all duration-200"
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
      <div className="flex-shrink-0 border-t border-white/[0.05] bg-[#09090b] pb-safe">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4">
          <div className="relative flex items-end gap-3 bg-white/[0.05] border border-white/[0.09]
            rounded-2xl px-3 py-2.5 focus-within:border-white/[0.18] focus-within:bg-white/[0.07]
            transition-all duration-300">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the universe…  (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[14px] text-white/90
                placeholder:text-white/25 px-2 py-1.5 outline-none max-h-[160px]
                leading-relaxed"
              aria-label="Message Singularity"
            />
            <button
              onClick={() => (isThinking ? handleStop() : handleSend())}
              disabled={!isThinking && !input.trim()}
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                transition-all duration-200 mb-0.5 ${
                isThinking
                  ? 'bg-white/90 text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                  : input.trim()
                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.30)]'
                    : 'bg-white/[0.07] text-white/25 cursor-not-allowed'
              }`}
              aria-label={isThinking ? 'Stop generating' : 'Send message'}
            >
              {isThinking
                ? <Square size={12} strokeWidth={2.5} fill="currentColor" />
                : <Send size={14} strokeWidth={2.5} className={input.trim() ? 'ml-0.5' : ''} />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-white/15 mt-2.5">
            Singularity may make mistakes. Verify important physics claims.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
