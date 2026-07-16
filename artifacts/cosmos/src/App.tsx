import { useState } from 'react';
import { motion } from 'framer-motion';

const TAGS = ['Quantum Mechanics', 'General Relativity', 'String Theory', 'Astrophysics'];

export default function App() {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* ── Full-screen Sketchfab background ── */}
      <div className="sketchfab-embed-wrapper absolute inset-0 z-0">
        <iframe
          title="Black Hole"
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen; xr-spatial-tracking"
          // @ts-expect-error – non-standard iframe attributes required by Sketchfab
          mozallowfullscreen="true"
          webkitallowfullscreen="true"
          src="https://sketchfab.com/models/e410da98b1e5445eae2acafaaa53587d/embed?autospin=1&autostart=1&preload=1&ui_infos=0"
        />
      </div>

      {/* ── Frosted-glass UI overlay ── */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
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
