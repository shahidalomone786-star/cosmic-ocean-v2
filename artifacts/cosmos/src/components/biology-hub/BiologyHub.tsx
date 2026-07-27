import { useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Layers3, Heart, Network, Zap, Brain, Microscope,
  GitBranch, FlaskConical, Atom, TreePine, BookOpen, Play, Gauge,
  Dna, Bone, ScanLine,
} from 'lucide-react';
import BioHeader from './BioHeader';
import BioSidebar from './BioSidebar';
import BioMainContent from './BioMainContent';
import { BIO_NAV_ITEMS, type BioSectionId } from './types';

// ─── Biology Hub — Full-Screen Page ───────────────────────────────────────────

interface BiologyHubProps {
  lm: boolean;
  onToggleLm: () => void;
  onClose: () => void;
}

// Icon lookup for mobile nav chips
const MOBILE_ICON_MAP: Record<string, React.FC<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Layers3, Heart, Network, Zap, Brain, Microscope,
  GitBranch, FlaskConical, Atom, TreePine, BookOpen, Play, Gauge,
  Dna, Bone, ScanLine,
};

// ─── Mobile horizontal scroll navigation ──────────────────────────────────────
function MobileNav({
  lm,
  activeSection,
  onSelect,
}: {
  lm: boolean;
  activeSection: BioSectionId;
  onSelect: (id: BioSectionId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="sm:hidden flex-shrink-0 overflow-x-auto scrollbar-hide"
      style={{
        background: lm ? 'rgba(240,253,244,0.92)' : 'rgba(2,8,6,0.88)',
        borderBottom: lm
          ? '1px solid rgba(52,211,153,0.14)'
          : '1px solid rgba(52,211,153,0.08)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 px-3 py-2 w-max"
      >
        {BIO_NAV_ITEMS.map((item) => {
          const Icon = MOBILE_ICON_MAP[item.iconName] ?? Microscope;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                // Scroll active chip into view
                const btn = document.getElementById(`mob-nav-${item.id}`);
                btn?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
              }}
              id={`mob-nav-${item.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium flex-shrink-0 transition-all duration-200"
              style={{
                background: isActive
                  ? lm ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.16)'
                  : lm ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                border: isActive
                  ? lm ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(52,211,153,0.35)'
                  : lm ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.08)',
                color: isActive
                  ? lm ? '#065f46' : '#34d399'
                  : lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.4)',
                boxShadow: isActive ? '0 0 10px rgba(52,211,153,0.12)' : 'none',
              }}
            >
              <Icon
                size={11}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? item.color : ''}
              />
              {item.label}
              {item.badge && (
                <span
                  className="text-[8px] px-1 py-px rounded-full font-semibold"
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
                    border: `1px solid ${
                      item.badge === 'New'
                        ? 'rgba(52,211,153,0.3)'
                        : item.badge === 'Popular'
                          ? 'rgba(167,139,250,0.3)'
                          : 'rgba(34,211,238,0.3)'
                    }`,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
const BiologyHub = memo(({ lm, onToggleLm, onClose }: BiologyHubProps) => {
  const [activeSection, setActiveSection] = useState<BioSectionId>('3d-anatomy');
  const [searchQuery,   setSearchQuery]   = useState('');

  const handleSelect = (id: BioSectionId) => {
    setActiveSection(id);
    setSearchQuery('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1     }}
      exit={{    opacity: 0, y: 24, scale: 0.99  }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[160] flex flex-col"
      style={{
        background: lm
          ? 'linear-gradient(160deg, rgba(236,253,245,0.99) 0%, rgba(240,249,255,0.99) 50%, rgba(245,240,255,0.99) 100%)'
          : 'linear-gradient(160deg, rgba(1,8,5,0.99) 0%, rgba(2,8,16,0.99) 50%, rgba(6,2,18,0.99) 100%)',
      }}
    >
      {/* ── Ambient background glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
            filter: 'blur(32px)',
          }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(163,230,53,0.04) 0%, transparent 70%)',
            filter: 'blur(28px)',
          }}
        />
      </div>

      {/* ── Sticky Header ── */}
      <BioHeader
        lm={lm}
        onToggleLm={onToggleLm}
        onClose={onClose}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ── Mobile horizontal scroll nav (hidden sm+) ── */}
      <MobileNav
        lm={lm}
        activeSection={activeSection}
        onSelect={handleSelect}
      />

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar — hidden on very small screens, shown from sm: */}
        <div className="hidden sm:flex w-52 flex-shrink-0 h-full">
          <BioSidebar
            lm={lm}
            activeSection={activeSection}
            onSelect={handleSelect}
          />
        </div>

        {/* Main content scrollable area */}
        <BioMainContent
          lm={lm}
          activeSection={activeSection}
          searchQuery={searchQuery}
        />
      </div>
    </motion.div>
  );
});

BiologyHub.displayName = 'BiologyHub';
export default BiologyHub;
