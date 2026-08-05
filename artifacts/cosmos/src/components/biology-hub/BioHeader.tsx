import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Sun, Moon, Dna, X, Clock, TrendingUp,
  SlidersHorizontal, Pin, Trash2, Bookmark, BookmarkCheck,
} from 'lucide-react';
import type { AdvancedSearchFilters, SavedSearch, SearchHistoryEntry } from '../../lib/advancedSearch';

// ─── Biology Hub — Sticky Header ──────────────────────────────────────────────

interface BioHeaderProps {
  lm: boolean;
  onToggleLm: () => void;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSelect: (q: string) => void;
  recentSearches: SearchHistoryEntry[];
  suggestedSearches: string[];
  advancedFilters: AdvancedSearchFilters;
  onAdvancedFiltersChange: (filters: AdvancedSearchFilters) => void;
  onHistorySelect: (entry: SearchHistoryEntry) => void;
  onHistoryPin: (id: string) => void;
  onHistoryDelete: (id: string) => void;
  savedSearches: SavedSearch[];
  onSaveSearch: () => void;
  onSavedSearchSelect: (entry: SavedSearch) => void;
  onSavedSearchDelete: (id: string) => void;
}

function FilterInput({
  label,
  value,
  onChange,
  lm,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  lm: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[9px] font-medium" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.45)' }}>
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none"
        style={{
          background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.07)',
          border: '1px solid rgba(52,211,153,0.15)',
          color: lm ? '#064e3b' : 'rgba(255,255,255,0.78)',
        }}
      />
    </label>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  lm,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  lm: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-[9px] font-medium" style={{ color: lm ? 'rgba(6,78,59,0.55)' : 'rgba(255,255,255,0.45)' }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none"
        style={{
          background: lm ? 'rgba(52,211,153,0.06)' : 'rgba(3,20,13,0.95)',
          border: '1px solid rgba(52,211,153,0.15)',
          color: lm ? '#064e3b' : 'rgba(255,255,255,0.78)',
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option || `Any ${label.toLowerCase()}`}
          </option>
        ))}
      </select>
    </label>
  );
}

const BioHeader = memo(({
  lm, onToggleLm, onClose,
  searchQuery, onSearchChange, onSearchSelect,
  recentSearches, suggestedSearches, advancedFilters, onAdvancedFiltersChange,
  onHistorySelect, onHistoryPin, onHistoryDelete, savedSearches,
  onSaveSearch, onSavedSearchSelect, onSavedSearchDelete,
}: BioHeaderProps) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const showDropdown = searchFocused;
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

          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-medium"
              style={{
                background: showAdvanced ? 'rgba(52,211,153,0.16)' : 'transparent',
                border: '1px solid rgba(52,211,153,0.16)',
                color: lm ? '#065f46' : 'rgba(52,211,153,0.75)',
              }}
            >
              <SlidersHorizontal size={10} />
              Advanced filters
            </button>
            {(Object.values(advancedFilters).some(Boolean) || searchQuery.match(/\b(?:author|year|source|type|title):/i)) && (
              <span className="text-[9px]" style={{ color: lm ? 'rgba(6,78,59,0.45)' : 'rgba(255,255,255,0.35)' }}>
                Filters active
              </span>
            )}
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                className="mt-2 rounded-xl p-3 overflow-hidden"
                style={{
                  background: lm ? 'rgba(240,253,244,0.97)' : 'rgba(3,12,8,0.97)',
                  border: '1px solid rgba(52,211,153,0.15)',
                }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <FilterInput label="From year" value={advancedFilters.yearFrom}
                    onChange={(value) => onAdvancedFiltersChange({ ...advancedFilters, yearFrom: value.replace(/\D/g, '').slice(0, 4) })} lm={lm} />
                  <FilterInput label="To year" value={advancedFilters.yearTo}
                    onChange={(value) => onAdvancedFiltersChange({ ...advancedFilters, yearTo: value.replace(/\D/g, '').slice(0, 4) })} lm={lm} />
                  <FilterSelect label="Source" value={advancedFilters.source}
                    onChange={(value) => onAdvancedFiltersChange({ ...advancedFilters, source: value })} lm={lm}
                    options={['', 'wikipedia', 'wikidata', 'pubmed', 'europepmc', 'openalex']} />
                  <FilterSelect label="Type" value={advancedFilters.type}
                    onChange={(value) => onAdvancedFiltersChange({ ...advancedFilters, type: value as AdvancedSearchFilters['type'] })} lm={lm}
                    options={['', 'article', 'paper']} />
                  <FilterInput label="Language" value={advancedFilters.language}
                    onChange={(value) => onAdvancedFiltersChange({ ...advancedFilters, language: value })} lm={lm} />
                  <label className="col-span-2 sm:col-span-2 flex items-end gap-2 pb-1 text-[10px]" style={{ color: lm ? '#065f46' : 'rgba(255,255,255,0.6)' }}>
                    <input type="checkbox" checked={advancedFilters.openAccess}
                      onChange={(event) => onAdvancedFiltersChange({ ...advancedFilters, openAccess: event.target.checked })}
                      className="accent-emerald-400" />
                    Open access only
                  </label>
                  <button type="button" onClick={onSaveSearch}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium"
                    style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)', color: lm ? '#065f46' : '#34d399' }}>
                    <Bookmark size={11} /> Save search
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                        {recentSearches.slice(0, 8).map((entry) => (
                         <div key={entry.id} className="flex items-center gap-1">
                           <button onClick={() => { onHistorySelect(entry); setSearchFocused(false); }}
                             className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150 hover:scale-105"
                             style={{ background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', color: lm ? '#065f46' : 'rgba(255,255,255,0.7)' }}>
                             {entry.query}
                           </button>
                           <button aria-label={entry.pinned ? 'Unpin search' : 'Pin search'} onClick={() => onHistoryPin(entry.id)} className="p-1">
                             <Pin size={10} fill={entry.pinned ? 'currentColor' : 'none'} style={{ color: entry.pinned ? '#34d399' : 'rgba(255,255,255,0.35)' }} />
                           </button>
                           <button aria-label="Delete search" onClick={() => onHistoryDelete(entry.id)} className="p-1">
                             <Trash2 size={10} style={{ color: 'rgba(251,113,133,0.65)' }} />
                           </button>
                         </div>
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
                {savedSearches.length > 0 && (
                  <>
                    <div className="mx-3 my-1.5 h-px" style={{ background: lm ? 'rgba(52,211,153,0.1)' : 'rgba(52,211,153,0.08)' }} />
                    <div className="px-3 pt-1.5 pb-2">
                      <div className="flex items-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-[0.18em] font-semibold" style={{ color: lm ? 'rgba(6,78,59,0.4)' : 'rgba(52,211,153,0.4)' }}>
                        <BookmarkCheck size={9} /> Saved searches
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {savedSearches.slice(0, 8).map((entry) => (
                          <div key={entry.id} className="flex items-center gap-1">
                            <button onClick={() => { onSavedSearchSelect(entry); setSearchFocused(false); }}
                              className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                              style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', color: lm ? '#6d28d9' : '#c4b5fd' }}>
                              {entry.query}
                            </button>
                            <button aria-label="Delete saved search" onClick={() => onSavedSearchDelete(entry.id)} className="p-1">
                              <Trash2 size={10} style={{ color: 'rgba(251,113,133,0.65)' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
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
