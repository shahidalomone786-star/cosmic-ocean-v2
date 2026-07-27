import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import BioHeader from './BioHeader';
import BioSidebar from './BioSidebar';
import BioMainContent from './BioMainContent';
import { type BioSectionId } from './types';

// ─── Biology Hub — Full-Screen Page ───────────────────────────────────────────
// Composes Header + Sidebar + MainContent.
// Shown/hidden via `showBiologyHub` state in App.tsx (same pattern as CosmicNexus).

interface BiologyHubProps {
  lm: boolean;
  onToggleLm: () => void;
  onClose: () => void;
}

const BiologyHub = memo(({ lm, onToggleLm, onClose }: BiologyHubProps) => {
  const [activeSection, setActiveSection] = useState<BioSectionId>('3d-anatomy');
  const [searchQuery,   setSearchQuery]   = useState('');

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

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar — hidden on very small screens, shown from sm: */}
        <div className="hidden sm:flex w-52 flex-shrink-0 h-full">
          <BioSidebar
            lm={lm}
            activeSection={activeSection}
            onSelect={(id) => {
              setActiveSection(id);
              setSearchQuery('');
            }}
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
