/**
 * WorkspacePanel — Research workspace for saved AI responses
 * ─────────────────────────────────────────────────────────
 * Slides in as a right-side drawer over the Singularity chat.
 * State is persisted to localStorage. Fully lazy-mounted.
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Bookmark, Trash2, FileText, ChevronDown, ChevronUp, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SavedItem {
  id:      string;
  content: string;
  preview: string;  // plain-text excerpt, 130 chars
  savedAt: number;
  note:    string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'cosmos-workspace-v1';

function loadItems(): SavedItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function persistItems(items: SavedItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch {}
}

// ─── Hook (used by SingularityChat) ──────────────────────────────────────────
export function useWorkspace() {
  const [items, setItems] = useState<SavedItem[]>(loadItems);
  const [open,  setOpen]  = useState(false);

  const save = useCallback((content: string) => {
    const item: SavedItem = {
      id:      `ws-${Date.now()}`,
      content,
      preview: content
        .replace(/\$\$[\s\S]*?\$\$/g, 'formula')
        .replace(/\$[^$]+\$/g, 'formula')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/[#*_\[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim()
        .slice(0, 130),
      savedAt: Date.now(),
      note:    '',
    };
    setItems(prev => {
      const next = [item, ...prev];
      persistItems(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      persistItems(next);
      return next;
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setItems(prev => {
      const next = prev.map(i => (i.id === id ? { ...i, note } : i));
      persistItems(next);
      return next;
    });
  }, []);

  return { items, open, setOpen, save, remove, updateNote };
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
const ItemCard = memo(function ItemCard({
  item, onRemove, onNoteChange,
}: {
  item:         SavedItem;
  onRemove:     (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const [expanded,    setExpanded]    = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal,     setNoteVal]     = useState(item.note);
  const [noteSaved,   setNoteSaved]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ts    = new Date(item.savedAt);
  const label = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' · '
    + ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const commitNote = useCallback(() => {
    onNoteChange(item.id, noteVal);
    setEditingNote(false);
    setNoteSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNoteSaved(false), 2000);
  }, [item.id, noteVal, onNoteChange]);

  // cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="group relative rounded-xl bg-white/[0.03] border border-white/[0.06]
      hover:border-white/[0.09] transition-colors duration-200">

      {/* ── Card header ── */}
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-white/72 leading-[1.62] line-clamp-2">
            {item.preview}{item.preview.length >= 130 ? '…' : ''}
          </p>
          <p className="text-[9.5px] text-white/24 font-mono mt-1">{label}</p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg text-white/16 hover:text-red-400/75
            hover:bg-red-500/[0.08] transition-all duration-150
            opacity-0 group-hover:opacity-100"
          aria-label="Remove saved item"
        >
          <Trash2 size={12} strokeWidth={1.7} />
        </button>
      </div>

      {/* ── Action strip ── */}
      <div className="flex items-center gap-0.5 px-2.5 pb-2.5">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/25
            hover:text-white/52 hover:bg-white/[0.04] transition-all duration-150"
        >
          {expanded ? <ChevronUp size={10} strokeWidth={2} /> : <ChevronDown size={10} strokeWidth={2} />}
          {expanded ? 'Collapse' : 'Full text'}
        </button>
        <button
          onClick={() => { setEditingNote(n => !n); if (!editingNote) setNoteVal(item.note); }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-white/25
            hover:text-white/52 hover:bg-white/[0.04] transition-all duration-150"
        >
          {noteSaved
            ? <><Check size={10} strokeWidth={2.5} className="text-emerald-400/70" />Saved</>
            : <><FileText size={10} strokeWidth={1.8} />{item.note ? 'Edit note' : 'Add note'}</>
          }
        </button>
      </div>

      {/* ── Full text expansion ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mx-3.5 mb-3 px-3 py-2.5 rounded-lg
              bg-black/25 border border-white/[0.05]
              text-[11.5px] text-white/50 leading-relaxed
              max-h-52 overflow-y-auto whitespace-pre-wrap break-words">
              {item.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Note editor ── */}
      <AnimatePresence initial={false}>
        {editingNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3 flex flex-col gap-1.5">
              <textarea
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                placeholder="Research note…"
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg
                  text-[12px] text-white/78 placeholder:text-white/22 px-3 py-2
                  outline-none resize-none
                  focus:border-white/[0.14] transition-colors duration-150"
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  onClick={commitNote}
                  className="px-3 py-1 rounded-lg bg-white/[0.07] border border-white/[0.09]
                    text-[11px] text-white/65 hover:bg-white/[0.11] hover:text-white/90
                    transition-all duration-150"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingNote(false)}
                  className="px-3 py-1 rounded-lg text-[11px] text-white/28
                    hover:text-white/52 hover:bg-white/[0.04] transition-all duration-150"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved note display ── */}
      {item.note && !editingNote && (
        <div className="mx-3.5 mb-3 px-3 py-2 rounded-lg
          bg-violet-500/[0.05] border border-violet-400/[0.10]
          text-[11.5px] text-violet-200/60 leading-relaxed italic">
          {item.note}
        </div>
      )}
    </div>
  );
});

// ─── Panel ────────────────────────────────────────────────────────────────────
interface WorkspacePanelProps {
  open:         boolean;
  onClose:      () => void;
  items:        SavedItem[];
  onRemove:     (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export const WorkspacePanel = memo(function WorkspacePanel({
  open, onClose, items, onRemove, onNoteChange,
}: WorkspacePanelProps) {
  // Lazy-mount: only add to DOM after first open
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px] z-30"
            aria-hidden="true"
          />

          {/* Drawer — slides in from the right */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 right-0 h-full w-full sm:w-[372px] z-40 flex flex-col
              bg-[#0b0b0f] border-l border-white/[0.06]
              shadow-[-16px_0_48px_rgba(0,0,0,0.6)]"
            role="dialog"
            aria-label="Research Workspace"
            aria-modal="true"
          >
            {/* ── Drawer header ── */}
            <div className="flex-shrink-0 flex items-center justify-between
              px-5 py-[14px] border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg
                  bg-violet-500/[0.12] border border-violet-400/[0.18]">
                  <Bookmark size={13} strokeWidth={1.7} className="text-violet-400/80" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-white/90 tracking-[-0.01em]">
                    Research Workspace
                  </h3>
                  <p className="text-[9px] text-white/26 font-mono uppercase tracking-[0.15em] mt-[1px]">
                    {items.length} {items.length === 1 ? 'item' : 'items'} saved
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-white/28 hover:text-white/65
                  hover:bg-white/[0.07] transition-all duration-150 active:scale-95"
                aria-label="Close workspace"
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            </div>

            {/* ── Item list or empty state ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 pb-12">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06]
                    flex items-center justify-center">
                    <Bookmark size={22} strokeWidth={1.2} className="text-white/14" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-[13px] text-white/30 font-medium">Nothing saved yet</p>
                    <p className="text-[11.5px] text-white/18 leading-relaxed max-w-[200px]">
                      Save any AI response using the bookmark icon below each message.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {items.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onRemove={onRemove}
                      onNoteChange={onNoteChange}
                    />
                  ))}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            {items.length > 0 && (
              <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/16 text-center tracking-wide">
                  Saved locally · {items.length} {items.length === 1 ? 'response' : 'responses'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
