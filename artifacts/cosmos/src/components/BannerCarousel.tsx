/**
 * BannerCarousel — Premium Apple-level Image Carousel
 * Pure cinematic experience. No overlays. No dots. No text.
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ── 19 local images ────────────────────────────────────────────────────────
const IMAGES: string[] = Array.from(
  { length: 19 },
  (_, i) => `/banner/b${String(i + 1).padStart(2, '0')}.jpg`,
);

const TOTAL       = IMAGES.length;
const INTERVAL_MS = 4000;

// ── Apple-Level Ultra Smooth Transition ──────────────────────────────────────
// Custom cubic-bezier for buttery smooth easing
const TRANSITION = { ease: [0.32, 0.72, 0, 1] as const, duration: 1.5 };

// Added subtle scale and opacity to make the slide feel 3D and premium
const variants = {
  enter: (dir: 1 | -1) => ({ 
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0.4,
    scale: 0.96 
  }),
  center: { 
    x: 0,
    opacity: 1,
    scale: 1 
  },
  exit:  (dir: 1 | -1) => ({ 
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0.4,
    scale: 0.96 
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
function BannerCarousel({ lm: _lm }: { lm?: boolean }) {
  const [idx,    setIdx]    = useState(0);
  const [dir,    setDir]    = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  const pausedRef   = useRef(paused);
  pausedRef.current = paused;

  // Auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setDir(1);
      setIdx(i => (i + 1) % TOTAL);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const pause  = useCallback(() => setPaused(true),  []);
  const resume = useCallback(() => setPaused(false), []);

  // Prefetch next image
  const prefetchSrc = IMAGES[(idx + 1) % TOTAL];

  return (
    <div className="mb-6">
      <link rel="prefetch" href={prefetchSrc} as="image" />

      <div
        className="relative w-full aspect-video rounded-[2rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.9)] bg-[#050505] overflow-hidden"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
        aria-label="Image carousel"
        role="img"
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.img
            key={idx}
            src={IMAGES[idx]}
            alt="Cosmic Banner"
            aria-hidden="true"
            draggable={false}
            loading="eager"
            decoding="async"
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={TRANSITION}
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{ willChange: 'transform, opacity' }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(BannerCarousel);
