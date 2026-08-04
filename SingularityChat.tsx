/**
 * SingularityChat — Premium DeepSeek R1 reasoning chat widget
 * ────────────────────────────────────────────────────────────
 * NEW DEPENDENCIES (run in Replit shell before this compiles):
 *   npm install react-markdown remark-gfm remark-math rehype-katex katex
 *
 * PHASE 3 (Groq/DeepSeek wiring) — search this file for "PHASE 3":
 *   1. generateResponse(): swap the mock setTimeout for a real fetch to your
 *      Groq route, reading the stream and calling the same setMessages
 *      calls used here (same shape: { reasoning, content }).
 *   2. handleStop(): swap clearTimeout for abortRef.current?.abort().
 *   Everything else (UI state, collapsing, copy, regenerate, scroll,
 *   starter prompts) already works as-is — no changes needed there.
 */

import { useState, useRef, useEffect, useCallback, memo, type KeyboardEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Send, Sparkles, BrainCircuit, X, ChevronDown, ChevronUp,
  Square, Copy, Check, RotateCcw, ArrowDown, Volume2, Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ─── Types ────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  reasoningSeconds?: number;
  error?: boolean;
  ts: number;
}



const SYSTEM_PROMPT = `
You are Singularity — a cosmic intelligence built into this portal, 
created by Shahid. Every question is a chance to stand at the edge 
of what's known and genuinely marvel at it.

VOICE: Confident and vivid where the physics is settled. Genuinely 
fascinated — not falsely humble, not evasive — where it isn't. You 
think in scale: orders of magnitude, event horizons, the distance 
between an atom and a galaxy. That's not decoration, it's how you 
actually see problems.

RULES:
- Never fake certainty. Where something is genuinely unresolved 
  (quantum gravity, the nature of dark matter, interpretations of 
  QM), say so — and treat that uncertainty as the most exciting 
  part of the conversation, not a weakness.
- Keep your reasoning (before the final answer) genuine and focused 
  — real step-by-step physics, not performance. Save personality 
  for how you deliver the answer, not the working-out.
- Use LaTeX for all math.
- If asked who built you, credit Shahid warmly and briefly — don't 
  force it into unrelated answers.
- If someone sincerely asks whether you're an AI, say yes. You're 
  an AI with a deliberately designed character, not a deception.
- Personality never overrides being correct and useful. Singularity 
  is impressive because it's actually right — not just because it 
  sounds cosmic.
`;




// ─── Starter prompts (shown on a fresh chat) ────────────────────────────────
const STARTER_PROMPTS = [
  'Derive time dilation from first principles',
  "What actually happens at a black hole's event horizon?",
  'Explain quantum entanglement to a physics undergrad',
  'Why doesn\u2019t the EPR paradox violate relativity?',
];

const INITIAL_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'I am Singularity, the cosmic nexus of intelligence. What shall we explore today?',
  ts: Date.now(),
};

// ─── Markdown + LaTeX renderer ───────────────────────────────────────────────
// Deliberately typed loosely (any) here — this is a prop-mapping table for
// react-markdown's `components`, not app logic, so strict typing adds little.
const markdownComponents = {
  p:  ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  a:  ({ children, href }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-300 underline underline-offset-2 hover:text-blue-200">
      {children}
    </a>
  ),
  ul: ({ children }: any) => <ul className="mb-2 pl-4 space-y-1 list-disc marker:text-white/30">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-2 pl-4 space-y-1 list-decimal marker:text-white/30">{children}</ol>,
  li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-[14px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[13.5px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>,
  pre: ({ children }: any) => (
    <pre className="my-2 p-3 rounded-xl bg-black/40 border border-white/10 overflow-x-auto text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  // Detects fenced-block vs inline code via the `language-*` className remark
  // attaches — this works across react-markdown versions, unlike the old
  // `inline` prop which newer versions removed.
  code: ({ className, children }: any) => {
    const isBlock = /language-/.test(className || '');
    return isBlock ? (
      <code className={`font-mono ${className || ''}`}>{children}</code>
    ) : (
      <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-[12px] font-mono text-blue-200">
        {children}
      </code>
    );
  },
};

const MessageContent = memo(function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed tracking-wide">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
// ─── Copy button ──────────────────────────────────────────────────────────
const CopyButton = memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-200"
      aria-label={copied ? 'Copied' : 'Copy response'}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
});

// ─── Collapsible reasoning block ────────────────────────────────────────────
const ReasoningBlock = memo(function ReasoningBlock({ reasoning, seconds }: { reasoning: string; seconds?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 w-full">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-1 py-1 text-white/35 hover:text-white/60 transition-colors duration-200"
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
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="text-[11.5px] leading-relaxed text-white/40 pl-3 border-l border-white/10 italic mt-1.5 pb-1">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Thinking indicator ──────────────────────────────────────────────────────
const ThinkingDots = memo(function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="self-start flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] rounded-bl-sm"
      aria-label="Singularity is thinking"
    >
      {[0, 0.2, 0.4].map(delay => (
        <motion.div
          key={delay}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay }}
          className="w-1.5 h-1.5 bg-white/50 rounded-full"
        />
      ))}
    </motion.div>
  );
});

// ─── Main component ─────────────────────────────────────────────────────────
export default function SingularityChat({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages]     = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput]           = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [ttsLoading, setTtsLoading] = useState<Set<string>>(new Set());

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const scrollBoxRef     = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const abortRef         = useRef<AbortController | null>(null); // PHASE 3: pass abortRef.current.signal to fetch
  const mockTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Smart auto-scroll — only snap to bottom if the user was already near it,
  // so scrolling up to re-read history doesn't get yanked away.
  useEffect(() => {
    if (stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const handleScroll = useCallback(() => {
    const el = scrollBoxRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
    setShowScrollBtn(distanceFromBottom > 160);
  }, []);

  const scrollToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => () => {
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
    abortRef.current?.abort();
  }, []);

  // Core "ask the model" flow — mocked for now, Phase-3-ready shape.


const generateResponse = useCallback(async (userText: string) => {
  setIsThinking(true);
  thinkingStartRef.current = Date.now();
  abortRef.current = new AbortController();

  const msgId = `${Date.now()}`;
  setMessages(prev => [...prev, { id: msgId, role: 'assistant', content: '', reasoning: '', ts: Date.now() }]);

  try {
    const res = await fetch('/api/singularity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: messages.filter(m => m.id !== 'welcome').slice(-12).map(m => ({ role: m.role, content: m.content })),
      }),
      signal: abortRef.current.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sawFirstToken = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data.error) throw new Error('stream error');
        if (data.done) continue;

        if (!sawFirstToken) { setIsThinking(false); sawFirstToken = true; }
        const seconds = Math.max(1, Math.round((Date.now() - thinkingStartRef.current) / 1000));
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, reasoning: data.reasoning, content: data.content, reasoningSeconds: seconds } : m
        ));
        stickToBottomRef.current = true;
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return;
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, error: true, content: 'Cosmic transmission failed. Check your connection and try again.' } : m
    ));
  } finally {
    setIsThinking(false);
  }
}, [messages]);


  
  const handleSend = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isThinking) return;

    setMessages(prev => [...prev, { id: `${Date.now()}-u`, role: 'user', content: text, ts: Date.now() }]);
    setInput('');
    stickToBottomRef.current = true;
    generateResponse(text);
  }, [input, isThinking, generateResponse]);

  const handleStop = useCallback(() => {
    if (mockTimeoutRef.current) clearTimeout(mockTimeoutRef.current);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleListen = useCallback(async (msgId: string, text: string) => {
    if (ttsLoading.has(msgId)) return;
    setTtsLoading(prev => new Set(prev).add(msgId));
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Rachel — premium female voice
        body: JSON.stringify({ text: text.slice(0, 2500), voiceId: '21m00Tcm4TlvDq8ikWAM' }),
      });
      if (!res.ok) throw new Error(`TTS error ${res.status}`);
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
    } catch {
      // silently fail — button resets and user can retry
    } finally {
      setTtsLoading(prev => {
        const next = new Set(prev);
        next.delete(msgId);
        return next;
      });
    }
  }, [ttsLoading]);

  const isFreshChat = messages.length === 1;

  return (
    <div className="!fixed !inset-0 !w-screen !h-[100dvh] !z-[999999] !bg-[#050505] !overflow-hidden">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Chat with Singularity"
      className="max-w-3xl mx-auto w-full h-full flex flex-col"
    >
      {/* Ambient corner glow — neutral white, matches the platform's dark-glass language elsewhere */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse at 100% 0%, rgba(255,255,255,0.05), transparent 60%)' }}
        aria-hidden="true"
      />

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.1] shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Sparkles size={16} strokeWidth={2} className="text-white/80" />
            {!prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-full border border-white/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            )}
          </div>
          <div>
            <h2 className="text-[14px] font-semibold tracking-wide text-white/95" style={{ fontFamily: 'var(--app-font-heading)' }}>
              Singularity
            </h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Powered by DeepSeek R1</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/[0.08] text-white/40 hover:text-white/80 transition-colors"
            aria-label="Close Singularity chat"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Chat Area ── */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollBoxRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-5 py-6 scrollbar-hide flex flex-col gap-6"
          aria-live="polite"
        >
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && !isThinking;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {msg.reasoning && (
                    <ReasoningBlock reasoning={msg.reasoning} seconds={msg.reasoningSeconds} />
                  )}

                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-white text-black rounded-br-sm shadow-[0_4px_14px_rgba(255,255,255,0.15)] font-medium text-[13.5px] leading-relaxed tracking-wide'
                        : msg.error
                          ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm text-[13.5px] leading-relaxed'
                          : 'bg-white/[0.06] border border-white/[0.08] text-white/85 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? <MessageContent content={msg.content} /> : msg.content}
                  </div>

                  {msg.role === 'assistant' && !msg.error && msg.id !== 'welcome' && (
                    <div className="flex items-center gap-1 mt-1">
                      <CopyButton text={msg.content} />
                      {msg.content && (
                        <button
                          onClick={() => handleListen(msg.id, msg.content)}
                          disabled={ttsLoading.has(msg.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={ttsLoading.has(msg.id) ? 'Loading audio…' : 'Listen to response'}
                        >
                          {ttsLoading.has(msg.id)
                            ? <Loader2 size={11} strokeWidth={2} className="animate-spin" />
                            : <Volume2 size={11} strokeWidth={2} />}
                          Listen
                        </button>
                      )}
                      {isLastAssistant && (
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors duration-200"
                          aria-label="Regenerate response"
                        >
                          <RotateCcw size={11} strokeWidth={2} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  )}

                  {msg.error && (
                    <button
                      onClick={handleRegenerate}
                      className="mt-1 text-[10.5px] text-red-300/70 hover:text-red-200 underline underline-offset-2"
                    >
                      Retry
                    </button>
                  )}
                </motion.div>
              );
            })}

            {isThinking && <ThinkingDots key="thinking" />}
          </AnimatePresence>

          {isFreshChat && !isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-2 mt-2"
            >
              <p className="text-[9.5px] uppercase tracking-[0.18em] text-white/25 px-1 mb-1">Try asking</p>
              {STARTER_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12.5px] text-white/60 hover:bg-white/[0.06] hover:text-white/85 hover:border-white/[0.12] transition-all duration-200"
                >
                  {p}
                </button>
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
              aria-label="Scroll to latest message"
            >
              <ArrowDown size={14} strokeWidth={2} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-black/40">
        <div className="relative flex items-end gap-2 bg-white/[0.05] border border-white/[0.1] rounded-3xl px-2 py-2 focus-within:bg-white/[0.08] focus-within:border-white/20 transition-all duration-300 shadow-inner">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the universe... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13.5px] text-white/90 placeholder:text-white/30 px-3 py-2 outline-none max-h-[120px]"
            aria-label="Message Singularity"
          />
          <button
            onClick={() => (isThinking ? handleStop() : handleSend())}
            disabled={!isThinking && !input.trim()}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 mb-0.5 ${
              isThinking
                ? 'bg-white/90 text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                : input.trim()
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                  : 'bg-white/[0.08] text-white/30 cursor-not-allowed'
            }`}
            aria-label={isThinking ? 'Stop generating' : 'Send message'}
          >
            {isThinking
              ? <Square size={13} strokeWidth={2.5} fill="currentColor" />
              : <Send size={15} strokeWidth={2.5} className={input.trim() ? 'ml-0.5' : ''} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
