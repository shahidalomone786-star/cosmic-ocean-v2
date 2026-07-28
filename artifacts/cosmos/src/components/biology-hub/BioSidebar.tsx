import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers3, Heart, Network, Activity, Zap, Brain, Microscope,
  GitBranch, FlaskConical, Atom, TreePine, BookOpen, Play, Gauge,
  Dna, Bone, ScanLine, Leaf,
} from 'lucide-react';
import { BIO_NAV_ITEMS, type BioSectionId } from './types';

// ─── Biology Hub — Left Navigation Sidebar ────────────────────────────────────

interface BioSidebarProps {
  lm: boolean;
  activeSection: BioSectionId;
  onSelect: (id: BioSectionId) => void;
}

// Icon lookup map (must stay in sync with types.ts iconName strings)
const ICON_MAP: Record<string, React.FC<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Layers3, Heart, Network, Activity, Zap, Brain, Microscope,
  GitBranch, FlaskConical, Atom, TreePine, BookOpen, Play, Gauge,
  Dna, Bone, ScanLine, Leaf,
};

const SECTION_GROUPS = [
  {
    label: 'Human Body',
    ids: ['3d-anatomy', 'microscope', 'organs', 'body-systems', 'skeleton', 'muscles', 'brain'],
  },
  {
    label: 'Molecular',
    ids: ['cells', 'dna', 'genetics', 'microbiology', 'viruses'],
  },
  {
    label: 'Life Science',
    ids: ['evolution', 'biochemistry', 'feel-nature'],
  },
  {
    label: 'Resources',
    ids: ['research', 'videos', 'simulations'],
  },
] as const;

const BioSidebar = memo(({ lm, activeSection, onSelect }: BioSidebarProps) => {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="flex flex-col h-full overflow-y-auto scrollbar-hide py-4 px-2 gap-1"
      style={{
        background: lm
          ? 'rgba(240,253,244,0.6)'
          : 'rgba(2,8,6,0.5)',
        borderRight: lm
          ? '1px solid rgba(52,211,153,0.15)'
          : '1px solid rgba(52,211,153,0.08)',
      }}
    >
      {SECTION_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          {/* Group label */}
          <p
            className="px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-semibold mb-1"
            style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.3)' }}
          >
            {group.label}
          </p>

          {/* Items */}
          {BIO_NAV_ITEMS.filter((item) => (group.ids as readonly string[]).includes(item.id)).map((item, idx) => {
            const Icon = ICON_MAP[item.iconName] ?? Microscope;
            const isActive = activeSection === item.id;

            return (
              <motion.button
                key={item.id}
                onClick={() => onSelect(item.id)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left mb-0.5 transition-all duration-200 relative group"
                style={{
                  background: isActive
                    ? lm
                      ? `rgba(52,211,153,0.14)`
                      : `rgba(52,211,153,0.12)`
                    : 'transparent',
                  border: isActive
                    ? lm
                      ? '1px solid rgba(52,211,153,0.3)'
                      : '1px solid rgba(52,211,153,0.2)'
                    : '1px solid transparent',
                  boxShadow: isActive
                    ? `0 0 14px ${item.glow.replace('0.3', '0.1')}`
                    : 'none',
                }}
              >
                {/* Active indicator bar */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="bio-sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: 'linear-gradient(180deg, #34d399, #06b6d4)' }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <div
                  className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-300"
                  style={{
                    background: isActive
                      ? lm
                        ? `rgba(52,211,153,0.2)`
                        : `rgba(52,211,153,0.15)`
                      : lm
                        ? 'rgba(0,0,0,0.04)'
                        : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Icon
                    size={12}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={`transition-colors duration-200 ${
                      isActive ? item.color : lm ? 'text-slate-400' : 'text-white/35'
                    } group-hover:${item.color}`}
                  />
                </div>

                {/* Label + badge */}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span
                    className="text-[12px] font-medium truncate"
                    style={{
                      color: isActive
                        ? lm ? '#065f46' : 'rgba(255,255,255,0.92)'
                        : lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className="ml-1 text-[8px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{
                        background: item.badge === 'New'
                          ? 'rgba(52,211,153,0.2)'
                          : item.badge === 'Popular'
                            ? 'rgba(167,139,250,0.2)'
                            : 'rgba(34,211,238,0.2)',
                        color: item.badge === 'New'
                          ? '#34d399'
                          : item.badge === 'Popular'
                            ? '#a78bfa'
                            : '#22d3ee',
                        border: `1px solid ${item.badge === 'New' ? 'rgba(52,211,153,0.3)' : item.badge === 'Popular' ? 'rgba(167,139,250,0.3)' : 'rgba(34,211,238,0.3)'}`,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      ))}

      {/* Bottom fade */}
      <div className="h-8 flex-shrink-0" />
    </motion.aside>
  );
});

BioSidebar.displayName = 'BioSidebar';
export default BioSidebar;
