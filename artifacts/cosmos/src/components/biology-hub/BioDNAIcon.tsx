import { motion } from 'framer-motion';
import { memo } from 'react';

// ─── Biology Hub — Animated DNA Double Helix Icon ─────────────────────────────
// Pure SVG + Framer Motion — no external dependencies

interface BioDNAIconProps {
  size?: number;
  className?: string;
}

const BioDNAIcon = memo(({ size = 96, className = '' }: BioDNAIconProps) => {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.4;

  // Build double helix rungs as small ellipses
  const rungs = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const y = cy + Math.sin(angle) * (r * 0.55);
    const x = cx + Math.cos(angle) * (r * 0.18);
    return { x, y, angle };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Outer glow filter */}
        <filter id="bio-dna-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Strand gradient A */}
        <linearGradient id="bio-strand-a" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#06b6d4" stopOpacity="1"   />
          <stop offset="100%" stopColor="#a3e635" stopOpacity="0.9" />
        </linearGradient>

        {/* Strand gradient B */}
        <linearGradient id="bio-strand-b" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%"   stopColor="#818cf8" stopOpacity="0.9" />
          <stop offset="50%"  stopColor="#34d399" stopOpacity="1"   />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
        </linearGradient>

        {/* Rung gradient */}
        <linearGradient id="bio-rung" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#34d399" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* ── Outer rotating ring ── */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        stroke="rgba(52,211,153,0.15)"
        strokeWidth="1"
        strokeDasharray="4 6"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* ── Inner counter-rotating ring ── */}
      <motion.circle
        cx={cx} cy={cy} r={r * 0.72}
        stroke="rgba(34,211,238,0.12)"
        strokeWidth="1"
        strokeDasharray="3 8"
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* ── DNA Helix group — slow spin ── */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        filter="url(#bio-dna-glow)"
      >
        {/* Strand A — left sinusoid */}
        <motion.ellipse
          cx={cx - r * 0.18} cy={cy}
          rx={r * 0.14} ry={r * 0.72}
          stroke="url(#bio-strand-a)"
          strokeWidth="2.2"
          fill="none"
        />

        {/* Strand B — right sinusoid */}
        <motion.ellipse
          cx={cx + r * 0.18} cy={cy}
          rx={r * 0.14} ry={r * 0.72}
          stroke="url(#bio-strand-b)"
          strokeWidth="2.2"
          fill="none"
        />

        {/* Connecting rungs */}
        {rungs.map((rung, i) => (
          <line
            key={i}
            x1={cx - r * 0.28}
            y1={rung.y}
            x2={cx + r * 0.28}
            y2={rung.y}
            stroke="url(#bio-rung)"
            strokeWidth="1.2"
            opacity={0.5 + 0.5 * Math.abs(Math.cos(rung.angle))}
          />
        ))}
      </motion.g>

      {/* ── Central glowing dot ── */}
      <motion.circle
        cx={cx} cy={cy} r={r * 0.12}
        fill="rgba(52,211,153,0.9)"
        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        filter="url(#bio-dna-glow)"
      />

      {/* ── Orbiting accent dots ── */}
      {[0, 1, 2].map((i) => {
        const baseAngle = (i / 3) * Math.PI * 2;
        return (
          <motion.circle
            key={i}
            r={r * 0.055}
            fill={['#34d399', '#06b6d4', '#818cf8'][i]}
            animate={{
              cx: [
                cx + Math.cos(baseAngle) * r * 0.85,
                cx + Math.cos(baseAngle + Math.PI * 2 / 3) * r * 0.85,
                cx + Math.cos(baseAngle + Math.PI * 4 / 3) * r * 0.85,
                cx + Math.cos(baseAngle + Math.PI * 2) * r * 0.85,
              ],
              cy: [
                cy + Math.sin(baseAngle) * r * 0.85,
                cy + Math.sin(baseAngle + Math.PI * 2 / 3) * r * 0.85,
                cy + Math.sin(baseAngle + Math.PI * 4 / 3) * r * 0.85,
                cy + Math.sin(baseAngle + Math.PI * 2) * r * 0.85,
              ],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 1.3,
            }}
          />
        );
      })}
    </svg>
  );
});

BioDNAIcon.displayName = 'BioDNAIcon';
export default BioDNAIcon;
