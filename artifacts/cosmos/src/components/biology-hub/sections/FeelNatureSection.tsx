// ─── Biology Hub — Feel Nature Discovery Gallery (v5) ────────────────────────
// Perf: hardware-accelerated scroll, memoised cards, minimal Framer re-renders
// Portal: pure #000 background, fixed inset-0, object-cover — zero black bars
// v5: 79 specimens · Pure Visuals toggle · synthesized scroll sound
import {
  useState, useRef, useCallback, useEffect, memo,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Leaf, Dna, ChevronDown, ChevronUp,
  Maximize2, X, ArrowUp, ArrowDown, Sparkles, Eye, AlignLeft,
} from 'lucide-react';
import { natureGalleryData, type NatureCard } from './natureGalleryData';

type ViewMode = 'detailed' | 'pure';

// ─── Accent palette — 44 entries ────────────────────────────────────────────
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
  { rgb: '192,132,252', hex: '#c084fc' }, // 26 lavender
  { rgb: '134,239,172', hex: '#86efac' }, // 27 mint
  { rgb: '253,186,116', hex: '#fdba74' }, // 28 peach
  { rgb: '147,197,253', hex: '#93c5fd' }, // 29 powder blue
  { rgb: '216,180,254', hex: '#d8b4fe' }, // 30 wisteria
  { rgb: '110,231,183', hex: '#6ee7b7' }, // 31 seafoam
  { rgb: '253,224,71',  hex: '#fde047' }, // 32 sunflower
  { rgb: '252,165,165', hex: '#fca5a5' }, // 33 blush
  { rgb: '125,211,252', hex: '#7dd3fc' }, // 34 ice blue
  { rgb: '217,70,239',  hex: '#d946ef' }, // 35 fuchsia
  { rgb: '251,191,36',  hex: '#fbbf24' }, // 36 marigold
  { rgb: '52,144,220',  hex: '#3490dc' }, // 37 cerulean
  { rgb: '16,185,129',  hex: '#10b981' }, // 38 jade
  { rgb: '239,155,68',  hex: '#ef9b44' }, // 39 saffron
  { rgb: '139,92,246',  hex: '#8b5cf6' }, // 40 amethyst
  { rgb: '236,72,153',  hex: '#ec4899' }, // 41 hot pink
  { rgb: '20,184,166',  hex: '#14b8a6' }, // 42 turquoise
  { rgb: '234,179,8',   hex: '#eab308' }, // 43 harvest gold
  { rgb: '132,204,22',  hex: '#84cc16' }, // 44 chartreuse
  { rgb: '56,189,248',  hex: '#38bdf8' }, // 45 sky blue
  { rgb: '250,204,21',  hex: '#facc15' }, // 46 dandelion
  { rgb: '180,83,9',    hex: '#b45309' }, // 47 amber brown
  { rgb: '15,118,110',  hex: '#0f766e' }, // 48 deep teal
  { rgb: '217,119,6',   hex: '#d97706' }, // 49 warm amber
  { rgb: '124,58,237',  hex: '#7c3aed' }, // 50 deep violet
  { rgb: '6,182,212',   hex: '#06b6d4' }, // 51 electric cyan
  { rgb: '239,68,68',   hex: '#ef4444' }, // 52 vivid red
  { rgb: '168,162,158', hex: '#a8a29e' }, // 53 warm stone
  { rgb: '99,102,241',  hex: '#6366f1' }, // 54 indigo
  { rgb: '244,114,182', hex: '#f472b6' }, // 55 rose pink
  { rgb: '110,231,183', hex: '#6ee7b7' }, // 56 seafoam
  { rgb: '253,224,71',  hex: '#fde047' }, // 57 sunlit
  { rgb: '56,189,248',  hex: '#38bdf8' }, // 58 aqua sky
  { rgb: '251,146,60',  hex: '#fb923c' }, // 59 sunset orange
  { rgb: '216,180,254', hex: '#d8b4fe' }, // 60 soft lavender
  { rgb: '239,68,68',   hex: '#ef4444' }, // 61 vivid red
  { rgb: '129,140,248', hex: '#818cf8' }, // 62 periwinkle
  { rgb: '250,204,21',  hex: '#facc15' }, // 63 golden
  { rgb: '147,197,253', hex: '#93c5fd' }, // 64 powder blue
  { rgb: '163,230,53',  hex: '#a3e635' }, // 65 lime
  { rgb: '217,119,87',  hex: '#d97757' }, // 66 terra
  { rgb: '192,132,252', hex: '#c084fc' }, // 67 violet
  { rgb: '20,184,166',  hex: '#14b8a6' }, // 68 teal
  { rgb: '252,165,165', hex: '#fca5a5' }, // 69 blush
  { rgb: '217,119,87',  hex: '#d97757' }, // 70 tiger terra
  { rgb: '74,222,128',  hex: '#4ade80' }, // 71 chameleon green
  { rgb: '56,189,248',  hex: '#38bdf8' }, // 72 jellyfish blue
  { rgb: '251,146,60',  hex: '#fb923c' }, // 73 savannah amber
  { rgb: '34,211,238',  hex: '#22d3ee' }, // 74 photic cyan
  { rgb: '99,179,221',  hex: '#63b3dd' }, // 75 cave blue
  { rgb: '147,197,253', hex: '#93c5fd' }, // 76 whale sky
  { rgb: '125,211,252', hex: '#7dd3fc' }, // 77 baleen ice
  { rgb: '163,230,53',  hex: '#a3e635' }, // 78 canopy lime
  { rgb: '52,211,153',  hex: '#34d399' }, // 79 oasis emerald
] as const;

const ac = (id: number) => ACCENTS[(id - 1) % ACCENTS.length];

// ─── Shuffle helper ──────────────────────────────────────────────────────────
function shuffleWithFirst(data: NatureCard[], firstId: number): NatureCard[] {
  const rest = [...data].filter(c => c.id !== firstId).sort(() => Math.random() - 0.5);
  const first = data.find(c => c.id === firstId);
  return first ? [first, ...rest] : rest;
}

// ─── Scroll click sound ──────────────────────────────────────────────────────
function playScrollSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
    osc.addEventListener('ended', () => { void audioCtx.close().catch(() => undefined); }, { once: true });
  } catch (_) { /* silent fallback */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-Screen Reels Portal — edge-to-edge object-cover, overlay UI
// pureMode: image only, no text overlay
// ─────────────────────────────────────────────────────────────────────────────
const ReelsPortal = memo(function ReelsPortal({
  data,
  onClose,
  pureMode,
}: {
  data: NatureCard[];
  onClose: () => void;
  pureMode: boolean;
}) {
  const [idx, setIdx]      = useState(0);
  const [dir, setDir]      = useState<1 | -1>(1);
  const [expanded, setExp] = useState(false);
  const touchY             = useRef<number | null>(null);
  const total              = data.length;

  const go = useCallback((d: 1 | -1) => {
    playScrollSound();
    setDir(d);
    setIdx(p => Math.max(0, Math.min(total - 1, p + d)));
  }, [total]);

  useEffect(() => { setExp(false); }, [idx]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, onClose]);

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
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: '#000', touchAction: 'none', margin: 0, padding: 0 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Full-bleed image layer — edge-to-edge, object-cover ── */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.img
          key={card.id}
          src={card.image}
          alt={card.title}
          custom={dir}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', display: 'block', margin: 0, padding: 0 }}
          loading="eager"
          onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.12'; }}
        />
      </AnimatePresence>

      {/* ── Top scrim — darkens sky so exit/progress UI reads ── */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
      />

      {/* ── Bottom scrim — detailed mode only ── */}
      {!pureMode && (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
          style={{
            height: '65%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.93) 0%, rgba(0,0,0,0.72) 35%, rgba(0,0,0,0.3) 65%, transparent 100%)',
          }}
        />
      )}

      {/* ── Top bar (exit + progress + counter) ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-12 pb-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{
            background: 'rgba(0,0,0,0.38)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <X size={13} strokeWidth={2.2} /> Exit
        </button>

        <div className="flex items-center gap-[3px] flex-wrap justify-center max-w-[180px]">
          {data.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width:      i === idx ? '16px' : '4px',
                height:     '4px',
                background: i === idx ? accent.hex : 'rgba(255,255,255,0.22)',
              }}
            />
          ))}
        </div>

        <span className="text-[11px] font-mono tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {idx + 1}/{total}
        </span>
      </div>

      {/* ── Nav arrows — float over image, right edge ── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30">
        {idx > 0 && (
          <button
            onClick={() => go(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.32)',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <ArrowUp size={16} style={{ color: 'rgba(255,255,255,0.72)' }} strokeWidth={2} />
          </button>
        )}
        {idx < total - 1 && (
          <button
            onClick={() => go(1)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: `rgba(${accent.rgb},0.22)`,
              border: `1px solid rgba(${accent.rgb},0.4)`,
              backdropFilter: 'blur(14px)',
            }}
          >
            <ArrowDown size={16} style={{ color: accent.hex }} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ── Bottom text overlay — detailed mode only ── */}
      {!pureMode && (
        <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-8">
          {/* Subtitle pill */}
          <div className="mb-2.5">
            <span
              className="text-[9px] uppercase tracking-[0.22em] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: `rgba(${accent.rgb},0.25)`,
                border: `1px solid rgba(${accent.rgb},0.45)`,
                color: accent.hex,
                backdropFilter: 'blur(10px)',
              }}
            >
              {card.subtitle}
            </span>
          </div>

          <h2
            className="text-[22px] font-bold tracking-tight mb-1.5 leading-tight"
            style={{ color: '#fff', fontFamily: 'var(--app-font-heading)', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
          >
            {card.title}
          </h2>
          <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.52)' }}>
            {card.description}
          </p>

          {/* Evolution insight accordion */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: `rgba(${accent.rgb},0.1)`,
              border: `1px solid rgba(${accent.rgb},0.22)`,
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              onClick={() => setExp(p => !p)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left"
            >
              <Dna size={11} style={{ color: accent.hex, flexShrink: 0 }} strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] flex-1" style={{ color: accent.hex }}>
                Evolution Insight
              </span>
              {expanded
                ? <ChevronUp   size={12} style={{ color: `rgba(${accent.rgb},0.65)`, flexShrink: 0 }} />
                : <ChevronDown size={12} style={{ color: `rgba(${accent.rgb},0.65)`, flexShrink: 0 }} />}
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  exit={{ scaleY: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden', transformOrigin: 'top' }}
                >
                  <p className="px-3.5 pb-3.5 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
                    {card.evolution}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Pure mode: minimal counter at bottom ── */}
      {pureMode && (
        <div className="absolute bottom-8 right-5 z-30">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.38)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {String(card.id).padStart(2, '0')} / {total}
          </span>
        </div>
      )}

      {/* ── Hint ── */}
      <p
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 text-[9px] uppercase tracking-[0.22em] whitespace-nowrap"
        style={{ color: 'rgba(255,255,255,0.16)' }}
      >
        Swipe · Esc to exit
      </p>
    </motion.div>,
    document.body,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Single card — Detailed View
// ─────────────────────────────────────────────────────────────────────────────
const DetailedCard = memo(function DetailedCard({
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
        background: lm ? 'rgba(255,252,248,0.95)' : '#000',
        border:  lm ? `1px solid rgba(${accent.rgb},0.28)` : `1px solid rgba(${accent.rgb},0.16)`,
        boxShadow: lm
          ? `0 6px 28px rgba(${accent.rgb},0.1), 0 2px 6px rgba(0,0,0,0.05)`
          : `0 6px 36px rgba(${accent.rgb},0.09), 0 2px 10px rgba(0,0,0,0.55)`,
        willChange: 'transform',
        contain: 'content',
      }}
    >
      {/* Image */}
      <div
        className="relative w-full h-56 sm:h-60 flex-shrink-0 overflow-hidden"
        style={{ background: '#000' }}
      >
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
              : 'linear-gradient(to top, #000 0%, transparent 100%)',
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
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: 'hidden', transformOrigin: 'top' }}
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
// Single card — Pure Visuals (image only, click = immersive)
// ─────────────────────────────────────────────────────────────────────────────
const PureCard = memo(function PureCard({
  card, accentIdx, onImmersive,
}: {
  card: NatureCard;
  accentIdx: number;
  onImmersive: (id: number) => void;
}) {
  const accent = ACCENTS[accentIdx % ACCENTS.length];

  return (
    <div
      onClick={() => onImmersive(card.id)}
      className="relative flex-shrink-0 w-52 sm:w-60 snap-start rounded-3xl overflow-hidden cursor-pointer"
      style={{
        background: '#000',
        border: `1px solid rgba(${accent.rgb},0.12)`,
        aspectRatio: '9 / 16',
        willChange: 'transform',
        contain: 'content',
      }}
    >
      {/* Blurred fill layer for letterbox */}
      <img
        src={card.image}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: 'cover',
          filter: 'blur(24px) brightness(0.06)',
          transform: 'scale(1.1)',
          background: '#000',
        }}
        loading="lazy"
        decoding="async"
      />
      {/* Sharp contained image — full, no crop */}
      <img
        src={card.image}
        alt={card.title}
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'contain', background: 'transparent' }}
        loading="lazy"
        decoding="async"
        onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
      />
      {/* Counter badge */}
      <div
        className="absolute top-2.5 left-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: `rgba(${accent.rgb},0.75)`,
          color: '#fff',
          backdropFilter: 'blur(8px)',
        }}
      >
        {String(card.id).padStart(2, '0')}
      </div>
      {/* Tap hint on hover/focus — subtle bottom glow */}
      <div
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(to top, rgba(${accent.rgb},0.14) 0%, transparent 100%)` }}
      />
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Segmented View-Mode Toggle
// ─────────────────────────────────────────────────────────────────────────────
const ViewModeToggle = memo(function ViewModeToggle({
  mode, onChange, lm,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  lm: boolean;
}) {
  return (
    <div
      className="flex rounded-xl p-0.5 gap-0.5 flex-shrink-0"
      style={{
        background: lm ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
        border: lm ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {(['detailed', 'pure'] as ViewMode[]).map(m => {
        const active = mode === m;
        const Icon = m === 'detailed' ? AlignLeft : Eye;
        const label = m === 'detailed' ? 'Detailed View' : 'Pure Visuals';
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[10px] font-semibold tracking-wide transition-all duration-200"
            style={{
              background: active
                ? lm ? '#fff' : 'rgba(255,255,255,0.12)'
                : 'transparent',
              color: active
                ? lm ? '#92400e' : 'rgba(255,255,255,0.88)'
                : lm ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.32)',
              boxShadow: active
                ? lm ? '0 1px 4px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.4)'
                : 'none',
            }}
          >
            <Icon size={11} strokeWidth={2.2} />
            {label}
          </button>
        );
      })}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Infinite-loop scroll gallery
// ─────────────────────────────────────────────────────────────────────────────
const CLONE_COUNT = 5;
const REAL_COUNT  = natureGalleryData.length; // 79
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

  const [viewMode, setViewMode] = useState<ViewMode>('detailed');

  // Reels portal state
  const [reelsData,    setReelsData]    = useState<NatureCard[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openImmersive = useCallback((id: number) => {
    setReelsData(shuffleWithFirst(natureGalleryData, id));
    setIsFullscreen(true);
  }, []);

  // Card width helper — pure cards are narrower
  const cardWidth = useCallback((): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 16 : 0; // gap-4 = 16px
  }, []);

  // Scroll to a loop index
  const scrollToLoop = useCallback((loopIdx: number, instant = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: cardWidth() * loopIdx, behavior: instant ? 'instant' as ScrollBehavior : 'smooth' });
  }, [cardWidth]);

  // Init: jump to first real card
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const cw = cardWidth();
      if (cw > 0) el.scrollLeft = cw * CLONE_COUNT;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-init when view mode changes (card widths change)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const cw = cardWidth();
      if (cw > 0) el.scrollLeft = cw * (CLONE_COUNT + activeRef.current);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

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

    // Seamless loop
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
      <div className="flex items-center gap-3 mb-4 flex-wrap">
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
          className="text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.28)',
            color: '#f59e0b',
          }}
        >
          {REAL_COUNT} Specimens
        </span>

        {/* Toggle — pushed to right on larger screens */}
        <div className="ml-auto">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} lm={lm} />
        </div>
      </div>

      {/* Hero banner — only in Detailed view */}
      {viewMode === 'detailed' && (
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
            — the gallery loops endlessly. Tap{' '}
            <strong style={{ color: lm ? '#92400e' : 'rgba(245,158,11,0.8)' }}>Immersive View</strong>{' '}
            for a randomized full-screen Reels experience.
          </p>
        </div>
      )}

      {/* Pure Visuals hint */}
      {viewMode === 'pure' && (
        <div className="mb-4">
          <p
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: lm ? 'rgba(120,53,15,0.38)' : 'rgba(255,255,255,0.22)' }}
          >
            Tap any image to open Immersive View
          </p>
        </div>
      )}

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
          {loopData.map((card, i) =>
            viewMode === 'pure' ? (
              <PureCard
                key={`pure-${i}-${card.id}`}
                card={card}
                accentIdx={card.id - 1}
                onImmersive={openImmersive}
              />
            ) : (
              <DetailedCard
                key={`det-${i}-${card.id}`}
                card={card}
                accentIdx={card.id - 1}
                lm={lm}
                onImmersive={openImmersive}
              />
            )
          )}
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
          <ReelsPortal
            data={reelsData}
            onClose={() => setIsFullscreen(false)}
            pureMode={viewMode === 'pure'}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default FeelNatureSection;
