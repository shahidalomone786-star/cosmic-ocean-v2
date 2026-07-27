import { lazy, Suspense, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCcw, Tag, ScanLine, Maximize2, Minimize2,
  RefreshCw, GitBranch, Layers, Wifi,
} from 'lucide-react';
import { ORGAN_DATA, type OrganId } from './organData';
import type { OrganCanvasHandle } from './OrganCanvas';

// ─── OrganViewer — Full-screen Interactive 3D Viewer ─────────────────────────
// Lazy-loads the Three.js canvas bundle; only fetched on first open.

const LazyOrganCanvas = lazy(() => import('./OrganCanvas'));

interface OrganViewerProps {
  organId: OrganId | null;
  onClose: () => void;
  lm: boolean;
}

function ControlBtn({
  onClick, active, title, children, accent,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 select-none"
      style={{
        background: active
          ? accent ?? 'rgba(52,211,153,0.22)'
          : 'rgba(255,255,255,0.06)',
        border: active
          ? `1px solid ${accent?.replace('0.22', '0.5') ?? 'rgba(52,211,153,0.5)'}`
          : '1px solid rgba(255,255,255,0.12)',
        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
      <span className="hidden sm:inline">{title}</span>
    </motion.button>
  );
}

function CanvasLoadingSpinner({ accentRgb }: { accentRgb: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-2 border-transparent"
        style={{ borderTopColor: `rgba(${accentRgb},0.9)`, borderRightColor: `rgba(${accentRgb},0.3)` }}
      />
      <p className="text-[11px] font-medium" style={{ color: `rgba(${accentRgb},0.7)` }}>
        Loading 3D anatomy…
      </p>
    </div>
  );
}

export default function OrganViewer({ organId, onClose, lm }: OrganViewerProps) {
  const canvasRef = useRef<OrganCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [autoRotate,   setAutoRotate]   = useState(true);
  const [showLabels,   setShowLabels]   = useState(true);
  const [wireframe,    setWireframe]    = useState(false);
  const [crossSection, setCrossSection] = useState(false);
  const [exploded,     setExploded]     = useState(false);
  const [fullscreen,   setFullscreen]   = useState(false);

  const organ = organId ? ORGAN_DATA[organId] : null;

  const handleReset = useCallback(() => {
    canvasRef.current?.resetCamera();
  }, []);

  const handleFullscreen = useCallback(async () => {
    if (!fullscreen) {
      await containerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, [fullscreen]);

  if (!organ) return null;

  const accentRgb = organ.accentRgb;
  const glassPanel = {
    background: 'rgba(4,8,6,0.88)',
    backdropFilter: 'blur(24px)',
    border: `1px solid rgba(${accentRgb},0.15)`,
  };

  return (
    <AnimatePresence>
      {organId && (
        <motion.div
          key="organ-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[999] flex flex-col"
          style={{ background: 'rgba(2,6,4,0.97)' }}
          ref={containerRef}
        >
          {/* Ambient background glow matching organ accent */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, rgba(${accentRgb},0.06) 0%, transparent 65%)`,
            }}
          />

          {/* ── TOP BAR ── */}
          <div
            className="relative z-10 flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              background: 'rgba(2,6,4,0.80)',
              backdropFilter: 'blur(20px)',
              borderBottom: `1px solid rgba(${accentRgb},0.12)`,
            }}
          >
            {/* Close */}
            <motion.button
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <X size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Close</span>
            </motion.button>

            {/* Organ identity */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: `rgba(${accentRgb},0.18)`,
                  border: `1px solid rgba(${accentRgb},0.35)`,
                  boxShadow: `0 0 14px rgba(${accentRgb},0.25)`,
                }}
              >
                {organ.icon}
              </div>
              <div className="min-w-0">
                <p
                  className="text-[14px] font-bold tracking-tight leading-none truncate"
                  style={{ color: `rgb(${accentRgb})` }}
                >
                  {organ.name}
                </p>
                <p className="text-[10px] text-white/35 truncate">{organ.subtitle}</p>
              </div>
            </div>

            {/* Control strip */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <ControlBtn active={autoRotate} onClick={() => setAutoRotate(v => !v)} title="Rotate" accent={`rgba(${accentRgb},0.22)`}>
                <RotateCcw size={12} strokeWidth={2.2} />
              </ControlBtn>
              <ControlBtn active={showLabels} onClick={() => setShowLabels(v => !v)} title="Labels" accent="rgba(250,204,21,0.22)">
                <Tag size={12} strokeWidth={2.2} />
              </ControlBtn>
              <ControlBtn active={wireframe} onClick={() => setWireframe(v => !v)} title="Wireframe" accent="rgba(147,197,253,0.22)">
                <Layers size={12} strokeWidth={2.2} />
              </ControlBtn>
              <ControlBtn active={crossSection} onClick={() => setCrossSection(v => !v)} title="Section" accent="rgba(251,146,60,0.22)">
                <ScanLine size={12} strokeWidth={2.2} />
              </ControlBtn>
              {organ.supportsExplode && (
                <ControlBtn active={exploded} onClick={() => setExploded(v => !v)} title="Explode" accent="rgba(167,139,250,0.22)">
                  <GitBranch size={12} strokeWidth={2.2} />
                </ControlBtn>
              )}
              <ControlBtn onClick={handleReset} title="Reset" accent="rgba(52,211,153,0.22)">
                <RefreshCw size={12} strokeWidth={2.2} />
              </ControlBtn>
              <ControlBtn onClick={handleFullscreen} title={fullscreen ? 'Exit' : 'Full'} accent="rgba(255,255,255,0.12)">
                {fullscreen ? <Minimize2 size={12} strokeWidth={2.2} /> : <Maximize2 size={12} strokeWidth={2.2} />}
              </ControlBtn>
            </div>
          </div>

          {/* ── CANVAS AREA ── */}
          <div className="relative flex-1 min-h-0">
            {/* Interaction hint */}
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Wifi size={10} className="text-white/30" />
              <span className="text-[9px] text-white/30">Drag · Scroll · Right-drag pan</span>
            </div>

            <Suspense fallback={<CanvasLoadingSpinner accentRgb={accentRgb} />}>
              <LazyOrganCanvas
                ref={canvasRef}
                organId={organId}
                autoRotate={autoRotate}
                showLabels={showLabels}
                wireframe={wireframe}
                crossSection={crossSection}
                exploded={exploded}
              />
            </Suspense>
          </div>

          {/* ── BOTTOM INFO PANEL ── */}
          <div
            className="relative z-10 flex-shrink-0"
            style={{
              ...glassPanel,
              borderTop: `1px solid rgba(${accentRgb},0.14)`,
            }}
          >
            <div className="flex gap-0 overflow-x-auto scrollbar-hide">
              {/* Description */}
              <div
                className="px-5 py-3.5 flex-1 min-w-[220px] border-r border-white/[0.06]"
              >
                <p className="text-[9px] uppercase tracking-[0.22em] font-semibold mb-1.5"
                  style={{ color: `rgba(${accentRgb},0.55)` }}>
                  About
                </p>
                <p className="text-[11px] leading-relaxed text-white/55 max-w-sm">
                  {organ.description}
                </p>
              </div>

              {/* Facts */}
              <div className="flex items-stretch divide-x divide-white/[0.06]">
                {organ.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="px-4 py-3 flex flex-col items-start justify-center flex-shrink-0 min-w-[100px]"
                  >
                    <p
                      className="text-[13px] font-bold mb-0.5 leading-none"
                      style={{ color: `rgba(${accentRgb},0.9)` }}
                    >
                      {fact.value}
                    </p>
                    <p className="text-[9px] text-white/35 uppercase tracking-wider leading-tight">
                      {fact.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
