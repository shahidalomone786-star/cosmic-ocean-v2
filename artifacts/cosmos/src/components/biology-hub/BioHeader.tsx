import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Sun, Moon, Dna } from 'lucide-react';

// ─── Biology Hub — Sticky Header ──────────────────────────────────────────────

interface BioHeaderProps {
  lm: boolean;
  onToggleLm: () => void;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const BioHeader = memo(({ lm, onToggleLm, onClose, searchQuery, onSearchChange }: BioHeaderProps) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 flex-shrink-0"
      style={{
        background: lm
          ? 'rgba(240,253,244,0.92)'
          : 'rgba(3,10,8,0.88)',
        backdropFilter: 'blur(24px)',
        borderBottom: lm
          ? '1px solid rgba(52,211,153,0.2)'
          : '1px solid rgba(52,211,153,0.1)',
        boxShadow: lm
          ? '0 1px 20px rgba(52,211,153,0.06)'
          : '0 1px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">

        {/* ── Back button ── */}
        <motion.button
          whileHover={{ x: -2, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium flex-shrink-0 transition-all duration-200"
          style={{
            background: lm ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.1)',
            border: lm ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(52,211,153,0.2)',
            color: lm ? '#065f46' : 'rgba(52,211,153,0.9)',
          }}
        >
          <ArrowLeft size={13} strokeWidth={2.2} />
          <span className="hidden sm:inline">Back</span>
        </motion.button>

        {/* ── Title ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              boxShadow: '0 0 12px rgba(16,185,129,0.4)',
            }}
          >
            <Dna size={14} strokeWidth={2} className="text-white" />
          </div>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{
              fontFamily: 'var(--app-font-heading)',
              background: lm
                ? 'linear-gradient(135deg, #065f46, #0e7490)'
                : 'linear-gradient(135deg, #34d399, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Biology Hub
          </span>
        </div>

        {/* ── Search input ── */}
        <motion.div
          className="flex-1 min-w-0 relative"
          animate={{ scale: searchFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search anatomy, DNA, cells…"
            className="w-full pl-8 pr-4 py-1.5 rounded-full text-[12px] outline-none transition-all duration-300"
            style={{
              background: lm
                ? 'rgba(52,211,153,0.08)'
                : 'rgba(52,211,153,0.06)',
              border: searchFocused
                ? lm
                  ? '1px solid rgba(52,211,153,0.5)'
                  : '1px solid rgba(52,211,153,0.4)'
                : lm
                  ? '1px solid rgba(52,211,153,0.18)'
                  : '1px solid rgba(52,211,153,0.12)',
              color: lm ? '#065f46' : 'rgba(255,255,255,0.85)',
            }}
          />
        </motion.div>

        {/* ── Dark / Light toggle ── */}
        <motion.button
          whileHover={{ scale: 1.08, rotate: 15 }}
          whileTap={{ scale: 0.92 }}
          onClick={onToggleLm}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: lm ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.1)',
            border: lm ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(52,211,153,0.2)',
          }}
          aria-label="Toggle dark/light mode"
        >
          {lm
            ? <Moon size={14} strokeWidth={1.8} style={{ color: '#065f46' }} />
            : <Sun  size={14} strokeWidth={1.8} style={{ color: '#34d399' }} />
          }
        </motion.button>

      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.4) 30%, rgba(34,211,238,0.4) 70%, transparent 100%)',
        }}
      />
    </motion.header>
  );
});

BioHeader.displayName = 'BioHeader';
export default BioHeader;
