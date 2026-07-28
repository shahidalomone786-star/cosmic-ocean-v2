// ─── Biology Hub — Feel Nature Discovery Gallery ─────────────────────────────
import {
  useState, useRef, useCallback, useEffect, memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Leaf, Dna, ChevronDown, ChevronUp } from 'lucide-react';
import { natureGalleryData, type NatureCard } from './natureGalleryData';

// Per-card accent palette — warm, organic tones pulled from each image's mood
const ACCENTS: { rgb: string; hex: string }[] = [
  { rgb: '217,119,87',  hex: '#d97757' }, // 1 Facial — terra-cotta
  { rgb: '99,179,221',  hex: '#63b3dd' }, // 2 Skull   — clinical blue
  { rgb: '180,150,90',  hex: '#b4965a' }, // 3 March   — earthy sand
  { rgb: '245,158,11',  hex: '#f59e0b' }, // 4 Lion    — amber gold
  { rgb: '196,154,108', hex: '#c49a6c' }, // 5 Corgi   — warm caramel
  { rgb: '220,88,80',   hex: '#dc5850' }, // 6 Anatomy — muscle crimson
  { rgb: '56,189,248',  hex: '#38bdf8' }, // 7 Eye     — sky teal
  { rgb: '239,68,68',   hex: '#ef4444' }, // 8 Heart   — arterial red
];

// ─── Single gallery card ──────────────────────────────────────────────────────
function NatureCardView({
  card, index, lm,
}: { card: NatureCard; index: number; lm: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const accent = ACCENTS[index] ?? ACCENTS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex-shrink-0 w-72 sm:w-80 snap-start rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: lm ? 'rgba(255,252,248,0.95)' : 'rgba(10,8,4,0.95)',
        border:     lm
          ? `1px solid rgba(${accent.rgb},0.3)`
          : `1px solid rgba(${accent.rgb},0.18)`,
        boxShadow: lm
          ? `0 8px 32px rgba(${accent.rgb},0.12), 0 2px 8px rgba(0,0,0,0.06)`
          : `0 8px 40px rgba(${accent.rgb},0.1), 0 2px 12px rgba(0,0,0,0.5)`,
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
        {/* Bottom gradient — fades image into card panel */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
          style={{
            background: lm
              ? `linear-gradient(to top, rgba(255,252,248,1) 0%, rgba(255,252,248,0) 100%)`
              : `linear-gradient(to top, rgba(10,8,4,1) 0%, rgba(10,8,4,0) 100%)`,
          }}
        />
        {/* Index counter */}
        <div
          className="absolute top-3 left-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `rgba(${accent.rgb},0.85)`,
            color:      '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          {String(index + 1).padStart(2, '0')} / {natureGalleryData.length}
        </div>
      </div>

      {/* ── Text panel ── */}
      <div className="flex flex-col flex-1 px-4 pt-1 pb-4 gap-2.5">
        {/* Subtitle pill */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: `rgba(${accent.rgb},0.13)`,
              border:     `1px solid rgba(${accent.rgb},0.28)`,
              color:      accent.hex,
            }}
          >
            {card.subtitle}
          </span>
        </div>

        {/* Title */}
        <h3
          className="text-[15px] font-bold leading-snug tracking-tight"
          style={{
            fontFamily: 'var(--app-font-heading)',
            color:      lm ? '#1c1007' : 'rgba(255,255,255,0.92)',
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

        {/* Evolution insight block */}
        <div
          className="rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            background: lm
              ? `rgba(${accent.rgb},0.07)`
              : `rgba(${accent.rgb},0.08)`,
            border: `1px solid rgba(${accent.rgb},0.2)`,
          }}
        >
          {/* Toggle header */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          >
            <Dna size={11} style={{ color: accent.hex, flexShrink: 0 }} strokeWidth={2} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1"
              style={{ color: accent.hex }}
            >
              Evolution Insight
            </span>
            {expanded
              ? <ChevronUp  size={12} style={{ color: `rgba(${accent.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />
              : <ChevronDown size={12} style={{ color: `rgba(${accent.rgb},0.6)`, flexShrink: 0 }} strokeWidth={2} />
            }
          </button>

          {/* Expandable content */}
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
      </div>
    </motion.div>
  );
}

// ─── Main FeelNatureSection ───────────────────────────────────────────────────
const FeelNatureSection = memo(({ lm }: { lm: boolean }) => {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Update active index on scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const cardW = firstCard.offsetWidth + 16; // gap-4 = 16px
    const idx   = Math.round(el.scrollLeft / cardW);
    setActiveIdx(Math.min(Math.max(0, idx), natureGalleryData.length - 1));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    if (!firstCard) return;
    const cardW = firstCard.offsetWidth + 16;
    el.scrollTo({ left: cardW * idx, behavior: 'smooth' });
  }, []);

  const prev = () => scrollTo(Math.max(0, activeIdx - 1));
  const next = () => scrollTo(Math.min(natureGalleryData.length - 1, activeIdx + 1));

  return (
    <div>
      {/* ── Section header ── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(217,119,87,0.22))',
            border:     '1px solid rgba(245,158,11,0.35)',
          }}
        >
          <Leaf size={13} strokeWidth={1.8} style={{ color: '#f59e0b' }} />
        </div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{
            fontFamily: 'var(--app-font-heading)',
            color:      lm ? '#78350f' : 'rgba(255,255,255,0.92)',
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
            border:     '1px solid rgba(245,158,11,0.28)',
            color:      '#f59e0b',
          }}
        >
          8 Specimens
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
          border: lm
            ? '1px solid rgba(245,158,11,0.3)'
            : '1px solid rgba(245,158,11,0.15)',
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
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Swipe or scroll horizontally</strong>{' '}
          to explore 8 specimens from facial musculature to the four-chambered heart. Tap{' '}
          <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Evolution Insight</strong>{' '}
          on each card to reveal the evolutionary story behind the anatomy.
        </p>
      </motion.div>

      {/* ── Gallery scroll container ── */}
      <div className="relative">
        {/* Left arrow — desktop only */}
        <AnimatePresence>
          {activeIdx > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              onClick={prev}
              className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center transition-all duration-200"
              style={{
                background:     'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(12px)',
                border:         '1px solid rgba(245,158,11,0.3)',
                color:          '#f59e0b',
                boxShadow:      '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right arrow — desktop only */}
        <AnimatePresence>
          {activeIdx < natureGalleryData.length - 1 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              onClick={next}
              className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center transition-all duration-200"
              style={{
                background:     'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(12px)',
                border:         '1px solid rgba(245,158,11,0.3)',
                color:          '#f59e0b',
                boxShadow:      '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3"
          style={{ scrollbarWidth: 'none' }}
        >
          {natureGalleryData.map((card, i) => (
            <NatureCardView key={card.id} card={card} index={i} lm={lm} />
          ))}
          {/* Right padding spacer */}
          <div className="flex-shrink-0 w-1" />
        </div>
      </div>

      {/* ── Progress dots ── */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {natureGalleryData.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width:      i === activeIdx ? '20px' : '6px',
              height:     '6px',
              background: i === activeIdx
                ? '#f59e0b'
                : lm ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
              border: i === activeIdx
                ? '1px solid rgba(245,158,11,0.5)'
                : 'none',
            }}
          />
        ))}
      </div>

      {/* ── Scroll hint ── */}
      <p
        className="text-center text-[9px] mt-2 uppercase tracking-[0.2em]"
        style={{ color: lm ? 'rgba(120,53,15,0.35)' : 'rgba(245,158,11,0.25)' }}
      >
        {activeIdx + 1} of {natureGalleryData.length} · Scroll to explore
      </p>
    </div>
  );
});

FeelNatureSection.displayName = 'FeelNatureSection';
export default FeelNatureSection;
