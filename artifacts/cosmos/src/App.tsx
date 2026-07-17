import { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

// ─── 6 Cosmic Scenes (untouched) ─────────────────────────────────────────────
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

function randomIndexExcluding(current: number, length: number): number {
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

// ─── Glassmorphism Avatar Card ────────────────────────────────────────────────
function AvatarCard({ name, subtitle, gradient, image }: { name: string; subtitle: string; gradient: string; image?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative flex-shrink-0 w-44 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer group"
    >
      {/* Photo or abstract gradient avatar */}
      <div className="w-full h-36 relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full ${gradient} flex items-center justify-center relative`}>
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
            <span className="text-4xl font-thin text-white/80 select-none z-10">
              {name.split(' ').map((w: string) => w[0]).join('')}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="text-white text-sm font-medium tracking-wide truncate">{name}</p>
        <p className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5 truncate">{subtitle}</p>
        <div className="mt-2.5 flex gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Chat
          </span>
          <span className="text-[9px] uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Explore
          </span>
        </div>
      </div>

      {/* Hover shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [focused,     setFocused]     = useState(false);
  const [showPortal,  setShowPortal]  = useState(false);
  const [language,    setLanguage]    = useState('English');
  const [langOpen,    setLangOpen]    = useState(false);
  const [activeTab,   setActiveTab]   = useState('All');
  const [portalQuery, setPortalQuery] = useState('');
  const [sceneIdx,    setSceneIdx]    = useState(() =>
    Math.floor(Math.random() * cosmicScenes.length)
  );
  const overlayControls = useAnimation();

  // 5-minute cinematic crossfade swap (untouched)
  useEffect(() => {
    const interval = setInterval(async () => {
      await overlayControls.start({ opacity: 1, transition: { duration: 1.5, ease: 'easeInOut' } });
      setSceneIdx(prev => randomIndexExcluding(prev, cosmicScenes.length));
      await overlayControls.start({ opacity: 0, transition: { duration: 1.5, ease: 'easeInOut' } });
    }, 300_000);
    return () => clearInterval(interval);
  }, [overlayControls]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* ── z-0  Full-screen Sketchfab background — 110vw×120vh pushes bottom controls off-screen ── */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black pointer-events-auto flex items-center justify-center">
        <iframe
          key={sceneIdx}
          title="Cosmic Background"
          src={cosmicScenes[sceneIdx]}
          className="absolute w-[110vw] h-[120vh] border-none pointer-events-auto"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          // @ts-expect-error – non-standard Sketchfab / iframe attributes
          xr-spatial-tracking="true"
          execution-while-out-of-viewport="true"
          execution-while-not-rendered="true"
          web-share="true"
        />
      </div>

      {/* ── z-10  Cinematic black crossfade overlay (untouched) ── */}
      <motion.div
        className="absolute inset-0 z-10 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={overlayControls}
      />

      {/* ── z-20  Main cinematic UI ── */}
      <AnimatePresence>
        {!showPortal && (
          <motion.div
            key="main-ui"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              animate={{ y: focused ? -120 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="flex flex-col items-center gap-5 pointer-events-auto px-6 w-full max-w-md"
            >
              {/* Search bar */}
              <div className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-5 py-3.5 shadow-2xl">
                <input
                  type="text"
                  placeholder="Search the cosmos..."
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full bg-transparent outline-none text-white placeholder-white/50 text-[15px] tracking-wide"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap justify-center gap-2">
                {TAGS.map(tag => (
                  <span key={tag}
                    className="text-[11px] uppercase tracking-wider text-white/70 backdrop-blur-md bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              {/* EVERYTHING button */}
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
        {showPortal && (
          <motion.div
            key="portal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              {/* Back button */}
              <motion.button
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPortal(false)}
                className="flex items-center gap-2 text-white/60 hover:text-white text-[12px] uppercase tracking-widest transition-colors duration-200"
              >
                <span className="text-base leading-none">←</span>
                <span>Back to Cosmos</span>
              </motion.button>

              {/* Language dropdown */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen(o => !o)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl text-white/70 text-[11px] uppercase tracking-wider hover:bg-white/10 transition-colors duration-200"
                >
                  🌐 {language}
                  <span className="text-white/40">{langOpen ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-36 rounded-xl border border-white/10 bg-black/80 backdrop-blur-2xl overflow-hidden shadow-2xl z-50"
                    >
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          onClick={() => { setLanguage(lang); setLangOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[12px] tracking-wide transition-colors duration-150
                            ${lang === language
                              ? 'text-white bg-white/10'
                              : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          {lang}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Portal search bar ── */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="w-full backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl px-5 py-3.5 shadow-xl">
                <input
                  type="text"
                  value={portalQuery}
                  onChange={e => setPortalQuery(e.target.value)}
                  placeholder="Search everything in the cosmos..."
                  className="w-full bg-transparent outline-none text-white placeholder-white/40 text-[15px] tracking-wide"
                  autoFocus
                />
              </div>
            </div>

            {/* ── Scrollable tabs ── */}
            <div className="px-5 pb-5 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {PORTAL_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider border transition-all duration-200
                      ${activeTab === tab
                        ? 'border-white/40 bg-white/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/8'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">

              {/* Cosmic Pix section */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-white text-[15px] font-medium tracking-wide">✦ Cosmic Pix</h2>
                  <span className="text-white/30 text-[11px] uppercase tracking-wider">AI Avatars</span>
                </div>

                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  <AvatarCard
                    name="Albert Einstein"
                    subtitle="Theoretical Physicist"
                    gradient=""
                    image="https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg"
                  />
                  <AvatarCard
                    name="Richard Feynman"
                    subtitle="Quantum Pioneer"
                    gradient=""
                    image="https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg"
                  />
                  <AvatarCard
                    name="Carl Sagan"
                    subtitle="Cosmos Explorer"
                    gradient=""
                    image="https://cdn.britannica.com/15/116415-050-61A601A9/Carl-Sagan.jpg"
                  />
                  <AvatarCard
                    name="Nikola Tesla"
                    subtitle="Electrical Visionary"
                    gradient=""
                    image="https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg"
                  />
                </div>
              </div>

              {/* Placeholder content rows */}
              {[
                { label: '✦ Black Holes', sub: 'Singularities & Event Horizons' },
                { label: '✦ Equations', sub: 'The Language of the Universe' },
              ].map(({ label, sub }) => (
                <div key={label} className="mb-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <h2 className="text-white text-[15px] font-medium tracking-wide">{label}</h2>
                    <span className="text-white/30 text-[11px] uppercase tracking-wider">{sub}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i}
                        className="flex-shrink-0 w-40 h-24 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md
                          bg-gradient-to-br from-white/5 to-transparent flex items-end p-3">
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

    </div>
  );
}
