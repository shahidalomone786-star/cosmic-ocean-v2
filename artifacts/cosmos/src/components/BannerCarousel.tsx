/**
 * BannerCarousel — Cinematic auto-sliding space image carousel
 *
 * Features:
 *   • Framer Motion horizontal slide transitions
 *   • Auto-advances every 4 s; pauses on hover & touch
 *   • Glassmorphism progress dot/pill nav at bottom
 *   • Dark 3D glassmorphism card shell
 *   • Next image preloaded in a hidden <link> so transitions are instant
 *   • Fully keyboard-accessible dot buttons
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ── Slide data — high-quality Unsplash space/cosmic images ────────────────────
const SLIDES = [
  {
    src:     'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1600&q=85',
    caption: 'Deep Space',
  },
  {
    src:     'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=85',
    caption: 'Earth from Space',
  },
  {
    src:     'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1600&q=85',
    caption: 'Starfield',
  },
  {
    src:     'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1600&q=85',
    caption: 'Nebula',
  },
  {
    src:     'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=1600&q=85',
    caption: 'Lunar Surface',
  },
  {
    src:     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=85',
    caption: "Earth's Curve",
  },
  {
    src:     'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=1600&q=85',
    caption: 'Milky Way',
  },
  {
    src:     'https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=1600&q=85',
    caption: 'Cosmic Horizon',
  },
] as const;

const TOTAL       = SLIDES.length;
const INTERVAL_MS = 4000;
const SLIDE_DUR   = 0.72; // seconds

// ── Slide transition variants (horizontal) ────────────────────────────────────
const variants = {
  enter: (dir: 1 | -1) => ({
    x:       dir > 0 ? '100%' : '-100%',
    opacity: 0,
    zIndex:  2,
  }),
  center: {
    x:       0,
    opacity: 1,
    zIndex:  2,
  },
  exit: (dir: 1 | -1) => ({
    x:       dir > 0 ? '-100%' : '100%',
    opacity: 0,
    zIndex:  1,
  }),
};

const slideTransition = {
  x:       { type: 'spring' as const, stiffness: 260, damping: 36 },
  opacity: { duration: SLIDE_DUR * 0.6, ease: 'easeInOut' as const },
};

// ─────────────────────────────────────────────────────────────────────────────
function BannerCarousel({ lm: _lm }: { lm?: boolean }) {
  const [idx,    setIdx]    = useState(0);
  const [dir,    setDir]    = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pausedRef    = useRef(paused);
  pausedRef.current  = paused;

  // ── Navigate to a specific slide ─────────────────────────────────────────
  const goTo = useCallback((next: number, direction: 1 | -1 = 1) => {
    setDir(direction);
    setIdx(next);
  }, []);

  const goNext = useCallback(() => {
    setDir(1);
    setIdx(i => (i + 1) % TOTAL);
  }, []);

  // ── Auto-advance timer ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!pausedRef.current) goNext();
    };

    intervalRef.current = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [goNext]);

  // ── Pause handlers ────────────────────────────────────────────────────────
  const pause   = useCallback(() => setPaused(true),  []);
  const resume  = useCallback(() => setPaused(false), []);

  // ── Preload the slide AFTER the current one ───────────────────────────────
  const prefetchSrc = SLIDES[(idx + 1) % TOTAL].src;

  return (
    <div className="mb-6">
      {/* Prefetch next image */}
      <link rel="prefetch" href={prefetchSrc} as="image" />

      {/* ── Card shell ── */}
      <div
        className="relative w-full aspect-video rounded-[2rem] bg-[#050505] border border-white/10 shadow-2xl overflow-hidden"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
        role="region"
        aria-label="Space image carousel"
        aria-roledescription="carousel"
      >
        {/* ── Slides ── */}
        <AnimatePresence initial={false} custom={dir} mode="sync">
          <motion.div
            key={idx}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 w-full h-full"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${TOTAL}: ${SLIDES[idx].caption}`}
          >
            <img
              src={SLIDES[idx].src}
              alt={SLIDES[idx].caption}
              draggable={false}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover select-none"
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Cinematic top/bottom vignette ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'linear-gradient(to bottom,',
              '  rgba(0,0,0,0.28) 0%,',
              '  transparent 22%,',
              '  transparent 68%,',
              '  rgba(0,0,0,0.52) 100%)',
            ].join(' '),
            zIndex: 10,
          }}
        />

        {/* ── Radial edge vignette ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.52) 100%)',
            zIndex: 11,
          }}
        />

        {/* ── Inner border highlight ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-[2rem]"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            zIndex: 20,
          }}
        />

        {/* ── Pause indicator ── */}
        <AnimatePresence>
          {paused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                zIndex: 30,
              }}
            >
              {/* Two vertical bars = pause icon */}
              <span className="flex gap-0.5" aria-hidden="true">
                <span className="w-[2px] h-3 rounded-full bg-white/70" />
                <span className="w-[2px] h-3 rounded-full bg-white/70" />
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 font-medium">Paused</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Caption ── */}
        <motion.div
          key={`caption-${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute bottom-10 left-0 right-0 text-center pointer-events-none"
          style={{ zIndex: 25 }}
          aria-hidden="true"
        >
          <span
            className="text-[11px] uppercase tracking-[0.28em] text-white/55 font-medium px-3 py-1 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.30)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {SLIDES[idx].caption}
          </span>
        </motion.div>

        {/* ── Progress dots ── */}
        <div
          className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2"
          style={{ zIndex: 30 }}
          role="tablist"
          aria-label="Slide navigation"
        >
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === idx}
              aria-label={`Go to slide ${i + 1}: ${slide.caption}`}
              onClick={() => goTo(i, i > idx ? 1 : -1)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-full"
            >
              <motion.span
                className="block rounded-full"
                animate={{
                  width:           i === idx ? 24 : 7,
                  height:          7,
                  backgroundColor: i === idx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.22)',
                }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  backdropFilter: 'blur(8px)',
                  border:         '1px solid rgba(255,255,255,0.18)',
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(BannerCarousel);
