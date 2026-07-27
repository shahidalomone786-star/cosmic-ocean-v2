import { memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import BioDNAIcon from './BioDNAIcon';
import BioParticles from './BioParticles';

// ─── Biology Hub — Hero Entry Card (shown on Home below Simulation Search) ────

interface BioHeroCardProps {
  lm: boolean;
  onOpen: () => void;
}

const BioHeroCard = memo(({ lm, onOpen }: BioHeroCardProps) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="relative mb-6 mt-2 overflow-hidden rounded-3xl cursor-pointer group"
      style={{
        background: lm
          ? 'linear-gradient(135deg, rgba(240,253,244,0.97) 0%, rgba(236,252,255,0.97) 50%, rgba(243,240,255,0.97) 100%)'
          : 'linear-gradient(135deg, rgba(2,14,10,0.95) 0%, rgba(2,12,20,0.95) 50%, rgba(8,4,20,0.95) 100%)',
        border: lm
          ? '1px solid rgba(52,211,153,0.3)'
          : '1px solid rgba(52,211,153,0.2)',
        boxShadow: lm
          ? '0 8px 40px rgba(52,211,153,0.12), 0 2px 12px rgba(52,211,153,0.08)'
          : '0 8px 40px rgba(52,211,153,0.08), 0 0 0 1px rgba(52,211,153,0.06)',
        backdropFilter: 'blur(24px)',
      }}
      onClick={onOpen}
      whileHover={{ scale: 1.012, y: -2 }}
      whileTap={{ scale: 0.995 }}
    >
      {/* ── Particle field ── */}
      <BioParticles count={35} />

      {/* ── Ambient glow blobs ── */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(163,230,53,0.07) 0%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 flex items-center gap-6 px-6 py-6 sm:px-8 sm:py-7">

        {/* Left: Text */}
        <div className="flex-1 min-w-0">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.3)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-400">
                New Hub
              </span>
            </motion.div>
            <Sparkles size={12} className="text-emerald-400/60" />
          </div>

          {/* Title */}
          <motion.h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-none"
            style={{
              fontFamily: 'var(--app-font-heading)',
              background: lm
                ? 'linear-gradient(135deg, #065f46 0%, #0e7490 50%, #4f46e5 100%)'
                : 'linear-gradient(135deg, #34d399 0%, #06b6d4 50%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Biology Hub
          </motion.h2>

          {/* Subtitle */}
          <p
            className="text-[12px] sm:text-[13px] leading-relaxed mb-4 max-w-xs"
            style={{ color: lm ? 'rgba(6,78,59,0.7)' : 'rgba(255,255,255,0.5)' }}
          >
            Explore Human Anatomy, Cells, DNA, Genetics, Evolution and
            Interactive Biology.
          </p>

          {/* CTA Button */}
          <motion.button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            whileHover={{ scale: 1.04, x: 3 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              boxShadow: '0 4px 18px rgba(16,185,129,0.35)',
              color: '#fff',
              border: 'none',
            }}
          >
            Enter Biology Hub
            <motion.span
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={14} strokeWidth={2.5} />
            </motion.span>
          </motion.button>
        </div>

        {/* Right: Animated DNA icon */}
        <div className="flex-shrink-0 relative">
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)',
              filter: 'blur(12px)',
              transform: 'scale(1.2)',
            }}
          />
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BioDNAIcon size={100} />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom glow bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(52,211,153,0.5), rgba(34,211,238,0.5), transparent)',
        }}
      />

      {/* ── Hover shimmer overlay ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(52,211,153,0.04) 0%, rgba(34,211,238,0.04) 50%, rgba(163,130,250,0.04) 100%)',
        }}
      />
    </motion.div>
  );
});

BioHeroCard.displayName = 'BioHeroCard';
export default BioHeroCard;
