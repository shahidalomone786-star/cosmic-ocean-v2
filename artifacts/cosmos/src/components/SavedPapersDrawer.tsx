/**
 * SavedPapersDrawer — Research Workspace panel
 *
 * Features:
 *   1. Collections  — create/delete, assign papers, drill-in view
 *   2. Reading List — cycle unread → reading → read, last-opened timestamp
 *   3. Notes        — plain text, auto-save (700ms debounce), edited timestamp
 *   4. Favorites    — star toggle, dedicated tab
 *
 * External props interface is UNCHANGED — NasaSearch.tsx needs no edits.
 * All data is stored in localStorage (cosmos_research_workspace_v1).
 *
 * Performance: React.memo on every sub-component, stable useCallback refs,
 * useMemo for filtered lists, no unnecessary re-renders.
 */

import {
  memo, useState, useRef, useEffect, useCallback, useMemo,
  type ChangeEvent,
} from 'react';
import {
  Bookmark, ExternalLink, X, Trash2, BookOpen,
  Star, FileText, FolderOpen, FolderPlus,
  ChevronLeft, Check, BookMarked, Eye, CheckCircle2,
  Clock, Folder, Layers,
} from 'lucide-react';
import type { SectionItem } from './NasaSearch';
import { stableItemId } from '../hooks/useSavedPapers';
import {
  useResearchWorkspace,
  DEFAULT_PAPER_META,
  type PaperMeta,
  type Collection,
  type ReadStatus,
} from '../hooks/useResearchWorkspace';

// ─── Collection color palette ─────────────────────────────────────────────────
// All Tailwind class strings are written in full (no dynamic construction).

interface ColorDef {
  key:      string;
  dot:      string;    // hex — used in inline style
  dark:     string;    // badge classes — dark mode
  light:    string;    // badge classes — light mode
  cardDark: string;
  cardLm:   string;
}

const COLLECTION_COLORS: ColorDef[] = [
  { key: 'violet', dot: '#8b5cf6', dark: 'bg-violet-500/15 border-violet-400/25 text-violet-300',     light: 'bg-violet-50 border-violet-200 text-violet-700',   cardDark: 'border-violet-500/20 bg-violet-500/[0.06]',  cardLm: 'border-violet-200 bg-violet-50'   },
  { key: 'sky',    dot: '#0ea5e9', dark: 'bg-sky-500/15 border-sky-400/25 text-sky-300',               light: 'bg-sky-50 border-sky-200 text-sky-700',             cardDark: 'border-sky-500/20 bg-sky-500/[0.06]',        cardLm: 'border-sky-200 bg-sky-50'         },
  { key: 'emerald',dot: '#10b981', dark: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300',   light: 'bg-emerald-50 border-emerald-200 text-emerald-700', cardDark: 'border-emerald-500/20 bg-emerald-500/[0.06]',cardLm: 'border-emerald-200 bg-emerald-50' },
  { key: 'amber',  dot: '#f59e0b', dark: 'bg-amber-500/15 border-amber-400/25 text-amber-300',         light: 'bg-amber-50 border-amber-200 text-amber-700',       cardDark: 'border-amber-500/20 bg-amber-500/[0.06]',    cardLm: 'border-amber-200 bg-amber-50'     },
  { key: 'rose',   dot: '#f43f5e', dark: 'bg-rose-500/15 border-rose-400/25 text-rose-300',           light: 'bg-rose-50 border-rose-200 text-rose-700',           cardDark: 'border-rose-500/20 bg-rose-500/[0.06]',      cardLm: 'border-rose-200 bg-rose-50'       },
  { key: 'indigo', dot: '#6366f1', dark: 'bg-indigo-500/15 border-indigo-400/25 text-indigo-300',     light: 'bg-indigo-50 border-indigo-200 text-indigo-700',     cardDark: 'border-indigo-500/20 bg-indigo-500/[0.06]',  cardLm: 'border-indigo-200 bg-indigo-50'   },
  { key: 'orange', dot: '#f97316', dark: 'bg-orange-500/15 border-orange-400/25 text-orange-300',     light: 'bg-orange-50 border-orange-200 text-orange-700',     cardDark: 'border-orange-500/20 bg-orange-500/[0.06]',  cardLm: 'border-orange-200 bg-orange-50'   },
  { key: 'teal',   dot: '#14b8a6', dark: 'bg-teal-500/15 border-teal-400/25 text-teal-300',           light: 'bg-teal-50 border-teal-200 text-teal-700',           cardDark: 'border-teal-500/20 bg-teal-500/[0.06]',      cardLm: 'border-teal-200 bg-teal-50'       },
];

function getColor(key: string): ColorDef {
  return COLLECTION_COLORS.find(c => c.key === key) ?? COLLECTION_COLORS[0];
}

let _colorCursor = 0;
function nextColorKey(): string {
  const c = COLLECTION_COLORS[_colorCursor % COLLECTION_COLORS.length].key;
  _colorCursor++;
  return c;
}

// ─── Source label ─────────────────────────────────────────────────────────────

const SOURCE_DISPLAY: Record<string, string> = {
  wiki: 'Wikipedia', nasa: 'NASA', esa: 'ESA Hubble',
  arxiv: 'arXiv', openalex: 'OpenAlex',
  semanticscholar: 'Semantic Scholar', inspirehep: 'INSPIRE-HEP', book: 'Book',
};

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ReadStatus, { label: string; dk: string; lm: string; Icon: typeof Eye }> = {
  unread:  { label: 'Unread',  dk: 'bg-white/[0.04] border-white/[0.09] text-white/38',              lm: 'bg-gray-100 border-gray-200 text-gray-400',         Icon: BookOpen     },
  reading: { label: 'Reading', dk: 'bg-amber-500/15 border-amber-400/25 text-amber-300/90',          lm: 'bg-amber-50 border-amber-200 text-amber-700',        Icon: Eye          },
  read:    { label: 'Done',    dk: 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300/90',    lm: 'bg-emerald-50 border-emerald-200 text-emerald-700',  Icon: CheckCircle2 },
};

const StatusPill = memo(function StatusPill({
  status, onCycle, lm,
}: { status: ReadStatus; onCycle: () => void; lm?: boolean }) {
  const cfg = STATUS_CFG[status];
  return (
    <button
      onClick={onCycle}
      title="Click to change reading status"
      className={`flex items-center gap-1 px-1.5 py-[3px] rounded-full border text-[8.5px] uppercase tracking-[0.12em] font-medium transition-colors duration-150 ${lm ? cfg.lm : cfg.dk}`}
    >
      <cfg.Icon size={8} strokeWidth={2.5} />
      {cfg.label}
    </button>
  );
});

// ─── Favorite button ──────────────────────────────────────────────────────────

const FavButton = memo(function FavButton({
  active, onToggle, lm,
}: { active: boolean; onToggle: () => void; lm?: boolean }) {
  return (
    <button
      onClick={onToggle}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      className={`p-[3px] rounded-md transition-colors duration-150 ${
        active
          ? 'text-amber-400'
          : lm ? 'text-gray-300 hover:text-amber-400' : 'text-white/18 hover:text-amber-400/70'
      }`}
    >
      <Star size={11} strokeWidth={2} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
});

// ─── Note panel ───────────────────────────────────────────────────────────────
// Mounts with current note text. Auto-saves after 700ms idle. Shows flash "✓ Saved".

interface NotePanelProps {
  initialNote:  string;
  noteEditedAt: number | null;
  onSave:       (note: string) => void;
  lm?:          boolean;
}

const NotePanel = memo(function NotePanel({ initialNote, noteEditedAt, onSave, lm }: NotePanelProps) {
  const [text, setText]   = useState(initialNote);
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave(v);
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 2000);
    }, 700);
  }, [onSave]);

  const editedLabel = noteEditedAt
    ? new Date(noteEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`mt-2 rounded-xl border overflow-hidden ${
      lm ? 'border-gray-200 bg-gray-50/80' : 'border-white/[0.07] bg-white/[0.025]'
    }`}>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Add a personal note…"
        rows={3}
        className={`w-full resize-none bg-transparent text-[11.5px] leading-relaxed px-3 pt-2.5 pb-1 outline-none ${
          lm ? 'text-gray-700 placeholder:text-gray-300' : 'text-white/65 placeholder:text-white/18'
        }`}
      />
      <p className={`px-3 pb-2 text-[8.5px] uppercase tracking-[0.14em] ${
        flash
          ? lm ? 'text-emerald-500' : 'text-emerald-400/70'
          : lm ? 'text-gray-300' : 'text-white/18'
      }`}>
        {flash ? '✓ Saved' : editedLabel ? `Edited ${editedLabel}` : 'Plain text · auto-saves'}
      </p>
    </div>
  );
});

// ─── Collection picker ────────────────────────────────────────────────────────
// Floating dropdown; closes on outside click.

interface CollectionPickerProps {
  assignedIds:  string[];
  collections:  Collection[];
  onAdd:        (colId: string) => void;
  onRemove:     (colId: string) => void;
  onCreate:     (name: string, color: string) => void;
  lm?:          boolean;
}

const CollectionPicker = memo(function CollectionPicker({
  assignedIds, collections, onAdd, onRemove, onCreate, lm,
}: CollectionPickerProps) {
  const [open, setOpen]       = useState(false);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleCreate = useCallback(() => {
    const n = newName.trim();
    if (!n) return;
    onCreate(n, nextColorKey());
    setNewName('');
    setShowNew(false);
  }, [newName, onCreate]);

  return (
    <div ref={container} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Assign to collection"
        className={`flex items-center gap-0.5 px-1.5 py-[3px] rounded-full border text-[8.5px] uppercase tracking-[0.10em] font-medium transition-colors duration-150 ${
          lm
            ? 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            : 'border-white/[0.07] text-white/26 hover:border-white/[0.14] hover:text-white/55'
        }`}
      >
        <Layers size={8} strokeWidth={2} />
        <span>+ Collection</span>
      </button>

      {open && (
        <div className={`absolute bottom-full left-0 mb-1.5 w-52 rounded-2xl border shadow-xl z-20 overflow-hidden ${
          lm ? 'bg-white border-gray-200 shadow-black/10' : 'bg-[#0e0e1a] border-white/[0.10] shadow-black/80'
        }`}>
          <p className={`px-3 py-2 text-[8.5px] uppercase tracking-[0.18em] font-semibold border-b ${
            lm ? 'text-gray-400 border-gray-100' : 'text-white/28 border-white/[0.06]'
          }`}>Collections</p>

          <div className="max-h-40 overflow-y-auto">
            {collections.length === 0 && !showNew && (
              <p className={`px-3 py-2.5 text-[10.5px] ${lm ? 'text-gray-300' : 'text-white/22'}`}>No collections yet</p>
            )}
            {collections.map(col => {
              const cd = getColor(col.color);
              const assigned = assignedIds.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => assigned ? onRemove(col.id) : onAdd(col.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 ${
                    lm ? 'hover:bg-gray-50' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cd.dot }} />
                  <span className={`flex-1 text-[11.5px] truncate ${lm ? 'text-gray-700' : 'text-white/72'}`}>{col.name}</span>
                  {assigned && <Check size={10} strokeWidth={2.5} className={lm ? 'text-violet-600' : 'text-violet-400'} />}
                </button>
              );
            })}
          </div>

          {showNew ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-2 border-t ${lm ? 'border-gray-100' : 'border-white/[0.06]'}`}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setShowNew(false); setNewName(''); }
                }}
                placeholder="Collection name"
                className={`flex-1 text-[11px] bg-transparent outline-none ${
                  lm ? 'text-gray-700 placeholder:text-gray-300' : 'text-white/78 placeholder:text-white/22'
                }`}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className={`flex-shrink-0 transition-colors duration-150 ${
                  newName.trim()
                    ? lm ? 'text-violet-600' : 'text-violet-400'
                    : lm ? 'text-gray-300' : 'text-white/18'
                }`}
              >
                <Check size={12} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 border-t text-[11px] transition-colors duration-100 ${
                lm
                  ? 'border-gray-100 text-violet-600 hover:bg-violet-50'
                  : 'border-white/[0.06] text-violet-400/65 hover:bg-violet-500/[0.05]'
              }`}
            >
              <FolderPlus size={11} strokeWidth={2} />
              New collection
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Paper row ────────────────────────────────────────────────────────────────

interface PaperRowProps {
  item:        SectionItem;
  meta:        PaperMeta;
  collections: Collection[];
  onRemove:    (item: SectionItem) => void;
  onCycle:     (id: string) => void;
  onFav:       (id: string) => void;
  onSaveNote:  (id: string, note: string) => void;
  onTouch:     (id: string) => void;
  onAddCol:    (id: string, colId: string) => void;
  onRemoveCol: (id: string, colId: string) => void;
  onCreate:    (name: string, color: string) => void;
  lm?:         boolean;
}

const PaperRow = memo(function PaperRow({
  item, meta, collections, onRemove, onCycle, onFav,
  onSaveNote, onTouch, onAddCol, onRemoveCol, onCreate, lm,
}: PaperRowProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const pid = stableItemId(item);

  const handleRemove  = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onRemove(item); }, [item, onRemove]);
  const handleCycle   = useCallback(() => onCycle(pid),   [onCycle,   pid]);
  const handleFav     = useCallback(() => onFav(pid),     [onFav,     pid]);
  const handleTouch   = useCallback(() => onTouch(pid),   [onTouch,   pid]);
  const handleSave    = useCallback((n: string) => onSaveNote(pid, n), [onSaveNote, pid]);
  const handleAddCol  = useCallback((cid: string) => onAddCol(pid, cid),    [onAddCol,    pid]);
  const handleRmvCol  = useCallback((cid: string) => onRemoveCol(pid, cid), [onRemoveCol, pid]);
  const toggleNote    = useCallback(() => {
    setNoteOpen(o => !o);
    onTouch(pid);
  }, [onTouch, pid]);

  const src = SOURCE_DISPLAY[item.source] ?? item.source;
  const lastLabel = meta.lastOpened
    ? new Date(meta.lastOpened).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className={`rounded-xl border transition-colors duration-150 ${
      lm
        ? 'bg-white border-gray-100 hover:border-gray-200'
        : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.09] hover:bg-white/[0.035]'
    }`}>
      {/* Title row */}
      <div className="flex items-start gap-2.5 px-3.5 pt-3 pb-1.5">
        <div className="flex-shrink-0 mt-[5px] w-1.5 h-1.5 rounded-full bg-violet-400/55" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold leading-snug line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/87'}`}
            style={{ fontFamily: 'var(--app-font-heading)' }}>
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span className={`text-[9px] uppercase tracking-[0.14em] ${lm ? 'text-gray-400' : 'text-white/28'}`}>{src}</span>
            {item.date && <span className={`text-[9px] tabular-nums ${lm ? 'text-gray-400' : 'text-white/22'}`}>{item.date.slice(0, 4)}</span>}
            {item.authors && item.authors.length > 0 && (
              <span className={`text-[9px] truncate max-w-[160px] ${lm ? 'text-gray-400' : 'text-white/22'}`}>
                {item.authors.slice(0, 2).join(', ')}{item.authors.length > 2 ? ' et al.' : ''}
              </span>
            )}
            {lastLabel && (
              <span className={`flex items-center gap-0.5 text-[8.5px] ${lm ? 'text-gray-300' : 'text-white/18'}`}>
                <Clock size={7} strokeWidth={2} />
                {lastLabel}
              </span>
            )}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-0.5">
          {item.url && (
            <a
              href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={handleTouch}
              aria-label={`Open ${item.title}`}
              className={`p-1.5 rounded-lg transition-colors duration-150 ${
                lm ? 'text-gray-300 hover:text-gray-700 hover:bg-gray-100' : 'text-white/22 hover:text-white/68 hover:bg-white/[0.07]'
              }`}
            >
              <ExternalLink size={10} strokeWidth={2} aria-hidden="true" />
            </a>
          )}
          <button
            onClick={handleRemove}
            aria-label={`Remove ${item.title}`}
            className={`p-1.5 rounded-lg transition-colors duration-150 ${
              lm ? 'text-gray-200 hover:text-red-500 hover:bg-red-50' : 'text-white/14 hover:text-red-400/75 hover:bg-red-500/[0.07]'
            }`}
          >
            <X size={10} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collection chips */}
      {meta.collectionIds.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3.5 pb-1">
          {meta.collectionIds.map(cid => {
            const col = collections.find(c => c.id === cid);
            if (!col) return null;
            const cd = getColor(col.color);
            return (
              <span key={cid} className={`inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full border text-[8.5px] ${lm ? cd.light : cd.dark}`}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cd.dot }} />
                {col.name}
              </span>
            );
          })}
        </div>
      )}

      {/* Note panel */}
      {noteOpen && (
        <div className="px-3.5 pb-2">
          <NotePanel
            initialNote={meta.note}
            noteEditedAt={meta.noteEditedAt}
            onSave={handleSave}
            lm={lm}
          />
        </div>
      )}

      {/* Controls row */}
      <div className={`flex items-center gap-1.5 flex-wrap px-3 pb-2.5 pt-1 border-t ${
        lm ? 'border-gray-50' : 'border-white/[0.035]'
      }`}>
        <StatusPill status={meta.readStatus} onCycle={handleCycle} lm={lm} />
        <FavButton active={meta.isFavorite} onToggle={handleFav} lm={lm} />
        <button
          onClick={toggleNote}
          className={`flex items-center gap-1 px-1.5 py-[3px] rounded-full border text-[8.5px] uppercase tracking-[0.10em] font-medium transition-colors duration-150 ${
            noteOpen
              ? lm ? 'border-violet-300 bg-violet-50 text-violet-600' : 'border-violet-400/30 bg-violet-500/15 text-violet-300'
              : meta.note
                ? lm ? 'border-violet-200 text-violet-500' : 'border-violet-400/18 text-violet-400/65'
                : lm ? 'border-gray-200 text-gray-400' : 'border-white/[0.07] text-white/26'
          }`}
        >
          <FileText size={8} strokeWidth={2} />
          {meta.note ? 'Note' : '+ Note'}
        </button>
        <CollectionPicker
          assignedIds={meta.collectionIds}
          collections={collections}
          onAdd={handleAddCol}
          onRemove={handleRmvCol}
          onCreate={onCreate}
          lm={lm}
        />
      </div>
    </div>
  );
});

// ─── Shared paper list ────────────────────────────────────────────────────────

interface PaperListProps {
  papers:      SectionItem[];
  paperMeta:   Record<string, PaperMeta>;
  collections: Collection[];
  onRemove:    (item: SectionItem) => void;
  onCycle:     (id: string) => void;
  onFav:       (id: string) => void;
  onSaveNote:  (id: string, note: string) => void;
  onTouch:     (id: string) => void;
  onAddCol:    (id: string, colId: string) => void;
  onRemoveCol: (id: string, colId: string) => void;
  onCreate:    (name: string, color: string) => void;
  emptyLabel?: string;
  lm?:         boolean;
}

const PaperList = memo(function PaperList({
  papers, paperMeta, collections, onRemove, onCycle, onFav,
  onSaveNote, onTouch, onAddCol, onRemoveCol, onCreate, emptyLabel, lm,
}: PaperListProps) {
  if (papers.length === 0) {
    return (
      <div className={`flex flex-col items-center gap-3 py-12 px-6 text-center ${lm ? 'text-gray-300' : 'text-white/22'}`}>
        <BookOpen size={24} strokeWidth={1.2} />
        <p className="text-[11px] leading-relaxed">{emptyLabel ?? 'No saved papers yet.'}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      {papers.map(item => {
        const pid  = stableItemId(item);
        const meta = paperMeta[pid] ?? DEFAULT_PAPER_META;
        return (
          <PaperRow
            key={pid}
            item={item}
            meta={meta}
            collections={collections}
            onRemove={onRemove}
            onCycle={onCycle}
            onFav={onFav}
            onSaveNote={onSaveNote}
            onTouch={onTouch}
            onAddCol={onAddCol}
            onRemoveCol={onRemoveCol}
            onCreate={onCreate}
            lm={lm}
          />
        );
      })}
    </div>
  );
});

// ─── Collections view ─────────────────────────────────────────────────────────

interface CollectionsViewProps {
  collections:     Collection[];
  onDelete:        (id: string) => void;
  onCreate:        (name: string, color: string) => void;
  onDrillIn:       (id: string) => void;
  paperCount:      (id: string) => number;
  lm?:             boolean;
}

const CollectionsView = memo(function CollectionsView({
  collections, onDelete, onCreate, onDrillIn, paperCount, lm,
}: CollectionsViewProps) {
  const [showForm, setShowForm]     = useState(false);
  const [newName, setNewName]       = useState('');
  const [pickedColor, setPickedColor] = useState(COLLECTION_COLORS[0].key);

  const handleCreate = useCallback(() => {
    const n = newName.trim();
    if (!n) return;
    onCreate(n, pickedColor);
    setNewName('');
    setShowForm(false);
    setPickedColor(COLLECTION_COLORS[0].key);
  }, [newName, pickedColor, onCreate]);

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {/* Collection cards */}
      {collections.length === 0 && !showForm && (
        <div className={`flex flex-col items-center gap-3 py-10 text-center ${lm ? 'text-gray-300' : 'text-white/22'}`}>
          <Folder size={28} strokeWidth={1.2} />
          <p className="text-[11px] leading-relaxed">
            No collections yet.<br />
            <span className={`text-[10px] ${lm ? 'text-gray-300' : 'text-white/18'}`}>
              Create one to organize your saved papers.
            </span>
          </p>
        </div>
      )}

      {collections.map(col => {
        const cd    = getColor(col.color);
        const count = paperCount(col.id);
        return (
          <div
            key={col.id}
            role="button"
            tabIndex={0}
            onClick={() => onDrillIn(col.id)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDrillIn(col.id); }}
            className={`group flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all duration-150 ${
              lm ? `${cd.cardLm} hover:shadow-sm` : `${cd.cardDark} hover:brightness-125`
            }`}
          >
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cd.dot }} />
            <div className="flex-1 min-w-0">
              <p className={`text-[12.5px] font-semibold truncate ${lm ? 'text-gray-900' : 'text-white/87'}`}
                style={{ fontFamily: 'var(--app-font-heading)' }}>{col.name}</p>
              <p className={`text-[9px] mt-0.5 ${lm ? 'text-gray-400' : 'text-white/28'}`}>
                {count} {count === 1 ? 'paper' : 'papers'}
              </p>
            </div>
            <ChevronLeft size={12} strokeWidth={2} className={`rotate-180 transition-opacity duration-150 ${lm ? 'text-gray-300' : 'text-white/22'}`} aria-hidden />
            <button
              onClick={e => { e.stopPropagation(); onDelete(col.id); }}
              aria-label={`Delete ${col.name}`}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-150 ${
                lm ? 'text-gray-300 hover:text-red-500 hover:bg-red-50' : 'text-white/18 hover:text-red-400/75 hover:bg-red-500/[0.07]'
              }`}
            >
              <Trash2 size={11} strokeWidth={2} />
            </button>
          </div>
        );
      })}

      {/* New collection form / button */}
      {showForm ? (
        <div className={`rounded-xl border p-3 space-y-2.5 ${lm ? 'border-gray-200 bg-gray-50' : 'border-white/[0.07] bg-white/[0.025]'}`}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowForm(false); setNewName(''); }
            }}
            placeholder="Collection name"
            className={`w-full bg-transparent text-[12px] outline-none ${
              lm ? 'text-gray-800 placeholder:text-gray-300' : 'text-white/80 placeholder:text-white/22'
            }`}
          />
          {/* Color swatches */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLLECTION_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => setPickedColor(c.key)}
                aria-label={`Color: ${c.key}`}
                style={{
                  background:    c.dot,
                  outline:       pickedColor === c.key ? `2px solid ${c.dot}` : 'none',
                  outlineOffset: '2px',
                }}
                className="w-5 h-5 rounded-full transition-transform duration-100 hover:scale-110"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-150 ${
                newName.trim()
                  ? lm ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-500/75 text-white hover:bg-violet-500/90'
                  : lm ? 'bg-gray-100 text-gray-300' : 'bg-white/[0.04] text-white/18'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(''); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] transition-colors duration-150 ${
                lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/38 hover:bg-white/[0.05]'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] transition-colors duration-150 ${
            lm
              ? 'border-dashed border-gray-300 text-gray-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
              : 'border-dashed border-white/[0.09] text-white/28 hover:border-violet-400/30 hover:text-violet-400/65 hover:bg-violet-500/[0.04]'
          }`}
        >
          <FolderPlus size={12} strokeWidth={2} />
          New Collection
        </button>
      )}
    </div>
  );
});

// ─── Reading view ─────────────────────────────────────────────────────────────

type ReadFilter = 'all' | ReadStatus;

const READING_FILTERS: { key: ReadFilter; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'unread',  label: 'Unread'  },
  { key: 'reading', label: 'Reading' },
  { key: 'read',    label: 'Done'    },
];

interface ReadingViewProps {
  saved:       SectionItem[];
  paperMeta:   Record<string, PaperMeta>;
  collections: Collection[];
  onRemove:    (item: SectionItem) => void;
  onCycle:     (id: string) => void;
  onFav:       (id: string) => void;
  onSaveNote:  (id: string, note: string) => void;
  onTouch:     (id: string) => void;
  onAddCol:    (id: string, colId: string) => void;
  onRemoveCol: (id: string, colId: string) => void;
  onCreate:    (name: string, color: string) => void;
  lm?:         boolean;
}

const ReadingView = memo(function ReadingView({
  saved, paperMeta, collections, onRemove, onCycle, onFav,
  onSaveNote, onTouch, onAddCol, onRemoveCol, onCreate, lm,
}: ReadingViewProps) {
  const [filter, setFilter] = useState<ReadFilter>('all');

  const counts = useMemo(() => {
    const r: Record<ReadFilter, number> = { all: saved.length, unread: 0, reading: 0, read: 0 };
    saved.forEach(item => {
      const s = (paperMeta[stableItemId(item)] ?? DEFAULT_PAPER_META).readStatus;
      r[s]++;
    });
    return r;
  }, [saved, paperMeta]);

  const filtered = useMemo(() => {
    if (filter === 'all') return saved;
    return saved.filter(item => (paperMeta[stableItemId(item)] ?? DEFAULT_PAPER_META).readStatus === filter);
  }, [saved, paperMeta, filter]);

  return (
    <div className="flex flex-col">
      {/* Status filter pills */}
      <div className={`flex gap-1.5 flex-wrap px-4 pt-3 pb-2.5 border-b ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
        {READING_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-full text-[9px] border transition-colors duration-150 ${
              filter === key
                ? lm ? 'bg-violet-600 border-violet-600 text-white' : 'bg-violet-500/20 border-violet-400/38 text-violet-200'
                : lm ? 'border-gray-200 text-gray-500 hover:border-gray-300' : 'border-white/[0.07] text-white/32 hover:border-white/[0.13]'
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>
      <PaperList
        papers={filtered}
        paperMeta={paperMeta}
        collections={collections}
        onRemove={onRemove}
        onCycle={onCycle}
        onFav={onFav}
        onSaveNote={onSaveNote}
        onTouch={onTouch}
        onAddCol={onAddCol}
        onRemoveCol={onRemoveCol}
        onCreate={onCreate}
        emptyLabel="No papers matching this filter."
        lm={lm}
      />
    </div>
  );
});

// ─── Tab config ───────────────────────────────────────────────────────────────

type ActiveTab = 'all' | 'favorites' | 'collections' | 'reading';

const TABS: { key: ActiveTab; Icon: typeof Bookmark; label: string }[] = [
  { key: 'all',         Icon: Bookmark,   label: 'All'         },
  { key: 'favorites',   Icon: Star,        label: 'Favorites'   },
  { key: 'collections', Icon: FolderOpen,  label: 'Collections' },
  { key: 'reading',     Icon: BookMarked,  label: 'Reading'     },
];

// ─── Main drawer ──────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab]     = useState<ActiveTab>('all');
  const [activeColId, setActiveColId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const ws = useResearchWorkspace();

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Auto-focus close button on open
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const sel = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])';
    const panel = panelRef.current;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(panel.querySelectorAll<HTMLElement>(sel)).filter(el => !el.hasAttribute('disabled'));
      if (!els.length) return;
      const [first, last] = [els[0], els[els.length - 1]];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Derived lists (memoised)
  const favPapers = useMemo(
    () => saved.filter(item => ws.favoritePaperIds.has(stableItemId(item))),
    [saved, ws.favoritePaperIds],
  );
  const colPapers = useMemo(() => {
    if (!activeColId) return [];
    return saved.filter(item => (ws.paperMeta[stableItemId(item)] ?? DEFAULT_PAPER_META).collectionIds.includes(activeColId));
  }, [saved, ws.paperMeta, activeColId]);

  const activeCol = ws.collections.find(c => c.id === activeColId) ?? null;

  // Tab badge counts
  const favCount = favPapers.length;
  const colCount = ws.collections.length;

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setActiveColId(null);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[98] transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } ${lm ? 'bg-black/25' : 'bg-black/60'} backdrop-blur-sm`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Research Workspace"
        className={[
          'fixed z-[99] flex flex-col',
          'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[2rem]',
          'sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:max-h-none sm:h-full sm:w-[400px] sm:rounded-none sm:rounded-l-[2rem]',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          prefersReduced ? '' : open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full',
          open ? 'pointer-events-auto' : 'pointer-events-none',
          lm
            ? 'bg-white/97 border border-gray-200/80 shadow-[-4px_0_40px_rgba(0,0,0,0.12)]'
            : 'bg-[rgba(6,6,13,0.96)] border border-white/[0.08] backdrop-blur-2xl shadow-[-4px_0_52px_rgba(0,0,0,0.88),inset_1px_0_0_rgba(255,255,255,0.03)]',
        ].join(' ')}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0 ${lm ? 'border-gray-100' : 'border-white/[0.055]'}`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            lm ? 'bg-violet-100 border border-violet-200' : 'bg-violet-500/10 border border-violet-400/18'
          }`}>
            <Bookmark size={14} strokeWidth={2} className={lm ? 'text-violet-600' : 'text-violet-300'} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-semibold ${lm ? 'text-gray-900' : 'text-white/90'}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}>
              Research Workspace
            </p>
            <p className={`text-[8.5px] uppercase tracking-[0.2em] ${lm ? 'text-gray-400' : 'text-white/26'}`}>
              {saved.length} {saved.length === 1 ? 'paper' : 'papers'} · {colCount} {colCount === 1 ? 'collection' : 'collections'}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close research workspace"
            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border transition-colors duration-200 ${
              lm
                ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                : 'border-white/[0.09] bg-white/[0.04] text-white/42 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <X size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* Tab bar */}
        <div className={`flex-shrink-0 flex border-b ${lm ? 'border-gray-100' : 'border-white/[0.055]'}`}>
          {TABS.map(({ key, Icon, label }) => {
            const isActive = activeTab === key;
            const badge = key === 'favorites' ? favCount : key === 'collections' ? colCount : null;
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[8.5px] uppercase tracking-[0.11em] transition-colors duration-150 border-b-[1.5px] ${
                  isActive
                    ? lm ? 'text-violet-700 border-violet-600' : 'text-violet-300 border-violet-500'
                    : lm ? 'text-gray-400 border-transparent hover:text-gray-600' : 'text-white/28 border-transparent hover:text-white/52'
                }`}
              >
                <span className="relative">
                  <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
                  {badge !== null && badge > 0 && (
                    <span className={`absolute -top-1.5 -right-2.5 min-w-[14px] h-[14px] rounded-full text-[7.5px] flex items-center justify-center px-0.5 font-semibold ${
                      lm ? 'bg-violet-600 text-white' : 'bg-violet-500/65 text-white'
                    }`}>{badge > 99 ? '99+' : badge}</span>
                  )}
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* All */}
          {activeTab === 'all' && (
            <PaperList
              papers={saved}
              paperMeta={ws.paperMeta}
              collections={ws.collections}
              onRemove={onRemove}
              onCycle={ws.cycleReadStatus}
              onFav={ws.toggleFavorite}
              onSaveNote={ws.setNote}
              onTouch={ws.touchLastOpened}
              onAddCol={ws.addToCollection}
              onRemoveCol={ws.removeFromCollection}
              onCreate={ws.createCollection}
              emptyLabel="No saved papers yet. Tap the bookmark icon on any result."
              lm={lm}
            />
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <PaperList
              papers={favPapers}
              paperMeta={ws.paperMeta}
              collections={ws.collections}
              onRemove={onRemove}
              onCycle={ws.cycleReadStatus}
              onFav={ws.toggleFavorite}
              onSaveNote={ws.setNote}
              onTouch={ws.touchLastOpened}
              onAddCol={ws.addToCollection}
              onRemoveCol={ws.removeFromCollection}
              onCreate={ws.createCollection}
              emptyLabel="No favorites yet. Star any paper to add it here."
              lm={lm}
            />
          )}

          {/* Collections */}
          {activeTab === 'collections' && (
            activeColId !== null ? (
              <div className="flex flex-col">
                {/* Breadcrumb / back */}
                <div className={`flex items-center gap-2 px-4 py-3 border-b ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
                  <button
                    onClick={() => setActiveColId(null)}
                    className={`flex items-center gap-1 text-[10px] transition-colors duration-150 ${lm ? 'text-gray-500 hover:text-gray-800' : 'text-white/38 hover:text-white/75'}`}
                  >
                    <ChevronLeft size={13} strokeWidth={2} />
                    Collections
                  </button>
                  {activeCol && (
                    <>
                      <span className={lm ? 'text-gray-200' : 'text-white/15'}>/</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: getColor(activeCol.color).dot }} />
                        <span className={`text-[10px] font-semibold ${lm ? 'text-gray-800' : 'text-white/72'}`}>{activeCol.name}</span>
                      </span>
                    </>
                  )}
                </div>
                <PaperList
                  papers={colPapers}
                  paperMeta={ws.paperMeta}
                  collections={ws.collections}
                  onRemove={onRemove}
                  onCycle={ws.cycleReadStatus}
                  onFav={ws.toggleFavorite}
                  onSaveNote={ws.setNote}
                  onTouch={ws.touchLastOpened}
                  onAddCol={ws.addToCollection}
                  onRemoveCol={ws.removeFromCollection}
                  onCreate={ws.createCollection}
                  emptyLabel="No papers in this collection yet. Add papers via the '+ Collection' button."
                  lm={lm}
                />
              </div>
            ) : (
              <CollectionsView
                collections={ws.collections}
                onDelete={ws.deleteCollection}
                onCreate={ws.createCollection}
                onDrillIn={setActiveColId}
                paperCount={ws.collectionPaperCount}
                lm={lm}
              />
            )
          )}

          {/* Reading */}
          {activeTab === 'reading' && (
            <ReadingView
              saved={saved}
              paperMeta={ws.paperMeta}
              collections={ws.collections}
              onRemove={onRemove}
              onCycle={ws.cycleReadStatus}
              onFav={ws.toggleFavorite}
              onSaveNote={ws.setNote}
              onTouch={ws.touchLastOpened}
              onAddCol={ws.addToCollection}
              onRemoveCol={ws.removeFromCollection}
              onCreate={ws.createCollection}
              lm={lm}
            />
          )}
        </div>

        {/* Footer — clear all (All tab only) */}
        {activeTab === 'all' && saved.length > 0 && (
          <div className={`flex-shrink-0 px-5 pb-6 pt-3 border-t ${lm ? 'border-gray-100' : 'border-white/[0.055]'}`}>
            <button
              onClick={onClear}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10.5px] font-medium uppercase tracking-[0.16em] transition-all duration-200 ${
                lm
                  ? 'border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                  : 'border-red-500/[0.11] text-red-400/52 hover:bg-red-500/[0.06] hover:border-red-400/[0.20] hover:text-red-300/75'
              }`}
            >
              <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
              Clear all saved papers
            </button>
          </div>
        )}
      </div>
    </>
  );
});

export default SavedPapersDrawer;
