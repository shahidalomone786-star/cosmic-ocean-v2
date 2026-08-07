/**
 * Singularity Workspace — an editorial canvas for turning an exchange into a
 * durable research artifact. The chat contract intentionally remains tiny:
 * useWorkspace().save/remove/updateNote are still the only persistence hooks
 * the parent needs to know about.
 */
import {
  memo, useCallback, useEffect, useMemo, useRef, useState,
  type ChangeEvent, type KeyboardEvent, type RefObject,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clipboard, Code2, Copy, Download, FileText, GripVertical,
  History, List, Maximize2, Menu, MoreHorizontal, Pencil, Plus, Redo2,
  Replace, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, Undo2,
  Wand2, X, BookOpen, Calculator, Braces, Columns2,
} from 'lucide-react';

export interface SavedItem {
  id: string;
  content: string;
  preview: string;
  savedAt: number;
  note: string;
}

const STORAGE_KEY = 'cosmos-workspace-v1';
const DOCUMENTS_KEY = 'cosmos-workspace-documents-v2';
const VERSIONS_KEY = 'cosmos-workspace-versions-v2';
const MAX_VERSIONS = 24;
type DocumentKind = 'text' | 'markdown' | 'code' | 'math';
type WorkspaceDocument = { id: string; title: string; content: string; kind: DocumentKind; updatedAt: number };
type Snapshot = WorkspaceDocument & { versionId: string; createdAt: number };

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '');
    return value as T;
  } catch { return fallback; }
};
const safeWrite = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
};
const previewOf = (content: string) => content.replace(/```[\s\S]*?```/g, '').replace(/[#*_[\]]/g, '')
  .replace(/\$\$[\s\S]*?\$\$/g, 'formula').replace(/\$[^$]+\$/g, 'formula')
  .replace(/\n+/g, ' ').trim().slice(0, 130);
const initialDoc = (item?: SavedItem): WorkspaceDocument => ({
  id: item ? `doc-${item.id}` : `doc-${Date.now()}`,
  title: item ? (item.preview.slice(0, 48) || 'Untitled research note') : 'Untitled research note',
  content: item?.content || '',
  kind: item?.content.includes('```') ? 'code' : item?.content.includes('# ') ? 'markdown' : 'text',
  updatedAt: Date.now(),
});
const kindLabel: Record<DocumentKind, string> = { text: 'Text', markdown: 'Markdown', code: 'Code', math: 'Math' };
const persistSnapshot = (document: WorkspaceDocument) => {
  const snapshot: Snapshot = { ...document, versionId: `v-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, createdAt: Date.now() };
  const existing = safeRead<Snapshot[]>(VERSIONS_KEY, []);
  safeWrite(VERSIONS_KEY, [snapshot, ...existing].slice(0, MAX_VERSIONS));
};

function loadItems(): SavedItem[] {
  const parsed = safeRead<unknown>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is SavedItem => Boolean(item && typeof item === 'object' && 'id' in item && 'content' in item)) : [];
}
export function useWorkspace() {
  const [items, setItems] = useState<SavedItem[]>(loadItems);
  const [open, setOpen] = useState(false);
  const [seedContent, setSeedContent] = useState<string | undefined>();
  const save = useCallback((content: string) => {
    const item: SavedItem = { id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, content, preview: previewOf(content), savedAt: Date.now(), note: '' };
    setItems(previous => { const next = [item, ...previous]; safeWrite(STORAGE_KEY, next); return next; });
  }, []);
  const remove = useCallback((id: string) => {
    setItems(previous => { const next = previous.filter(item => item.id !== id); safeWrite(STORAGE_KEY, next); return next; });
  }, []);
  const updateNote = useCallback((id: string, note: string) => {
    setItems(previous => { const next = previous.map(item => item.id === id ? { ...item, note } : item); safeWrite(STORAGE_KEY, next); return next; });
  }, []);
  const openWithContent = useCallback((content: string) => {
    setSeedContent(content);
    setOpen(true);
  }, []);
  return { items, open, setOpen, save, remove, updateNote, seedContent, openWithContent };
}

const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-white/55 transition-gpu hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 disabled:cursor-not-allowed disabled:opacity-35';
const iconButtonClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/42 transition-gpu hover:bg-white/[0.07] hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50';

const ToolButton = memo(function ToolButton({ label, onClick, children, testId, disabled }: { label: string; onClick: () => void; children: React.ReactNode; testId: string; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} data-testid={testId} onClick={onClick} disabled={disabled} className={iconButtonClass}>{children}</button>;
});

const ItemCard = memo(function ItemCard({ item, onRemove, onNoteChange, onOpenDocument }: { item: SavedItem; onRemove: (id: string) => void; onNoteChange: (id: string, note: string) => void; onOpenDocument: (item: SavedItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note);
  const label = new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return <article data-testid={`card-saved-item-${item.id}`} className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 transition-colors hover:border-violet-300/20">
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-300/15 bg-violet-300/[0.08] text-violet-200/70"><Bookmark size={12} /></div>
      <div className="min-w-0 flex-1">
        <button type="button" data-testid={`button-open-saved-${item.id}`} onClick={() => onOpenDocument(item)} className="block w-full text-left text-[12px] leading-[1.55] text-white/72 hover:text-white/95">{item.preview || 'Empty response'}{item.preview.length >= 130 ? '…' : ''}</button>
        <p data-testid={`text-saved-date-${item.id}`} className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/25">{label} · saved locally</p>
      </div>
      <ToolButton label="Remove saved response" testId={`button-remove-saved-${item.id}`} onClick={() => onRemove(item.id)}><Trash2 size={13} /></ToolButton>
    </div>
    <div className="mt-3 flex items-center gap-1.5">
      <button type="button" data-testid={`button-toggle-full-text-${item.id}`} onClick={() => setExpanded(value => !value)} className="rounded-md px-2 py-1 text-[10px] text-white/35 hover:bg-white/[0.05] hover:text-white/75">{expanded ? 'Collapse' : 'Read response'}</button>
      <button type="button" data-testid={`button-toggle-note-${item.id}`} onClick={() => setEditingNote(value => !value)} className="rounded-md px-2 py-1 text-[10px] text-white/35 hover:bg-white/[0.05] hover:text-white/75">{item.note ? 'Edit note' : 'Add note'}</button>
    </div>
    <AnimatePresence initial={false}>
      {expanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden"><div data-testid={`text-full-response-${item.id}`} className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-[1.65] text-white/55">{item.content}</div></motion.div>}
    </AnimatePresence>
    {editingNote && <div className="mt-2 flex gap-1.5"><input data-testid={`input-note-${item.id}`} value={note} onChange={event => setNote(event.target.value)} placeholder="A note for later" className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/80 outline-none focus:outline-none focus:ring-0 focus:border-white/[0.22]" /><button type="button" data-testid={`button-save-note-${item.id}`} onClick={() => { onNoteChange(item.id, note); setEditingNote(false); }} className={buttonClass}>Save</button></div>}
    {item.note && !editingNote && <p data-testid={`text-note-${item.id}`} className="mt-2 rounded-lg border border-violet-300/10 bg-violet-300/[0.045] px-2.5 py-2 text-[11px] italic leading-[1.5] text-violet-100/55">{item.note}</p>}
  </article>;
});

const transformSelection = (label: string, selected: string): string => {
  const trimmed = selected.trim();
  if (!trimmed) return selected;
  switch (label) {
    case 'Continue Writing': return `${selected}${selected.endsWith(' ') ? '' : ' '}This line develops the central idea with a measured next step.`;
    case 'Rewrite': return `A considered restatement: ${trimmed}`;
    case 'Improve': return trimmed.replace(/\bvery\b/gi, 'notably').replace(/\bthing\b/gi, 'point');
    case 'Summarize': return `In brief: ${trimmed.split(/[.!?]\s/)[0]}.`;
    case 'Expand': return `${selected}\n\nFurther context: this claim can be understood through its assumptions, evidence, and practical implications.`;
    case 'Shorten': return trimmed.split(/[.!?]\s/)[0] + (/[.!?]$/.test(trimmed.split(/[.!?]\s/)[0]) ? '' : '.');
    case 'Translate': return `[Translation placeholder — local transform]\n${selected}`;
    case 'Fix Grammar': return selected.replace(/\bi\b/g, 'I').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1');
    case 'Explain': return `${selected}\n\nExplanation: this passage introduces a claim and gives the reader a frame for interpreting it.`;
    case 'Convert to Table': return `| Point | Detail |\n| --- | --- |\n| Selected passage | ${trimmed.replace(/\n/g, ' ')} |`;
    case 'Convert to Bullet Points': return trimmed.split(/\n+/).map(line => `- ${line.replace(/^[-*]\s*/, '')}`).join('\n');
    case 'Generate Diagram': return `flowchart TD\n  A[Selected idea] --> B[Evidence]\n  B --> C[Implication]\n  %% ${trimmed.replace(/\n/g, ' ')}`;
    case 'Generate Code': return `// Local code sketch derived from the selection\nfunction researchSketch() {\n  return ${JSON.stringify(trimmed)};\n}`;
    default: return selected;
  }
};
const AI_ACTIONS = ['Continue Writing', 'Rewrite', 'Improve', 'Summarize', 'Expand', 'Shorten', 'Translate', 'Fix Grammar', 'Explain', 'Convert to Table', 'Convert to Bullet Points', 'Generate Diagram', 'Generate Code'];

function SelectionToolbar({ editorRef, onChange, content, announce }: { editorRef: RefObject<HTMLTextAreaElement | null>; onChange: (value: string) => void; content: string; announce: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 84, left: 24 });
  const refresh = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || editor.selectionStart === editor.selectionEnd) { setVisible(false); return; }
    const rect = editor.getBoundingClientRect();
    const line = content.slice(0, editor.selectionStart).split('\n').length;
    setPosition({ top: Math.min(Math.max(56, line * 24 - editor.scrollTop + 14), rect.height - 20), left: Math.min(Math.max(14, rect.width / 2 - 170), Math.max(14, rect.width - 350)) });
    setVisible(true);
  }, [content, editorRef]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addEventListener('select', refresh);
    editor.addEventListener('keyup', refresh);
    return () => { editor.removeEventListener('select', refresh); editor.removeEventListener('keyup', refresh); };
  }, [editorRef, refresh]);
  const apply = (action: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart; const end = editor.selectionEnd; const selected = content.slice(start, end);
    const replacement = transformSelection(action, selected);
    onChange(content.slice(0, start) + replacement + content.slice(end));
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start, start + replacement.length); });
    announce(`${action} applied to selected text`);
    setVisible(false);
  };
  return <AnimatePresence>{visible && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ top: position.top, left: position.left }} className="absolute z-20 flex max-w-[calc(100%-28px)] flex-wrap gap-1 rounded-xl border border-violet-200/15 bg-[#211d2c]/95 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl" role="toolbar" aria-label="Selection tools" data-testid="selection-ai-toolbar">
    {AI_ACTIONS.map(action => <button type="button" key={action} data-testid={`button-ai-${action.toLowerCase().replaceAll(' ', '-')}`} onMouseDown={event => event.preventDefault()} onClick={() => apply(action)} className="rounded-lg px-2 py-1 text-[9px] text-white/62 hover:bg-violet-200/10 hover:text-white">{action}</button>)}
  </motion.div>}</AnimatePresence>;
}

function SearchPanel({ content, onChange, editorRef, onClose }: { content: string; onChange: (value: string) => void; editorRef: RefObject<HTMLTextAreaElement | null>; onClose: () => void }) {
  const [query, setQuery] = useState(''); const [replacement, setReplacement] = useState(''); const [cursor, setCursor] = useState(0);
  const matches = useMemo(() => { if (!query) return []; const result: number[] = []; let from = 0; while (from < content.length) { const found = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(), from); if (found < 0) break; result.push(found); from = found + Math.max(1, query.length); } return result; }, [content, query]);
  const jump = (direction: number) => { if (!matches.length) return; const next = (cursor + direction + matches.length) % matches.length; setCursor(next); const start = matches[next]; editorRef.current?.focus(); editorRef.current?.setSelectionRange(start, start + query.length); };
  const replaceCurrent = () => { if (!matches.length) return; const start = matches[cursor]; onChange(content.slice(0, start) + replacement + content.slice(start + query.length)); };
  return <div data-testid="panel-find-replace" className="border-b border-white/[0.07] bg-[#16151c] px-4 py-3"><div className="flex items-center gap-2"><Search size={13} className="text-violet-200/55" /><input autoFocus data-testid="input-find" value={query} onChange={event => { setQuery(event.target.value); setCursor(0); }} placeholder="Find in document" className="min-w-0 flex-1 bg-transparent text-[11px] text-white/80 outline-none" /><span data-testid="text-match-count" className="whitespace-nowrap font-mono text-[9px] text-white/32">{matches.length ? `${cursor + 1} / ${matches.length}` : 'No matches'}</span><ToolButton label="Close find and replace" testId="button-close-find" onClick={onClose}><X size={13} /></ToolButton></div><div className="mt-2 flex items-center gap-1.5"><input data-testid="input-replace" value={replacement} onChange={event => setReplacement(event.target.value)} placeholder="Replace with" className="min-w-0 flex-1 rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-1.5 text-[10px] text-white/72 outline-none" /><button type="button" data-testid="button-find-previous" onClick={() => jump(-1)} className={buttonClass}><ChevronLeft size={12} />Prev</button><button type="button" data-testid="button-find-next" onClick={() => jump(1)} className={buttonClass}>Next<ChevronRight size={12} /></button><button type="button" data-testid="button-replace-current" onClick={replaceCurrent} className={buttonClass}><Replace size={11} />Replace</button><button type="button" data-testid="button-replace-all" onClick={() => query && onChange(content.split(query).join(replacement))} className={buttonClass}>All</button></div></div>;
}

function VersionsPanel({ document, onRestore, onDuplicate, onRename, onDelete, onClose }: { document: WorkspaceDocument; onRestore: (snapshot: Snapshot) => void; onDuplicate: () => void; onRename: () => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [versions, setVersions] = useState<Snapshot[]>(() => safeRead<Snapshot[]>(VERSIONS_KEY, []).filter(version => version.id === document.id).sort((a, b) => b.createdAt - a.createdAt));
  useEffect(() => setVersions(safeRead<Snapshot[]>(VERSIONS_KEY, []).filter(version => version.id === document.id).sort((a, b) => b.createdAt - a.createdAt)), [document.id, document.updatedAt]);
  return <aside data-testid="panel-version-history" className="absolute inset-y-0 right-0 z-30 w-[min(90%,330px)] border-l border-white/[0.08] bg-[#14131a] shadow-[-16px_0_36px_rgba(0,0,0,.28)]"><div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-violet-200/50">Archive</p><h3 className="mt-1 text-[14px] text-white/90">Version history</h3></div><ToolButton label="Close version history" testId="button-close-history" onClick={onClose}><X size={14} /></ToolButton></div><div className="space-y-2 overflow-y-auto p-3">{versions.length === 0 ? <div data-testid="empty-version-history" className="px-2 py-10 text-center text-[11px] leading-relaxed text-white/32">Snapshots appear as you work. The current document is always safe.</div> : versions.map(version => <div key={version.versionId} data-testid={`version-${version.versionId}`} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3"><p className="text-[11px] text-white/70">{new Date(version.createdAt).toLocaleString()}</p><p className="mt-1 line-clamp-2 text-[10px] text-white/30">{version.content.slice(0, 100) || 'Empty document'}</p><button type="button" data-testid={`button-restore-version-${version.versionId}`} onClick={() => onRestore(version)} className="mt-2 text-[10px] text-violet-200/65 hover:text-violet-100">Restore</button><button type="button" data-testid={`button-delete-version-${version.versionId}`} onClick={() => { onDelete(version.versionId); setVersions(current => current.filter(item => item.versionId !== version.versionId)); }} className="ml-3 text-[10px] text-white/28 hover:text-red-300">Delete</button></div>)}</div><div className="absolute bottom-0 flex w-full gap-1.5 border-t border-white/[0.07] bg-[#14131a] p-3"><button type="button" data-testid="button-duplicate-document" onClick={onDuplicate} className={buttonClass}><Copy size={11} />Duplicate</button><button type="button" data-testid="button-rename-document" onClick={onRename} className={buttonClass}><Pencil size={11} />Rename</button></div></aside>;
}

function Editor({ document, setDocument, announce }: { document: WorkspaceDocument; setDocument: (value: WorkspaceDocument) => void; announce: (value: string) => void }) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>([document.content]); const [historyIndex, setHistoryIndex] = useState(0);
  const [findOpen, setFindOpen] = useState(false); const [status, setStatus] = useState<'Saved' | 'Saving' | 'Unsaved'>('Saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = document.content;
  const update = useCallback((value: string) => {
    setDocument({ ...document, content: value, updatedAt: Date.now() }); setStatus('Unsaved');
    setHistory(previous => [...previous.slice(0, historyIndex + 1), value].slice(-80)); setHistoryIndex(index => Math.min(index + 1, 79));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistSnapshot({ ...document, content: value, updatedAt: Date.now() });
      setStatus('Saved');
    }, 650);
  }, [document, historyIndex, setDocument]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const moveHistory = (direction: number) => { const next = Math.min(Math.max(0, historyIndex + direction), history.length - 1); if (next !== historyIndex) { setHistoryIndex(next); setDocument({ ...document, content: history[next], updatedAt: Date.now() }); } };
  const metrics = useMemo(() => { const words = content.trim() ? content.trim().split(/\s+/).length : 0; return { words, chars: content.length, reading: Math.max(1, Math.ceil(words / 220)) }; }, [content]);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key.toLowerCase() === 's') { event.preventDefault(); setStatus('Saved'); announce('Document saved'); }
    if (mod && event.key.toLowerCase() === 'f') { event.preventDefault(); setFindOpen(true); }
    if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); moveHistory(event.shiftKey ? 1 : -1); }
    if (mod && event.key.toLowerCase() === 'a') { /* native select all remains natural */ }
  };
  return <div className="relative flex min-h-0 flex-1 flex-col">
    {findOpen && <SearchPanel content={content} onChange={update} editorRef={editorRef} onClose={() => setFindOpen(false)} />}
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2"><div className="flex items-center gap-0.5"><ToolButton label="Undo (Cmd/Ctrl+Z)" testId="button-undo" onClick={() => moveHistory(-1)} disabled={historyIndex === 0}><Undo2 size={14} /></ToolButton><ToolButton label="Redo (Cmd/Ctrl+Shift+Z)" testId="button-redo" onClick={() => moveHistory(1)} disabled={historyIndex === history.length - 1}><Redo2 size={14} /></ToolButton><span className="mx-2 h-4 w-px bg-white/[0.08]" /><ToolButton label="Find in document (Cmd/Ctrl+F)" testId="button-open-find" onClick={() => setFindOpen(value => !value)}><Search size={14} /></ToolButton><button type="button" data-testid="button-copy-document" onClick={() => navigator.clipboard.writeText(content).then(() => announce('Document copied'))} className={buttonClass}><Copy size={11} />Copy</button></div><div data-testid="status-autosave" aria-live="polite" className="flex items-center gap-1.5 text-[10px] text-white/32"><span className={`h-1.5 w-1.5 rounded-full ${status === 'Saved' ? 'bg-emerald-300/75' : 'bg-amber-300/75'}`} />{status === 'Saved' ? 'Saved locally' : 'Saving locally…'}</div></div>
    <div className="relative min-h-0 flex-1 overflow-y-auto scroll-smooth bg-[#191820] px-[clamp(1rem,6vw,5.5rem)] py-8 sm:py-12"><SelectionToolbar editorRef={editorRef} content={content} onChange={update} announce={announce} /><div className="mx-auto max-w-[760px]"><textarea ref={editorRef} data-testid="textarea-document-editor" aria-label="Document content" value={content} onChange={event => update(event.target.value)} onKeyDown={onKeyDown} spellCheck={document.kind !== 'code'} placeholder="Begin your research artifact…" className={`min-h-[58vh] w-full resize-none border-0 bg-transparent text-[16px] leading-[1.85] tracking-[0.005em] text-[#e4e0ec] outline-none placeholder:text-white/20 sm:text-[17px] ${document.kind === 'code' ? 'font-mono text-[13px] leading-[1.7]' : document.kind === 'math' ? 'font-mono text-[15px]' : 'font-serif'}`} /><div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-white/24"><span data-testid="text-word-count">{metrics.words} words</span><span data-testid="text-character-count">{metrics.chars} characters</span><span data-testid="text-reading-time">{metrics.reading} min read</span><span className="text-violet-200/45">{kindLabel[document.kind]} mode</span></div></div></div>
  </div>;
}

interface WorkspacePanelProps { open: boolean; onClose: () => void; items: SavedItem[]; onRemove: (id: string) => void; onNoteChange: (id: string, note: string) => void; seedContent?: string; }
export const WorkspacePanel = memo(function WorkspacePanel({ open, onClose, items, onRemove, onNoteChange, seedContent }: WorkspacePanelProps) {
  const [mounted, setMounted] = useState(false); const [selectedItem, setSelectedItem] = useState<SavedItem | undefined>(items[0]); const [document, setDocument] = useState<WorkspaceDocument | null>(null);
  const [view, setView] = useState<'canvas' | 'library'>('canvas'); const [historyOpen, setHistoryOpen] = useState(false); const [width, setWidth] = useState(58); const [announced, setAnnounced] = useState(''); const [exportOpen, setExportOpen] = useState(false);
  const reducedMotion = useReducedMotion(); const dragRef = useRef(false);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  useEffect(() => {
    if (!seedContent) return;
    setSelectedItem(undefined);
    setDocument(initialDoc({
      id: `seed-${seedContent.length}`,
      content: seedContent,
      preview: previewOf(seedContent),
      savedAt: Date.now(),
      note: '',
    }));
    setView('canvas');
  }, [seedContent]);
  useEffect(() => { if (!document) { const docs = safeRead<WorkspaceDocument[]>(DOCUMENTS_KEY, []); setDocument(docs[0] || null); } }, [document]);
  useEffect(() => {
    if (!document) return;
    const existing = safeRead<WorkspaceDocument[]>(DOCUMENTS_KEY, []);
    safeWrite(DOCUMENTS_KEY, [document, ...existing.filter(item => item.id !== document.id)].slice(0, 12));
  }, [document]);
  const announce = useCallback((message: string) => { setAnnounced(message); window.setTimeout(() => setAnnounced(''), 2400); }, []);
  const openItem = useCallback((item: SavedItem) => { setSelectedItem(item); setDocument(initialDoc(item)); setView('canvas'); announce('Saved response opened as an editable document'); }, [announce]);
  const newDocument = () => { const fresh = initialDoc(); setDocument(fresh); setView('canvas'); announce('New document created'); };
  const activeDocument = document || initialDoc(selectedItem);
  const changeKind = (event: ChangeEvent<HTMLSelectElement>) => setDocument({ ...activeDocument, kind: event.target.value as DocumentKind, updatedAt: Date.now() });
  const exportDocument = (format: 'md' | 'txt' | 'pdf') => {
    const body = format === 'md' ? activeDocument.content : activeDocument.content.replace(/[#*_`]/g, '');
    if (format === 'pdf') { const printWindow = window.open('', '_blank', 'noopener,noreferrer'); if (printWindow) { printWindow.document.write(`<html><head><title>${activeDocument.title}</title><style>body{font-family:Georgia,serif;max-width:700px;margin:60px auto;line-height:1.8;white-space:pre-wrap}</style></head><body>${body.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c))}</body></html>`); printWindow.document.close(); printWindow.print(); } } else { const blob = new Blob([body], { type: format === 'md' ? 'text/markdown' : 'text/plain' }); const link = window.document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${activeDocument.title || 'singularity-document'}.${format}`; link.click(); URL.revokeObjectURL(link.href); } announce(`${format.toUpperCase()} export ready`); setExportOpen(false);
  };
  const startDrag = (event: React.PointerEvent) => { dragRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); };
  const drag = (event: React.PointerEvent) => { if (dragRef.current) setWidth(Math.min(76, Math.max(38, ((window.innerWidth - event.clientX) / window.innerWidth) * 100))); };
  const stopDrag = () => { dragRef.current = false; };
  const snapshot = () => { const versions = safeRead<Snapshot[]>(VERSIONS_KEY, []); const next = [{ ...activeDocument, versionId: `v-${Date.now()}`, createdAt: Date.now() }, ...versions].filter(version => version.id === activeDocument.id || versions.some(item => item.id === version.id)).slice(0, MAX_VERSIONS); safeWrite(VERSIONS_KEY, next); };
  if (!mounted) return null;
  return <AnimatePresence>
    {open && <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="absolute inset-0 z-40" data-testid="workspace-shell">
      <div className="absolute inset-0 bg-black/35 md:bg-black/10" onClick={onClose} aria-hidden="true" />
      <motion.section initial={reducedMotion ? false : { x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ ['--workspace-width' as string]: `${width}%` }} className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/[0.08] bg-[#121118] shadow-[-20px_0_60px_rgba(0,0,0,.36)] md:w-[var(--workspace-width)]" role="dialog" aria-modal="true" aria-label="Singularity Workspace" data-testid="workspace-panel">
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#13121a]/95 px-3 py-3 backdrop-blur-xl sm:px-5"><div className="flex min-w-0 items-center gap-2.5"><button type="button" data-testid="button-workspace-back" onClick={onClose} className={iconButtonClass} aria-label="Close workspace"><ArrowLeft size={16} /></button><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200/15 bg-violet-200/[0.08] text-violet-100/70"><Sparkles size={14} /></div><div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-violet-200/48">Singularity / Workspace</p><h2 data-testid="text-workspace-title" className="truncate text-[14px] font-medium tracking-[-0.02em] text-white/90">{view === 'library' ? 'Saved responses' : 'Research canvas'}</h2></div></div><div className="flex items-center gap-1"><button type="button" data-testid="button-toggle-library" onClick={() => setView(value => value === 'library' ? 'canvas' : 'library')} className={`${buttonClass} hidden sm:inline-flex`}><BookOpen size={12} />{view === 'library' ? 'Canvas' : `Library · ${items.length}`}</button><button type="button" data-testid="button-toggle-library-mobile" onClick={() => setView(value => value === 'library' ? 'canvas' : 'library')} className={`${iconButtonClass} sm:hidden`} aria-label="Open saved response library"><BookOpen size={14} /></button><ToolButton label="Close workspace" testId="button-close-workspace" onClick={onClose}><X size={15} /></ToolButton></div></header>
        {view === 'library' ? <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-violet-200/48">Saved exchange</p><h3 data-testid="text-library-heading" className="mt-1 text-xl tracking-[-0.04em] text-white/90">Research library</h3><p className="mt-1 text-[11px] text-white/35">Keep the original response. Shape a separate document when you are ready.</p></div><button type="button" data-testid="button-new-document-library" onClick={newDocument} className={buttonClass}><Plus size={12} />New document</button></div>{items.length === 0 ? <div data-testid="empty-workspace" className="flex min-h-[50vh] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-white/20"><Bookmark size={23} /></div><p className="mt-4 text-[13px] text-white/45">Nothing saved yet</p><p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-white/25">Use Save beneath an answer to keep an exchange here.</p></div> : <div className="space-y-2.5">{items.map(item => <ItemCard key={item.id} item={item} onRemove={onRemove} onNoteChange={onNoteChange} onOpenDocument={openItem} />)}</div>}</main> : <main className="relative flex min-h-0 flex-1 flex-col"><div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-6"><div className="min-w-[170px] flex-1"><input data-testid="input-document-title" aria-label="Document title" value={activeDocument.title} onChange={event => setDocument({ ...activeDocument, title: event.target.value, updatedAt: Date.now() })} className="w-full bg-transparent text-[17px] tracking-[-0.035em] text-white/90 outline-none placeholder:text-white/25" placeholder="Document title" /></div><select data-testid="select-document-kind" aria-label="Document kind" value={activeDocument.kind} onChange={changeKind} className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[10px] text-white/60 outline-none"><option value="text">Text</option><option value="markdown">Markdown</option><option value="code">Code</option><option value="math">Math</option></select><div className="relative"><button type="button" data-testid="button-export-menu" onClick={() => setExportOpen(value => !value)} className={buttonClass}><Download size={11} />Export<ChevronDown size={10} /></button>{exportOpen && <div data-testid="menu-export" className="absolute right-0 top-full z-40 mt-1 w-40 rounded-xl border border-white/[0.09] bg-[#211f29] p-1.5 shadow-xl"><button type="button" data-testid="button-export-markdown" onClick={() => exportDocument('md')} className="block w-full rounded-md px-2.5 py-2 text-left text-[10px] text-white/65 hover:bg-white/[0.07]">Markdown</button><button type="button" data-testid="button-export-txt" onClick={() => exportDocument('txt')} className="block w-full rounded-md px-2.5 py-2 text-left text-[10px] text-white/65 hover:bg-white/[0.07]">Plain text</button><button type="button" data-testid="button-export-pdf" onClick={() => exportDocument('pdf')} className="block w-full rounded-md px-2.5 py-2 text-left text-[10px] text-white/65 hover:bg-white/[0.07]">PDF via print</button><button type="button" data-testid="button-export-docx" disabled className="block w-full rounded-md px-2.5 py-2 text-left text-[10px] text-white/30">DOCX · coming later</button></div>}</div><ToolButton label="Version history" testId="button-open-history" onClick={() => { snapshot(); setHistoryOpen(true); }}><History size={14} /></ToolButton><button type="button" data-testid="button-open-library" onClick={() => setView('library')} className={buttonClass}><BookOpen size={11} />Library</button></div><Editor document={activeDocument} setDocument={setDocument} announce={announce} />{historyOpen && <VersionsPanel document={activeDocument} onClose={() => setHistoryOpen(false)} onRestore={version => { setDocument({ ...version, updatedAt: Date.now() }); setHistoryOpen(false); announce('Version restored'); }} onDuplicate={() => { setDocument({ ...activeDocument, id: `doc-${Date.now()}`, title: `${activeDocument.title} copy`, updatedAt: Date.now() }); announce('Document duplicated'); }} onRename={() => { const title = window.prompt('Rename document', activeDocument.title); if (title) setDocument({ ...activeDocument, title, updatedAt: Date.now() }); }} onDelete={id => safeWrite(VERSIONS_KEY, safeRead<Snapshot[]>(VERSIONS_KEY, []).filter(version => version.versionId !== id))} />}</main>}
        <div ref={node => { if (!node) return; }} className="hidden md:block" />
        <div role="separator" aria-label="Resize workspace" data-testid="workspace-resize-handle" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} className="absolute left-0 top-0 hidden h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center md:flex"><GripVertical size={14} className="text-white/20" /></div>
        <div aria-live="polite" data-testid="status-workspace-live" className="sr-only">{announced}</div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>;
});