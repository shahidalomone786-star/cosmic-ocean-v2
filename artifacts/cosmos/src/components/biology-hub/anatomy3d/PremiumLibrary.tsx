// ─── Biology Hub — Premium 3D Library (Netflix-style catalog) ─────────────────
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Crown, Loader2, AlertCircle,
  RotateCcw, ExternalLink, Layers3, ChevronRight,
} from 'lucide-react';
import { premiumCategories, PREMIUM_MODEL_COUNT, type PremiumModel, type PremiumCategory } from './premiumData';

// Gold accent for "Premium" theme
const GOLD    = 'rgb(251,191,36)';
const GOLD_RGB = '251,191,36';

// ─── Lightweight fullscreen viewer (portal) ───────────────────────────────────
type ViewState = 'loading' | 'ready' | 'error';

function PremiumViewer({
  model, onClose,
}: { model: PremiumModel; onClose: () => void }) {
  const [state, setState]   = useState<ViewState>('loading');
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setState('loading');
    timerRef.current = setTimeout(() => setState('error'), 12_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [model.id]);

  // Escape key closes viewer
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleLoad  = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('ready');
  }, []);
  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('error');
  }, []);
  const retry = () => {
    setState('loading');
    timerRef.current = setTimeout(() => setState('error'), 12_000);
  };

  const embedUrl = `https://sketchfab.com/models/${model.id}/embed?autostart=1&preload=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_settings=0&ui_vr=0&ui_annotations=0`;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col"
      style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(32px)' }}
    >
      {/* ── Back button ── */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-[10001] flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200"
        style={{
          background:     'rgba(255,255,255,0.1)',
          border:         '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(16px)',
          boxShadow:      '0 4px 24px rgba(0,0,0,0.4)',
          color:          'rgba(255,255,255,0.9)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
      >
        <ArrowLeft size={15} strokeWidth={2.2} />
        <span className="text-[13px] font-semibold tracking-tight">Back</span>
      </button>

      {/* ── Model name — top center ── */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 pointer-events-none"
      >
        <Crown size={13} style={{ color: GOLD }} strokeWidth={2} />
        <p className="text-[13px] font-semibold tracking-tight text-white/85 truncate max-w-[240px] sm:max-w-sm">
          {model.name}
        </p>
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: `rgba(${GOLD_RGB},0.15)`,
            border:     `1px solid rgba(${GOLD_RGB},0.3)`,
            color:      GOLD,
          }}
        >
          3D
        </span>
      </div>

      {/* ── Viewer area ── */}
      <div className="relative w-full flex-1">
        {/* Loading overlay */}
        <AnimatePresence>
          {state === 'loading' && (
            <motion.div
              initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(4,8,4,0.98)' }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={30} style={{ color: GOLD }} strokeWidth={1.6} />
              </motion.div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-white/85 mb-1">Loading premium model…</p>
                <p className="text-[11px] text-white/30">Powered by Sketchfab</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error fallback */}
        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5"
            style={{ background: 'rgba(4,8,4,0.98)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `rgba(${GOLD_RGB},0.08)`, border: `1px solid rgba(${GOLD_RGB},0.2)` }}
            >
              <AlertCircle size={28} style={{ color: GOLD }} strokeWidth={1.4} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-white/88 mb-1.5 tracking-tight">Model Unavailable</p>
              <p className="text-[11px] text-white/38 max-w-[220px] mx-auto leading-relaxed">
                Could not load <strong className="text-white/55">{model.name}</strong>. The model may be private or unavailable.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={retry}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: `rgba(${GOLD_RGB},0.14)`,
                  border:     `1px solid rgba(${GOLD_RGB},0.3)`,
                  color:      GOLD,
                }}
              >
                <RotateCcw size={11} strokeWidth={2.2} />
                Retry
              </button>
              <a
                href={`https://sketchfab.com/models/${model.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.1)',
                  color:      'rgba(255,255,255,0.5)',
                }}
              >
                <ExternalLink size={11} strokeWidth={2} />
                View on Sketchfab
              </a>
            </div>
          </motion.div>
        )}

        {/* Iframe */}
        <iframe
          key={model.id}
          src={embedUrl}
          title={`3D model — ${model.name}`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </motion.div>,
    document.body,
  );
}

// ─── Individual model card ─────────────────────────────────────────────────────
function ModelCard({
  model, index, onOpen, lm,
}: { model: PremiumModel; index: number; onOpen: (m: PremiumModel) => void; lm: boolean }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onOpen(model)}
      className="relative flex-shrink-0 w-44 sm:w-52 text-left cursor-pointer rounded-2xl overflow-hidden group"
      style={{
        background: lm
          ? `rgba(254,243,199,0.7)`
          : `rgba(12,9,2,0.75)`,
        border: lm
          ? `1px solid rgba(${GOLD_RGB},0.35)`
          : `1px solid rgba(${GOLD_RGB},0.2)`,
        boxShadow: lm
          ? `0 4px 20px rgba(${GOLD_RGB},0.1)`
          : `0 4px 20px rgba(${GOLD_RGB},0.06)`,
        backdropFilter: 'blur(18px)',
      }}
    >
      {/* Gold glow top-right */}
      <div
        className="absolute -top-5 -right-5 w-20 h-20 rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, rgba(${GOLD_RGB},0.28) 0%, transparent 70%)`, filter: 'blur(12px)' }}
      />

      <div className="relative z-10 p-3.5">
        {/* 3D badge */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{
              background: `rgba(${GOLD_RGB},0.15)`,
              border:     `1px solid rgba(${GOLD_RGB},0.3)`,
            }}
          >
            <Layers3 size={9} style={{ color: GOLD }} strokeWidth={2} />
            <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: GOLD }}>3D</span>
          </div>
          <ChevronRight
            size={12}
            style={{ color: `rgba(${GOLD_RGB},0.5)` }}
            strokeWidth={2.2}
            className="group-hover:translate-x-0.5 transition-transform duration-200"
          />
        </div>

        {/* Name */}
        <p
          className="text-[12px] font-bold leading-snug tracking-tight line-clamp-2"
          style={{
            color: lm ? '#78350f' : `rgba(${GOLD_RGB},0.92)`,
          }}
        >
          {model.name}
        </p>

        {/* Bottom label */}
        <p
          className="text-[9px] mt-2 font-medium"
          style={{ color: lm ? 'rgba(120,53,15,0.45)' : 'rgba(255,255,255,0.25)' }}
        >
          Sketchfab · Interactive
        </p>
      </div>

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `linear-gradient(135deg, rgba(${GOLD_RGB},0.07) 0%, transparent 70%)` }}
      />
    </motion.button>
  );
}

// ─── Category row ──────────────────────────────────────────────────────────────
function CategoryRow({
  category, catIndex, onOpen, lm,
}: { category: PremiumCategory; catIndex: number; onOpen: (m: PremiumModel) => void; lm: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: catIndex * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-7"
    >
      {/* Row header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <h3
          className="text-[13px] font-bold tracking-tight"
          style={{ color: lm ? '#78350f' : 'rgba(255,255,255,0.88)' }}
        >
          {category.title}
        </h3>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: `rgba(${GOLD_RGB},0.12)`,
            border:     `1px solid rgba(${GOLD_RGB},0.25)`,
            color:      GOLD,
          }}
        >
          {category.models.length} model{category.models.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {category.models.map((model, i) => (
          <ModelCard
            key={model.id}
            model={model}
            index={i}
            onOpen={onOpen}
            lm={lm}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main PremiumLibrary component ────────────────────────────────────────────
interface PremiumLibraryProps {
  lm:     boolean;
  onBack: () => void;
}

const PremiumLibrary = memo(({ lm, onBack }: PremiumLibraryProps) => {
  const [activeModel, setActiveModel] = useState<PremiumModel | null>(null);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 flex-shrink-0"
          style={{
            background: lm ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
            border:     lm ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
            color:      lm ? 'rgba(6,78,59,0.7)'         : 'rgba(255,255,255,0.55)',
          }}
        >
          <ArrowLeft size={12} strokeWidth={2.2} />
          Back
        </motion.button>

        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `rgba(${GOLD_RGB},0.15)`,
              border:     `1px solid rgba(${GOLD_RGB},0.35)`,
              boxShadow:  `0 0 16px rgba(${GOLD_RGB},0.15)`,
            }}
          >
            <Crown size={13} style={{ color: GOLD }} strokeWidth={2} />
          </div>
          <h2
            className="text-[15px] font-semibold tracking-tight truncate"
            style={{
              fontFamily: 'var(--app-font-heading)',
              color:      lm ? '#78350f' : `rgba(${GOLD_RGB},0.92)`,
            }}
          >
            Premium Library
          </h2>
          <span className="text-[10px] uppercase tracking-[0.18em] font-medium flex-shrink-0"
            style={{ color: lm ? `rgba(120,53,15,0.45)` : `rgba(${GOLD_RGB},0.4)` }}>
            Advanced 3D Models
          </span>
        </div>

        {/* Count badge */}
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: `rgba(${GOLD_RGB},0.12)`,
            border:     `1px solid rgba(${GOLD_RGB},0.28)`,
            color:      GOLD,
          }}
        >
          {PREMIUM_MODEL_COUNT} Models
        </span>
      </div>

      {/* ── Hero description strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl mb-6 px-5 py-4 flex items-center gap-4"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(254,243,199,0.8) 0%, rgba(253,230,138,0.5) 100%)'
            : 'linear-gradient(135deg, rgba(18,12,2,0.95) 0%, rgba(10,8,2,0.95) 100%)',
          border: lm
            ? `1px solid rgba(${GOLD_RGB},0.4)`
            : `1px solid rgba(${GOLD_RGB},0.18)`,
          boxShadow: `0 4px 32px rgba(${GOLD_RGB},0.08)`,
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(${GOLD_RGB},0.18) 0%, transparent 70%)`, filter: 'blur(20px)' }}
        />
        <div className="relative z-10 flex-1 min-w-0">
          <p
            className="text-[13px] font-bold tracking-tight mb-0.5"
            style={{ color: lm ? '#78350f' : GOLD }}
          >
            Highly Detailed Anatomy · 6 Categories
          </p>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: lm ? 'rgba(120,53,15,0.55)' : 'rgba(255,255,255,0.35)' }}
          >
            Full-body musculature, cellular biology, evolutionary models and more — click any card to open an immersive 3D viewer.
          </p>
        </div>
        <Crown size={28} style={{ color: `rgba(${GOLD_RGB},0.4)`, flexShrink: 0 }} strokeWidth={1.4} />
      </motion.div>

      {/* ── Netflix-style category rows ── */}
      {premiumCategories.map((cat, catIdx) => (
        <CategoryRow
          key={cat.title}
          category={cat}
          catIndex={catIdx}
          onOpen={setActiveModel}
          lm={lm}
        />
      ))}

      {/* ── Fullscreen viewer portal ── */}
      <AnimatePresence>
        {activeModel && (
          <PremiumViewer
            model={activeModel}
            onClose={() => setActiveModel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

PremiumLibrary.displayName = 'PremiumLibrary';
export default PremiumLibrary;
