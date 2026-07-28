// ─── Biology Hub — Feel Nature Discovery Gallery (v3) ────────────────────────
// Perf: hardware-accelerated scroll, memoised cards, minimal Framer re-renders
// Portal: blurred-bg + object-contain so no image is ever cropped
import {
  useState, useRef, useCallback, useEffect, memo,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Leaf, Dna, ChevronDown, ChevronUp,
  Maximize2, X, ArrowUp, ArrowDown, Sparkles,
} from 'lucide-react';
import { natureGalleryData, type NatureCard } from './natureGalleryData';

// ─── Accent palette — 25 entries ────────────────────────────────────────────
const ACCENTS = [
  { rgb: '217,119,87',  hex: '#d97757' }, //  1 terra-cotta
  { rgb: '99,179,221',  hex: '#63b3dd' }, //  2 clinical blue
  { rgb: '180,150,90',  hex: '#b4965a' }, //  3 earthy sand
  { rgb: '245,158,11',  hex: '#f59e0b' }, //  4 amber gold
  { rgb: '196,154,108', hex: '#c49a6c' }, //  5 warm caramel
  { rgb: '220,88,80',   hex: '#dc5850' }, //  6 muscle crimson
  { rgb: '56,189,248',  hex: '#38bdf8' }, //  7 sky teal
  { rgb: '239,68,68',   hex: '#ef4444' }, //  8 arterial red
  { rgb: '52,211,153',  hex: '#34d399' }, //  9 emerald
  { rgb: '168,85,247',  hex: '#a855f7' }, // 10 violet
  { rgb: '251,146,60',  hex: '#fb923c' }, // 11 orange
  { rgb: '20,184,166',  hex: '#14b8a6' }, // 12 teal
  { rgb: '250,204,21',  hex: '#facc15' }, // 13 yellow
  { rgb: '34,211,238',  hex: '#22d3ee' }, // 14 cyan
  { rgb: '163,230,53',  hex: '#a3e635' }, // 15 lime
  { rgb: '129,140,248', hex: '#818cf8' }, // 16 indigo
  { rgb: '74,222,128',  hex: '#4ade80' }, // 17 green
  { rgb: '56,189,248',  hex: '#38bdf8' }, // 18 sky
  { rgb: '251,113,133', hex: '#fb7185' }, // 19 rose
  { rgb: '99,102,241',  hex: '#6366f1' }, // 20 purple
  { rgb: '244,114,182', hex: '#f472b6' }, // 21 pink
  { rgb: '248,113,113', hex: '#f87171' }, // 22 red-light
  { rgb: '45,212,191',  hex: '#2dd4bf' }, // 23 teal-light
  { rgb: '250,189,0',   hex: '#fabd00' }, // 24 golden
  { rgb: '100,210,255', hex: '#64d2ff' }, // 25 aqua
] as const;

const ac = (id: number) => ACCENTS[(id - 1) % ACCENTS.length];

// ─── Shuffle helper ──────────────────────────────────────────────────────────
function shuffleWithFirst(data: NatureCard[], firstId: number): NatureCard[] {
  const rest = [...data].filter(c => c.id !== firstId).sort(() => Math.random() - 0.5);
  const first = data.find(c => c.id === firstId);
  return first ? [first, ...rest] : rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-Screen Reels Portal — blurred bg + object-contain (no cropping)
// ─────────────────────────────────────────────────────────────────────────────
const ReelsPortal = memo(function ReelsPortal({
  data,
  onClose,
}: {
  data: NatureCard[];
  onClose: () => void;
}) {
  const [idx, setIdx]       = useState(0);
  const [dir, setDir]       = useState<1 | -1>(1);
  const [expanded, setExp]  = useState(false);
  const touchY              = useRef<number | null>(null);
  const total               = data.length;

  const go = useCallback((d: 1 | -1) => {
    setDir(d);
    setIdx(p => Math.max(0, Math.min(total - 1, p + d)));
  }, [total]);

  // Reset accordion when card changes
  useEffect(() => { setExp(false); }, [idx]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft')  go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, onClose]);

  // Touch
  const onTouchStart = (e: React.TouchEvent) => { touchY.current = e.touches[0].clientY; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchY.current === null) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
    touchY.current = null;
  };

  const card   = data[idx];
  const accent = ac(card.id);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{ background: '#000', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Ambient glow — accent colour radiates from centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 38%, rgba(${accent.rgb},0.18) 0%, transparent 70%)`,
          transition: 'background 0.55s ease',
        }}
      />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe-top pt-5 pb-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <X size={13} strokeWidth={2.2} /> Exit
        </button>

        {/* Progress pills — max 25, compact */}
        <div className="flex items-center gap-[3px] flex-wrap justify-center max-w-[200px]">
          {data.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === idx ? '16px' : '4px',
                height:     '4px',
                background: i === idx ? accent.hex : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>

        <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {idx + 1}/{total}
        </span>
      </div>

      {/* ── Card area ── */}
      <div className="relative flex-1 flex flex-col min-h-0 px-3 pb-3">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={card.id}
            custom={dir}
            initial={{ opacity: 0, y: (dir as number) * 55 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: (dir as number) * -55 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col min-h-0 rounded-3xl overflow-hidden"
            style={{
              border: `1px solid rgba(${accent.rgb},0.22)`,
              boxShadow: `0 0 55px rgba(${accent.rgb},0.12)`,
            }}
          >
            {/* ── Image area: blurred background + contained foreground ── */}
            <div
              className="relative flex-1 min-h-0 overflow-hidden"
              style={{ background: '#050505' }}
            >
              {/* Blurred fill layer — prevents letterbox black bars looking empty */}
              <img
                src={card.image}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: 'cover',
                  filter: 'blur(24px) brightness(0.35) saturate(1.6)',
                  transform: 'scale(1.1)',
                }}
              />
              {/* Sharp contained layer — no cropping */}
              <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'contain' }}
                loading="eager"
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }}
              />
              {/* Bottom gradient into text panel */}
              <div
                className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
                style={{ background: 'linear-gradient(to top, #080808 0%, transparent 100%)' }}
              />
              {/* Subtitle pill */}
              <div className="absolute bottom-3 left-4">
                <span
                  className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `rgba(${accent.rgb},0.22)`,
                    border: `1px solid rgba(${accent.rgb},0.4)`,
                    color: accent.hex,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {card.subtitle}
                </span>
              </div>
            </div>

            {/* ── Text panel ── */}
            <div className="flex-shrink-0 px-5 pt-3.5 pb-4" style={{ background: '#080808' }}>
              <h2
                className="text-[19px] font-bold tracking-tight mb-1.5 leading-tight"
                style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--app-font-heading)' }}
              >
                {card.title}
              </h2>
              <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.42)' }}>
                {card.description}
              </p>

              {/* Evolution insight */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: `rgba(${accent.rgb},0.07)`,
                  border: `1px solid rgba(${accent.rgb},0.18)`,
                }}
              >
                <button
                  onClick={() => setExp(p => !p)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <Dna size={11} style={{ color: accent.hex, flexShrink: 0 }} strokeWidth={2} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1" style={{ color: accent.hex }}>
                    Evolution Insight
                  </span>
                  {expanded
                    ? <ChevronUp   size={12} style={{ color: `rgba(${accent.rgb},0.6)`, flexShrink: 0 }} />
                    : <ChevronDown size={12} style={{ color: `rgba(${accent.rgb},0.6)`, flexShrink: 0 }} />}
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="px-3 pb-3.5 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {card.evolution}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next buttons — right edge */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {idx > 0 && (
            <button
              onClick={() => go(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowUp size={15} style={{ color: 'rgba(255,255,255,0.65)' }} strokeWidth={2} />
            </button>
          )}
          {idx < total - 1 && (
            <button
              onClick={() => go(1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: `rgba(${accent.rgb},0.16)`,
                border: `1px solid rgba(${accent.rgb},0.32)`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowDown size={15} style={{ color: accent.hex }} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[9px] pb-4 flex-shrink-0 uppercase tracking-[0.2em]"
        style={{ color: 'rgba(255,255,255,0.18)' }}>
        Swipe up / down · Esc to exit
      </p>
    </motion.div>,
    document.body,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Single card (horizontal scroll gallery)
// Wrapped in memo — re-renders only when card/lm changes
// ─────────────────────────────────────────────────────────────────────────────
const NatureCardView = memo(function NatureCardView({
  card, accentIdx, lm, onImmersive,
}: {
  card: NatureCard;
  accentIdx: number;
  lm: boolean;
  onImmersive: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accent = ACCENTS[accentIdx % ACCENTS.length];

  return (
    <div
      className="relative flex-shrink-0 w-72 sm:w-80 snap-start rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: lm ? 'rgba(255,252,248,0.95)' : 'rgba(10,8,4,0.95)',
        border:  lm ? `1px solid rgba(${accent.rgb},0.28)` : `1px solid rgba(${accent.rgb},0.16)`,
        boxShadow: lm
          ? `0 6px 28px rgba(${accent.rgb},0.1), 0 2px 6px rgba(0,0,0,0.05)`
          : `0 6px 36px rgba(${accent.rgb},0.09), 0 2px 10px rgba(0,0,0,0.45)`,
        // Hint the browser this element will transform → own compositor layer
        willChange: 'transform',
        contain: 'content',
      }}
    >
      {/* Image */}
      <div className="relative w-full h-56 sm:h-60 flex-shrink-0 overflow-hidden">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full"
          style={{ objectFit: 'cover', display: 'block' }}
          loading="lazy"
          decoding="async"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{
            background: lm
              ? 'linear-gradient(to top, rgba(255,252,248,1) 0%, transparent 100%)'
              : 'linear-gradient(to top, rgba(10,8,4,1) 0%, transparent 100%)',
          }}
        />
        <div
          className="absolute top-3 left-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `rgba(${accent.rgb},0.82)`, color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {String(card.id).padStart(2, '0')} / {natureGalleryData.length}
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col flex-1 px-4 pt-2 pb-4 gap-2">
        <span
          className="self-start text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `rgba(${accent.rgb},0.12)`,
            border: `1px solid rgba(${accent.rgb},0.26)`,
            color: accent.hex,
          }}
        >
          {card.subtitle}
        </span>

        <h3
          className="text-[14px] font-bold leading-snug tracking-tight"
          style={{
            fontFamily: 'var(--app-font-heading)',
            color: lm ? '#1c1007' : 'rgba(255,255,255,0.92)',
          }}
        >
          {card.title}
        </h3>

        <p
          className="text-[11px] leading-relaxed"
          style={{ color: lm ? 'rgba(28,16,7,0.56)' : 'rgba(255,255,255,0.4)' }}
        >
          {card.description}
        </p>

        {/* Evolution accordion */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: lm ? `rgba(${accent.rgb},0.07)` : `rgba(${accent.rgb},0.08)`,
            border: `1px solid rgba(${accent.rgb},0.2)`,
          }}
        >
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          >
            <Dna size={11} style={{ color: accent.hex, flexShrink: 0 }} strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1" style={{ color: accent.hex }}>
              Evolution Insight
            </span>
            {expanded
              ? <ChevronUp   size={12} style={{ color: `rgba(${accent.rgb},0.55)`, flexShrink: 0 }} strokeWidth={2} />
              : <ChevronDown size={12} style={{ color: `rgba(${accent.rgb},0.55)`, flexShrink: 0 }} strokeWidth={2} />}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  className="px-3 pb-3 text-[11px] leading-relaxed"
                  style={{ color: lm ? 'rgba(28,16,7,0.62)' : 'rgba(255,255,255,0.42)' }}
                >
                  {card.evolution}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Immersive View */}
        <button
          onClick={() => onImmersive(card.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-semibold tracking-wide transition-opacity duration-150 active:opacity-70"
          style={{
            background: lm
              ? `linear-gradient(135deg, rgba(${accent.rgb},0.11), rgba(${accent.rgb},0.05))`
              : `linear-gradient(135deg, rgba(${accent.rgb},0.14), rgba(${accent.rgb},0.05))`,
            border: `1px solid rgba(${accent.rgb},0.32)`,
            color: accent.hex,
            boxShadow: `0 0 14px rgba(${accent.rgb},0.12)`,
          }}
        >
          <Sparkles size={12} strokeWidth={2} />
          Immersive View
          <Maximize2 size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Infinite-loop scroll gallery
// ─────────────────────────────────────────────────────────────────────────────
const CLONE_COUNT = 5;
const REAL_COUNT  = natureGalleryData.length; // 25
const loopData    = [
  ...natureGalleryData.slice(-CLONE_COUNT),
  ...natureGalleryData,
  ...natureGalleryData.slice(0, CLONE_COUNT),
];

const FeelNatureSection = memo(function FeelNatureSection({ lm }: { lm: boolean }) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const activeRef  = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const isJumping  = useRef(false);

  // Reels portal state
  const [reelsData,    setReelsData]    = useState<NatureCard[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openImmersive = useCallback((id: number) => {
    setReelsData(shuffleWithFirst(natureGalleryData, id));
    setIsFullscreen(true);
  }, []);

  // Card width helper
  const cardWidth = useCallback((): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 16 : 0; // gap-4 = 16px
  }, []);

  // Scroll to a loop index (instant or smooth)
  const scrollToLoop = useCallback((loopIdx: number, instant = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: cardWidth() * loopIdx, behavior: instant ? 'instant' as ScrollBehavior : 'smooth' });
  }, [cardWidth]);

  // Init: jump to first real card without animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Small rAF delay so the browser has laid out the cards
    requestAnimationFrame(() => {
      const cw = cardWidth();
      if (cw > 0) el.scrollLeft = cw * CLONE_COUNT;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isJumping.current) return;
    const cw = cardWidth();
    if (!cw) return;

    const loopIdx = Math.round(el.scrollLeft / cw);
    const realIdx = loopIdx - CLONE_COUNT;

    if (realIdx >= 0 && realIdx < REAL_COUNT) {
      if (activeRef.current !== realIdx) {
        activeRef.current = realIdx;
        setActiveIdx(realIdx);
      }
    }

    // Seamless loop: jump when inside clone zone
    if (loopIdx < CLONE_COUNT) {
      isJumping.current = true;
      const target = loopIdx + REAL_COUNT;
      el.scrollLeft = cw * target;
      activeRef.current = target - CLONE_COUNT;
      setActiveIdx(activeRef.current);
      requestAnimationFrame(() => { isJumping.current = false; });
    } else if (loopIdx >= CLONE_COUNT + REAL_COUNT) {
      isJumping.current = true;
      const target = loopIdx - REAL_COUNT;
      el.scrollLeft = cw * target;
      activeRef.current = target - CLONE_COUNT;
      setActiveIdx(activeRef.current);
      requestAnimationFrame(() => { isJumping.current = false; });
    }
  }, [cardWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const arrowNav = useCallback((d: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cw  = cardWidth();
    const cur = Math.round(el.scrollLeft / cw);
    scrollToLoop(cur + d);
  }, [cardWidth, scrollToLoop]);

  const dotClick = useCallback((ri: number) => {
    scrollToLoop(CLONE_COUNT + ri);
    setActiveIdx(ri);
    activeRef.current = ri;
  }, [scrollToLoop]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(217,119,87,0.22))',
            border: '1px solid rgba(245,158,11,0.35)',
          }}
        >
          <Leaf size={13} strokeWidth={1.8} style={{ color: '#f59e0b' }} />
        </div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#78350f' : 'rgba(255,255,255,0.92)' }}
        >
          Feel Nature
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: lm ? 'rgba(120,53,15,0.5)' : 'rgba(245,158,11,0.45)' }}
        >
          Evolutionary Discovery
        </span>
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#f59e0b',
          }}
        >
          {REAL_COUNT} Specimens
        </span>
      </div>

      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl mb-5 px-5 py-3.5 flex items-center gap-3"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(254,243,199,0.7), rgba(255,247,237,0.7))'
            : 'linear-gradient(135deg, rgba(14,10,2,0.9), rgba(10,8,2,0.9))',
          border: lm ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(245,158,11,0.14)',
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.16) 0%, transparent 70%)', filter: 'blur(18px)' }}
        />
        <Leaf size={18} style={{ color: '#f59e0b', flexShrink: 0 }} strokeWidth={1.6} />
        <p className="text-[11px] leading-relaxed relative z-10" style={{ color: lm ? 'rgba(120,53,15,0.65)' : 'rgba(255,255,255,0.38)' }}>
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Scroll horizontally</strong>{' '}
          — the gallery loops endlessly across {REAL_COUNT} specimens. Tap{' '}
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Immersive View</strong>{' '}
          for a randomized full-screen Reels experience.
        </p>
      </div>

      {/* Gallery container */}
      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => arrowNav(-1)}
          className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#f59e0b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </button>

        {/* Right arrow */}
        <button
          onClick={() => arrowNav(1)}
          className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#f59e0b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronRight size={16} strokeWidth={2.2} />
        </button>

        {/* Scrollable loop track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3"
          style={{
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {loopData.map((card, i) => (
            <NatureCardView
              key={`${i}-${card.id}`}
              card={card}
              accentIdx={card.id - 1}
              lm={lm}
              onImmersive={openImmersive}
            />
          ))}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-[5px] mt-4 flex-wrap px-4">
        {natureGalleryData.map((_, i) => (
          <button
            key={i}
            onClick={() => dotClick(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width:      i === activeIdx ? '18px' : '5px',
              height:     '5px',
              background: i === activeIdx
                ? '#f59e0b'
                : lm ? 'rgba(245,158,11,0.22)' : 'rgba(245,158,11,0.18)',
              border: i === activeIdx ? '1px solid rgba(245,158,11,0.45)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Hint */}
      <p
        className="text-center text-[9px] mt-2 uppercase tracking-[0.2em]"
        style={{ color: lm ? 'rgba(120,53,15,0.32)' : 'rgba(245,158,11,0.22)' }}
      >
        {activeIdx + 1} of {REAL_COUNT} · Infinite loop
      </p>

      {/* Portal */}
      <AnimatePresence>
        {isFullscreen && (
          <ReelsPortal data={reelsData} onClose={() => setIsFullscreen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
});

export default FeelNatureSection;
