import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Microscope } from 'lucide-react';
import { ORGAN_DATA, ORGAN_LIST, type OrganId } from './organData';
import OrganViewer from './OrganViewer';

// ─── Anatomy3DViewer — Organ selection grid + viewer launcher ─────────────────
// Replaces the Phase 1 placeholder in BioMainContent's AnatomySection.

interface Anatomy3DViewerProps {
  lm: boolean;
}

const CARD_ORDER: OrganId[] = ['heart', 'brain', 'lungs', 'skeleton', 'kidney', 'liver', 'dna'];

function OrganCard({
  organId, onClick, lm, index,
}: { organId: OrganId; onClick: () => void; lm: boolean; index: number }) {
  const organ = ORGAN_DATA[organId];
  const rgb = organ.accentRgb;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl text-left group cursor-pointer"
      style={{
        background: lm
          ? `rgba(${rgb},0.08)`
          : `rgba(${rgb},0.05)`,
        border: lm
          ? `1px solid rgba(${rgb},0.25)`
          : `1px solid rgba(${rgb},0.15)`,
        boxShadow: `0 4px 20px rgba(${rgb},0.08)`,
        aspectRatio: '1 / 1.05',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60"
        style={{
          background: `radial-gradient(circle, rgba(${rgb},0.22) 0%, transparent 70%)`,
          filter: 'blur(12px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-3.5">
        {/* Icon */}
        <div className="mb-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              background: `rgba(${rgb},0.14)`,
              border: `1px solid rgba(${rgb},0.25)`,
              boxShadow: `0 0 16px rgba(${rgb},0.18)`,
            }}
          >
            {organ.icon}
          </div>
        </div>

        {/* Name */}
        <p
          className="text-[12px] font-bold leading-tight mb-0.5 tracking-tight"
          style={{ color: lm ? `rgb(${rgb})` : `rgba(${rgb},0.95)` }}
        >
          {organ.name.replace('Human ', '')}
        </p>

        {/* Subtitle */}
        <p
          className="text-[9px] uppercase tracking-[0.18em] font-medium mb-auto"
          style={{ color: lm ? `rgba(${rgb},0.55)` : `rgba(${rgb},0.40)` }}
        >
          {organ.subtitle}
        </p>

        {/* Fact */}
        <div
          className="mt-2.5 pt-2 flex items-center justify-between"
          style={{ borderTop: `1px solid rgba(${rgb},0.12)` }}
        >
          <p className="text-[9px]" style={{ color: lm ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.28)' }}>
            {organ.facts[0].label}: <span style={{ color: `rgba(${rgb},0.75)` }}>{organ.facts[0].value}</span>
          </p>
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.30)` }}
          >
            <Maximize2 size={9} style={{ color: `rgba(${rgb},0.8)` }} strokeWidth={2.5} />
          </motion.div>
        </div>
      </div>

      {/* Hover shimmer */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-2xl"
        style={{ background: `linear-gradient(135deg, rgba(${rgb},0.05) 0%, rgba(${rgb},0.02) 100%)` }}
      />
    </motion.button>
  );
}

const Anatomy3DViewer = memo(({ lm }: Anatomy3DViewerProps) => {
  const [activeOrgan, setActiveOrgan] = useState<OrganId | null>(null);

  return (
    <div>
      {/* ── Section header ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(34,211,238,0.22))',
              border: '1px solid rgba(52,211,153,0.35)',
            }}
          >
            <Microscope size={13} strokeWidth={1.8} className="text-emerald-400" />
          </div>
          <h2
            className="text-[15px] font-semibold tracking-tight"
            style={{
              fontFamily: 'var(--app-font-heading)',
              color: lm ? '#065f46' : 'rgba(255,255,255,0.92)',
            }}
          >
            Interactive 3D Anatomy
          </h2>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.35)' }}
        >
          Click to explore
        </span>
        <span
          className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-semibold"
          style={{
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.25)',
            color: '#34d399',
          }}
        >
          WebGL · 60fps
        </span>
      </div>

      {/* ── Organ grid (4 + 3 layout) ── */}
      <div className="grid grid-cols-4 gap-2.5 mb-2.5">
        {CARD_ORDER.slice(0, 4).map((id, i) => (
          <OrganCard
            key={id}
            organId={id}
            onClick={() => setActiveOrgan(id)}
            lm={lm}
            index={i}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CARD_ORDER.slice(4).map((id, i) => (
          <OrganCard
            key={id}
            organId={id}
            onClick={() => setActiveOrgan(id)}
            lm={lm}
            index={i + 4}
          />
        ))}
      </div>

      {/* ── Usage hint ── */}
      <div
        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{
          background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.04)',
          border: lm ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(52,211,153,0.08)',
        }}
      >
        <span className="text-[10px]" style={{ color: lm ? 'rgba(6,78,59,0.5)' : 'rgba(255,255,255,0.28)' }}>
          🖱 Drag to rotate · Scroll to zoom · Right-drag to pan · All models are 60fps procedural WebGL
        </span>
      </div>

      {/* ── Full-screen Organ Viewer ── */}
      <OrganViewer
        organId={activeOrgan}
        onClose={() => setActiveOrgan(null)}
        lm={lm}
      />
    </div>
  );
});

Anatomy3DViewer.displayName = 'Anatomy3DViewer';
export default Anatomy3DViewer;
