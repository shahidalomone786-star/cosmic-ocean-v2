/**
 * SavedPapersDrawer — Reading List side panel
 *
 * • Slides in from the right (desktop) / bottom sheet (mobile)
 * • Dark cosmic glassmorphism — matches the search UI palette
 * • Keyboard accessible (Escape closes, focus trap within)
 * • prefers-reduced-motion: skip translate animation
 * • All fields rendered only when present — no broken / empty UI
 */

import { memo, useEffect, useRef, useCallback } from 'react';
import { Bookmark, ExternalLink, X, Trash2, BookOpen } from 'lucide-react';
import type { SectionItem } from './NasaSearch';
import { stableItemId } from '../hooks/useSavedPapers';

// ─── Source label map (display-only) ─────────────────────────────────────────
const SOURCE_DISPLAY: Record<string, string> = {
  wiki:            'Wikipedia',
  nasa:            'NASA',
  esa:             'ESA Hubble',
  arxiv:           'arXiv',
  openalex:        'OpenAlex',
  semanticscholar: 'Semantic Scholar',
  inspirehep:      'INSPIRE-HEP',
  book:            'Book',
};

// ─── Single saved item row ────────────────────────────────────────────────────
const SavedItemRow = memo(function SavedItemRow({
  item, onRemove, lm,
}: { item: SectionItem; onRemove: (item: SectionItem) => void; lm?: boolean }) {
  const srcLabel = SOURCE_DISPLAY[item.source] ?? item.source;

  const handleRemove = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onRemove(item); },
    [item, onRemove],
  );

  return (
    <div className={`group flex items-start gap-3 px-4 py-3 rounded-xl border transition-colors duration-150 ${
      lm
        ? 'bg-white border-gray-100 hover:border-gray-200'
        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]'
    }`}>
      {/* Source dot */}
      <div className={`flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${lm ? 'bg-violet-400' : 'bg-violet-400/60'}`} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[12.5px] font-semibold leading-snug line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/88'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}>
          {item.title}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          <span className={`text-[9.5px] uppercase tracking-[0.14em] ${lm ? 'text-gray-400' : 'text-white/32'}`}>
            {srcLabel}
          </span>
          {item.date && (
            <span className={`text-[9.5px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              {item.date.slice(0, 4)}
            </span>
          )}
          {item.authors && item.authors.length > 0 && (
            <span className={`text-[9.5px] truncate max-w-[160px] ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              {item.authors.slice(0, 2).join(', ')}{item.authors.length > 2 ? ' et al.' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            aria-label={`Open ${item.title}`}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${
              lm
                ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                : 'text-white/30 hover:text-white/70 hover:bg-white/[0.08]'
            }`}
          >
            <ExternalLink size={11} strokeWidth={2} aria-hidden="true" />
          </a>
        )}
        <button
          onClick={handleRemove}
          aria-label={`Remove ${item.title} from reading list`}
          className={`p-1.5 rounded-lg transition-colors duration-150 ${
            lm
              ? 'text-gray-300 hover:text-red-500 hover:bg-red-50'
              : 'text-white/20 hover:text-red-400/80 hover:bg-red-500/[0.08]'
          }`}
        >
          <X size={11} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

// ─── Drawer ───────────────────────────────────────────────────────────────────
interface DrawerProps {
  open:     boolean;
  saved:    SectionItem[];
  onClose:  () => void;
  onRemove: (item: SectionItem) => void;
  onClear:  () => void;
  lm?:      boolean;
}

const SavedPapersDrawer = memo(function SavedPapersDrawer({
  open, saved, onClose, onRemove, onClear, lm,
}: DrawerProps) {
  const panelRef  = useRef<HTMLDivElement>(null);
  const closeRef  = useRef<HTMLButtonElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus the close button when drawer opens
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Trap focus inside the panel when open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const panel = panelRef.current;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter(
        el => !el.hasAttribute('disabled'),
      );
      if (els.length === 0) return;
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [open]);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[98] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${lm ? 'bg-black/30' : 'bg-black/60'} backdrop-blur-sm`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reading List"
        className={`
          fixed z-[99] flex flex-col
          bottom-0 left-0 right-0 max-h-[85vh] rounded-t-[2rem]
          sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:max-h-none sm:h-full sm:w-[380px] sm:rounded-none sm:rounded-l-[2rem]
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${prefersReduced ? '' : open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'}
          ${open ? 'pointer-events-auto' : 'pointer-events-none'}
          ${lm
            ? 'bg-white/97 border border-gray-200/80 shadow-[-4px_0_40px_rgba(0,0,0,0.12)]'
            : 'bg-[rgba(7,7,14,0.95)] border border-white/[0.09] backdrop-blur-2xl shadow-[-4px_0_48px_rgba(0,0,0,0.8),inset_1px_0_0_rgba(255,255,255,0.04)]'
          }
        `}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0 ${
          lm ? 'border-gray-100' : 'border-white/[0.07]'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/15 border border-violet-400/22'
          }`}>
            <Bookmark size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-semibold ${lm ? 'text-gray-900' : 'text-white/90'}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}>
              Reading List
            </p>
            <p className={`text-[9.5px] uppercase tracking-[0.18em] ${lm ? 'text-gray-400' : 'text-white/32'}`}>
              {saved.length} {saved.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>

          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close reading list"
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors duration-200 ${
              lm
                ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                : 'border-white/[0.12] bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.10]'
            }`}
          >
            <X size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Empty state */}
        {saved.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-12">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              lm ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.04] border-white/[0.08]'
            }`}>
              <BookOpen size={20} strokeWidth={1.5} className={lm ? 'text-gray-300' : 'text-white/25'} aria-hidden="true" />
            </div>
            <p className={`text-[12px] text-center ${lm ? 'text-gray-400' : 'text-white/35'}`}>
              No saved papers yet.
              <br />
              <span className={`text-[11px] ${lm ? 'text-gray-300' : 'text-white/25'}`}>
                Tap the bookmark icon on any result.
              </span>
            </p>
          </div>
        )}

        {/* List */}
        {saved.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            {saved.map(item => (
              <SavedItemRow
                key={stableItemId(item)}
                item={item}
                onRemove={onRemove}
                lm={lm}
              />
            ))}
          </div>
        )}

        {/* Footer — clear all */}
        {saved.length > 0 && (
          <div className={`flex-shrink-0 px-5 pb-6 pt-3 border-t ${lm ? 'border-gray-100' : 'border-white/[0.07]'}`}>
            <button
              onClick={onClear}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-medium uppercase tracking-[0.16em] transition-all duration-200 ${
                lm
                  ? 'border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                  : 'border-red-500/[0.14] text-red-400/60 hover:bg-red-500/[0.08] hover:border-red-400/[0.24] hover:text-red-300/80'
              }`}
            >
              <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default SavedPapersDrawer;
