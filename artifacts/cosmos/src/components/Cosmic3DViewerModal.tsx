import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MasterpieceItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  theme: MasterpieceTheme;
}

export type MasterpieceTheme = 'blue' | 'amber' | 'purple' | 'cyan' | 'emerald';

// ─── Theme Palettes ───────────────────────────────────────────────────────────
const THEMES: Record<MasterpieceTheme, {
  primary: string;
  secondary: string;
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
    secondary:   '#0ea5e9',
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
    secondary:   '#d97706',
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
    secondary:   '#9333ea',
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
    secondary:   '#06b6d4',
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
    secondary:   '#059669',
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

// ─── Boot Messages ────────────────────────────────────────────────────────────
const BOOT_SEQUENCE = [
  'Initializing 3D engine...',
  'Calibrating stellar coordinates...',
  'Loading spatial geometry...',
  'Compiling shader programs...',
  'Establishing data streams...',
  'Rendering volumetric environment...',
  'Optimizing for real-time display...',
  'Almost ready...',
];

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

// ─── Hex Grid SVG overlay ─────────────────────────────────────────────────────
function HexGrid({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          <polygon
            points="30,1 59,16 59,46 30,61 1,46 1,16"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" opacity="0.06" />
    </svg>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────
interface Props {
  item: MasterpieceItem;
  onClose: () => void;
}

export default function Cosmic3DViewerModal({ item, onClose }: Props) {
  const t = THEMES[item.theme];
  const [bootIdx, setBootIdx]     = useState(0);
  const [progress, setProgress]   = useState(0);
  const [scanY, setScanY]         = useState(0);

  // Boot message ticker
  useEffect(() => {
    const id = setInterval(() => {
      setBootIdx(prev => Math.min(prev + 1, BOOT_SEQUENCE.length - 1));
    }, 600);
    return () => clearInterval(id);
  }, []);

  // Progress bar
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 3 + 1;
      if (p >= 100) { p = 100; clearInterval(id); }
      setProgress(p);
    }, 120);
    return () => clearInterval(id);
  }, []);

  // Scan-line sweep
  useEffect(() => {
    let y = 0;
    const id = setInterval(() => {
      y = (y + 1.2) % 100;
      setScanY(y);
    }, 16);
    return () => clearInterval(id);
  }, []);

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
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${t.bgFrom}, ${t.bgTo})` }}
    >
      {/* Starfield */}
      <StarField color={t.primary} />

      {/* Hex grid */}
      <HexGrid color={t.primary} />

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10 transition-none"
        style={{
          top: `${scanY}%`,
          background: `linear-gradient(90deg, transparent, ${t.scanLine}, transparent)`,
        }}
      />

      {/* Radial ambient glow (center) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% 50%, ${t.glow.replace('0.5)', '0.08)')}, transparent 70%)`,
        }}
      />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={onClose}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          background:   'rgba(255,255,255,0.05)',
          border:       `1px solid rgba(255,255,255,0.12)`,
          color:        'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </motion.button>

      {/* Corner decoration lines */}
      {[
        'top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl w-16 h-16',
        'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl w-16 h-16',
        'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl w-16 h-16',
        'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl w-16 h-16',
      ].map((cls, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
          className={`absolute pointer-events-none ${cls}`}
          style={{ borderColor: t.primary, opacity: 0.4 }}
        />
      ))}

      {/* ── Central content ── */}
      <div className="relative z-20 flex flex-col items-center gap-8 px-6 text-center max-w-lg w-full">

        {/* Triple-ring spinner */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Outer ring — slow CCW */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{
              border: `2px solid transparent`,
              borderTopColor:   t.ring1,
              borderRightColor: t.ring3,
              boxShadow: `0 0 18px ${t.glow}`,
            }}
          />
          {/* Middle ring — medium CW */}
          <motion.div
            className="absolute rounded-full"
            style={{ inset: 14 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                border: `2px solid transparent`,
                borderTopColor:    t.ring2,
                borderBottomColor: t.ring2,
                boxShadow: `0 0 12px ${t.ring2}`,
              }}
            />
          </motion.div>
          {/* Inner ring — fast CCW */}
          <motion.div
            className="absolute rounded-full"
            style={{ inset: 28 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                border: `1.5px dashed ${t.ring1}`,
                opacity: 0.7,
              }}
            />
          </motion.div>

          {/* Core pulse */}
          <motion.div
            className="absolute rounded-full"
            style={{ inset: 42 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${t.primary}, ${t.secondary})`,
                boxShadow: `0 0 20px ${t.glow}, 0 0 40px ${t.glow}`,
              }}
            />
          </motion.div>

          {/* Icon inside */}
          <span
            className="relative z-10 text-3xl"
            style={{ filter: `drop-shadow(0 0 12px ${t.primary})` }}
          >
            {item.icon}
          </span>
        </div>

        {/* Title */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold tracking-tight mb-2"
            style={{
              color: '#fff',
              textShadow: t.textGlow,
              fontFamily: 'var(--app-font-heading)',
            }}
          >
            {item.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm tracking-widest uppercase"
            style={{ color: t.primary, letterSpacing: '0.2em' }}
          >
            {item.subtitle}
          </motion.p>
        </div>

        {/* Boot log */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full rounded-xl px-5 py-4 font-mono text-xs leading-relaxed text-left"
          style={{
            background:   'rgba(0,0,0,0.55)',
            border:       `1px solid rgba(255,255,255,0.07)`,
            backdropFilter: 'blur(10px)',
            color:        'rgba(255,255,255,0.45)',
            maxHeight:    '110px',
            overflowY:    'hidden',
          }}
        >
          {BOOT_SEQUENCE.slice(0, bootIdx + 1).map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ color: t.primary }}>›</span>
              <span style={{ color: i === bootIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)' }}>
                {msg}
              </span>
              {i === bootIdx && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ color: t.primary }}
                >
                  ▌
                </motion.span>
              )}
            </div>
          ))}
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.55 }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Engine Load
            </span>
            <span className="text-[10px] font-mono" style={{ color: t.primary }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${t.secondary}, ${t.primary})`,
                boxShadow: `0 0 10px ${t.glow}`,
                transition: 'width 0.12s ease-out',
              }}
            />
          </div>
        </motion.div>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
          style={{
            background:   t.badgeBg,
            border:       `1px solid ${t.badgeBorder}`,
            color:        t.badgeText,
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ background: t.primary, boxShadow: `0 0 6px ${t.primary}` }}
          />
          3D Engine Initializing — Coming Soon
        </motion.div>

      </div>
    </motion.div>
  );
}
