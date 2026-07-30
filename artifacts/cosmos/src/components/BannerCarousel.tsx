/**
 * BannerCarousel — Premium cinematic full-width 16:9 image carousel.
 *
 * Strategy: two stacked layers.
 *   - Base layer:     always shows the CURRENT image at opacity 1. No transition.
 *   - Incoming layer: keyed per transition. Fades in from 0 → 1 with a CSS
 *                     keyframe animation, then unmounts once it's fully opaque.
 *
 * Handoff is seamless: at the exact moment the incoming layer reaches opacity 1,
 * we swap the base layer's src to the same image and remove the incoming layer.
 * Both show identical pixels at that moment → zero visible flash.
 *
 * Only two images are ever in DOM (current + next-incoming).
 * The image AFTER next is preloaded via a hidden <link rel="prefetch"> so the
 * very next transition is always instant.
 */

import { useState, useEffect, useRef, memo } from 'react';

// ── Image list ────────────────────────────────────────────────────────────────
const IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/banner/b${String(i + 1).padStart(2, '0')}.jpg`
);

const SHOW_MS = 3000; // ms each slide stays fully visible before transition
const FADE_MS = 1000; // ms for the crossfade itself

// ── Component ─────────────────────────────────────────────────────────────────
function BannerCarousel({ lm }: { lm?: boolean }) {
  const total = IMAGES.length;

  // `current`  — index of the image rendered in the always-visible base layer
  // `incoming` — index of the image fading in (null when idle)
  const [current,  setCurrent]  = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);

  const t1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Drive the slide cycle whenever `current` changes
  useEffect(() => {
    const nextIdx = (current + 1) % total;

    t1.current = setTimeout(() => {
      // Start the fade-in of the next image
      setIncoming(nextIdx);

      // After the fade completes, snap the base layer forward
      t2.current = setTimeout(() => {
        setCurrent(nextIdx);
        setIncoming(null);
      }, FADE_MS);
    }, SHOW_MS);

    return () => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
    };
  }, [current, total]);

  // Prefetch the slide AFTER the incoming one so it's ready when its turn comes
  const prefetchSrc = IMAGES[(current + 2) % total];

  return (
    <div className="mb-6">
      {/* Invisible prefetch trigger — keeps the *next* next image warm in cache */}
      <link rel="prefetch" href={prefetchSrc} as="image" />

      {/* Outer container: clean 16:9 card */}
      <div
        className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: '#03030e' }}
      >
        {/* ── Base layer ── current image, always visible, no animation */}
        <img
          key={`base-${current}`}
          src={IMAGES[current]}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* ── Incoming layer ── fades in over the base, then unmounts */}
        {incoming !== null && (
          <img
            key={`in-${incoming}`}
            src={IMAGES[incoming]}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-0"
            style={{
              animation: `banner-fade-in ${FADE_MS}ms ease-in-out forwards`,
              willChange: 'opacity',
            }}
          />
        )}

        {/* ── Cinematic top + bottom vignette ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'linear-gradient(to bottom,',
              '  rgba(0,0,0,0.22) 0%,',
              '  transparent 18%,',
              '  transparent 72%,',
              '  rgba(0,0,0,0.35) 100%)',
            ].join(' '),
            zIndex: 10,
          }}
        />

        {/* ── Radial edge vignette for cinematic depth ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.46) 100%)',
            zIndex: 11,
          }}
        />

        {/* ── Ultra-thin glass border inner highlight ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.09)',
            zIndex: 12,
          }}
        />
      </div>
    </div>
  );
}

export default memo(BannerCarousel);
