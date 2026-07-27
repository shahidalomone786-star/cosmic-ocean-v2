import {
  useState, useRef, useCallback, useEffect, memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw,
  ScanLine, AlertCircle, Loader2, FlaskConical, Info,
} from 'lucide-react';

// ─── Slide data ────────────────────────────────────────────────────────────────

interface SlideData {
  id: string;
  name: string;
  category: string;
  stain: string;
  defaultMag: string;
  description: string;
  accentRgb: string;
  imageUrl: string;
  attribution: string;
}

const SLIDES: SlideData[] = [
  {
    id: 'blood-smear',
    name: 'Blood Smear',
    category: 'Hematology',
    stain: 'Wright–Giemsa',
    defaultMag: '400×',
    description:
      'Peripheral blood smear showing biconcave erythrocytes (~7 µm), spherical thrombocytes and the nucleus of a leukocyte. Characteristic "rouleaux" stacking visible at lower magnification.',
    accentRgb: '239,68,68',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/SEM_blood_cells.jpg',
    attribution: 'Wikimedia Commons · Public domain',
  },
  {
    id: 'neuron',
    name: 'Neuron',
    category: 'Neuroscience',
    stain: 'Golgi Silver',
    defaultMag: '100×',
    description:
      'Multipolar neuron with soma, branching dendrites and a single axon. Cajal\'s silver staining method reveals the full arborisation of individual neurons within cortical layers.',
    accentRgb: '167,139,250',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Cajal_cortex_drawings.png',
    attribution: 'Santiago Ramón y Cajal · Public domain',
  },
  {
    id: 'skin-tissue',
    name: 'Skin Tissue',
    category: 'Histology',
    stain: 'H&E',
    defaultMag: '100×',
    description:
      'Cross-section of human skin showing stratified squamous epithelium (epidermis), dermis rich in collagen fibres, and the subcutaneous hypodermis with adipocytes.',
    accentRgb: '251,146,60',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Skin_layers.png/640px-Skin_layers.png',
    attribution: 'Wikimedia Commons · CC BY-SA',
  },
  {
    id: 'plant-cell',
    name: 'Plant Cell',
    category: 'Botany',
    stain: 'Unstained (live)',
    defaultMag: '400×',
    description:
      'Live Elodea canadensis leaf cells showing brilliant green chloroplasts undergoing active cytoplasmic streaming. Cell wall, central vacuole and oval chloroplasts are clearly resolved.',
    accentRgb: '74,222,128',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/11/Elodea_leaf_cells_with_visible_chloroplasts.jpg',
    attribution: 'Wikimedia Commons · CC BY-SA 3.0',
  },
  {
    id: 'animal-cell',
    name: 'Animal Cell',
    category: 'Cytology',
    stain: 'Methylene Blue',
    defaultMag: '400×',
    description:
      'Human buccal (cheek) epithelial cells stained with methylene blue. Polygonal cell outlines, central nucleus and visible nuclear membrane are characteristic of this stratified squamous epithelium.',
    accentRgb: '56,189,248',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Human_cheek_epithelial_cells_-_3.jpg',
    attribution: 'Wikimedia Commons · CC BY-SA',
  },
  {
    id: 'bone-tissue',
    name: 'Bone Tissue',
    category: 'Osteology',
    stain: 'Ground section',
    defaultMag: '40×',
    description:
      'Ground cross-section of compact bone showing Haversian systems (osteons). Central Haversian canals surrounded by concentric lamellae of mineralised collagen, with osteocyte lacunae visible between layers.',
    accentRgb: '203,213,225',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/b3/Compact_bone_-_ground_cross_section.jpg',
    attribution: 'Wikimedia Commons · Public domain',
  },
  {
    id: 'bacteria',
    name: 'Bacteria',
    category: 'Microbiology',
    stain: 'Gram Stain',
    defaultMag: '1000×',
    description:
      'Gram-negative rod-shaped bacteria (bacilli) under oil-immersion objective. The differential Gram stain reveals peptidoglycan wall thickness and is the primary taxonomic tool in clinical microbiology.',
    accentRgb: '163,230,53',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Lactobacillus_sp_07.jpg/640px-Lactobacillus_sp_07.jpg',
    attribution: 'Wikimedia Commons · CC BY-SA',
  },
  {
    id: 'virus',
    name: 'Virus',
    category: 'Virology',
    stain: 'TEM (negative stain)',
    defaultMag: '1000×',
    description:
      'Transmission electron micrograph of coronavirus SARS-CoV-2. Characteristic spike glycoproteins (S-protein) form the distinctive crown ("corona") on the lipid bilayer envelope at nanometre resolution.',
    accentRgb: '34,211,238',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/82/SARS-CoV-2_without_background.png',
    attribution: 'NIAID · Public domain',
  },
];

// ─── Zoom presets ──────────────────────────────────────────────────────────────

interface ZoomPreset {
  label: string;
  zoom: number;
  scaleLabel: string;
}

const ZOOM_PRESETS: ZoomPreset[] = [
  { label: '40×',   zoom: 1.0,  scaleLabel: '100 µm' },
  { label: '100×',  zoom: 2.5,  scaleLabel: '50 µm'  },
  { label: '400×',  zoom: 10.0, scaleLabel: '20 µm'  },
  { label: '1000×', zoom: 25.0, scaleLabel: '5 µm'   },
];
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 30;

function getScaleLabel(zoom: number): string {
  const µm = Math.round(100 / zoom);
  if (µm >= 100) return `${µm} µm`;
  if (µm >= 1)   return `${µm} µm`;
  return `${(µm * 1000).toFixed(0)} nm`;
}

function getNearestPreset(zoom: number): string {
  let nearest = ZOOM_PRESETS[0];
  let minDist = Math.abs(Math.log(zoom) - Math.log(nearest.zoom));
  for (const p of ZOOM_PRESETS) {
    const dist = Math.abs(Math.log(zoom) - Math.log(p.zoom));
    if (dist < minDist) { minDist = dist; nearest = p; }
  }
  return nearest.label;
}

// ─── Slide tray card ──────────────────────────────────────────────────────────

function SlideTrayCard({
  slide, isActive, onClick, lm,
}: {
  slide: SlideData; isActive: boolean; onClick: () => void; lm: boolean;
}) {
  const { accentRgb: rgb } = slide;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex-shrink-0 text-left rounded-xl overflow-hidden transition-all duration-200"
      style={{
        width: 110,
        background: isActive
          ? `rgba(${rgb},0.14)`
          : lm ? 'rgba(240,253,244,0.7)' : 'rgba(3,12,8,0.7)',
        border: isActive
          ? `1.5px solid rgba(${rgb},0.55)`
          : lm ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(52,211,153,0.08)',
        boxShadow: isActive ? `0 0 18px rgba(${rgb},0.2)` : 'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Colour accent top strip */}
      <div
        className="h-0.5 w-full"
        style={{ background: `rgba(${rgb},0.8)` }}
      />

      <div className="p-2.5">
        {/* Category pill */}
        <span
          className="text-[8px] uppercase tracking-[0.18em] font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: `rgba(${rgb},0.12)`,
            border: `1px solid rgba(${rgb},0.25)`,
            color: `rgb(${rgb})`,
          }}
        >
          {slide.category}
        </span>

        <p
          className="mt-1.5 text-[11px] font-bold leading-tight"
          style={{ color: isActive ? `rgb(${rgb})` : lm ? '#065f46' : 'rgba(255,255,255,0.88)' }}
        >
          {slide.name}
        </p>

        <p
          className="mt-0.5 text-[9px]"
          style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)' }}
        >
          {slide.stain}
        </p>

        {/* Mag label */}
        <div className="mt-2 flex items-center gap-1">
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: `rgba(${rgb},0.8)` }}
          />
          <span
            className="text-[9px] font-medium"
            style={{ color: `rgba(${rgb},0.8)` }}
          >
            {slide.defaultMag}
          </span>
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="slide-active-indicator"
          className="absolute left-0 top-8 bottom-2 w-0.5 rounded-full"
          style={{ background: `rgba(${rgb},0.9)` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </motion.button>
  );
}

// ─── Viewer controls bar ───────────────────────────────────────────────────────

function ControlsBar({
  zoom, onZoomPreset, onZoomIn, onZoomOut, onReset,
  isFullscreen, onToggleFullscreen, lm,
}: {
  zoom: number;
  onZoomPreset: (z: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  lm: boolean;
}) {
  const glassBase = {
    background: lm ? 'rgba(240,253,244,0.85)' : 'rgba(3,10,7,0.85)',
    backdropFilter: 'blur(20px)',
    border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.14)',
  } as const;

  const iconBtn = (onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
        border: lm ? '1px solid rgba(52,211,153,0.22)' : '1px solid rgba(52,211,153,0.15)',
        color: lm ? '#065f46' : 'rgba(52,211,153,0.9)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = lm
          ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.16)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = lm
          ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)';
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-2xl flex-wrap"
      style={glassBase}
    >
      {/* Zoom presets */}
      <div className="flex items-center gap-1">
        {ZOOM_PRESETS.map((p) => {
          const active = Math.abs(zoom - p.zoom) < 0.3 * p.zoom;
          return (
            <button
              key={p.label}
              onClick={() => onZoomPreset(p.zoom)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all duration-200"
              style={{
                background: active
                  ? 'rgba(52,211,153,0.22)'
                  : lm ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                border: active
                  ? '1px solid rgba(52,211,153,0.45)'
                  : lm ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                color: active
                  ? '#34d399'
                  : lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.45)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div
        className="w-px h-5 flex-shrink-0"
        style={{ background: lm ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)' }}
      />

      {/* Zoom in / out / reset / fullscreen */}
      <div className="flex items-center gap-1">
        {iconBtn(onZoomOut, 'Zoom out', <ZoomOut size={13} strokeWidth={2} />)}
        {iconBtn(onZoomIn,  'Zoom in',  <ZoomIn  size={13} strokeWidth={2} />)}
        {iconBtn(onReset,   'Reset',    <RotateCcw size={12} strokeWidth={2} />)}
        {iconBtn(
          onToggleFullscreen,
          isFullscreen ? 'Exit fullscreen' : 'Fullscreen',
          isFullscreen
            ? <Minimize2 size={12} strokeWidth={2} />
            : <Maximize2 size={12} strokeWidth={2} />,
        )}
      </div>
    </div>
  );
}

// ─── Scale bar ─────────────────────────────────────────────────────────────────

function ScaleBar({ zoom, lm }: { zoom: number; lm: boolean }) {
  const label = getScaleLabel(zoom);
  const preset = getNearestPreset(zoom);
  return (
    <div
      className="flex flex-col items-start gap-1 px-2.5 py-2 rounded-xl"
      style={{
        background: lm ? 'rgba(240,253,244,0.85)' : 'rgba(3,10,7,0.85)',
        backdropFilter: 'blur(16px)',
        border: lm ? '1px solid rgba(52,211,153,0.18)' : '1px solid rgba(52,211,153,0.12)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="h-0.5 rounded-full"
          style={{ width: 64, background: lm ? '#065f46' : 'rgba(52,211,153,0.9)' }}
        />
        <span
          className="text-[9px] font-semibold"
          style={{ color: lm ? '#065f46' : '#34d399' }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[8px] uppercase tracking-[0.18em]"
        style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)' }}
      >
        ≈ {preset}
      </span>
    </div>
  );
}

// ─── Image state ───────────────────────────────────────────────────────────────

type ImgState = 'loading' | 'ready' | 'error';

// ─── Microscope viewer ─────────────────────────────────────────────────────────

const MicroscopeViewer = memo(({
  slide, lm, isFullscreen, onToggleFullscreen,
}: {
  slide: SlideData;
  lm: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) => {
  const containerRef   = useRef<HTMLDivElement>(null);
  const wrapperRef     = useRef<HTMLDivElement>(null);
  const zoomRef        = useRef(1);
  const panRef         = useRef({ x: 0, y: 0 });
  const dragRef        = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const touchRef       = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const [displayZoom,  setDisplayZoom]  = useState(1);
  const [imgState,     setImgState]     = useState<ImgState>('loading');
  const [showInfo,     setShowInfo]     = useState(false);

  // Reset zoom/pan when slide changes
  useEffect(() => {
    zoomRef.current = 1;
    panRef.current  = { x: 0, y: 0 };
    applyTransform(1, 0, 0, true);
    setDisplayZoom(1);
    setImgState('loading');
    setShowInfo(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id]);

  const applyTransform = useCallback(
    (z: number, px: number, py: number, animate = false) => {
      if (!wrapperRef.current) return;
      wrapperRef.current.style.transition = animate
        ? 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)'
        : 'none';
      wrapperRef.current.style.transform = `translate(${px}px, ${py}px) scale(${z})`;
    },
    [],
  );

  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const cx   = e.clientX - rect.left - rect.width  / 2;
    const cy   = e.clientY - rect.top  - rect.height / 2;
    const factor = Math.pow(1.12, -e.deltaY / 100);
    const newZ   = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
    const scale  = newZ / zoomRef.current;
    const newPx  = (panRef.current.x - cx) * scale + cx;
    const newPy  = (panRef.current.y - cy) * scale + cy;
    zoomRef.current    = newZ;
    panRef.current     = { x: newPx, y: newPy };
    applyTransform(newZ, newPx, newPy, false);
    setDisplayZoom(newZ);
  }, [applyTransform]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Mouse pan ───────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      sx: e.clientX, sy: e.clientY,
      px: panRef.current.x, py: panRef.current.y,
    };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    const newPx = dragRef.current.px + dx;
    const newPy = dragRef.current.py + dy;
    panRef.current = { x: newPx, y: newPy };
    applyTransform(zoomRef.current, newPx, newPy, false);
  }, [applyTransform]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  }, []);

  // ── Touch pan + pinch-zoom ──────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx   = e.touches[1].clientX - e.touches[0].clientX;
      const dy   = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      touchRef.current = { dist, midX, midY };
      dragRef.current  = null;
    } else if (e.touches.length === 1) {
      dragRef.current = {
        sx: e.touches[0].clientX, sy: e.touches[0].clientY,
        px: panRef.current.x,     py: panRef.current.y,
      };
      touchRef.current = null;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchRef.current) {
      const dx      = e.touches[1].clientX - e.touches[0].clientX;
      const dy      = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.hypot(dx, dy);
      const factor  = newDist / touchRef.current.dist;
      const rect    = containerRef.current!.getBoundingClientRect();
      const midX    = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width  / 2;
      const midY    = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top  - rect.height / 2;
      const newZ    = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      const sc      = newZ / zoomRef.current;
      const newPx   = (panRef.current.x - midX) * sc + midX;
      const newPy   = (panRef.current.y - midY) * sc + midY;
      zoomRef.current    = newZ;
      panRef.current     = { x: newPx, y: newPy };
      touchRef.current   = { dist: newDist, midX, midY };
      applyTransform(newZ, newPx, newPy, false);
      setDisplayZoom(newZ);
    } else if (e.touches.length === 1 && dragRef.current) {
      const dx   = e.touches[0].clientX - dragRef.current.sx;
      const dy   = e.touches[0].clientY - dragRef.current.sy;
      const newPx = dragRef.current.px + dx;
      const newPy = dragRef.current.py + dy;
      panRef.current = { x: newPx, y: newPy };
      applyTransform(zoomRef.current, newPx, newPy, false);
    }
  }, [applyTransform]);

  const onTouchEnd = useCallback(() => {
    dragRef.current  = null;
    touchRef.current = null;
  }, []);

  // ── Preset / reset / ±zoom ──────────────────────────────────────────────────
  const jumpToPreset = useCallback((z: number) => {
    zoomRef.current = z;
    panRef.current  = { x: 0, y: 0 };
    applyTransform(z, 0, 0, true);
    setDisplayZoom(z);
  }, [applyTransform]);

  const stepZoom = useCallback((factor: number) => {
    const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
    const sc   = newZ / zoomRef.current;
    const newPx = panRef.current.x * sc;
    const newPy = panRef.current.y * sc;
    zoomRef.current = newZ;
    panRef.current  = { x: newPx, y: newPy };
    applyTransform(newZ, newPx, newPy, true);
    setDisplayZoom(newZ);
  }, [applyTransform]);

  const reset = useCallback(() => {
    zoomRef.current = 1;
    panRef.current  = { x: 0, y: 0 };
    applyTransform(1, 0, 0, true);
    setDisplayZoom(1);
  }, [applyTransform]);

  // Fullscreen escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggleFullscreen(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, onToggleFullscreen]);

  const rgb = slide.accentRgb;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* ── Viewer canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-2xl overflow-hidden select-none"
        style={{
          minHeight: 320,
          cursor: 'grab',
          background: lm
            ? 'radial-gradient(circle at 50% 50%, rgba(240,253,244,0.9) 0%, rgba(220,252,231,0.95) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(2,10,6,0.97) 0%, rgba(1,6,4,0.99) 100%)',
          border: lm
            ? '1px solid rgba(52,211,153,0.2)'
            : '1px solid rgba(52,211,153,0.12)',
          boxShadow: lm
            ? '0 8px 40px rgba(52,211,153,0.08)'
            : '0 8px 40px rgba(0,0,0,0.5)',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Microscope grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: lm
              ? 'radial-gradient(circle, rgba(52,211,153,0.12) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(52,211,153,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Crosshair center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            className="relative"
            style={{ opacity: imgState === 'ready' ? 0.18 : 0 }}
          >
            <div
              className="absolute"
              style={{ width: 1, height: 40, background: '#34d399', top: -20, left: 0 }}
            />
            <div
              className="absolute"
              style={{ width: 40, height: 1, background: '#34d399', top: 0, left: -20 }}
            />
          </div>
        </div>

        {/* Image wrapper — transform applied here */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ willChange: 'transform' }}
        >
          <div
            ref={wrapperRef}
            style={{ transformOrigin: 'center center', userSelect: 'none' }}
          >
            {imgState !== 'error' && (
              <img
                key={slide.id}
                src={slide.imageUrl}
                alt={slide.name}
                loading="lazy"
                draggable={false}
                onLoad={() => setImgState('ready')}
                onError={() => setImgState('error')}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  opacity: imgState === 'ready' ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                  borderRadius: 4,
                }}
              />
            )}
          </div>
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {imgState === 'loading' && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
              style={{
                background: lm
                  ? 'rgba(236,253,245,0.96)'
                  : 'rgba(1,8,5,0.96)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={26} className="text-emerald-400" strokeWidth={1.6} />
              </motion.div>
              <div className="text-center">
                <p
                  className="text-[13px] font-semibold mb-0.5"
                  style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.88)' }}
                >
                  Loading slide…
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.3)' }}
                >
                  {slide.stain} · {slide.category}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        <AnimatePresence>
          {imgState === 'error' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-8 text-center"
              style={{
                background: lm ? 'rgba(236,253,245,0.97)' : 'rgba(1,8,5,0.97)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `rgba(${rgb},0.1)`,
                  border: `1px solid rgba(${rgb},0.25)`,
                }}
              >
                <AlertCircle size={24} style={{ color: `rgb(${rgb})` }} strokeWidth={1.4} />
              </div>
              <div>
                <p
                  className="text-[14px] font-semibold mb-1.5"
                  style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.88)' }}
                >
                  Image Unavailable
                </p>
                <p
                  className="text-[11px] leading-relaxed max-w-[240px]"
                  style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.38)' }}
                >
                  The <strong>{slide.name}</strong> specimen image could not be
                  loaded. Viewer controls remain active for demonstration.
                </p>
              </div>
              <a
                href={`https://commons.wikimedia.org/wiki/Special:Search/${encodeURIComponent(slide.name + ' microscopy')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-3 py-1.5 rounded-full"
                style={{
                  background: `rgba(${rgb},0.12)`,
                  border: `1px solid rgba(${rgb},0.25)`,
                  color: `rgb(${rgb})`,
                }}
              >
                Browse Wikimedia Commons
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info panel overlay */}
        <AnimatePresence>
          {showInfo && imgState === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-14 left-3 right-3 z-30 rounded-xl p-3.5"
              style={{
                background: lm ? 'rgba(240,253,244,0.95)' : 'rgba(2,10,6,0.95)',
                backdropFilter: 'blur(20px)',
                border: lm
                  ? '1px solid rgba(52,211,153,0.2)'
                  : '1px solid rgba(52,211,153,0.14)',
              }}
            >
              <p
                className="text-[11px] font-semibold mb-1"
                style={{ color: lm ? '#065f46' : '#34d399' }}
              >
                {slide.name} — {slide.stain}
              </p>
              <p
                className="text-[10px] leading-relaxed mb-1.5"
                style={{ color: lm ? 'rgba(6,78,59,0.65)' : 'rgba(255,255,255,0.5)' }}
              >
                {slide.description}
              </p>
              <p
                className="text-[9px]"
                style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.22)' }}
              >
                {slide.attribution}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD top-right: zoom + info */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
          {/* Zoom badge */}
          <div
            className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold"
            style={{
              background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(2,10,6,0.9)',
              backdropFilter: 'blur(12px)',
              border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.14)',
              color: lm ? '#065f46' : '#34d399',
            }}
          >
            {displayZoom < 2   ? '40×'
              : displayZoom < 5  ? '100×'
              : displayZoom < 18 ? '400×'
              : '1000×'}
            {' '}
            <span
              className="font-normal"
              style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
            >
              {(displayZoom).toFixed(1)}×
            </span>
          </div>

          {/* Scale bar */}
          <div className="pointer-events-none">
            <ScaleBar zoom={displayZoom} lm={lm} />
          </div>
        </div>

        {/* Info toggle bottom-left */}
        <button
          className="absolute bottom-3 left-3 z-20 w-7 h-7 rounded-full flex items-center justify-center pointer-events-auto transition-all duration-200"
          style={{
            background: showInfo
              ? 'rgba(52,211,153,0.25)'
              : lm ? 'rgba(240,253,244,0.85)' : 'rgba(2,10,6,0.85)',
            backdropFilter: 'blur(12px)',
            border: showInfo
              ? '1px solid rgba(52,211,153,0.5)'
              : lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.14)',
          }}
          onClick={() => setShowInfo((v) => !v)}
          title="Slide information"
        >
          <Info
            size={13}
            strokeWidth={2}
            style={{ color: showInfo ? '#34d399' : lm ? '#065f46' : 'rgba(52,211,153,0.8)' }}
          />
        </button>

        {/* Specimen label bottom-right */}
        <div
          className="absolute bottom-3 right-3 z-20 px-2 py-1 rounded-lg"
          style={{
            background: lm ? 'rgba(240,253,244,0.85)' : 'rgba(2,10,6,0.85)',
            backdropFilter: 'blur(12px)',
            border: lm ? '1px solid rgba(52,211,153,0.18)' : '1px solid rgba(52,211,153,0.12)',
          }}
        >
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(52,211,153,0.5)' }}
          >
            {slide.category}
          </span>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ControlsBar
          zoom={displayZoom}
          onZoomPreset={jumpToPreset}
          onZoomIn={() => stepZoom(1.5)}
          onZoomOut={() => stepZoom(1 / 1.5)}
          onReset={reset}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          lm={lm}
        />

        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
          style={{
            background: lm ? 'rgba(240,253,244,0.7)' : 'rgba(3,10,7,0.7)',
            backdropFilter: 'blur(12px)',
            border: lm ? '1px solid rgba(52,211,153,0.14)' : '1px solid rgba(52,211,153,0.1)',
          }}
        >
          <ScanLine size={11} className="text-emerald-400" strokeWidth={2} />
          <span
            className="text-[9px] font-medium"
            style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.3)' }}
          >
            Scroll to zoom · Drag to pan · Pinch on touch
          </span>
        </div>
      </div>
    </div>
  );
});

MicroscopeViewer.displayName = 'MicroscopeViewer';

// ─── Main section ──────────────────────────────────────────────────────────────

const MicroscopeSection = memo(({ lm }: { lm: boolean }) => {
  const [activeSlide,   setActiveSlide]   = useState<SlideData>(SLIDES[0]);
  const [isFullscreen,  setIsFullscreen]  = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), []);

  const viewer = (
    <MicroscopeViewer
      slide={activeSlide}
      lm={lm}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );

  return (
    <>
      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-5"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.22))',
            border: '1px solid rgba(52,211,153,0.35)',
          }}
        >
          <ScanLine size={13} strokeWidth={1.9} className="text-emerald-400" />
        </div>
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#065f46' : 'rgba(255,255,255,0.92)' }}
        >
          Virtual Microscope
        </h2>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
        >
          Select · Zoom · Explore
        </span>
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
          style={{
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.22)',
            color: '#34d399',
          }}
        >
          {SLIDES.length} Slides
        </span>
      </motion.div>

      {/* ── Slide tray (horizontal scroll) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4"
      >
        {SLIDES.map((slide, i) => (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <SlideTrayCard
              slide={slide}
              isActive={activeSlide.id === slide.id}
              onClick={() => setActiveSlide(slide)}
              lm={lm}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Viewer ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ minHeight: 480 }}
        >
          {viewer}
        </motion.div>
      </AnimatePresence>

      {/* ── Attribution footnote ── */}
      <div
        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: lm ? 'rgba(52,211,153,0.04)' : 'rgba(52,211,153,0.03)',
          border: lm ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(52,211,153,0.07)',
        }}
      >
        <FlaskConical size={11} className="text-emerald-400 flex-shrink-0" strokeWidth={1.8} />
        <span
          className="text-[10px]"
          style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.25)' }}
        >
          All specimen images are high-resolution educational materials sourced from
          Wikimedia Commons under open licences. No proprietary content is used.
        </span>
      </div>

      {/* ── Fullscreen overlay ── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[250] flex flex-col p-4"
            style={{
              background: lm
                ? 'rgba(236,253,245,0.98)'
                : 'rgba(1,6,4,0.98)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.22))',
                  border: '1px solid rgba(52,211,153,0.35)',
                }}
              >
                <ScanLine size={11} strokeWidth={2} className="text-emerald-400" />
              </div>
              <span
                className="text-[13px] font-semibold"
                style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#065f46' : 'rgba(255,255,255,0.9)' }}
              >
                {activeSlide.name}
              </span>
              <span
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
              >
                {activeSlide.stain}
              </span>
              <button
                onClick={toggleFullscreen}
                className="ml-auto px-3 py-1 rounded-full text-[10px] font-medium"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                }}
              >
                Exit fullscreen (Esc)
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <MicroscopeViewer
                slide={activeSlide}
                lm={lm}
                isFullscreen={true}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

MicroscopeSection.displayName = 'MicroscopeSection';
export default MicroscopeSection;
