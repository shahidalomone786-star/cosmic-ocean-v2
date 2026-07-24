import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Orbit, Telescope, Sparkles, Satellite, type LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MasterpieceItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  theme: MasterpieceTheme;
}

export type MasterpieceTheme = 'blue' | 'amber' | 'purple' | 'cyan' | 'emerald';

// ─── Iframe URLs per card (all NASA Eyes — mobile-friendly WebGL) ─────────────
const IFRAME_URLS: Record<string, string> = {
  'blue-dot':        'https://eyes.nasa.gov/apps/earth/',
  'solar-system':    'https://eyes.nasa.gov/apps/solar-system/',
  'deep-space':      'https://eyes.nasa.gov/apps/exo/',
  'infinite-galaxy': 'https://eyes.nasa.gov/apps/asteroids/',
  'gaia-starmap':    'https://eyes.nasa.gov/apps/dsn/',
};

// ─── Lucide icon map per card ─────────────────────────────────────────────────
const PIECE_ICONS: Record<string, LucideIcon> = {
  'blue-dot':        Globe,
  'solar-system':    Orbit,
  'deep-space':      Telescope,
  'infinite-galaxy': Sparkles,
  'gaia-starmap':    Satellite,
};

// ─── Theme Palettes ───────────────────────────────────────────────────────────
const THEMES: Record<MasterpieceTheme, {
  primary: string;
  glow: string;
  ring1: string;
  ring2: string;
  ring3: string;
  textGlow: string;
  bgFrom: string;
  bgTo: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  scanLine: string;
}> = {
  blue: {
    primary:     '#38bdf8',
    glow:        'rgba(56,189,248,0.5)',
    ring1:       'rgba(56,189,248,0.8)',
    ring2:       'rgba(14,165,233,0.5)',
    ring3:       'rgba(56,189,248,0.25)',
    textGlow:    '0 0 24px rgba(56,189,248,0.9), 0 0 48px rgba(56,189,248,0.4)',
    bgFrom:      'rgba(2,8,23,0.98)',
    bgTo:        'rgba(3,12,35,0.98)',
    badgeBg:     'rgba(56,189,248,0.12)',
    badgeBorder: 'rgba(56,189,248,0.35)',
    badgeText:   '#38bdf8',
    scanLine:    'rgba(56,189,248,0.15)',
  },
  amber: {
    primary:     '#f59e0b',
    glow:        'rgba(245,158,11,0.5)',
    ring1:       'rgba(245,158,11,0.8)',
    ring2:       'rgba(217,119,6,0.5)',
    ring3:       'rgba(245,158,11,0.25)',
    textGlow:    '0 0 24px rgba(245,158,11,0.9), 0 0 48px rgba(245,158,11,0.4)',
    bgFrom:      'rgba(15,8,2,0.98)',
    bgTo:        'rgba(25,12,3,0.98)',
    badgeBg:     'rgba(245,158,11,0.12)',
    badgeBorder: 'rgba(245,158,11,0.35)',
    badgeText:   '#f59e0b',
    scanLine:    'rgba(245,158,11,0.15)',
  },
  purple: {
    primary:     '#a855f7',
    glow:        'rgba(168,85,247,0.5)',
    ring1:       'rgba(168,85,247,0.8)',
    ring2:       'rgba(147,51,234,0.5)',
    ring3:       'rgba(168,85,247,0.25)',
    textGlow:    '0 0 24px rgba(168,85,247,0.9), 0 0 48px rgba(168,85,247,0.4)',
    bgFrom:      'rgba(8,3,20,0.98)',
    bgTo:        'rgba(12,4,28,0.98)',
    badgeBg:     'rgba(168,85,247,0.12)',
    badgeBorder: 'rgba(168,85,247,0.35)',
    badgeText:   '#a855f7',
    scanLine:    'rgba(168,85,247,0.15)',
  },
  cyan: {
    primary:     '#22d3ee',
    glow:        'rgba(34,211,238,0.5)',
    ring1:       'rgba(34,211,238,0.8)',
    ring2:       'rgba(6,182,212,0.5)',
    ring3:       'rgba(34,211,238,0.25)',
    textGlow:    '0 0 24px rgba(34,211,238,0.9), 0 0 48px rgba(34,211,238,0.4)',
    bgFrom:      'rgba(1,10,14,0.98)',
    bgTo:        'rgba(2,14,20,0.98)',
    badgeBg:     'rgba(34,211,238,0.12)',
    badgeBorder: 'rgba(34,211,238,0.35)',
    badgeText:   '#22d3ee',
    scanLine:    'rgba(34,211,238,0.15)',
  },
  emerald: {
    primary:     '#10b981',
    glow:        'rgba(16,185,129,0.5)',
    ring1:       'rgba(16,185,129,0.8)',
    ring2:       'rgba(5,150,105,0.5)',
    ring3:       'rgba(16,185,129,0.25)',
    textGlow:    '0 0 24px rgba(16,185,129,0.9), 0 0 48px rgba(16,185,129,0.4)',
    bgFrom:      'rgba(2,12,8,0.98)',
    bgTo:        'rgba(3,16,10,0.98)',
    badgeBg:     'rgba(16,185,129,0.12)',
    badgeBorder: 'rgba(16,185,129,0.35)',
    badgeText:   '#10b981',
    scanLine:    'rgba(16,185,129,0.15)',
  },
};

// ─── Star Canvas backdrop ─────────────────────────────────────────────────────
function StarField({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.004 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = frame * 0.016;
      for (const s of stars) {
        const alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * s.a})`;
        ctx.fill();
      }
      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ─── Loading Spinner Scene ────────────────────────────────────────────────────
const BOOT_SEQUENCE = [
  'Initializing 3D engine...',
  'Calibrating stellar coordinates...',
  'Loading spatial geometry...',
  'Compiling shader programs...',
  'Establishing data streams...',
  'Rendering volumetric environment...',
  'Ready.',
];

function LoadingScene({ item, t }: { item: MasterpieceItem; t: typeof THEMES[MasterpieceTheme] }) {
  const [bootIdx, setBootIdx]   = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setBootIdx(prev => Math.min(prev + 1, BOOT_SEQUENCE.length - 1));
    }, 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 18 + 8;
      if (p >= 100) { p = 100; clearInterval(id); }
      setProgress(p);
    }, 80);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 text-center">
      {/* Triple-ring spinner */}
      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ border: '2px solid transparent', borderTopColor: t.ring1, borderRightColor: t.ring3, boxShadow: `0 0 18px ${t.glow}` }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ inset: 12 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-full h-full rounded-full" style={{ border: '2px solid transparent', borderTopColor: t.ring2, borderBottomColor: t.ring2, boxShadow: `0 0 12px ${t.ring2}` }} />
        </motion.div>
        <motion.div
          className="absolute rounded-full"
          style={{ inset: 24 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-full h-full rounded-full" style={{ border: `1.5px dashed ${t.ring1}`, opacity: 0.7 }} />
        </motion.div>
        <motion.div
          className="absolute rounded-full"
          style={{ inset: 36 }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}, ${t.glow.replace('0.5)', '0.8)')})`, boxShadow: `0 0 20px ${t.glow}` }} />
        </motion.div>
        {(() => {
          const Icon = PIECE_ICONS[item.id] ?? Globe;
          return (
            <Icon
              className="relative z-10"
              size={36}
              strokeWidth={1.4}
              style={{ color: t.primary, filter: `drop-shadow(0 0 10px ${t.primary})` }}
            />
          );
        })()}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#fff', textShadow: t.textGlow }}>
        {item.title}
      </h1>
      <p className="text-xs tracking-widest uppercase mb-6" style={{ color: t.primary, letterSpacing: '0.2em' }}>
        {item.subtitle}
      </p>

      {/* Boot log */}
      <div
        className="w-full max-w-xs rounded-xl px-4 py-3 font-mono text-xs leading-relaxed text-left mb-5"
        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', color: 'rgba(255,255,255,0.45)', maxHeight: 90, overflowY: 'hidden' }}
      >
        {BOOT_SEQUENCE.slice(0, bootIdx + 1).map((msg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span style={{ color: t.primary }}>›</span>
            <span style={{ color: i === bootIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>{msg}</span>
            {i === bootIdx && bootIdx < BOOT_SEQUENCE.length - 1 && (
              <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ color: t.primary }}>▌</motion.span>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading</span>
          <span className="text-[10px] font-mono" style={{ color: t.primary }}>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${t.glow.replace('0.5)', '0.8)')}, ${t.primary})`, boxShadow: `0 0 10px ${t.glow}`, transition: 'width 0.08s ease-out' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────
interface Props {
  item: MasterpieceItem;
  onClose: () => void;
}

export default function Cosmic3DViewerModal({ item, onClose }: Props) {
  const t = THEMES[item.theme];
  const [showIframe, setShowIframe] = useState(false);
  const iframeUrl = IFRAME_URLS[item.id] ?? '';

  // Show spinner for 1.4 seconds, then reveal the iframe
  useEffect(() => {
    setShowIframe(false);
    const id = setTimeout(() => setShowIframe(true), 1400);
    return () => clearTimeout(id);
  }, [item.id]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[300] overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${t.bgFrom}, ${t.bgTo})` }}
    >
      {/* ── Loading phase — starfield + spinner ── */}
      <AnimatePresence>
        {!showIframe && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-10"
          >
            <StarField color={t.primary} />
            {/* Radial ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${t.glow.replace('0.5)', '0.10)')}, transparent 70%)` }}
            />
            <LoadingScene item={item} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iframe phase ── */}
      <AnimatePresence>
        {showIframe && (
          <motion.div
            key="iframe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-10"
          >
            <iframe
              src={iframeUrl}
              title={item.title}
              allowFullScreen
              allow="fullscreen; accelerometer; gyroscope; xr-spatial-tracking"
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
              loading="eager"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Close button — always on top ── */}
      <motion.button
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        onClick={onClose}
        className="absolute top-4 left-4 z-[400] flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          background:     'rgba(0,0,0,0.55)',
          border:         `1px solid ${t.badgeBorder}`,
          color:          t.primary,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow:      `0 0 18px ${t.glow}, 0 4px 20px rgba(0,0,0,0.5)`,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.75)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)';
          (e.currentTarget as HTMLButtonElement).style.color = t.primary;
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Close
      </motion.button>

      {/* Corner accent lines */}
      {([
        'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl',
        'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl',
        'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl',
        'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl',
      ] as const).map((cls, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className={`absolute w-10 h-10 pointer-events-none z-[350] ${cls}`}
          style={{ borderColor: t.primary, opacity: 0.35 }}
        />
      ))}
    </motion.div>
  );
}
