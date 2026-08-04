/**
 * CompareDialog — side-by-side paper comparison
 *
 * Lazy-mounted: parent only renders this when `open` has been true at least once.
 * Compares two SectionItems across all available fields; highlights differences.
 *
 * z-index: 102 (above drawer at 99, above drawer backdrop at 98).
 */

import { memo, useEffect, useRef } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import type { SectionItem } from './NasaSearch';
import { getYear, getSourceName, getAuthors } from '../utils/citationFormatters';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompareField {
  label:     string;
  valueA:    string;
  valueB:    string;
  multiLine: boolean;
}

interface CompareDialogProps {
  open:    boolean;
  items:   [SectionItem, SectionItem] | null;
  onClose: () => void;
  lm?:     boolean;
}

// ─── Field builder ───────────────────────────────────────────────────────────

function buildFields(a: SectionItem, b: SectionItem): CompareField[] {
  const field = (label: string, vA: string, vB: string, multiLine = false): CompareField =>
    ({ label, valueA: vA || '—', valueB: vB || '—', multiLine });

  const authStr = (item: SectionItem) => {
    const a = getAuthors(item);
    if (a.length === 0) return '—';
    return a.slice(0, 5).join(', ') + (a.length > 5 ? ` +${a.length - 5} more` : '');
  };

  return [
    field('Title',     a.title,              b.title,             false),
    field('Authors',   authStr(a),           authStr(b),           false),
    field('Year',      getYear(a),           getYear(b),           false),
    field('Source',    getSourceName(a),     getSourceName(b),     false),
    field('Citations', a.citationCount != null ? String(a.citationCount) : '—',
                       b.citationCount != null ? String(b.citationCount) : '—', false),
    field('URL / DOI', a.url ?? '',          b.url ?? '',          false),
    field('Abstract',  a.description ?? '', b.description ?? '',  true),
  ];
}

// ─── Value cell ──────────────────────────────────────────────────────────────

const ValueCell = memo(function ValueCell({
  value, differs, multiLine, side, lm,
}: {
  value:     string;
  differs:   boolean;
  multiLine: boolean;
  side:      'a' | 'b';
  lm?:       boolean;
}) {
  const baseText = lm ? 'text-gray-800' : 'text-white/82';
  const emptyText = lm ? 'text-gray-300 italic' : 'text-white/22 italic';
  const isUrl = value.startsWith('http');
  const isEmpty = value === '—';

  const diffBg = differs
    ? lm
      ? side === 'a'
        ? 'bg-amber-50/80 border border-amber-200/60 ring-1 ring-amber-200/40'
        : 'bg-sky-50/80 border border-sky-200/60 ring-1 ring-sky-200/40'
      : side === 'a'
        ? 'bg-amber-500/[0.07] border border-amber-400/[0.18]'
        : 'bg-sky-500/[0.07] border border-sky-400/[0.18]'
    : '';

  return (
    <div className={`rounded-lg px-2.5 py-2 text-[11.5px] leading-relaxed ${
      multiLine ? '' : 'flex items-center'
    } ${diffBg || (lm ? 'bg-gray-50/60' : 'bg-white/[0.025]')}`}>
      {isUrl && !isEmpty ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={`truncate underline decoration-dotted ${lm ? 'text-violet-700' : 'text-violet-300'}`}
        >
          {value}
        </a>
      ) : (
        <span className={`${isEmpty ? emptyText : baseText} ${multiLine ? 'line-clamp-5' : 'truncate'}`}>
          {value}
        </span>
      )}
    </div>
  );
});

// ─── Compare dialog ──────────────────────────────────────────────────────────

const CompareDialog = memo(function CompareDialog({ open, items, onClose, lm }: CompareDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Auto-focus
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => closeBtnRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const sel = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const dlg = dialogRef.current;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(dlg.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (!els.length) return;
      const [first, last] = [els[0], els[els.length - 1]];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  if (!items) return null;

  const [a, b] = items;
  const fields = buildFields(a, b);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[101] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${lm ? 'bg-black/30' : 'bg-black/72'} backdrop-blur-sm`}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Paper comparison"
        className={[
          'fixed z-[102] inset-x-3 top-4 bottom-4',
          'sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2',
          'sm:top-6 sm:bottom-6 sm:w-[min(860px,calc(100vw-48px))]',
          'flex flex-col rounded-2xl border overflow-hidden',
          'transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-[0.97] pointer-events-none',
          lm
            ? 'bg-white border-gray-200 shadow-[0_24px_80px_rgba(0,0,0,0.16)]'
            : 'bg-[rgba(7,7,16,0.97)] border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.90)] backdrop-blur-2xl',
        ].join(' ')}
      >
        {/* Header */}
        <div className={`flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b ${
          lm ? 'border-gray-100' : 'border-white/[0.055]'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/10 border border-violet-400/18'
          }`}>
            <ArrowLeftRight size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-semibold ${lm ? 'text-gray-900' : 'text-white/90'}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}>
              Compare Papers
            </p>
            <p className={`text-[8.5px] uppercase tracking-[0.2em] ${lm ? 'text-gray-400' : 'text-white/28'}`}>
              Differences highlighted
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close comparison"
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors duration-150 ${
              lm
                ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                : 'border-white/[0.09] bg-white/[0.04] text-white/42 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        {/* Column headers — paper titles */}
        <div className={`flex-shrink-0 grid grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3 border-b ${
          lm ? 'border-gray-100 bg-gray-50/60' : 'border-white/[0.055] bg-white/[0.015]'
        }`}>
          <div /> {/* label spacer */}
          {[a, b].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 min-w-0`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                i === 0
                  ? lm ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-300'
                  : lm ? 'bg-sky-100 text-sky-700'    : 'bg-sky-500/15 text-sky-300'
              }`}>
                {i === 0 ? 'A' : 'B'}
              </span>
              <p className={`text-[10.5px] font-semibold leading-snug line-clamp-2 min-w-0 ${
                lm ? 'text-gray-800' : 'text-white/80'
              }`} style={{ fontFamily: 'var(--app-font-heading)' }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison rows */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col divide-y divide-white/[0.035]">
            {fields.map(({ label, valueA, valueB, multiLine }) => {
              const differs = valueA !== valueB && valueA !== '—' && valueB !== '—';
              return (
                <div
                  key={label}
                  className={`grid grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3 ${
                    lm ? 'divide-x divide-gray-100' : ''
                  }`}
                >
                  {/* Field label */}
                  <div className="flex items-start pt-2">
                    <span className={`text-[8.5px] uppercase tracking-[0.16em] font-semibold ${
                      lm ? 'text-gray-400' : 'text-white/30'
                    }`}>
                      {label}
                    </span>
                    {differs && (
                      <span className={`ml-1.5 mt-[1px] text-[7px] px-1 py-[1px] rounded-full font-semibold ${
                        lm ? 'bg-rose-50 text-rose-500 border border-rose-200' : 'bg-rose-500/10 text-rose-400/70 border border-rose-400/20'
                      }`}>
                        diff
                      </span>
                    )}
                  </div>
                  {/* Paper A */}
                  <ValueCell value={valueA} differs={differs} multiLine={multiLine} side="a" lm={lm} />
                  {/* Paper B */}
                  <ValueCell value={valueB} differs={differs} multiLine={multiLine} side="b" lm={lm} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend footer */}
        <div className={`flex-shrink-0 flex items-center gap-4 px-5 py-3 border-t ${
          lm ? 'border-gray-100 bg-gray-50/60' : 'border-white/[0.055] bg-white/[0.01]'
        }`}>
          <span className={`text-[8.5px] uppercase tracking-[0.16em] ${lm ? 'text-gray-400' : 'text-white/25'}`}>
            Legend
          </span>
          {[
            { letter: 'A', dk: 'bg-amber-500/10 border-amber-400/20 text-amber-300', lmC: 'bg-amber-50 border-amber-200 text-amber-700' },
            { letter: 'B', dk: 'bg-sky-500/10 border-sky-400/20 text-sky-300',       lmC: 'bg-sky-50 border-sky-200 text-sky-700' },
          ].map(({ letter, dk, lmC }) => (
            <span key={letter} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8.5px] ${lm ? lmC : dk}`}>
              <span className="font-bold">{letter}</span>
              <span className="font-normal">= Paper {letter}</span>
            </span>
          ))}
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8.5px] ${
            lm ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-rose-500/10 border-rose-400/20 text-rose-400/80'
          }`}>
            <span className="font-semibold">diff</span> = fields differ
          </span>
        </div>
      </div>
    </>
  );
});

export default CompareDialog;
