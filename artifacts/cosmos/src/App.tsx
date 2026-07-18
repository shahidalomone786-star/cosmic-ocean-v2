import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import NasaSearch, { DetailModal, type UnifiedItem, type WikiItem, type NasaItem, type NasaStatus } from './components/NasaSearch';
import WarpIntro from './components/WarpIntro';

// ─── 6 Cosmic Scenes ──────────────────────────────────────────────────────────
const cosmicScenes = [
  "https://sketchfab.com/models/e410da98b1e5445eae2acafaaa53587d/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/a64ff34315e74697b90dfb107109fc64/embed?autostart=1&preload=1",
  "https://sketchfab.com/models/c09a1970148c43ad99db134a9d6d00b5/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  "https://sketchfab.com/models/81be051e683646d3922b2f6e71eafa11/embed?autostart=1&ui_infos=0",
  "https://sketchfab.com/models/25b3f6f993de4f978de290b6e755ba87/embed?autostart=1&preload=1&ui_infos=0",
];

// ─── Constants ────────────────────────────────────────────────────────────────
const TAGS        = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics', 'Everything'];

const EVERYTHING_TERMS = [
  'nebula', 'galaxy', 'cosmos', 'supernova', 'aurora', 'jupiter', 'saturn',
  'milky way', 'black hole', 'star cluster', 'deep space', 'universe',
  'exoplanet', 'quasar', 'pulsar', 'comet', 'solar flare', 'hubble',
];

function interleave(a: UnifiedItem[], b: UnifiedItem[]): UnifiedItem[] {
  const out: UnifiedItem[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

const PORTAL_TABS = ['All','Black Holes','Galaxies','String Theory','Avatars','Equations',
                     'Nebulae','Dark Matter','Wormholes','Supernovae','Cosmology','Quantum Field'];

// Languages + their Google Translate codes
const LANGUAGES: { label: string; gtCode: string }[] = [
  { label: 'English',    gtCode: 'en' },
  { label: 'Hindi',      gtCode: 'hi' },
  { label: 'Japanese',   gtCode: 'ja' },
  { label: 'Spanish',    gtCode: 'es' },
  { label: 'French',     gtCode: 'fr' },
  { label: 'German',     gtCode: 'de' },
  { label: 'Arabic',     gtCode: 'ar' },
  { label: 'Portuguese', gtCode: 'pt' },
  { label: 'Korean',     gtCode: 'ko' },
  { label: 'Chinese',    gtCode: 'zh-CN' },
];

// ─── Avatar data ──────────────────────────────────────────────────────────────
const AVATARS = [
  { name: 'Albert Einstein', role: 'Theoretical Physicist',
    image: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg' },
  { name: 'Richard Feynman', role: 'Quantum Pioneer',
    image: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg' },
  { name: 'Carl Sagan',      role: 'Cosmos Explorer',      image: '/carl-sagan.jpg' },
  { name: 'Nikola Tesla',    role: 'Electrical Visionary',
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg' },
] as const;

function randomIndexExcluding(current: number, length: number): number {
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatTarget    = { name: string; role: string; image: string };
type Message       = { role: 'user' | 'model'; text: string };
type SharedContext = { title: string; description: string; source: 'nasa' | 'wiki' };

// ─── Google Translate helpers ─────────────────────────────────────────────────
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (opts: object, id: string) => void;
      };
    };
  }
}

function injectGoogleTranslate() {
  if (document.getElementById('gt-script')) return; // already injected
  const el = document.createElement('div');
  el.id = 'google_translate_element';
  el.style.display = 'none';
  document.body.appendChild(el);

  window.googleTranslateElementInit = () => {
    if (window.google?.translate?.TranslateElement) {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
    }
  };

  const script = document.createElement('script');
  script.id  = 'gt-script';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.head.appendChild(script);
}

function deleteGTranslateCookie() {
  const past = 'expires=Thu, 01 Jan 1970 00:00:01 GMT';
  document.cookie = `googtrans=; ${past}; path=/;`;
  document.cookie = `googtrans=; ${past}; domain=${location.hostname}; path=/;`;
  // Also clear sub-domain variant (e.g. www.)
  document.cookie = `googtrans=; ${past}; domain=.${location.hostname}; path=/;`;
}

function applyGTranslate(targetCode: string) {
  if (targetCode === 'en') {
    // Read the cookie state BEFORE touching anything
    const wasTranslated = document.cookie
      .split(';')
      .some(c => {
        const v = c.trim();
        return v.startsWith('googtrans=') && !v.includes('/en/en') && v !== 'googtrans=';
      });

    // Nuke the cookie unconditionally so GT doesn't re-apply on reload
    deleteGTranslateCookie();

    if (wasTranslated) {
      // Hard reload — the deleted cookie means GT will serve English
      window.location.reload();
    }
    return;
  }

  // ── Non-English: set cookie then fire the GT combo-select ──────────────────
  const cookieVal = `/en/${targetCode}`;
  document.cookie = `googtrans=${cookieVal}; path=/;`;
  document.cookie = `googtrans=${cookieVal}; domain=${location.hostname}; path=/;`;

  // Primary: trigger the hidden GT select element (no reload needed)
  const sel = document.querySelector<HTMLSelectElement>('.goog-te-combo');
  if (sel) {
    sel.value = targetCode;
    sel.dispatchEvent(new Event('change'));
    return;
  }

  // Fallback: cookie is set — reload and GT will pick it up automatically
  setTimeout(() => window.location.reload(), 80);
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────
// ─── TTS Controls ────────────────────────────────────────────────────────────
function TtsControls({
  idx, playingIdx, isPlaying, activeEngine, preferEngine,
  onPlay, onSkip, onEngineToggle,
}: {
  idx: number;
  playingIdx: number | null;
  isPlaying: boolean;
  activeEngine: 'premium' | 'standard';
  preferEngine: 'premium' | 'standard';
  onPlay: () => void;
  onSkip: (delta: number) => void;
  onEngineToggle: () => void;
}) {
  const isActive = playingIdx === idx;
  const showSkip = isActive && activeEngine === 'premium';
  return (
    <div className="ml-10 flex items-center gap-1.5 pt-1 opacity-70">
      {/* Engine toggle */}
      <button
        onClick={onEngineToggle}
        title={preferEngine === 'premium' ? 'Switch to Standard (browser TTS)' : 'Switch to Premium (ElevenLabs)'}
        className={`px-2 py-[2px] rounded-full text-[8.5px] uppercase tracking-[0.14em] border transition-all duration-200
          ${preferEngine === 'premium'
            ? 'border-violet-400/30 bg-violet-500/10 text-violet-300/90 hover:border-violet-400/50'
            : 'border-white/[0.12] bg-white/[0.05] text-white/45 hover:text-white/70'}`}
      >
        {preferEngine === 'premium' ? '★ PREM' : '◎ STD'}
      </button>
      {/* Rewind 5s — premium + active only */}
      {showSkip && (
        <button onClick={() => onSkip(-5)} title="Back 5s"
          className="w-[18px] h-[18px] flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/45 hover:text-white/75 hover:bg-white/[0.09] transition-all duration-150 text-[8px]">
          ⏪
        </button>
      )}
      {/* Play / Pause */}
      <button onClick={onPlay}
        className="w-6 h-6 flex items-center justify-center rounded-full border border-white/[0.14] bg-white/[0.07] text-white/65 hover:text-white hover:bg-white/[0.14] hover:border-white/[0.25] transition-all duration-150">
        {isActive && isPlaying
          ? <span className="text-[10px]">⏸</span>
          : <span className="text-[9px] pl-px">▶</span>}
      </button>
      {/* Fast-forward 5s — premium + active only */}
      {showSkip && (
        <button onClick={() => onSkip(5)} title="Forward 5s"
          className="w-[18px] h-[18px] flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] text-white/45 hover:text-white/75 hover:bg-white/[0.09] transition-all duration-150 text-[8px]">
          ⏩
        </button>
      )}
    </div>
  );
}

function ChatModal({ avatar, language, sharedContext, onClose, onInputFocus, onInputBlur }: {
  avatar: ChatTarget;
  language: string;
  sharedContext?: SharedContext;
  onClose: () => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (sharedContext) {
      return []; // will be populated by auto-analyse
    }
    return [{ role: 'model', text: `Greetings! I am ${avatar.name}. What mysteries of the universe shall we explore today?` }];
  });
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const callingRef  = useRef(false);
  const lastSentRef = useRef(0);
  const autoAnalysedRef = useRef(false);

  // ── TTS state ──────────────────────────────────────────────────────────────
  const audioRef      = useRef<HTMLAudioElement>(null);
  const blobUrlRef    = useRef('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preferEngine, setPreferEngine] = useState<'premium' | 'standard'>('premium');
  const [playingIdx,   setPlayingIdx]   = useState<number | null>(null);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [activeEngine, setActiveEngine] = useState<'premium' | 'standard'>('premium');
  const [ttsToast,     setTtsToast]     = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  useEffect(() => {
    setError('');
  }, [avatar.name]);

  // ── Auto-analyse shared content on mount ──────────────────────────────────
  useEffect(() => {
    if (!sharedContext || autoAnalysedRef.current) return;
    autoAnalysedRef.current = true;
    const analyse = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            history: [],
            avatarName: avatar.name,
            language,
            sharedContext,
          }),
        });
        const data = await res.json() as { reply?: string; error?: string };
        if (!res.ok || data.error) {
          setError(data.error ?? `Server error ${res.status}`);
          setMessages([{ role: 'model', text: `Greetings! I am ${avatar.name}. What mysteries of the universe shall we explore today?` }]);
        } else {
          setMessages([{ role: 'model', text: data.reply! }]);
        }
      } catch (err: unknown) {
        setError((err as Error)?.message ?? String(err));
        setMessages([{ role: 'model', text: `Greetings! I am ${avatar.name}. What mysteries of the universe shall we explore today?` }]);
      } finally {
        setIsLoading(false);
      }
    };
    analyse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (callingRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < 3_000) return;
    callingRef.current  = true;
    lastSentRef.current = now;

    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      const history = messages.slice(sharedContext ? 0 : 1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          avatarName: avatar.name,
          language,
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? `Server error ${res.status}`);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: data.reply! }]);
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? String(err));
    } finally {
      setIsLoading(false);
      callingRef.current = false;
    }
  };

  // ── TTS helpers ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setTtsToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setTtsToast(''), 4500);
  }, []);

  const stopAll = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setPlayingIdx(null);
  }, []);

  const playStandard = useCallback((text: string, idx: number) => {
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.92;
    utt.onend   = () => { setIsPlaying(false); setPlayingIdx(null); };
    utt.onerror = () => { setIsPlaying(false); setPlayingIdx(null); };
    window.speechSynthesis.speak(utt);
    setPlayingIdx(idx);
    setIsPlaying(true);
    setActiveEngine('standard');
  }, []);

  const playPremium = useCallback(async (text: string, idx: number) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, avatarName: avatar.name }),
      });
      if (!res.ok) {
        const data = await res.json() as { code?: string };
        showToast(
          data.code === 'TOTAL_QUOTA_EXHAUSTED'
            ? 'Premium quota exhausted. Using Standard Voice.'
            : 'Premium TTS unavailable. Using Standard Voice.',
        );
        playStandard(text, idx);
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = url;
      const audio = audioRef.current!;
      audio.src     = url;
      audio.onended = () => { setIsPlaying(false); setPlayingIdx(null); };
      audio.onerror = () => { setIsPlaying(false); setPlayingIdx(null); };
      try { await audio.play(); } catch { /* interrupted */ }
      setPlayingIdx(idx);
      setIsPlaying(true);
      setActiveEngine('premium');
    } catch {
      showToast('Premium TTS error. Using Standard Voice.');
      playStandard(text, idx);
    }
  }, [avatar.name, showToast, playStandard]);

  const playTTS = useCallback(async (text: string, idx: number) => {
    // Toggle pause on the active message
    if (playingIdx === idx && isPlaying) {
      if (activeEngine === 'premium' && audioRef.current) { audioRef.current.pause(); }
      else { window.speechSynthesis?.pause(); }
      setIsPlaying(false);
      return;
    }
    // Resume a paused message
    if (playingIdx === idx && !isPlaying) {
      if (activeEngine === 'premium' && audioRef.current) {
        try { await audioRef.current.play(); } catch { /* ok */ }
      } else { window.speechSynthesis?.resume(); }
      setIsPlaying(true);
      return;
    }
    // New message — stop everything and start fresh
    stopAll();
    if (preferEngine === 'premium') { await playPremium(text, idx); }
    else { playStandard(text, idx); }
  }, [playingIdx, isPlaying, activeEngine, preferEngine, stopAll, playPremium, playStandard]);

  const skipTime = useCallback((delta: number) => {
    if (audioRef.current && activeEngine === 'premium' && playingIdx !== null) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + delta);
    }
  }, [activeEngine, playingIdx]);

  // Cleanup on unmount
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <motion.div
      key="chat-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-[32px] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-[92%] max-w-2xl h-[82vh] bg-[rgba(7,7,12,0.88)] backdrop-blur-[28px] border border-white/[0.09] rounded-[2rem] flex flex-col overflow-hidden shadow-[0_40px_80px_-16px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3.5">
            <img src={avatar.image} alt={avatar.name}
              className="w-10 h-10 rounded-full object-cover border border-white/[0.18] shadow-[0_0_16px_rgba(0,0,0,0.6)]" />
            <div>
              <p className="text-white text-[14px] font-medium tracking-wide leading-tight" style={{ fontFamily: 'var(--app-font-heading)' }}>{avatar.name}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] mt-0.5">{avatar.role}</p>
            </div>
          </div>
          {/* Shared context badge */}
          {sharedContext && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 max-w-[180px]">
              <span className="text-[9px] text-violet-300/80 uppercase tracking-wider flex-shrink-0">Analysing</span>
              <span className="text-[9px] text-white/50 truncate">{sharedContext.title}</span>
            </div>
          )}
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.12] hover:border-white/[0.18] transition-all duration-200 text-lg leading-none">
            ×
          </button>
        </div>

        {/* ── Shared context banner ── */}
        {sharedContext && (
          <div className="flex-shrink-0 px-6 py-3 bg-[rgba(124,58,237,0.08)] border-b border-violet-400/[0.12]">
            <p className="text-violet-300/50 text-[9px] uppercase tracking-[0.2em] mb-0.5">Analysing context</p>
            <p className="text-white/65 text-[12px] tracking-wide leading-snug line-clamp-1">{sharedContext.title}</p>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide flex flex-col gap-4">
          {/* Auto-analyse loading state */}
          {isLoading && messages.length === 0 && (
            <div className="flex items-start gap-3">
              <img src={avatar.image} alt={avatar.name}
                className="w-7 h-7 rounded-full object-cover border border-white/[0.15] flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
              <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-[4px]">
                <ThinkingDots />
              </div>
            </div>
          )}

          {messages.map((msg, idx) =>
            msg.role === 'user' ? (
              <div key={idx} className="flex justify-end">
                <div className="bg-white/[0.12] border border-white/[0.11] backdrop-blur-md rounded-2xl rounded-tr-[5px] px-5 py-3 max-w-[80%] shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
                  <p className="text-white text-[13.5px] leading-relaxed tracking-wide">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={idx} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <img src={avatar.image} alt={avatar.name}
                    className="w-7 h-7 rounded-full object-cover border border-white/[0.15] flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
                  <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-[5px] px-5 py-3 max-w-[82%]">
                    <p className="text-white/88 text-[13.5px] leading-relaxed tracking-wide">{msg.text}</p>
                  </div>
                </div>
                <TtsControls
                  idx={idx}
                  playingIdx={playingIdx}
                  isPlaying={isPlaying}
                  activeEngine={activeEngine}
                  preferEngine={preferEngine}
                  onPlay={() => { void playTTS(msg.text, idx); }}
                  onSkip={skipTime}
                  onEngineToggle={() => setPreferEngine(e => e === 'premium' ? 'standard' : 'premium')}
                />
              </div>
            )
          )}

          {isLoading && messages.length > 0 && (
            <div className="flex items-start gap-3">
              <img src={avatar.image} alt={avatar.name}
                className="w-7 h-7 rounded-full object-cover border border-white/[0.15] flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
              <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-[5px]">
                <ThinkingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="mx-auto px-4 py-2 rounded-full bg-red-500/10 border border-red-400/20">
              <p className="text-center text-red-400/90 text-[11.5px] tracking-wide">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── TTS toast ── */}
        <AnimatePresence>
          {ttsToast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/85 border border-white/[0.12] backdrop-blur-xl text-white/75 text-[11px] tracking-wide whitespace-nowrap z-20 pointer-events-none"
            >
              {ttsToast}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Hidden audio element for premium TTS */}
        <audio ref={audioRef} preload="none" className="hidden" />

        {/* ── Input ── */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); if (error) setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              disabled={isLoading}
              placeholder={isLoading ? 'Thinking…' : `Ask ${avatar.name.split(' ')[0]} anything…`}
              className="flex-1 bg-white/[0.06] border border-white/[0.11] rounded-full px-5 py-3 text-white text-[13.5px] placeholder-white/30 outline-none focus:border-white/[0.24] focus:bg-white/[0.09] disabled:opacity-40 transition-all duration-250 tracking-wide"
            />
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.08 }}
              whileTap={{ scale: isLoading ? 1 : 0.92 }}
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.16] hover:border-white/[0.25] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            >
              <span className="text-base leading-none">↑</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Portal Wiki Card ─────────────────────────────────────────────────────────
function PortalWikiCard({ item, onSelect }: { item: WikiItem; onSelect: () => void }) {
  const imgSrc  = item.thumbnail?.source;
  const snippet = item.extract?.split('\n').find(l => l.trim()) ?? '';
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="flex-shrink-0 w-52 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.04] backdrop-blur-[16px] cursor-pointer hover:border-white/[0.20] hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out"
    >
      {imgSrc ? (
        <div className="w-full h-28 overflow-hidden bg-black/20">
          <img src={imgSrc} alt={item.title} loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="w-full h-28 flex items-center justify-center bg-gradient-to-br from-amber-900/20 via-black/20 to-transparent">
          <span className="text-4xl font-thin text-amber-200/15 select-none">W</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[8px] font-medium uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/20 text-amber-200/80">
            ◈ WIKI
          </span>
        </div>
        <p className="text-white text-[12px] font-medium leading-snug tracking-wide truncate mb-1">{item.title}</p>
        {snippet && (
          <p className="text-white/40 text-[11px] leading-relaxed line-clamp-2">{snippet}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Glassmorphism Avatar Card ────────────────────────────────────────────────
const AvatarCard = memo(function AvatarCard({ name, subtitle, image, onChat }: {
  name: string; subtitle: string; image?: string; onChat: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative flex-shrink-0 w-44 rounded-2xl overflow-hidden border border-white/[0.09] bg-white/[0.05] backdrop-blur-[18px] cursor-pointer group shadow-[0_4px_20px_rgba(0,0,0,0.45)]"
    >
      <div className="w-full h-36 relative overflow-hidden">
        {image ? (
          <img src={image} alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
            <span className="text-4xl font-thin text-white/80 select-none z-10">
              {name.split(' ').map((w: string) => w[0]).join('')}
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-white text-sm font-medium tracking-wide truncate">{name}</p>
        <p className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5 truncate">{subtitle}</p>
        <div className="mt-2.5 flex gap-1.5">
          <button onClick={onChat}
            className="text-[9px] uppercase tracking-wider text-white/70 bg-white/8 border border-white/20 px-2 py-0.5 rounded-full hover:bg-white/15 hover:text-white transition-colors duration-200">
            Chat
          </button>
          <span className="text-[9px] uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Explore
          </span>
        </div>
      </div>

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [showIntro,   setShowIntro]  = useState(true);
  const [focused,     setFocused]    = useState(false);
  const [showPortal,  setShowPortal] = useState(false);
  const [language,    setLanguage]   = useState('English');
  const [langOpen,    setLangOpen]   = useState(false);
  const [activeTab,   setActiveTab]  = useState('All');
  const [portalQuery, setPortalQuery]= useState('');
  const [activeChat,       setActiveChat]       = useState<ChatTarget | null>(null);
  const [chatSharedCtx,    setChatSharedCtx]    = useState<SharedContext | undefined>(undefined);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const [sceneIdx,         setSceneIdx]         = useState(() => Math.floor(Math.random() * cosmicScenes.length));
  const overlayControls = useAnimation();
  const bgIframeRef     = useRef<HTMLIFrameElement>(null);

  // ── Unified search state ──────────────────────────────────────────────────
  const [nasaQuery,        setNasaQuery]        = useState('');
  const [searchResults,    setSearchResults]    = useState<UnifiedItem[]>([]);
  const [searchStatus,     setSearchStatus]     = useState<NasaStatus>('idle');
  const [searchError,      setSearchError]      = useState('');
  const [isEverythingMode, setIsEverythingMode] = useState(false);
  const [isLoadingMore,    setIsLoadingMore]    = useState(false);
  const [selectedCard,     setSelectedCard]     = useState<UnifiedItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Portal prefetch state ──────────────────────────────────────────────────
  const [portalFetched,    setPortalFetched]    = useState(false);
  const [portalBlackHoles, setPortalBlackHoles] = useState<WikiItem[]>([]);
  const [portalEquations,  setPortalEquations]  = useState<WikiItem[]>([]);

  const hasSearchResults = searchStatus !== 'idle';

  // ── Inject Google Translate once on mount ─────────────────────────────────
  useEffect(() => {
    injectGoogleTranslate();
  }, []);

  // ── Apply Google Translate whenever language changes ──────────────────────
  useEffect(() => {
    const lang = LANGUAGES.find(l => l.label === language);
    if (!lang) return;
    // Small delay to let GT widget load on first run
    const timer = setTimeout(() => applyGTranslate(lang.gtCode), 800);
    return () => clearTimeout(timer);
  }, [language]);

  // ── STRICT BACKGROUND FREEZE: hide iframe entirely to stop GPU rendering ──
  // Using imperative DOM mutation — avoids re-mounting / key change on the iframe
  useEffect(() => {
    const iframe = bgIframeRef.current;
    if (!iframe) return;
    if (isAnimationPaused) {
      iframe.style.display = 'none';
    } else {
      iframe.style.display = '';
    }
  });

  const isAnimationPaused =
    showIntro || focused || showPortal || langOpen ||
    activeChat !== null || chatInputFocused ||
    hasSearchResults || selectedCard !== null;

  const searchAll = useCallback(async (q: string, mode: 'specific' | 'everything' = 'specific') => {
    const term = q.trim();
    if (!term) return;
    const everything = mode === 'everything';
    setIsEverythingMode(everything);
    setSearchStatus('loading');
    setSearchResults([]);
    setSearchError('');
    try {
      const nasaTerm = everything ? 'cosmos' : term;
      const wikiTerm = everything ? 'cosmology astronomy' : term;

      const [nasaRes, wikiRes] = await Promise.all([
        fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(nasaTerm)}&media_type=image&page=1`),
        fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(wikiTerm)}&gsrlimit=10&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=600&format=json&origin=*`),
      ]);

      const nasaItems: UnifiedItem[] = nasaRes.ok
        ? ((await nasaRes.json() as { collection: { items: NasaItem[] } }).collection.items ?? [])
            .map(item => ({ source: 'nasa' as const, item }))
        : [];

      const wikiItems: UnifiedItem[] = wikiRes.ok
        ? Object.values(
            ((await wikiRes.json() as { query?: { pages?: Record<string, WikiItem> } }).query?.pages) ?? {}
          ).map(item => ({ source: 'wiki' as const, item }))
        : [];

      setSearchResults(interleave(nasaItems, wikiItems));
      setSearchStatus('done');
    } catch (err: unknown) {
      setSearchError((err as Error)?.message ?? String(err));
      setSearchStatus('error');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !isEverythingMode) return;
    setIsLoadingMore(true);
    try {
      const nasaTerm = EVERYTHING_TERMS[Math.floor(Math.random() * EVERYTHING_TERMS.length)];
      const wikiTerm = EVERYTHING_TERMS[Math.floor(Math.random() * EVERYTHING_TERMS.length)];
      const page     = Math.floor(Math.random() * 8) + 1;

      const [nasaRes, wikiRes] = await Promise.all([
        fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(nasaTerm)}&media_type=image&page=${page}`),
        fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(wikiTerm)}&gsrlimit=10&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=600&format=json&origin=*`),
      ]);

      const nasaItems: UnifiedItem[] = nasaRes.ok
        ? ((await nasaRes.json() as { collection: { items: NasaItem[] } }).collection.items ?? [])
            .filter(item => item.links?.length)
            .map(item => ({ source: 'nasa' as const, item }))
        : [];

      const wikiItems: UnifiedItem[] = wikiRes.ok
        ? Object.values(
            ((await wikiRes.json() as { query?: { pages?: Record<string, WikiItem> } }).query?.pages) ?? {}
          ).map(item => ({ source: 'wiki' as const, item }))
        : [];

      setSearchResults(prev => [...prev, ...interleave(nasaItems, wikiItems)]);
    } catch { /* silently swallow */ }
    finally { setIsLoadingMore(false); }
  }, [isLoadingMore, isEverythingMode]);

  const clearSearch = useCallback(() => {
    setNasaQuery('');
    setSearchResults([]);
    setSearchStatus('idle');
    setSearchError('');
    setIsEverythingMode(false);
    setSelectedCard(null);
    setIsLoadingMore(false);
  }, []);

  // ── Portal fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showPortal || portalFetched) return;
    setPortalFetched(true);

    const fetchWikiTitles = async (titles: string[], setter: (items: WikiItem[]) => void) => {
      try {
        const joined = titles.map(encodeURIComponent).join('|');
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${joined}&prop=pageimages|extracts&exintro=1&explaintext=1&pithumbsize=400&format=json&origin=*`
        );
        if (!res.ok) return;
        const json = await res.json() as { query?: { pages?: Record<string, WikiItem> } };
        const items = Object.values(json.query?.pages ?? {}).filter(p => !('missing' in p));
        setter(items);
      } catch { /* ignore */ }
    };

    fetchWikiTitles(['Black hole', 'Supermassive black hole', 'Event horizon'], setPortalBlackHoles);
    fetchWikiTitles(['Theory of relativity', 'Schrödinger equation', 'Standard Model'], setPortalEquations);
  }, [showPortal, portalFetched]);

  // ── IntersectionObserver — infinite scroll ────────────────────────────────
  useEffect(() => {
    if (!isEverythingMode || searchStatus !== 'done') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isEverythingMode, searchStatus, loadMore]);

  // ── Scene rotation — paused when any UI interaction is active ─────────────
  useEffect(() => {
    if (isAnimationPaused) return;

    const interval = setInterval(async () => {
      await overlayControls.start({ opacity: 1, transition: { duration: 1.5, ease: 'easeInOut' } });
      setSceneIdx(prev => randomIndexExcluding(prev, cosmicScenes.length));
      await overlayControls.start({ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } });
    }, 300_000);
    return () => clearInterval(interval);
  }, [overlayControls, isAnimationPaused]);

  // ── Stable callbacks ──────────────────────────────────────────────────────
  const closeChat = useCallback(() => {
    setActiveChat(null);
    setChatSharedCtx(undefined);
  }, []);

  const openChat = useCallback((avatar: ChatTarget) => {
    setChatSharedCtx(undefined);
    setActiveChat(avatar);
  }, []);

  // Open chat WITH shared context (from "Discuss with a Scientist")
  const openChatWithContext = useCallback((avatarName: string, ctx: SharedContext) => {
    const av = AVATARS.find(a => a.name === avatarName);
    if (!av) return;
    setChatSharedCtx(ctx);
    setActiveChat({ name: av.name, role: av.role, image: av.image });
  }, []);

  // Build shared context from a selected card for passing to DetailModal
  const buildSharedContext = useCallback((card: UnifiedItem): SharedContext => {
    if (card.source === 'nasa') {
      return {
        title:       card.item.data?.[0]?.title ?? 'NASA Image',
        description: card.item.data?.[0]?.description ?? '',
        source:      'nasa',
      };
    }
    return {
      title:       card.item.title ?? 'Wikipedia Article',
      description: card.item.extract ?? '',
      source:      'wiki',
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* ── Cinematic Big Bang Intro ── */}
      <AnimatePresence>
        {showIntro && <WarpIntro onDone={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* ── z-0  Full-screen Sketchfab background ── */}
      <div
        className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-auto flex items-center justify-center transition-all duration-1000"
        style={{ filter: hasSearchResults ? 'blur(14px) brightness(0.55)' : 'none' }}
      >
        {/* Static fallback gradient shown while iframe is hidden */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #1a0a3a 0%, #050010 50%, #000 100%)',
            opacity: isAnimationPaused ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />
        <iframe
          key={sceneIdx}
          ref={bgIframeRef}
          title="Cosmic Background"
          src={cosmicScenes[sceneIdx]}
          className="absolute w-[110vw] h-[120vh] border-none pointer-events-auto"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          xr-spatial-tracking="true"
          execution-while-out-of-viewport="true"
          execution-while-not-rendered="true"
          web-share="true"
        />
      </div>

      {/* ── z-10  Cinematic crossfade overlay ── */}
      <motion.div
        className="absolute inset-0 z-10 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={overlayControls}
      />

      {/* ── z-11  Freeze overlay — covers iframe to visually freeze it ── */}
      <motion.div
        className="absolute inset-0 z-[11] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isAnimationPaused ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ backdropFilter: isAnimationPaused ? 'blur(2px)' : 'blur(0px)', background: 'rgba(0,0,0,0.45)' }}
      />

      {/* ── z-20  Main cinematic UI ── */}
      <AnimatePresence>
        {!showPortal && (
          <motion.div key="main-ui"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4, ease: 'easeInOut' }}
            className={`absolute inset-0 z-20 flex flex-col items-center pointer-events-none ${
              hasSearchResults ? 'justify-start overflow-y-auto pt-10 pb-16' : 'justify-center'
            }`}
          >
            {/* ── Language pill — top right ── */}
            <div className="absolute top-4 right-4 z-30 pointer-events-auto">
              <div className="relative">
                <button onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur-[18px] text-white/80 text-[11px] uppercase tracking-[0.15em] hover:bg-white/[0.11] hover:border-white/[0.2] transition-all duration-300">
                  🌐 {language}
                  <span className="text-white/35 text-[9px]">{langOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.94 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/[0.09] bg-[rgba(8,8,14,0.92)] backdrop-blur-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50"
                    >
                      {LANGUAGES.map(lang => (
                        <button key={lang.label} onClick={() => { setLanguage(lang.label); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-[12px] tracking-wide transition-all duration-150
                            ${lang.label === language ? 'text-white bg-white/[0.10] border-l-2 border-white/40' : 'text-white/55 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Search bar + tags */}
            <motion.div
              animate={{ y: hasSearchResults ? 0 : focused ? -120 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className={`flex flex-col items-center gap-5 pointer-events-auto px-6 w-full ${
                hasSearchResults ? 'max-w-2xl' : 'max-w-md'
              }`}
            >
              <div className="w-full backdrop-blur-[22px] bg-white/[0.07] border border-white/[0.14] rounded-full px-6 py-4 shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-300 focus-within:border-white/[0.24] focus-within:bg-white/[0.10] focus-within:shadow-[0_8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.10)]">
                <input
                  type="text"
                  value={nasaQuery}
                  placeholder="Search the cosmos..."
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={e => { setNasaQuery(e.target.value); if (!e.target.value.trim()) clearSearch(); }}
                  onKeyDown={e => { if (e.key === 'Enter') searchAll(nasaQuery); }}
                  className="w-full bg-transparent outline-none text-white placeholder-white/40 text-[15px] tracking-wide font-light leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {TAGS.map(tag => {
                  const isEverything = tag === 'Everything';
                  return (
                    <button key={tag}
                      onClick={() => {
                        if (isEverything) {
                          setNasaQuery('cosmos');
                          searchAll('cosmos', 'everything');
                        } else {
                          setNasaQuery(tag);
                          searchAll(tag, 'specific');
                          setIsEverythingMode(false);
                        }
                      }}
                      className={`text-[11px] uppercase tracking-[0.14em] backdrop-blur-[14px] px-3.5 py-1.5 rounded-full transition-all duration-300 ease-out cursor-pointer hover:-translate-y-px ${
                        isEverything
                          ? 'text-white/95 bg-white/[0.10] border border-white/[0.22] hover:bg-white/[0.16] hover:text-white hover:border-white/[0.35] hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)] font-medium'
                          : 'text-white/65 bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.09] hover:text-white/90 hover:border-white/[0.18]'
                      }`}>
                      {isEverything ? '✦ Everything' : tag}
                    </button>
                  );
                })}
              </div>

              {!hasSearchResults && (
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.10)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPortal(true)}
                  className="mt-1 px-8 py-3 rounded-full border border-white/[0.14] bg-white/[0.06] backdrop-blur-[18px] text-white/80 text-[12px] uppercase tracking-[0.28em] font-medium shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:shadow-[0_4px_32px_rgba(255,255,255,0.07)]"
                >
                  Explore Portal ✦
                </motion.button>
              )}
            </motion.div>

            {/* Results feed */}
            {hasSearchResults && (
              <div className="w-full max-w-2xl px-6 mt-8 pointer-events-auto">
                <NasaSearch
                  results={searchResults}
                  status={searchStatus}
                  errMsg={searchError}
                  onClear={clearSearch}
                  onCardClick={setSelectedCard}
                  sentinelRef={sentinelRef}
                  isEverythingMode={isEverythingMode}
                  isLoadingMore={isLoadingMore}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-30  Everything Portal ── */}
      <AnimatePresence>
        {showPortal && (
          <motion.div key="portal"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowPortal(false)}
                className="flex items-center gap-2 text-white/60 hover:text-white text-[12px] uppercase tracking-widest transition-colors duration-200">
                <span className="text-base leading-none">←</span>
                <span>Back to Cosmos</span>
              </motion.button>

              {/* Language selector inside portal */}
              <div className="relative">
                <button onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.12] bg-white/[0.06] backdrop-blur-[18px] text-white/80 text-[11px] uppercase tracking-[0.15em] hover:bg-white/[0.11] hover:border-white/[0.2] transition-all duration-300">
                  🌐 {language}
                  <span className="text-white/35 text-[9px]">{langOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.94 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/[0.09] bg-[rgba(8,8,14,0.92)] backdrop-blur-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50"
                    >
                      {LANGUAGES.map(lang => (
                        <button key={lang.label} onClick={() => { setLanguage(lang.label); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-[12px] tracking-wide transition-all duration-150
                            ${lang.label === language ? 'text-white bg-white/[0.10] border-l-2 border-white/40' : 'text-white/55 hover:text-white hover:bg-white/[0.06] border-l-2 border-transparent'}`}>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Portal search bar */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="w-full backdrop-blur-[20px] bg-white/[0.07] border border-white/[0.12] rounded-2xl px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] focus-within:border-white/[0.22] focus-within:bg-white/[0.10] transition-all duration-300">
                <input type="text" value={portalQuery} onChange={e => setPortalQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && portalQuery.trim()) {
                      searchAll(portalQuery, 'specific');
                      setShowPortal(false);
                    }
                  }}
                  placeholder="Search everything in the cosmos…"
                  className="w-full bg-transparent outline-none text-white placeholder-white/35 text-[15px] tracking-wide font-light"
                  autoFocus />
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-5 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {PORTAL_TABS.map(tab => (
                  <button key={tab} onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'All') { setShowPortal(false); clearSearch(); }
                    else { searchAll(tab, 'specific'); setShowPortal(false); }
                  }}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-[11px] uppercase tracking-[0.14em] border transition-all duration-300 hover:-translate-y-px
                      ${activeTab === tab
                        ? 'border-white/[0.35] bg-white/[0.13] text-white shadow-[0_2px_12px_rgba(255,255,255,0.06)]'
                        : 'border-white/[0.09] bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.17]'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">

              {/* Cosmic Pix — avatar cards */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-white text-[15px] font-medium tracking-wide" style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Cosmic Pix</h2>
                  <span className="text-white/30 text-[11px] uppercase tracking-[0.18em]">AI Avatars</span>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {AVATARS.map(av => (
                    <AvatarCard
                      key={av.name}
                      name={av.name}
                      subtitle={av.role}
                      image={av.image}
                      onChat={() => openChat(av)}
                    />
                  ))}
                </div>
              </div>

              {/* ── Black Holes ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-white text-[15px] font-medium tracking-wide" style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Black Holes</h2>
                  <span className="text-white/30 text-[11px] uppercase tracking-[0.18em]">Singularities & Event Horizons</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {portalBlackHoles.length > 0
                    ? portalBlackHoles.map(item => (
                        <PortalWikiCard key={item.pageid} item={item}
                          onSelect={() => setSelectedCard({ source: 'wiki', item })} />
                      ))
                    : [...Array(3)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-52 h-44 rounded-xl border border-white/8 bg-white/4 backdrop-blur-md animate-pulse" />
                      ))}
                </div>
              </div>

              {/* ── Equations ── */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="text-white text-[15px] font-medium tracking-wide" style={{ fontFamily: 'var(--app-font-heading)' }}>✦ Equations</h2>
                  <span className="text-white/30 text-[11px] uppercase tracking-[0.18em]">The Language of the Universe</span>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {portalEquations.length > 0
                    ? portalEquations.map(item => (
                        <PortalWikiCard key={item.pageid} item={item}
                          onSelect={() => setSelectedCard({ source: 'wiki', item })} />
                      ))
                    : [...Array(3)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-52 h-44 rounded-xl border border-white/8 bg-white/4 backdrop-blur-md animate-pulse" />
                      ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-[100]  Chat Modal ── */}
      <AnimatePresence>
        {activeChat && (
          <ChatModal
            key={`${activeChat.name}-${chatSharedCtx?.title ?? 'plain'}`}
            avatar={activeChat}
            language={language}
            sharedContext={chatSharedCtx}
            onClose={closeChat}
            onInputFocus={() => setChatInputFocused(true)}
            onInputBlur={() => setChatInputFocused(false)}
          />
        )}
      </AnimatePresence>

      {/* ── z-[200]  NASA Detail Modal ── */}
      <AnimatePresence>
        {selectedCard && (
          <DetailModal
            item={selectedCard}
            onClose={() => setSelectedCard(null)}
            chatAvatars={AVATARS.map(a => ({ name: a.name, image: a.image }))}
            onShareToChat={(avatarName) => {
              const ctx = buildSharedContext(selectedCard);
              setSelectedCard(null);
              openChatWithContext(avatarName, ctx);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
