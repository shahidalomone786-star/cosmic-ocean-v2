import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock3,
  Download,
  Edit3,
  Ellipsis,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  CHAT_SIDEBAR_COLLAPSED_KEY,
  CHAT_SIDEBAR_WIDTH_KEY,
  getChatPreview,
  getChatSearchText,
  listChatSessionSummaries,
  summarizeChatSession,
  type ChatSessionSummary,
  type ChatSession,
} from '@/lib/singularityChatHistory';

interface SingularitySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onToggleArchive: (sessionId: string) => void;
  onDuplicateSession: (sessionId: string) => void;
  onExportSession: (sessionId: string, format: 'json' | 'markdown' | 'txt' | 'pdf') => void;
  onUndoDelete: () => void;
  undoTitle?: string | null;
  historyNotice?: string | null;
  historyRefreshToken?: number;
  pendingHistoryWrites?: number;
  isOffline?: boolean;
  disabled?: boolean;
}

type TimeGroup = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Previous 30 Days' | 'This Year' | 'Older';

const GROUP_ORDER: TimeGroup[] = [
  'Today',
  'Yesterday',
  'Previous 7 Days',
  'Previous 30 Days',
  'This Year',
  'Older',
];

function getTimeGroup(timestamp: number, now = new Date()): TimeGroup {
  const date = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const age = Math.floor((startOfToday - startOfDate) / dayMs);

  if (age <= 0) return 'Today';
  if (age === 1) return 'Yesterday';
  if (age <= 7) return 'Previous 7 Days';
  if (age <= 30) return 'Previous 30 Days';
  if (date.getFullYear() === now.getFullYear()) return 'This Year';
  return 'Older';
}

function formatUpdatedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (getTimeGroup(timestamp, now) === 'Today') {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (getTimeGroup(timestamp, now) === 'Yesterday') return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function highlightMatches(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase()
      ? <mark key={`${part}-${index}`} className="rounded bg-violet-400/25 px-0.5 text-violet-100">{part}</mark>
      : part,
  );
}

function SessionRow({
  session,
  active,
  collapsed,
  query,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDuplicate,
  onExport,
  deleting = false,
}: {
  session: ChatSession | ChatSessionSummary;
  active: boolean;
  collapsed: boolean;
  query: string;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onToggleArchive: () => void;
  onDuplicate: () => void;
  onExport: (format: 'json' | 'markdown' | 'txt' | 'pdf') => void;
  deleting?: boolean;
}) {
  const preview = 'preview' in session ? session.preview : getChatPreview(session);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const commitRename = () => {
    const nextTitle = draftTitle.replace(/\s+/g, ' ').trim();
    if (nextTitle) onRename(nextTitle);
    setEditing(false);
  };

  return (
    <div className={`group relative flex w-full items-start rounded-xl transition-gpu
      ${active
        ? 'border border-violet-300/[0.16] bg-violet-300/[0.10] text-white shadow-[inset_0_1px_0_rgba(196,181,253,0.10),0_6px_18px_rgba(0,0,0,0.16)]'
        : 'border border-transparent text-white/55 hover:bg-white/[0.055] hover:text-white/90'}
      ${collapsed ? 'justify-center' : ''}
      ${deleting ? 'pointer-events-none translate-x-1 scale-[0.98] opacity-0' : ''}`}>
      <button
        type="button"
        onClick={onSelect}
        title={collapsed ? session.title : undefined}
        className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left
          transition-gpu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55 focus-visible:ring-inset
          ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg
          ${active ? 'bg-violet-300/20 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]' : 'bg-white/[0.055] text-white/30 group-hover:bg-white/[0.08] group-hover:text-white/70'}`}>
          {session.favorite ? <Star size={13} fill="currentColor" strokeWidth={1.8} /> : <MessageCircle size={13} strokeWidth={1.8} />}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              {editing ? (
                <input
                  ref={titleInputRef}
                  value={draftTitle}
                  onChange={event => setDraftTitle(event.target.value)}
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event => {
                    if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
                    if (event.key === 'Escape') { event.preventDefault(); setEditing(false); }
                  }}
                  onBlur={commitRename}
                  maxLength={80}
                   className="min-w-0 flex-1 rounded-md border border-violet-300/35 bg-black/30 px-1.5 py-0.5 text-[12px] text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-300/45"
                  aria-label={`Rename ${session.title}`}
                />
              ) : (
                <span className="flex min-w-0 items-center gap-1 truncate text-[12px] font-medium">
                  {session.pinned && (
                    <Pin size={10} strokeWidth={2.2} className="flex-shrink-0 text-violet-200/80" aria-label="Pinned" />
                  )}
                  <span className="truncate">{highlightMatches(session.title, query)}</span>
                </span>
              )}
              <span className={`flex-shrink-0 text-[9px] ${active ? 'text-violet-100/65' : 'text-white/30'}`}>
                {formatUpdatedAt(session.updatedAt)}
              </span>
            </span>
            {preview && (
              <span className="mt-1 block truncate text-[10px] text-white/32">
                {highlightMatches(preview, query)}
              </span>
            )}
          </span>
        )}
      </button>

      {!collapsed && (
        <button
          type="button"
          onClick={event => { event.stopPropagation(); setMenuOpen(value => !value); }}
            className="mr-1 mt-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white/25 opacity-100 transition-gpu group-hover:bg-white/[0.08] hover:bg-white/[0.12] hover:text-white/90 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"
          aria-label={`Actions for ${session.title}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Ellipsis size={14} />
        </button>
      )}

      {menuOpen && !collapsed && (
        <div
          role="menu"
          className="absolute right-1 top-9 z-30 w-44 rounded-2xl border border-white/[0.11] bg-[#171720]/[0.98] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl"
          onClick={event => event.stopPropagation()}
        >
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setEditing(true); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Edit3 size={12} />Rename</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onTogglePin(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><PinIcon active={Boolean(session.pinned)} />{session.pinned ? 'Unpin' : 'Pin'}</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onToggleFavorite(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Star size={12} fill={session.favorite ? 'currentColor' : 'none'} />{session.favorite ? 'Remove favorite' : 'Favorite'}</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onToggleArchive(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55">{session.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}{session.archived ? 'Restore' : 'Archive'}</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDuplicate(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Copy size={12} />Duplicate</button>
          <div className="px-2.5 pb-1 pt-1 text-[9px] uppercase tracking-[0.14em] text-white/25">Export as</div>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onExport('markdown'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Download size={12} />Markdown</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onExport('txt'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Download size={12} />Plain text</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onExport('json'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Download size={12} />JSON</button>
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onExport('pdf'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-white/65 transition-gpu hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"><Download size={12} />PDF</button>
          <div className="my-1 border-t border-white/[0.07]" />
           <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-red-300/80 transition-gpu hover:bg-red-400/[0.10] hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50"><Trash2 size={12} />Delete</button>
        </div>
      )}
    </div>
  );
}

function PinIcon({ active }: { active: boolean }) {
  return <span className={`text-[12px] leading-none ${active ? 'text-violet-200' : 'text-white/65'}`}>⌖</span>;
}

function SidebarContents({
  sessions,
  activeSessionId,
  collapsed,
  query,
  setQuery,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDuplicateSession,
  onExportSession,
  onUndoDelete,
  undoTitle,
  historyNotice,
  focusSearchRequest,
  historyRefreshToken,
  pendingHistoryWrites = 0,
  isOffline = false,
  onCollapse,
  onCloseMobile,
  disabled,
}: {
  sessions: Array<ChatSession | ChatSessionSummary>;
  activeSessionId: string;
  collapsed: boolean;
  query: string;
  setQuery: (value: string) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onToggleArchive: (sessionId: string) => void;
  onDuplicateSession: (sessionId: string) => void;
  onExportSession: (sessionId: string, format: 'json' | 'markdown' | 'txt' | 'pdf') => void;
  onUndoDelete: () => void;
  undoTitle?: string | null;
  historyNotice?: string | null;
  focusSearchRequest: number;
  historyRefreshToken: number;
  pendingHistoryWrites?: number;
  isOffline?: boolean;
  onCollapse?: () => void;
  onCloseMobile?: () => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | ChatSessionSummary | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [summarySessions, setSummarySessions] = useState<ChatSessionSummary[]>([]);
  const [hasMoreSummaries, setHasMoreSummaries] = useState(false);
  const [summaryCursor, setSummaryCursor] = useState<string | null>(null);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [virtualStart, setVirtualStart] = useState(0);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummariesLoading(true);
    setSummaryCursor(null);
    void listChatSessionSummaries(null).then(page => {
      if (cancelled) return;
      setSummarySessions(page.sessions);
      setHasMoreSummaries(page.hasMore);
      setSummaryCursor(page.sessions.at(-1)?.sortKey ?? null);
    }).finally(() => {
      if (!cancelled) setSummariesLoading(false);
    });
    return () => { cancelled = true; };
  }, [historyRefreshToken]);

  const loadMoreSummaries = () => {
    if (summariesLoading || !hasMoreSummaries) return;
    setSummariesLoading(true);
    void listChatSessionSummaries(summaryCursor).then(page => {
      setSummarySessions(previous => {
        const byId = new Map(previous.map(session => [session.id, session]));
        page.sessions.forEach(session => byId.set(session.id, session));
        return [...byId.values()];
      });
      setHasMoreSummaries(page.hasMore);
      setSummaryCursor(page.sessions.at(-1)?.sortKey ?? summaryCursor);
    }).finally(() => setSummariesLoading(false));
  };

  const mergedSessions = useMemo(() => {
    const fromProps = sessions.map(session => 'messageCount' in session ? session : summarizeChatSession(session));
    const byId = new Map(summarySessions.map(session => [session.id, session]));
    fromProps.forEach(session => byId.set(session.id, session));
    return [...byId.values()];
  }, [sessions, summarySessions]);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return mergedSessions;
    return mergedSessions.filter(session =>
      `${session.title}\n${'searchText' in session ? session.searchText : getChatSearchText(session)}`.toLowerCase().includes(normalized),
    );
  }, [mergedSessions, query]);

  useEffect(() => {
    if (!focusSearchRequest) return;
    if (collapsed) onCollapse?.();
    window.setTimeout(() => searchRef.current?.focus(), 40);
  }, [collapsed, focusSearchRequest, onCollapse]);

  const visibleSessions = filteredSessions.filter(session => !session.archived);
  const archivedSessions = filteredSessions.filter(session => session.archived);
  const pinned = visibleSessions.filter(session => session.pinned);
  const favorites = visibleSessions.filter(session => session.favorite && !session.pinned);
  const regularSessions = visibleSessions.filter(session => !session.favorite && !session.pinned);

  const grouped = useMemo(() => {
  const result = new Map<TimeGroup, ChatSessionSummary[]>();
    regularSessions.forEach(session => {
      const group = getTimeGroup(session.updatedAt);
      result.set(group, [...(result.get(group) ?? []), session]);
    });
    return GROUP_ORDER
      .filter(group => result.has(group))
      .map(group => ({ group, sessions: result.get(group) ?? [] }));
  }, [regularSessions]);

  const renderRow = (session: ChatSessionSummary) => (
    <SessionRow
      key={session.id}
      session={session}
      active={session.id === activeSessionId}
      collapsed={collapsed}
      query={query}
      onSelect={() => {
        onSelectSession(session.id);
        onCloseMobile?.();
      }}
      onRename={title => onRenameSession(session.id, title)}
       onDelete={() => setDeleteTarget(session)}
      onTogglePin={() => onTogglePin(session.id)}
      onToggleFavorite={() => onToggleFavorite(session.id)}
      onToggleArchive={() => onToggleArchive(session.id)}
      onDuplicate={() => onDuplicateSession(session.id)}
       onExport={format => onExportSession(session.id, format)}
       deleting={deletingSessionId === session.id}
    />
  );

  type VirtualRow =
    | { kind: 'header'; key: string; label: string }
    | { kind: 'session'; key: string; session: ChatSessionSummary };

  const virtualRows = useMemo<VirtualRow[]>(() => {
    const rows: VirtualRow[] = [];
    if (pinned.length > 0) {
      rows.push({ kind: 'header', key: 'header-pinned', label: 'Pinned' });
      pinned.forEach(session => rows.push({ kind: 'session', key: session.id, session }));
    }
    if (favorites.length > 0) {
      rows.push({ kind: 'header', key: 'header-favorites', label: 'Favorites' });
      favorites.forEach(session => rows.push({ kind: 'session', key: session.id, session }));
    }
    grouped.forEach(({ group, sessions: groupSessions }) => {
      rows.push({ kind: 'header', key: `header-${group}`, label: group });
      groupSessions.forEach(session => rows.push({ kind: 'session', key: session.id, session }));
    });
    if (archivedSessions.length > 0) {
      rows.push({ kind: 'header', key: 'header-archived', label: 'Archived' });
      archivedSessions.forEach(session => rows.push({ kind: 'session', key: session.id, session }));
    }
    return rows;
  }, [archivedSessions, favorites, grouped, pinned]);

  const rowHeight = 58;
  const overscan = 8;
  const virtualStartWithOverscan = Math.max(0, virtualStart - overscan);
  const renderedRows = virtualRows.slice(
    virtualStartWithOverscan,
    Math.min(virtualRows.length, virtualStart + Math.ceil(320 / rowHeight) + overscan),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 pb-4 pt-4`}>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-200/20 bg-violet-200/[0.09] text-violet-100 shadow-[0_8px_20px_rgba(88,28,135,0.16)]">
              <span className="text-sm">✦</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold tracking-[0.08em] text-white/85">SINGULARITY</p>
              <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">Chat history</p>
            </div>
          </div>
        )}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-gpu hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-gpu hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"
            aria-label="Close chat history"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={`px-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className={`flex items-center gap-2 rounded-xl border border-violet-200/20 bg-violet-200/[0.10]
            text-[11px] font-medium text-violet-50 shadow-[0_8px_24px_rgba(76,29,149,0.14)]
            transition-gpu hover:border-violet-200/40 hover:bg-violet-200/[0.16] active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60
            ${collapsed ? 'h-10 w-10 justify-center px-0' : 'w-full justify-center px-3 py-2.5'}`}
          aria-label="Start a new chat"
        >
          <Plus size={14} strokeWidth={2.2} />
          {!collapsed && 'New chat'}
        </button>
      </div>

      <div className={`mt-4 px-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={() => onCollapse?.()}
            className="flex h-9 w-10 items-center justify-center rounded-lg text-white/35 transition-gpu hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55"
            aria-label="Search chat history"
          >
            <Search size={14} />
          </button>
        ) : (
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2 text-white/35 transition-colors focus-within:border-violet-300/35 focus-within:bg-white/[0.025] focus-within:text-white/70">
            <Search size={13} className="flex-shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search chats"
              className="min-w-0 flex-1 bg-transparent text-[11px] text-white/80 outline-none placeholder:text-white/25"
              aria-label="Search chat history"
            />
            {query && <kbd className="text-[9px] text-white/20">ESC</kbd>}
          </label>
        )}
      </div>

      <div
        ref={historyScrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-5 pt-4 scrollbar-hide"
        onScroll={event => {
          const element = event.currentTarget;
          setVirtualStart(Math.max(0, Math.floor(element.scrollTop / rowHeight)));
          if (element.scrollTop + element.clientHeight >= element.scrollHeight - 500) loadMoreSummaries();
        }}
      >
        {!ready ? (
          <div className="space-y-2 px-1" aria-label="Loading chat history">
            {[0, 1, 2, 3, 4].map(item => (
              <div key={item} className="flex animate-pulse items-center gap-2.5 rounded-xl px-2.5 py-2.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-lg bg-white/[0.06]" />
                {!collapsed && <div className="h-8 flex-1 rounded-lg bg-white/[0.045]" />}
              </div>
            ))}
          </div>
        ) : favorites.length === 0 && pinned.length === 0 && grouped.length === 0 && archivedSessions.length === 0 ? (
          <div className={`${collapsed ? 'px-1' : 'px-3'} py-10 text-center`}>
            <Clock3 size={18} className="mx-auto mb-3 text-white/15" />
            {!collapsed && (
              <p className="text-[11px] leading-relaxed text-white/28">
                {query ? 'No chats match your search.' : 'Your conversations will appear here.'}
              </p>
            )}
          </div>
        ) : (
          <div style={{ height: virtualRows.length * rowHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${virtualStartWithOverscan * rowHeight}px)` }}>
              {renderedRows.map(row => row.kind === 'header' ? (
                <div key={row.key} className="flex h-[58px] items-end px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  {!collapsed && row.label}
                </div>
              ) : (
                <div key={row.key} className="h-[58px] py-0.5">
                  {renderRow(row.session)}
                </div>
              ))}
            </div>
          </div>
        )}
        {summariesLoading && <div className="px-3 py-2 text-[10px] text-white/25" role="status">Loading more history…</div>}
      </div>

      {(undoTitle || historyNotice) && !collapsed && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-[10px] text-white/60" role="status">
          <span className="min-w-0 flex-1 truncate">{historyNotice ?? `${undoTitle} deleted`}</span>
          {undoTitle && <button type="button" onClick={onUndoDelete} className="flex items-center gap-1 font-medium text-violet-200 hover:text-white"><Undo2 size={11} />Undo</button>}
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-white/[0.07] bg-black/[0.08] px-4 py-3.5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">Local history</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/25">
            {isOffline ? 'Offline cache active. Changes will sync when you reconnect.' : 'Saved securely in this browser.'}
          </p>
          {pendingHistoryWrites > 0 && (
            <p className="mt-1 text-[9px] text-amber-200/55" role="status">
              Sync queued · retrying automatically
            </p>
          )}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-chat-title"
            aria-describedby="delete-chat-description"
            className="w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#18181f] p-5 shadow-2xl"
          >
            <h2 id="delete-chat-title" className="text-[15px] font-semibold text-white/90">Delete conversation?</h2>
            <p id="delete-chat-description" className="mt-2 text-[12px] leading-relaxed text-white/45">
              “{deleteTarget.title}” will be removed from this browser. You can undo this action for a few seconds.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg px-3 py-2 text-[11px] text-white/55 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50">Cancel</button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  const targetId = deleteTarget.id;
                  setDeletingSessionId(targetId);
                  setDeleteTarget(null);
                  window.setTimeout(() => {
                    onDeleteSession(targetId);
                    setDeletingSessionId(current => current === targetId ? null : current);
                  }, 180);
                }}
                className="rounded-lg bg-red-400/15 px-3 py-2 text-[11px] font-medium text-red-200 hover:bg-red-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SingularitySidebar({
  sessions,
  activeSessionId,
  mobileOpen,
  onMobileOpenChange,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onTogglePin,
  onToggleFavorite,
  onToggleArchive,
  onDuplicateSession,
  onExportSession,
  onUndoDelete,
  undoTitle,
  historyNotice,
  historyRefreshToken = 0,
  pendingHistoryWrites = 0,
  isOffline = false,
  disabled = false,
}: SingularitySidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CHAT_SIDEBAR_COLLAPSED_KEY) === 'true';
  });
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 280;
    const stored = Number(window.localStorage.getItem(CHAT_SIDEBAR_WIDTH_KEY));
    return Number.isFinite(stored) ? Math.min(380, Math.max(220, stored)) : 280;
  });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [focusSearchRequest, setFocusSearchRequest] = useState(0);
  const resizingRef = useRef(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setFocusSearchRequest(value => value + 1);
        if (window.matchMedia('(max-width: 767px)').matches) {
          onMobileOpenChange(true);
        }
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        onNewChat();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onMobileOpenChange, onNewChat]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_SIDEBAR_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (!query) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuery('');
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [query]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mobileOpen) {
        onMobileOpenChange(false);
        return;
      }
      if (query) {
        setQuery('');
        return;
      }
      if (!collapsed) setCollapsed(true);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [collapsed, mobileOpen, onMobileOpenChange, query]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizingRef.current) return;
      setWidth(Math.min(380, Math.max(220, event.clientX)));
    };
    const up = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const contentsProps = {
    sessions,
    activeSessionId,
    query: debouncedQuery,
    setQuery,
    onNewChat,
    onSelectSession,
    onRenameSession,
    onDeleteSession,
    onTogglePin,
    onToggleFavorite,
    onToggleArchive,
    onDuplicateSession,
    onExportSession,
    onUndoDelete,
    undoTitle,
    historyNotice,
    focusSearchRequest,
    historyRefreshToken,
    pendingHistoryWrites,
    isOffline,
    disabled,
  };

  return (
    <>
      <aside
        className="relative hidden h-full flex-shrink-0 border-r border-white/[0.08] bg-[#0b0b10]/88 shadow-[8px_0_32px_rgba(0,0,0,0.14)] backdrop-blur-2xl md:block"
        style={{ width: collapsed ? 68 : width }}
        aria-label="Singularity chat history"
      >
        <SidebarContents
          {...contentsProps}
          collapsed={collapsed}
          onCollapse={() => setCollapsed(value => !value)}
        />
        {!collapsed && (
          <div
            role="separator"
            aria-label="Resize chat history sidebar"
            aria-orientation="vertical"
            onPointerDown={startResize}
            className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize transition-colors hover:bg-violet-300/20"
          />
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close chat history"
          />
          <aside className="relative z-10 h-full w-[min(90vw,340px)] border-r border-white/[0.10] bg-[#0b0b10]/[0.98] shadow-[20px_0_60px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
            <SidebarContents
              {...contentsProps}
              collapsed={false}
              onCloseMobile={() => onMobileOpenChange(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-white/38 transition-gpu hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55 md:hidden"
      aria-label="Open chat history"
    >
      <Menu size={16} />
    </button>
  );
}

export function DesktopSidebarPeek({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return collapsed ? (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-gpu hover:bg-white/[0.07] hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/55 md:flex"
      aria-label="Expand chat history sidebar"
    >
      <ChevronRight size={15} />
    </button>
  ) : (
    <ChevronLeft size={15} className="hidden text-white/20 md:block" aria-hidden="true" />
  );
}