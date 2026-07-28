// ─── Biology Hub — Feel Nature Discovery Gallery (v2) ────────────────────────
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

// ─── Per-card accent palette (16 entries) ────────────────────────────────────
const ACCENTS: { rgb: string; hex: string }[] = [
  { rgb: '217,119,87',  hex: '#d97757' }, //  1 Facial — terra-cotta
  { rgb: '99,179,221',  hex: '#63b3dd' }, //  2 Skull  — clinical blue
  { rgb: '180,150,90',  hex: '#b4965a' }, //  3 March  — earthy sand
  { rgb: '245,158,11',  hex: '#f59e0b' }, //  4 Lion   — amber gold
  { rgb: '196,154,108', hex: '#c49a6c' }, //  5 Corgi  — warm caramel
  { rgb: '220,88,80',   hex: '#dc5850' }, //  6 Anatomy— muscle crimson
  { rgb: '56,189,248',  hex: '#38bdf8' }, //  7 Eye    — sky teal
  { rgb: '239,68,68',   hex: '#ef4444' }, //  8 Heart  — arterial red
  { rgb: '52,211,153',  hex: '#34d399' }, //  9 Blueprint — emerald
  { rgb: '168,85,247',  hex: '#a855f7' }, // 10 Duality — violet
  { rgb: '251,146,60',  hex: '#fb923c' }, // 11 Core   — orange
  { rgb: '20,184,166',  hex: '#14b8a6' }, // 12 Engine — teal
  { rgb: '250,204,21',  hex: '#facc15' }, // 13 Symphony — yellow
  { rgb: '34,211,238',  hex: '#22d3ee' }, // 14 Ocean  — cyan
  { rgb: '163,230,53',  hex: '#a3e635' }, // 15 Plants — lime
  { rgb: '129,140,248', hex: '#818cf8' }, // 16 Observer — indigo
];

const accent = (i: number) => ACCENTS[i % ACCENTS.length] ?? ACCENTS[0];

// ─── Shuffle helper — puts `firstId` at index 0, rest random ─────────────────
function shuffleWithFirst(data: NatureCard[], firstId: number): NatureCard[] {
  const rest = data.filter(c => c.id !== firstId).sort(() => Math.random() - 0.5);
  const first = data.find(c => c.id === firstId);
  return first ? [first, ...rest] : [...rest];
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-Screen Reels Portal
// ─────────────────────────────────────────────────────────────────────────────
function ReelsPortal({
  data,
  onClose,
}: {
  data: NatureCard[];
  onClose: () => void;
}) {
  const [idx, setIdx]     = useState(0);
  const [dir, setDir]     = useState<1 | -1>(1);
  const touchStartY       = useRef<number | null>(null);
  const containerRef      = useRef<HTMLDivElement>(null);

  const total = data.length;
  const go    = useCallback((delta: 1 | -1) => {
    setDir(delta);
    setIdx(prev => Math.max(0, Math.min(total - 1, prev + delta)));
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  go(-1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [go, onClose]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
    touchStartY.current = null;
  };

  const card = data[idx];
  const ac   = accent(card.id - 1);
  const [expanded, setExpanded] = useState(false);

  // Reset expanded when card changes
  useEffect(() => setExpanded(false), [idx]);

  return createPortal(
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Ambient glow behind image ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, rgba(${ac.rgb},0.14) 0%, transparent 70%)`,
          transition: 'background 0.6s ease',
        }}
      />

      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <X size={13} strokeWidth={2.2} />
          Exit
        </button>

        {/* Progress pills */}
        <div className="flex items-center gap-1">
          {data.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === idx ? '18px' : '5px',
                height:     '5px',
                background: i === idx ? ac.hex : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {idx + 1} / {total}
        </span>
      </div>

      {/* ── Main card ── */}
      <div className="relative flex-1 flex flex-col min-h-0 px-4 pb-4">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={card.id}
            custom={dir}
            initial={{ opacity: 0, y: dir * 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir * -60 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col min-h-0 rounded-3xl overflow-hidden"
            style={{
              border: `1px solid rgba(${ac.rgb},0.25)`,
              boxShadow: `0 0 60px rgba(${ac.rgb},0.12), 0 8px 40px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Image — fills most of the space */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover"
                loading="eager"
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
              />
              {/* Bottom gradient */}
              <div
                className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)' }}
              />

              {/* Subtitle pill — bottom left of image */}
              <div className="absolute bottom-4 left-4">
                <span
                  className="text-[9px] uppercase tracking-[0.2em] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: `rgba(${ac.rgb},0.25)`,
                    border: `1px solid rgba(${ac.rgb},0.4)`,
                    color: ac.hex,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {card.subtitle}
                </span>
              </div>
            </div>

            {/* Text panel */}
            <div
              className="flex-shrink-0 px-5 pt-4 pb-5"
              style={{ background: 'rgba(4,4,8,0.97)' }}
            >
              <h2
                className="text-[20px] font-bold tracking-tight mb-2 leading-tight"
                style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--app-font-heading)' }}
              >
                {card.title}
              </h2>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {card.description}
              </p>

              {/* Evolution insight accordion */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: `rgba(${ac.rgb},0.07)`,
                  border: `1px solid rgba(${ac.rgb},0.2)`,
                }}
              >
                <button
                  onClick={() => setExpanded(p => !p)}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5"
                >
                  <Dna size={11} style={{ color: ac.hex, flexShrink: 0 }} strokeWidth={2} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1 text-left" style={{ color: ac.hex }}>
                    Evolution Insight
                  </span>
                  {expanded
                    ? <ChevronUp   size={12} style={{ color: `rgba(${ac.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />
                    : <ChevronDown size={12} style={{ color: `rgba(${ac.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />}
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
                      <p className="px-3.5 pb-3.5 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                        {card.evolution}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Prev / Next arrows ── */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          {idx > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => go(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowUp size={15} style={{ color: 'rgba(255,255,255,0.7)' }} strokeWidth={2} />
            </motion.button>
          )}
          {idx < total - 1 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
              onClick={() => go(1)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: `rgba(${ac.rgb},0.18)`,
                border: `1px solid rgba(${ac.rgb},0.35)`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <ArrowDown size={15} style={{ color: ac.hex }} strokeWidth={2} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Swipe hint */}
      <p
        className="text-center text-[9px] pb-4 uppercase tracking-[0.2em]"
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        Swipe up / down to navigate · Esc to exit
      </p>
    </motion.div>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single gallery card (horizontal scroll view)
// ─────────────────────────────────────────────────────────────────────────────
function NatureCardView({
  card, index, lm, onImmersive,
}: {
  card: NatureCard;
  index: number;
  lm: boolean;
  onImmersive: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ac = accent(index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: (index % 8) * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 w-72 sm:w-80 snap-start rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: lm ? 'rgba(255,252,248,0.95)' : 'rgba(10,8,4,0.95)',
        border:     lm
          ? `1px solid rgba(${ac.rgb},0.3)`
          : `1px solid rgba(${ac.rgb},0.18)`,
        boxShadow: lm
          ? `0 8px 32px rgba(${ac.rgb},0.12), 0 2px 8px rgba(0,0,0,0.06)`
          : `0 8px 40px rgba(${ac.rgb},0.1), 0 2px 12px rgba(0,0,0,0.5)`,
      }}
    >
      {/* ── Image ── */}
      <div className="relative w-full h-56 sm:h-60 flex-shrink-0 overflow-hidden">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{
            background: lm
              ? 'linear-gradient(to top, rgba(255,252,248,1) 0%, rgba(255,252,248,0) 100%)'
              : 'linear-gradient(to top, rgba(10,8,4,1) 0%, rgba(10,8,4,0) 100%)',
          }}
        />
        <div
          className="absolute top-3 left-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `rgba(${ac.rgb},0.85)`,
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          {String(card.id).padStart(2, '0')} / {natureGalleryData.length}
        </div>
      </div>

      {/* ── Text panel ── */}
      <div className="flex flex-col flex-1 px-4 pt-1 pb-4 gap-2.5">
        {/* Subtitle pill */}
        <span
          className="self-start text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `rgba(${ac.rgb},0.13)`,
            border: `1px solid rgba(${ac.rgb},0.28)`,
            color: ac.hex,
          }}
        >
          {card.subtitle}
        </span>

        {/* Title */}
        <h3
          className="text-[15px] font-bold leading-snug tracking-tight"
          style={{
            fontFamily: 'var(--app-font-heading)',
            color: lm ? '#1c1007' : 'rgba(255,255,255,0.92)',
          }}
        >
          {card.title}
        </h3>

        {/* Description */}
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: lm ? 'rgba(28,16,7,0.58)' : 'rgba(255,255,255,0.42)' }}
        >
          {card.description}
        </p>

        {/* Evolution insight */}
        <div
          className="rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            background: lm ? `rgba(${ac.rgb},0.07)` : `rgba(${ac.rgb},0.08)`,
            border: `1px solid rgba(${ac.rgb},0.2)`,
          }}
        >
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          >
            <Dna size={11} style={{ color: ac.hex, flexShrink: 0 }} strokeWidth={2} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1"
              style={{ color: ac.hex }}
            >
              Evolution Insight
            </span>
            {expanded
              ? <ChevronUp   size={12} style={{ color: `rgba(${ac.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />
              : <ChevronDown size={12} style={{ color: `rgba(${ac.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  className="px-3 pb-3 text-[11px] leading-relaxed"
                  style={{ color: lm ? 'rgba(28,16,7,0.65)' : 'rgba(255,255,255,0.45)' }}
                >
                  {card.evolution}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Immersive View button ── */}
        <button
          onClick={() => onImmersive(card.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-semibold tracking-wide transition-all duration-200 active:scale-95"
          style={{
            background: lm
              ? `linear-gradient(135deg, rgba(${ac.rgb},0.12), rgba(${ac.rgb},0.06))`
              : `linear-gradient(135deg, rgba(${ac.rgb},0.14), rgba(${ac.rgb},0.06))`,
            border: `1px solid rgba(${ac.rgb},0.35)`,
            color: ac.hex,
            boxShadow: `0 0 16px rgba(${ac.rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <Sparkles size={12} strokeWidth={2} />
          Immersive View
          <Maximize2 size={11} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main FeelNatureSection — with infinite loop + portal
// ─────────────────────────────────────────────────────────────────────────────

// Build a looping array: [...tail clone, ...real cards, ...head clone]
const CLONE_COUNT    = 4;
const REAL_COUNT     = natureGalleryData.length;
const headClones     = natureGalleryData.slice(0, CLONE_COUNT);
const tailClones     = natureGalleryData.slice(-CLONE_COUNT);
const loopData       = [...tailClones, ...natureGalleryData, ...headClones];
// Real cards start at index CLONE_COUNT inside loopData

const FeelNatureSection = memo(({ lm }: { lm: boolean }) => {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0); // 0-based into real cards
  const isJumping   = useRef(false);

  // ── Immersive / fullscreen state ──
  const [reelsData, setReelsData]       = useState<NatureCard[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openImmersive = useCallback((cardId: number) => {
    setReelsData(shuffleWithFirst(natureGalleryData, cardId));
    setIsFullscreen(true);
  }, []);

  // ── Scroll logic with infinite loop jump ──
  const getCardWidth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const firstCard = el.firstElementChild as HTMLElement | null;
    return firstCard ? firstCard.offsetWidth + 16 : 0;
  }, []);

  // Scroll to a given position in loopData
  const scrollToLoopIdx = useCallback((loopIdx: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = getCardWidth();
    el.scrollTo({ left: cardW * loopIdx, behavior });
  }, [getCardWidth]);

  // Initialize: jump (no animation) to the first real card position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = getCardWidth();
    if (cardW > 0) {
      el.scrollLeft = cardW * CLONE_COUNT;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isJumping.current) return;
    const cardW = getCardWidth();
    if (!cardW) return;

    const loopIdx = Math.round(el.scrollLeft / cardW);
    // Update active dot (mapped to real card)
    const realIdx = loopIdx - CLONE_COUNT;
    if (realIdx >= 0 && realIdx < REAL_COUNT) {
      setActiveIdx(realIdx);
    }

    // Seamless jump when entering clone zones
    if (loopIdx < CLONE_COUNT) {
      // Entered tail clone — jump to real tail
      isJumping.current = true;
      const jumpTo = loopIdx + REAL_COUNT;
      el.scrollLeft = cardW * jumpTo;
      setActiveIdx(jumpTo - CLONE_COUNT);
      requestAnimationFrame(() => { isJumping.current = false; });
    } else if (loopIdx >= CLONE_COUNT + REAL_COUNT) {
      // Entered head clone — jump to real head
      isJumping.current = true;
      const jumpTo = loopIdx - REAL_COUNT;
      el.scrollLeft = cardW * jumpTo;
      setActiveIdx(jumpTo - CLONE_COUNT);
      requestAnimationFrame(() => { isJumping.current = false; });
    }
  }, [getCardWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Arrow navigation — scrolls within loopData
  const arrowNav = useCallback((delta: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = getCardWidth();
    const cur = Math.round(el.scrollLeft / cardW);
    scrollToLoopIdx(cur + delta);
  }, [getCardWidth, scrollToLoopIdx]);

  // Dot click — jump to real card
  const dotClick = useCallback((realIdx: number) => {
    scrollToLoopIdx(CLONE_COUNT + realIdx);
    setActiveIdx(realIdx);
  }, [scrollToLoopIdx]);

  return (
    <div>
      {/* ── Section header ── */}
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
          style={{
            fontFamily: 'var(--app-font-heading)',
            color: lm ? '#78350f' : 'rgba(255,255,255,0.92)',
          }}
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

      {/* ── Hero description ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl mb-5 px-5 py-3.5 flex items-center gap-3"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(254,243,199,0.7) 0%, rgba(255,247,237,0.7) 100%)'
            : 'linear-gradient(135deg, rgba(14,10,2,0.9) 0%, rgba(10,8,2,0.9) 100%)',
          border: lm ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(245,158,11,0.15)',
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)', filter: 'blur(18px)' }}
        />
        <Leaf size={18} style={{ color: '#f59e0b', flexShrink: 0 }} strokeWidth={1.6} />
        <p
          className="text-[11px] leading-relaxed relative z-10"
          style={{ color: lm ? 'rgba(120,53,15,0.65)' : 'rgba(255,255,255,0.38)' }}
        >
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Scroll horizontally</strong>{' '}
          to explore {REAL_COUNT} specimens — the gallery loops infinitely. Tap{' '}
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Immersive View</strong>{' '}
          on any card for a randomized full-screen Reels experience.
        </p>
      </motion.div>

      {/* ── Gallery ── */}
      <div className="relative">
        {/* Left arrow */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => arrowNav(-1)}
          className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#f59e0b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronLeft size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Right arrow */}
        <motion.button
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => arrowNav(1)}
          className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245,158,11,0.3)',
            color: '#f59e0b',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronRight size={16} strokeWidth={2.2} />
        </motion.button>

        {/* Scrollable cards — loopData */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {loopData.map((card, i) => {
            // Map loop index back to a real accent index
            const realAccentIdx = (card.id - 1);
            return (
              <NatureCardView
                key={`${card.id}-${i}`}
                card={card}
                index={realAccentIdx}
                lm={lm}
                onImmersive={openImmersive}
              />
            );
          })}
        </div>
      </div>

      {/* ── Progress dots (real cards only) ── */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        {natureGalleryData.map((_, i) => (
          <button
            key={i}
            onClick={() => dotClick(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width:      i === activeIdx ? '20px' : '6px',
              height:     '6px',
              background: i === activeIdx
                ? '#f59e0b'
                : lm ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
              border: i === activeIdx ? '1px solid rgba(245,158,11,0.5)' : 'none',
            }}
          />
        ))}
      </div>

      {/* ── Scroll hint ── */}
      <p
        className="text-center text-[9px] mt-2 uppercase tracking-[0.2em]"
        style={{ color: lm ? 'rgba(120,53,15,0.35)' : 'rgba(245,158,11,0.25)' }}
      >
        {activeIdx + 1} of {REAL_COUNT} · Infinite loop
      </p>

      {/* ── Full-Screen Reels Portal ── */}
      <AnimatePresence>
        {isFullscreen && (
          <ReelsPortal
            data={reelsData}
            onClose={() => setIsFullscreen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

FeelNatureSection.displayName = 'FeelNatureSection';
export default FeelNatureSection;
