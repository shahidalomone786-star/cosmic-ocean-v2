import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Brain, Wind, Bone, Dna, Microscope,
  X, ExternalLink, ChevronRight, AlertCircle, Loader2,
  RotateCcw, Layers, Maximize2, ArrowLeft, Crown,
} from 'lucide-react';
import { ORGAN_DATA, ORGAN_LIST, type OrganId } from './organData';
import PremiumLibrary from './PremiumLibrary';

// ─── Lucide icon lookup ───────────────────────────────────────────────────────
type IconFC = React.FC<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

const ICON_MAP: Record<string, IconFC> = {
  Heart, Brain, Wind, Bone, Dna, Microscope,
};

// ─── Organ selection card ─────────────────────────────────────────────────────
function OrganCard({
  organId, onClick, lm, index,
}: { organId: OrganId; onClick: () => void; lm: boolean; index: number }) {
  const organ = ORGAN_DATA[organId];
  const rgb   = organ.accentRgb;
  const Icon  = ICON_MAP[organ.lucideIconName] ?? Microscope;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left group cursor-pointer w-full"
      style={{
        background:   lm ? `rgba(${rgb},0.07)` : `rgba(${rgb},0.05)`,
        border:       lm ? `1px solid rgba(${rgb},0.28)` : `1px solid rgba(${rgb},0.18)`,
        boxShadow:    `0 4px 24px rgba(${rgb},0.08)`,
        aspectRatio:  '1 / 1.1',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, rgba(${rgb},0.24) 0%, transparent 70%)`, filter: 'blur(14px)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-3 sm:p-4">
        {/* Icon bubble */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
          style={{
            background:  `rgba(${rgb},0.14)`,
            border:      `1px solid rgba(${rgb},0.28)`,
            boxShadow:   `0 0 18px rgba(${rgb},0.2)`,
          }}
        >
          <Icon size={18} style={{ color: `rgb(${rgb})` }} strokeWidth={1.7} />
        </div>

        {/* Name */}
        <p
          className="text-[12px] sm:text-[13px] font-bold leading-tight mb-0.5 tracking-tight"
          style={{ color: lm ? `rgb(${rgb})` : `rgba(${rgb},0.95)` }}
        >
          {organ.name.replace('Human ', '')}
        </p>

        {/* Subtitle */}
        <p
          className="text-[9px] uppercase tracking-[0.16em] font-medium mb-auto"
          style={{ color: lm ? `rgba(${rgb},0.55)` : `rgba(${rgb},0.42)` }}
        >
          {organ.subtitle}
        </p>

        {/* Bottom row */}
        <div
          className="mt-3 pt-2.5 flex items-center justify-between"
          style={{ borderTop: `1px solid rgba(${rgb},0.14)` }}
        >
          <p className="text-[9px]" style={{ color: lm ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.28)' }}>
            <span style={{ color: `rgba(${rgb},0.75)` }}>{organ.facts[0].value}</span>
            {' '}{organ.facts[0].label}
          </p>
          <ChevronRight size={11} style={{ color: `rgba(${rgb},0.6)` }} strokeWidth={2.5} />
        </div>
      </div>

      {/* Hover shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},0.06) 0%, transparent 70%)` }}
      />
    </motion.button>
  );
}

// ─── Sketchfab iframe viewer ──────────────────────────────────────────────────
type ViewerState = 'loading' | 'ready' | 'error' | 'unavailable';

function SketchfabViewer({
  modelId, organName, lm, onRetryRequest,
}: {
  modelId:        string | null;
  organName:      string;
  lm:             boolean;
  onRetryRequest?: () => void;
}) {
  const [state, setState] = useState<ViewerState>(modelId ? 'loading' : 'unavailable');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!modelId) { setState('unavailable'); return; }
    setState('loading');
    timerRef.current = setTimeout(() => setState('error'), 10_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [modelId]);

  const handleLoad  = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('ready');
  }, []);
  const handleError = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState('error');
  }, []);

  const embedUrl = modelId
    ? `https://sketchfab.com/models/${modelId}/embed?autostart=1&preload=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_settings=0&ui_vr=0&ui_annotations=0`
    : null;

  if (state === 'unavailable' || state === 'error') {
    return (
      <UnavailableModel
        lm={lm}
        organName={organName}
        canRetry={state === 'error'}
        onRetry={() => {
          if (modelId) {
            setState('loading');
            timerRef.current = setTimeout(() => setState('error'), 10_000);
          }
          onRetryRequest?.();
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      <AnimatePresence>
        {state === 'loading' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl"
            style={{
              background: lm
                ? 'rgba(236,253,245,0.97)'
                : 'rgba(2,12,8,0.97)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={28} className="text-emerald-400" strokeWidth={1.6} />
            </motion.div>
            <div className="text-center">
              <p
                className="text-[13px] font-semibold mb-1"
                style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.85)' }}
              >
                Loading 3D model…
              </p>
              <p className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.32)' }}>
                Powered by Sketchfab
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Iframe */}
      {embedUrl && (
        <iframe
          key={modelId}
          src={embedUrl}
          title={`3D model of ${organName}`}
          className="w-full h-full rounded-xl border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}
    </div>
  );
}

// ─── Polished "Model Unavailable" card ────────────────────────────────────────
function UnavailableModel({
  lm, organName, canRetry, onRetry,
}: { lm: boolean; organName: string; canRetry: boolean; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full flex flex-col items-center justify-center gap-5 rounded-xl p-8 text-center"
      style={{
        background: lm
          ? 'linear-gradient(160deg, rgba(236,253,245,0.96) 0%, rgba(224,252,255,0.96) 100%)'
          : 'linear-gradient(160deg, rgba(2,14,10,0.97) 0%, rgba(2,10,20,0.97) 100%)',
        border: lm
          ? '1px solid rgba(52,211,153,0.2)'
          : '1px solid rgba(52,211,153,0.12)',
      }}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background:  lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
          border:      '1px solid rgba(52,211,153,0.2)',
          boxShadow:   '0 0 32px rgba(52,211,153,0.1)',
        }}
      >
        <AlertCircle size={28} className="text-emerald-400" strokeWidth={1.4} />
      </div>

      <div>
        <p
          className="text-[15px] font-semibold mb-1.5 tracking-tight"
          style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.88)' }}
        >
          3D Model Unavailable
        </p>
        <p
          className="text-[11px] leading-relaxed max-w-[240px] mx-auto"
          style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.38)' }}
        >
          A premium interactive model for <strong>{organName}</strong> is being
          curated. Explore the anatomy data in the panel below.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        {canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200"
            style={{
              background: 'rgba(52,211,153,0.14)',
              border:     '1px solid rgba(52,211,153,0.28)',
              color:      '#34d399',
            }}
          >
            <RotateCcw size={11} strokeWidth={2.2} />
            Retry
          </button>
        )}
        <a
          href={`https://sketchfab.com/search?q=${encodeURIComponent(organName + ' anatomy')}&type=models`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
          style={{
            background: lm ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            border:     lm ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
            color:      lm ? 'rgba(6,78,59,0.7)' : 'rgba(255,255,255,0.5)',
          }}
        >
          <ExternalLink size={11} strokeWidth={2} />
          Browse Sketchfab
        </a>
      </div>
    </motion.div>
  );
}

// ─── Premium Variant Switcher ─────────────────────────────────────────────────
function VariantSwitcher({
  models, activeIdx, onSelect, accentRgb,
}: {
  models:    { id: string; name: string }[];
  activeIdx: number;
  onSelect:  (idx: number) => void;
  accentRgb: string;
}) {
  if (models.length <= 1) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-4 left-1/2 z-20 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl"
      style={{
        transform:       'translateX(-50%)',
        background:      'rgba(0,0,0,0.55)',
        backdropFilter:  'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border:          `1px solid rgba(${accentRgb},0.22)`,
        boxShadow:       `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(${accentRgb},0.1), inset 0 1px 0 rgba(255,255,255,0.06)`,
        maxWidth:        'calc(100% - 32px)',
        flexWrap:        'nowrap' as const,
        overflowX:       'auto' as const,
        scrollbarWidth:  'none' as const,
      }}
    >
      {/* Icon label */}
      <div
        className="flex-shrink-0 flex items-center gap-1 pr-1.5 mr-0.5"
        style={{ borderRight: `1px solid rgba(${accentRgb},0.18)` }}
      >
        <Layers size={10} style={{ color: `rgba(${accentRgb},0.7)` }} strokeWidth={2} />
        <span
          className="text-[9px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap"
          style={{ color: `rgba(${accentRgb},0.55)` }}
        >
          View
        </span>
      </div>

      {/* Pill buttons */}
      {models.map((model, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={model.id}
            onClick={() => onSelect(idx)}
            className="relative flex-shrink-0 px-3 py-1 rounded-xl text-[11px] font-semibold tracking-tight transition-all duration-200 whitespace-nowrap cursor-pointer"
            style={{
              background: isActive
                ? `rgba(${accentRgb},0.22)`
                : 'rgba(255,255,255,0.06)',
              border: isActive
                ? `1px solid rgba(${accentRgb},0.5)`
                : '1px solid rgba(255,255,255,0.14)',
              color: isActive
                ? `rgb(${accentRgb})`
                : 'rgba(255,255,255,0.72)',
              boxShadow: isActive
                ? `0 0 14px rgba(${accentRgb},0.25), inset 0 1px 0 rgba(${accentRgb},0.12)`
                : 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {isActive && (
              <motion.span
                layoutId="variant-active-pill"
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: `rgba(${accentRgb},0.1)` }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{model.name}</span>
          </button>
        );
      })}
    </motion.div>
  );
}

// ─── Organ detail modal ───────────────────────────────────────────────────────
function OrganModal({
  organId, onClose, lm,
}: { organId: OrganId; onClose: () => void; lm: boolean }) {
  const organ = ORGAN_DATA[organId];
  const rgb   = organ.accentRgb;
  const Icon  = ICON_MAP[organ.lucideIconName] ?? Microscope;

  // Active model variant index — resets to 0 each time the modal opens for this organ
  const [activeModelIdx, setActiveModelIdx] = useState(0);
  const [isFullscreen, setIsFullscreen]     = useState(false);

  const activeModel   = organ.models[activeModelIdx] ?? null;
  const activeModelId = activeModel?.id ?? null;

  // Escape: exit fullscreen first, then close modal on second press
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isFullscreen) { setIsFullscreen(false); }
      else { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, onClose]);

  // ── Immersive fullscreen overlay (portal — escapes modal stacking context) ──
  const fullscreenPortal = isFullscreen
    ? createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col"
          style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(32px)' }}
        >
          {/* Back button — top-left */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 left-6 z-[10000] flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 group"
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

          {/* Organ label — top-center */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 pointer-events-none">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `rgba(${rgb},0.18)`, border: `1px solid rgba(${rgb},0.35)` }}
            >
              <Icon size={12} style={{ color: `rgb(${rgb})` }} strokeWidth={1.8} />
            </div>
            <p className="text-[13px] font-semibold tracking-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {organ.name}
            </p>
            <span
              className="text-[9px] uppercase tracking-[0.18em] font-medium"
              style={{ color: `rgba(${rgb},0.55)` }}
            >
              {organ.subtitle}
            </span>
          </div>

          {/* Iframe — fills everything */}
          <div className="relative w-full flex-1">
            <SketchfabViewer
              modelId={activeModelId}
              organName={activeModel?.name ?? organ.name}
              lm={false}
            />

            {/* Variant switcher — bottom of fullscreen */}
            <VariantSwitcher
              models={organ.models}
              activeIdx={activeModelIdx}
              onSelect={setActiveModelIdx}
              accentRgb={rgb}
            />
          </div>
        </motion.div>,
        document.body
      )
    : null;

  return (
    <>
      {/* ── Fullscreen portal ── */}
      {fullscreenPortal}

    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col"
          style={{
            maxHeight: '90vh',
            background: lm
              ? 'rgba(240,253,244,0.98)'
              : 'rgba(3,12,8,0.98)',
            border: lm
              ? '1px solid rgba(52,211,153,0.25)'
              : '1px solid rgba(52,211,153,0.15)',
            boxShadow: `0 32px 80px rgba(${rgb},0.12), 0 0 0 1px rgba(${rgb},0.08)`,
          }}
        >
          {/* ── Modal header ── */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{
              borderBottom: lm
                ? '1px solid rgba(52,211,153,0.15)'
                : '1px solid rgba(52,211,153,0.1)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `rgba(${rgb},0.14)`,
                border:     `1px solid rgba(${rgb},0.28)`,
                boxShadow:  `0 0 16px rgba(${rgb},0.2)`,
              }}
            >
              <Icon size={17} style={{ color: `rgb(${rgb})` }} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[14px] font-bold tracking-tight truncate"
                style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.92)' }}
              >
                {organ.name}
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.18em]"
                style={{ color: lm ? 'rgba(6,78,59,0.45)' : `rgba(${rgb},0.5)` }}
              >
                {organ.subtitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: lm ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                border:     lm ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
              }}
              aria-label="Close"
            >
              <X size={14} style={{ color: lm ? 'rgba(6,78,59,0.7)' : 'rgba(255,255,255,0.6)' }} strokeWidth={2} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
            {/* 3D viewer pane */}
            <div className="flex-1 p-4 lg:p-5">
              {/* Aspect-ratio wrapper keeps the viewer balanced in the modal */}
              <div className="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden">
                <SketchfabViewer
                  modelId={activeModelId}
                  organName={activeModel?.name ?? organ.name}
                  lm={lm}
                />

                {/* ── Premium Variant Switcher ── */}
                <VariantSwitcher
                  models={organ.models}
                  activeIdx={activeModelIdx}
                  onSelect={setActiveModelIdx}
                  accentRgb={rgb}
                />

                {/* ── Expand / Full-Screen button — bottom-left ── */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setIsFullscreen(true)}
                  className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200"
                  style={{
                    background:     'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border:         `1px solid rgba(${rgb},0.3)`,
                    boxShadow:      `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(${rgb},0.1)`,
                    color:          `rgba(${rgb},0.9)`,
                  }}
                  title="View full screen"
                >
                  <Maximize2 size={12} strokeWidth={2.2} />
                  <span className="text-[11px] font-semibold tracking-tight">Full Screen</span>
                </motion.button>
              </div>
            </div>

            {/* Info panel */}
            <div
              className="w-full lg:w-72 xl:w-80 flex-shrink-0 overflow-y-auto p-4 lg:p-5 flex flex-col gap-4"
              style={{
                borderTop:  'none',
                borderLeft: lm ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(52,211,153,0.08)',
              }}
            >
              {/* Description */}
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2"
                  style={{ color: `rgba(${rgb},0.55)` }}
                >
                  Overview
                </p>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: lm ? 'rgba(6,78,59,0.7)' : 'rgba(255,255,255,0.55)' }}
                >
                  {organ.description}
                </p>
              </div>

              {/* Facts */}
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2.5"
                  style={{ color: `rgba(${rgb},0.55)` }}
                >
                  Key Facts
                </p>
                <div className="flex flex-col gap-1.5">
                  {organ.facts.map((fact) => (
                    <div
                      key={fact.label}
                      className="flex items-start justify-between gap-3 px-3 py-2 rounded-xl"
                      style={{
                        background: lm ? `rgba(${rgb},0.06)` : `rgba(${rgb},0.05)`,
                        border:     `1px solid rgba(${rgb},0.12)`,
                      }}
                    >
                      <span
                        className="text-[10px] font-medium flex-shrink-0"
                        style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.35)' }}
                      >
                        {fact.label}
                      </span>
                      <span
                        className="text-[10px] font-semibold text-right"
                        style={{ color: lm ? `rgb(${rgb})` : `rgba(${rgb},0.9)` }}
                      >
                        {fact.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sketchfab credit */}
              {organ.sketchfabCredit && organ.models.length > 0 && (
                <p
                  className="text-[9px] mt-auto pt-2"
                  style={{ color: lm ? 'rgba(6,78,59,0.3)' : 'rgba(255,255,255,0.2)' }}
                >
                  {organ.sketchfabCredit}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}

// ─── Main Anatomy3DViewer component ──────────────────────────────────────────
interface Anatomy3DViewerProps {
  lm: boolean;
}

const Anatomy3DViewer = memo(({ lm }: Anatomy3DViewerProps) => {
  const [activeOrgan,         setActiveOrgan        ] = useState<OrganId | null>(null);
  const [showPremiumLibrary,  setShowPremiumLibrary  ] = useState(false);

  // ── Show Premium Library ──
  if (showPremiumLibrary) {
    return <PremiumLibrary lm={lm} onBack={() => setShowPremiumLibrary(false)} />;
  }

  return (
    <div>
      {/* ── Section header ── */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.22))',
            border:     '1px solid rgba(52,211,153,0.35)',
          }}
        >
          <Microscope size={13} strokeWidth={1.8} className="text-emerald-400" />
        </div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{
            fontFamily: 'var(--app-font-heading)',
            color:      lm ? '#065f46' : 'rgba(255,255,255,0.92)',
          }}
        >
          Interactive 3D Anatomy
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
        >
          Click to explore
        </span>
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: 'rgba(52,211,153,0.1)',
            border:     '1px solid rgba(52,211,153,0.22)',
            color:      '#34d399',
          }}
        >
          Core 5
        </span>
      </div>

      {/* ── Organ grid — 2 cols mobile · 3 cols sm · 5 cols lg ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ORGAN_LIST.map((id, i) => (
          <OrganCard
            key={id}
            organId={id}
            onClick={() => setActiveOrgan(id)}
            lm={lm}
            index={i}
          />
        ))}
      </div>

      {/* ── Premium Library CTA — appears right after DNA card ── */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -3, scale: 1.012 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowPremiumLibrary(true)}
        className="mt-3 w-full relative overflow-hidden rounded-2xl text-left group cursor-pointer"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(254,243,199,0.75) 0%, rgba(253,230,138,0.45) 100%)'
            : 'linear-gradient(135deg, rgba(16,11,2,0.88) 0%, rgba(10,8,2,0.88) 100%)',
          border: lm
            ? '1px solid rgba(251,191,36,0.45)'
            : '1px solid rgba(251,191,36,0.25)',
          boxShadow: lm
            ? '0 4px 24px rgba(251,191,36,0.12)'
            : '0 4px 24px rgba(251,191,36,0.07)',
        }}
      >
        {/* Ambient gold glow */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)', filter: 'blur(20px)' }}
        />

        <div className="relative z-10 flex items-center gap-4 px-5 py-4">
          {/* Crown icon bubble */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(251,191,36,0.15)',
              border:     '1px solid rgba(251,191,36,0.35)',
              boxShadow:  '0 0 20px rgba(251,191,36,0.18)',
            }}
          >
            <Crown size={19} style={{ color: 'rgb(251,191,36)' }} strokeWidth={1.7} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p
                className="text-[13px] font-bold tracking-tight"
                style={{ color: lm ? '#78350f' : 'rgb(251,191,36)' }}
              >
                Premium Library
              </p>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: 'rgba(251,191,36,0.15)',
                  border:     '1px solid rgba(251,191,36,0.3)',
                  color:      'rgb(251,191,36)',
                }}
              >
                19 Models
              </span>
            </div>
            <p
              className="text-[10px] uppercase tracking-[0.16em] font-medium"
              style={{ color: lm ? 'rgba(120,53,15,0.5)' : 'rgba(251,191,36,0.4)' }}
            >
              Advanced 3D Models
            </p>
          </div>

          {/* Subtitle */}
          <p
            className="hidden sm:block text-[11px] max-w-[180px] text-right leading-relaxed flex-shrink-0"
            style={{ color: lm ? 'rgba(120,53,15,0.45)' : 'rgba(255,255,255,0.3)' }}
          >
            Full body, head, cellular &amp; evolution models
          </p>

          <ChevronRight
            size={16}
            style={{ color: 'rgba(251,191,36,0.55)', flexShrink: 0 }}
            strokeWidth={2.2}
            className="group-hover:translate-x-1 transition-transform duration-200"
          />
        </div>

        {/* Hover shimmer */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.07) 0%, transparent 70%)' }}
        />
      </motion.button>

      {/* ── Hint ── */}
      <div
        className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl"
        style={{
          background: lm ? 'rgba(52,211,153,0.05)' : 'rgba(52,211,153,0.04)',
          border:     lm ? '1px solid rgba(52,211,153,0.14)' : '1px solid rgba(52,211,153,0.08)',
        }}
      >
        <Microscope size={11} className="text-emerald-400 flex-shrink-0" strokeWidth={1.8} />
        <span className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.28)' }}>
          Select an organ above to explore with anatomy facts, or open the Premium Library for 19 advanced models.
        </span>
      </div>

      {/* ── Modal — rendered lazily on click ── */}
      {activeOrgan && (
        <OrganModal
          organId={activeOrgan}
          onClose={() => setActiveOrgan(null)}
          lm={lm}
        />
      )}
    </div>
  );
});

Anatomy3DViewer.displayName = 'Anatomy3DViewer';
export default Anatomy3DViewer;
