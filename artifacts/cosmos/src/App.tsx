import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

// ─── 6 Cosmic Scenes ─────────────────────────────────────────────────────────
const cosmicScenes = [
  // 1. Black Hole
  "https://sketchfab.com/models/e410da98b1e5445eae2acafaaa53587d/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  // 2. Need some space?
  "https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autostart=1&preload=1&ui_infos=0",
  // 3. Stars Size Comparison
  "https://sketchfab.com/models/a64ff34315e74697b90dfb107109fc64/embed?autostart=1&preload=1",
  // 4. Saturn
  "https://sketchfab.com/models/c09a1970148c43ad99db134a9d6d00b5/embed?autospin=1&autostart=1&preload=1&ui_infos=0",
  // 5. Purple-Striped Jellyfish
  "https://sketchfab.com/models/81be051e683646d3922b2f6e71eafa11/embed?autostart=1&ui_infos=0",
  // 6. Mars
  "https://sketchfab.com/models/25b3f6f993de4f978de290b6e755ba87/embed?autostart=1&preload=1&ui_infos=0",
];

const TAGS = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomIndexExcluding(current: number, length: number): number {
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [focused, setFocused]       = useState(false);
  const [sceneIdx, setSceneIdx]     = useState(() =>
    Math.floor(Math.random() * cosmicScenes.length)
  );
  const overlayControls = useAnimation();

  // Cinematic crossfade swap every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      // Fade to black over 1.5 s
      await overlayControls.start({
        opacity: 1,
        transition: { duration: 1.5, ease: 'easeInOut' },
      });

      // Swap to a different scene
      setSceneIdx((prev) => randomIndexExcluding(prev, cosmicScenes.length));

      // Fade back in over 1.5 s
      await overlayControls.start({
        opacity: 0,
        transition: { duration: 1.5, ease: 'easeInOut' },
      });
    }, 300_000);

    return () => clearInterval(interval);
  }, [overlayControls]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* ── z-0  Full-screen Sketchfab background ── */}
      <div className="absolute inset-0 z-0">
        <iframe
          key={sceneIdx}
          title={`cosmic-scene-${sceneIdx}`}
          src={cosmicScenes[sceneIdx]}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          // @ts-expect-error – non-standard Sketchfab attributes
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
        />
      </div>

      {/* ── z-10  Cinematic black crossfade overlay ── */}
      <motion.div
        className="absolute inset-0 z-10 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={overlayControls}
      />

      {/* ── z-20  Minimalist UI ── */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ y: focused ? -120 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="flex flex-col items-center gap-5 pointer-events-auto px-6 w-full max-w-md"
        >
          {/* Frosted-glass search bar */}
          <div className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-5 py-3.5 shadow-2xl">
            <input
              type="text"
              placeholder="Search the cosmos..."
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full bg-transparent outline-none text-white placeholder-white/50 text-[15px] tracking-wide"
            />
          </div>

          {/* Topic tags */}
          <div className="flex flex-wrap justify-center gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="text-[11px] uppercase tracking-wider text-white/70 backdrop-blur-md bg-white/5 border border-white/10 px-3 py-1.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
