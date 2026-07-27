import { motion } from 'framer-motion';
import { Play, Video, Microscope, Dna, Brain, Heart, Sparkles, Lock } from 'lucide-react';

// ─── Videos Section — Premium Coming Soon ────────────────────────────────────
// Videos integration is planned but requires YouTube API configuration.

interface VideosSectionProps {
  lm: boolean;
}

const PLANNED_CATEGORIES = [
  { icon: Heart,     label: 'Anatomy & Physiology', count: '240+ videos',  color: 'text-rose-400',    bg: 'rgba(251,113,133,0.1)', border: 'rgba(251,113,133,0.2)' },
  { icon: Dna,       label: 'Genetics & Genomics',  count: '180+ videos',  color: 'text-lime-400',    bg: 'rgba(163,230,53,0.1)',  border: 'rgba(163,230,53,0.2)'  },
  { icon: Brain,     label: 'Neuroscience',          count: '150+ videos',  color: 'text-violet-400',  bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  { icon: Microscope,label: 'Cell Biology',          count: '200+ videos',  color: 'text-teal-400',    bg: 'rgba(45,212,191,0.1)',  border: 'rgba(45,212,191,0.2)'  },
  { icon: Sparkles,  label: 'Evolution & Ecology',   count: '120+ videos',  color: 'text-yellow-400',  bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.2)'  },
  { icon: Video,     label: 'Lab Techniques',        count: '90+ videos',   color: 'text-sky-400',     bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.2)'  },
];

const glassCard = (lm: boolean) => ({
  background: lm ? 'rgba(240,253,244,0.9)' : 'rgba(3,14,9,0.8)',
  border: lm ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(52,211,153,0.12)',
  backdropFilter: 'blur(18px)',
});

export default function VideosSection({ lm }: VideosSectionProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: 'var(--app-font-heading)', color: lm ? '#064e3b' : 'rgba(255,255,255,0.92)' }}
        >
          Educational Videos
        </h2>
        <span
          className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
          style={{ background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.25)', color: '#f472b6' }}
        >
          Coming Soon
        </span>
      </div>

      {/* Hero coming-soon card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl mb-5 p-8 flex flex-col items-center text-center"
        style={{
          background: lm
            ? 'linear-gradient(135deg, rgba(253,242,248,0.98) 0%, rgba(240,253,244,0.98) 60%, rgba(240,242,255,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(14,4,12,0.98) 0%, rgba(2,14,8,0.98) 60%, rgba(4,6,20,0.98) 100%)',
          border: lm ? '1px solid rgba(244,114,182,0.25)' : '1px solid rgba(244,114,182,0.15)',
        }}
      >
        {/* Ambient glows */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)', filter: 'blur(24px)' }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)', filter: 'blur(20px)' }}
        />

        {/* Play button mockup */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mb-5"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(244,114,182,0.2), rgba(167,139,250,0.2))',
              border: '1px solid rgba(244,114,182,0.3)',
              boxShadow: '0 0 32px rgba(244,114,182,0.15)',
            }}
          >
            <Play size={28} strokeWidth={1.8} className="text-pink-400 ml-1" />
          </div>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        </motion.div>

        <div className="flex items-center gap-2 mb-3">
          <Lock size={13} className="text-pink-400 opacity-70" />
          <span
            className="text-[9px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: lm ? 'rgba(236,72,153,0.6)' : 'rgba(244,114,182,0.5)' }}
          >
            Coming in the Next Phase
          </span>
        </div>

        <h3
          className="text-[20px] font-bold tracking-tight mb-2"
          style={{
            fontFamily: 'var(--app-font-heading)',
            background: lm
              ? 'linear-gradient(135deg, #9d174d, #5b21b6)'
              : 'linear-gradient(135deg, #f472b6, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Biology Video Library
        </h3>
        <p
          className="text-[12px] leading-relaxed max-w-sm mb-4"
          style={{ color: lm ? 'rgba(80,7,36,0.55)' : 'rgba(255,255,255,0.38)' }}
        >
          Thousands of curated biology videos from top educators — from MIT OpenCourseWare to
          Khan Academy and Nature Research. Stream, search, and learn at your pace.
        </p>

        {/* Planned features */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['MIT OpenCourseWare', 'Khan Academy', 'CrashCourse', 'Nature Research', 'TED-Ed'].map((src) => (
            <span
              key={src}
              className="text-[10px] px-2.5 py-1 rounded-full font-medium"
              style={{
                background: lm ? 'rgba(244,114,182,0.1)' : 'rgba(244,114,182,0.08)',
                border: '1px solid rgba(244,114,182,0.2)',
                color: lm ? '#9d174d' : 'rgba(244,114,182,0.65)',
              }}
            >
              {src}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Planned categories */}
      <div
        className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3"
        style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
      >
        Planned categories
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {PLANNED_CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              ...glassCard(lm),
              opacity: 0.75,
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
            >
              <cat.icon size={15} strokeWidth={1.7} className={cat.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium" style={{ color: lm ? '#064e3b' : 'rgba(255,255,255,0.75)' }}>
                {cat.label}
              </p>
            </div>
            <span className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.35)' : 'rgba(255,255,255,0.25)' }}>
              {cat.count}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
