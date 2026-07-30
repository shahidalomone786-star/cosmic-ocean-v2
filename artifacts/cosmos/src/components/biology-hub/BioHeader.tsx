import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Sun, Moon, Dna, X, Clock, TrendingUp } from 'lucide-react';

// ─── Biology Hub — Sticky Header ──────────────────────────────────────────────

interface BioHeaderProps {
  lm: boolean;
  onToggleLm: () => void;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSelect: (q: string) => void;
  recentSearches: string[];
  suggestedSearches: string[];
}

const BioHeader = memo(({
  lm, onToggleLm, onClose,
  searchQuery, onSearchChange, onSearchSelect,
  recentSearches, suggestedSearches,
}: BioHeaderProps) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!searchFocused) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchFocused]);

  const showDropdown = searchFocused && searchQuery.trim().length === 0;
  const suggestions = searchQuery.trim().length === 0
    ? suggestedSearches
    : suggestedSearches.filter((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0"
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
            className="text-[15px] font-bold tracking-tight hidden xs:inline"
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

        {/* ── Search input with dropdown ── */}
        <div className="flex-1 min-w-0 relative">
          <motion.div
            animate={{ scale: searchFocused ? 1.01 : 1 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
              style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onSearchChange('');
                  setSearchFocused(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search anatomy, DNA, cells… (instant)"
              className="w-full pl-8 pr-8 py-1.5 rounded-full text-[12px] outline-none transition-all duration-300"
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
            {/* Clear button */}
            <AnimatePresence>
              {searchQuery.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => { onSearchChange(''); inputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: lm ? 'rgba(6,78,59,0.15)' : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <X size={9} style={{ color: lm ? 'rgba(6,78,59,0.6)' : 'rgba(255,255,255,0.5)' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Dropdown: recent + suggested ── */}
          <AnimatePresence>
            {showDropdown && (recentSearches.length > 0 || suggestions.length > 0) && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50"
                style={{
                  background: lm ? 'rgba(240,253,244,0.97)' : 'rgba(3,12,8,0.97)',
                  border: lm ? '1px solid rgba(52,211,153,0.22)' : '1px solid rgba(52,211,153,0.14)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: lm
                    ? '0 8px 32px rgba(52,211,153,0.1)'
                    : '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="px-3 pt-2.5 pb-1.5">
                    <div
                      className="flex items-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold"
                      style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
                    >
                      <Clock size={9} />
                      Recent
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((r) => (
                        <button
                          key={r}
                          onClick={() => { onSearchSelect(r); setSearchFocused(false); }}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150 hover:scale-105"
                          style={{
                            background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)',
                            border: '1px solid rgba(52,211,153,0.18)',
                            color: lm ? '#065f46' : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {recentSearches.length > 0 && suggestions.length > 0 && (
                  <div
                    className="mx-3 my-1.5 h-px"
                    style={{ background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)' }}
                  />
                )}

                {/* Suggested searches */}
                {suggestions.length > 0 && (
                  <div className="px-3 pt-1.5 pb-2.5">
                    <div
                      className="flex items-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold"
                      style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}
                    >
                      <TrendingUp size={9} />
                      Suggested
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.slice(0, 8).map((s) => (
                        <button
                          key={s}
                          onClick={() => { onSearchSelect(s); setSearchFocused(false); }}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150 hover:scale-105"
                          style={{
                            background: lm ? 'rgba(34,211,238,0.07)' : 'rgba(34,211,238,0.06)',
                            border: '1px solid rgba(34,211,238,0.15)',
                            color: lm ? '#0e7490' : 'rgba(34,211,238,0.75)',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
