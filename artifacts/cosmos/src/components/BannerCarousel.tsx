/**
 * BannerCarousel — Pure cinematic image carousel. No overlays. No dots. No text.
 *
 * • Framer Motion horizontal slide with world-class spring easing
 * • Auto-advances every 4 s; pauses on hover & touch
 * • Next image prefetched so transitions are always instant
 * • Exactly 19 local images served from /public/banner/
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ── 19 uploaded images ────────────────────────────────────────────────────────
const IMAGES: string[] = Array.from(
  { length: 19 },
  (_, i) => `/banner/b${String(i + 1).padStart(2, '0')}.jpg`,
);

const TOTAL       = IMAGES.length;
const INTERVAL_MS = 4000;

// ── Slide variants — pure horizontal with premium cubic easing ────────────────
const TRANSITION = { ease: [0.16, 1, 0.3, 1] as const, duration: 0.9 };

const variants = {
  enter: (dir: 1 | -1) => ({ x: dir > 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  exit:  (dir: 1 | -1) => ({ x: dir > 0 ? '-100%' : '100%' }),
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
        className="relative w-full aspect-video rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden bg-black"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
        aria-label="Image carousel"
        role="img"
      >
        <AnimatePresence initial={false} custom={dir} mode="sync">
          <motion.img
            key={idx}
            src={IMAGES[idx]}
            alt=""
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
            style={{ willChange: 'transform' }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(BannerCarousel);
