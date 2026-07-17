import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import NasaSearch from './components/NasaSearch';

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
const TAGS        = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics'];
const PORTAL_TABS = ['All','Black Holes','Galaxies','String Theory','Avatars','Equations',
                     'Nebulae','Dark Matter','Wormholes','Supernovae','Cosmology','Quantum Field'];
const LANGUAGES   = ['English','Hindi','Hinglish','Japanese','Spanish','French','German','Arabic'];

// ─── Avatar data (stable constant — prevents object recreation on re-render) ──
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
type ChatTarget = { name: string; role: string; image: string };
type Message    = { role: 'user' | 'model'; text: string };

// ─── Per-avatar system instructions ──────────────────────────────────────────
function systemInstruction(name: string, language: string): string {
  const lang = `Always respond in ${language}.`;
  const personas: Record<string, string> = {
    'Albert Einstein':  `You are Albert Einstein. Be philosophical and use thought experiments to explain ideas. Reference your own discoveries naturally. ${lang}`,
    'Richard Feynman':  `You are Richard Feynman. Be enthusiastic and playful. Hate jargon — always use simple, vivid analogies. ${lang}`,
    'Carl Sagan':       `You are Carl Sagan. Be poetic and filled with cosmic wonder. Speak humbly about humanity's place in the universe. ${lang}`,
    'Nikola Tesla':     `You are Nikola Tesla. Be visionary and intense, focused on electricity, energy, and future technology. ${lang}`,
  };
  return personas[name] ?? `You are ${name}. ${lang}`;
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

// ─── Self-contained Chat Modal ────────────────────────────────────────────────
function ChatModal({ avatar, language, onClose, onInputFocus, onInputBlur }: {
  avatar: ChatTarget; language: string; onClose: () => void;
  onInputFocus?: () => void; onInputBlur?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: `Greetings! I am ${avatar.name}. What mysteries of the universe shall we explore today?` },
  ]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState('');
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  // callingRef:   prevents concurrent or double-invoke calls (ref, not state, so it's synchronous)
  // lastSentRef:  timestamp of last successful dispatch — enforces a client-side 3 s cooldown
  const callingRef  = useRef(false);
  const lastSentRef = useRef(0);

  // Auto-scroll to bottom on every new message or loading change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Re-focus input after AI responds
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  // Clear any stale error whenever the active avatar changes
  useEffect(() => {
    setError('');
  }, [avatar.name]);

  const sendMessage = async () => {
    const text = input.trim();

    // Guard 1 — must have text and not already be loading
    if (!text || isLoading) return;
    // Guard 2 — synchronous in-flight lock (immune to render-timing races)
    if (callingRef.current) return;
    // Guard 3 — client-side 3-second cooldown between API calls
    const now = Date.now();
    if (now - lastSentRef.current < 3_000) return;
    callingRef.current  = true;
    lastSentRef.current = now;

    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    try {
      // Build history from all messages except the opening greeting and the new user turn
      const history = messages.slice(1).map(m => ({
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

  return (
    <motion.div
      key="chat-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-[90%] max-w-2xl h-[80vh] bg-black/40 border border-white/20 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0 bg-white/3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src={avatar.image} alt={avatar.name}
              className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-lg" />
            <div>
              <p className="text-white text-[13px] font-medium tracking-wide leading-tight">{avatar.name}</p>
              <p className="text-white/40 text-[10px] uppercase tracking-wider">{avatar.role}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-200 text-lg leading-none">
            ×
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-3">
          {messages.map((msg, idx) =>
            msg.role === 'user' ? (
              <div key={idx} className="flex justify-end">
                <div className="bg-white/10 border border-white/15 backdrop-blur-xl rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[78%]">
                  <p className="text-white text-[13px] leading-relaxed tracking-wide">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={idx} className="flex items-start gap-2.5">
                <img src={avatar.image} alt={avatar.name}
                  className="w-6 h-6 rounded-full object-cover border border-white/15 flex-shrink-0 mt-1" />
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[78%]">
                  <p className="text-white/85 text-[13px] leading-relaxed tracking-wide">{msg.text}</p>
                </div>
              </div>
            )
          )}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <img src={avatar.image} alt={avatar.name}
                className="w-6 h-6 rounded-full object-cover border border-white/15 flex-shrink-0 mt-1" />
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm">
                <ThinkingDots />
              </div>
            </div>
          )}

          {error && (
            <p className="text-center text-red-400/80 text-[11px] tracking-wide py-1">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-white/10 bg-white/3">
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
              className="flex-1 bg-white/5 border border-white/20 rounded-full px-5 py-2.5 text-white text-[13px] placeholder-white/30 outline-none focus:border-white/35 focus:bg-white/8 disabled:opacity-40 transition-all duration-200 tracking-wide"
            />
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.07 }}
              whileTap={{ scale: isLoading ? 1 : 0.93 }}
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <span className="text-base leading-none">↑</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Glassmorphism Avatar Card (memo = skip re-render when App state changes) ─
const AvatarCard = memo(function AvatarCard({ name, subtitle, image, onChat }: {
  name: string; subtitle: string; image?: string; onChat: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative flex-shrink-0 w-44 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer group"
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
  const [appMode,     setAppMode]    = useState<'chat' | 'nasa'>('chat');
  const [focused,     setFocused]    = useState(false);
  const [showPortal,  setShowPortal] = useState(false);
  const [language,    setLanguage]   = useState('English');
  const [langOpen,    setLangOpen]   = useState(false);
  const [activeTab,   setActiveTab]  = useState('All');
  const [portalQuery, setPortalQuery]= useState('');
  const [activeChat,       setActiveChat]       = useState<ChatTarget | null>(null);
  const [chatInputFocused, setChatInputFocused] = useState(false);
  const [sceneIdx,         setSceneIdx]         = useState(() => Math.floor(Math.random() * cosmicScenes.length));
  const overlayControls = useAnimation();
  const bgIframeRef = useRef<HTMLIFrameElement>(null);

  // ── Derived: is any UI interaction happening? ──────────────────────────────
  const isAnimationPaused = focused || showPortal || langOpen || activeChat !== null || chatInputFocused;

  // ── Pause/resume Sketchfab via postMessage when interaction state changes ──
  useEffect(() => {
    const iframe = bgIframeRef.current;
    if (!iframe) return;
    const method = isAnimationPaused ? 'pause' : 'play';
    // Sketchfab's viewer API accepts postMessage commands after it initialises.
    // We send both to '*' and the sketchfab.com origin for compatibility.
    try {
      iframe.contentWindow?.postMessage(JSON.stringify({ method }), '*');
      iframe.contentWindow?.postMessage(JSON.stringify({ method }), 'https://sketchfab.com');
    } catch { /* cross-origin silently ignored */ }
  }, [isAnimationPaused]);

  // ── Scene rotation timer — paused whenever any UI interaction is active ────
  useEffect(() => {
    if (isAnimationPaused) return;

    const interval = setInterval(async () => {
      await overlayControls.start({ opacity: 1, transition: { duration: 1.5, ease: 'easeInOut' } });
      setSceneIdx(prev => randomIndexExcluding(prev, cosmicScenes.length));
      await overlayControls.start({ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } });
    }, 300_000);
    return () => clearInterval(interval);
  }, [overlayControls, isAnimationPaused]);

  // ── Stable chat-open callbacks (useCallback = same reference across renders) ─
  const closeChat = useCallback(() => setActiveChat(null), []);

  // One stable handler; each AvatarCard passes its own avatar object from the
  // AVATARS constant (never recreated), so the inline arrow below is the only
  // new allocation — and memo on AvatarCard skips the child re-render anyway.
  const openChat = useCallback((avatar: ChatTarget) => setActiveChat(avatar), []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* ── z-0  Full-screen Sketchfab background ── */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-auto flex items-center justify-center">
        <iframe
          key={sceneIdx}
          ref={bgIframeRef}
          title="Cosmic Background"
          src={cosmicScenes[sceneIdx]}
          className="absolute w-[110vw] h-[120vh] border-none pointer-events-auto"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          // @ts-expect-error – non-standard Sketchfab attributes
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

      {/* ── z-11  Dramatic freeze overlay — appears when any UI is active ── */}
      <motion.div
        className="absolute inset-0 z-11 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isAnimationPaused ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ backdropFilter: isAnimationPaused ? 'blur(2px)' : 'blur(0px)', background: 'rgba(0,0,0,0.45)' }}
      />

      {/* ── z-50  Tab switcher — always above everything, never conditional ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full p-1 shadow-2xl">
        {(['chat', 'nasa'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setAppMode(mode)}
            className={`px-5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
              appMode === mode
                ? 'bg-white/20 text-white shadow-inner'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {mode === 'chat' ? '✦ Cosmic Chat' : '🛸 NASA Archive'}
          </button>
        ))}
      </div>

      {/* ── z-40  NASA Search panel — rendered only in nasa mode ── */}
      {appMode === 'nasa' && <NasaSearch />}

      {/* ── z-20  Main cinematic UI ── */}
      <AnimatePresence>
        {appMode === 'chat' && !showPortal && (
          <motion.div key="main-ui"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ y: focused ? -120 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="flex flex-col items-center gap-5 pointer-events-auto px-6 w-full max-w-md"
            >
              <div className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-5 py-3.5 shadow-2xl">
                <input type="text" placeholder="Search the cosmos..."
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  className="w-full bg-transparent outline-none text-white placeholder-white/50 text-[15px] tracking-wide" />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {TAGS.map(tag => (
                  <span key={tag}
                    className="text-[11px] uppercase tracking-wider text-white/70 backdrop-blur-md bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.10)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPortal(true)}
                className="mt-1 px-7 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl text-white/80 text-[12px] uppercase tracking-[0.25em] font-medium shadow-lg transition-colors duration-300"
              >
                Everything ✦
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-30  Everything Portal ── */}
      <AnimatePresence>
        {appMode === 'chat' && showPortal && (
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

              <div className="relative">
                <button onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl text-white/70 text-[11px] uppercase tracking-wider hover:bg-white/10 transition-colors duration-200">
                  🌐 {language}
                  <span className="text-white/40">{langOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }} transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-36 rounded-xl border border-white/10 bg-black/80 backdrop-blur-2xl overflow-hidden shadow-2xl z-50"
                    >
                      {LANGUAGES.map(lang => (
                        <button key={lang} onClick={() => { setLanguage(lang); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[12px] tracking-wide transition-colors duration-150
                            ${lang === language ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                          {lang}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Portal search bar */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="w-full backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl px-5 py-3.5 shadow-xl">
                <input type="text" value={portalQuery} onChange={e => setPortalQuery(e.target.value)}
                  placeholder="Search everything in the cosmos..."
                  className="w-full bg-transparent outline-none text-white placeholder-white/40 text-[15px] tracking-wide"
                  autoFocus />
              </div>
            </div>

            {/* Scrollable tabs */}
            <div className="px-5 pb-5 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {PORTAL_TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider border transition-all duration-200
                      ${activeTab === tab
                        ? 'border-white/40 bg-white/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/8'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">

              {/* Cosmic Pix — lazy-stable avatar cards */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-white text-[15px] font-medium tracking-wide">✦ Cosmic Pix</h2>
                  <span className="text-white/30 text-[11px] uppercase tracking-wider">AI Avatars</span>
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

              {/* Placeholder rows */}
              {[
                { label: '✦ Black Holes', sub: 'Singularities & Event Horizons' },
                { label: '✦ Equations',   sub: 'The Language of the Universe' },
              ].map(({ label, sub }) => (
                <div key={label} className="mb-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <h2 className="text-white text-[15px] font-medium tracking-wide">{label}</h2>
                    <span className="text-white/30 text-[11px] uppercase tracking-wider">{sub}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i}
                        className="flex-shrink-0 w-40 h-24 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md bg-gradient-to-br from-white/5 to-transparent flex items-end p-3">
                        <div className="w-full h-1.5 rounded-full bg-white/10" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── z-[100]  Chat Modal — only mounts when activeChat is truly set ── */}
      <AnimatePresence>
        {appMode === 'chat' && activeChat && (
          <ChatModal
            avatar={activeChat}
            language={language}
            onClose={closeChat}
            onInputFocus={() => setChatInputFocused(true)}
            onInputBlur={() => setChatInputFocused(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
