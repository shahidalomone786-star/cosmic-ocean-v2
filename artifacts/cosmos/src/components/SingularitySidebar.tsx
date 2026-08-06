import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  CHAT_SIDEBAR_COLLAPSED_KEY,
  CHAT_SIDEBAR_WIDTH_KEY,
  getChatPreview,
  getChatSearchText,
  type ChatSession,
} from '@/lib/singularityChatHistory';

interface SingularitySidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
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
}: {
  session: ChatSession;
  active: boolean;
  collapsed: boolean;
  query: string;
  onSelect: () => void;
}) {
  const preview = getChatPreview(session);
  return (
    <button
      type="button"
      onClick={onSelect}
      title={collapsed ? session.title : undefined}
      className={`group flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left
        transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50
        ${collapsed ? 'justify-center px-0' : ''}
        ${active
          ? 'bg-violet-400/[0.12] text-white shadow-[inset_0_1px_0_rgba(196,181,253,0.08)]'
          : 'text-white/55 hover:bg-white/[0.055] hover:text-white/85'}`}
    >
      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg
        ${active ? 'bg-violet-400/20 text-violet-200' : 'bg-white/[0.055] text-white/30 group-hover:text-white/60'}`}>
        <MessageCircle size={13} strokeWidth={1.8} />
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[12px] font-medium">
              {highlightMatches(session.title, query)}
            </span>
            <span className={`flex-shrink-0 text-[9px] ${active ? 'text-violet-200/60' : 'text-white/25'}`}>
              {formatUpdatedAt(session.updatedAt)}
            </span>
          </span>
          {preview && (
            <span className="mt-1 block truncate text-[10px] text-white/28">
              {highlightMatches(preview, query)}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function SidebarContents({
  sessions,
  activeSessionId,
  collapsed,
  query,
  setQuery,
  onNewChat,
  onSelectSession,
  onCollapse,
  onCloseMobile,
  disabled,
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  collapsed: boolean;
  query: string;
  setQuery: (value: string) => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onCollapse?: () => void;
  onCloseMobile?: () => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sessions;
    return sessions.filter(session =>
      `${session.title}\n${getChatSearchText(session)}`.toLowerCase().includes(normalized),
    );
  }, [query, sessions]);

  const grouped = useMemo(() => {
    const result = new Map<TimeGroup, ChatSession[]>();
    filteredSessions.forEach(session => {
      const group = getTimeGroup(session.updatedAt);
      result.set(group, [...(result.get(group) ?? []), session]);
    });
    return GROUP_ORDER
      .filter(group => result.has(group))
      .map(group => ({ group, sessions: result.get(group) ?? [] }));
  }, [filteredSessions]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 pb-3 pt-4`}>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/[0.10] text-violet-200 shadow-[0_0_18px_rgba(167,139,250,0.12)]">
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
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
          className={`flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/[0.11]
            text-[11px] font-medium text-violet-100 shadow-[0_8px_24px_rgba(76,29,149,0.15)]
            transition hover:border-violet-200/35 hover:bg-violet-300/[0.17] active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60
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
            className="flex h-9 w-10 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white/75"
            aria-label="Search chat history"
          >
            <Search size={14} />
          </button>
        ) : (
          <label className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2 text-white/35 focus-within:border-violet-300/30 focus-within:text-white/65">
            <Search size={13} className="flex-shrink-0" />
            <input
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-5 scrollbar-hide">
        {!ready ? (
          <div className="space-y-2 px-1" aria-label="Loading chat history">
            {[0, 1, 2, 3, 4].map(item => (
              <div key={item} className="flex animate-pulse items-center gap-2.5 rounded-xl px-2.5 py-2.5">
                <div className="h-7 w-7 flex-shrink-0 rounded-lg bg-white/[0.06]" />
                {!collapsed && <div className="h-8 flex-1 rounded-lg bg-white/[0.045]" />}
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className={`${collapsed ? 'px-1' : 'px-3'} py-10 text-center`}>
            <Clock3 size={18} className="mx-auto mb-3 text-white/15" />
            {!collapsed && (
              <p className="text-[11px] leading-relaxed text-white/28">
                {query ? 'No chats match your search.' : 'Your conversations will appear here.'}
              </p>
            )}
          </div>
        ) : (
          grouped.map(({ group, sessions: groupSessions }) => (
            <section key={group} className="mb-5">
              {!collapsed && (
                <h3 className="mb-1 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                  {group}
                </h3>
              )}
              <div className="space-y-0.5">
                {groupSessions.map(session => (
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
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">Local history</p>
          <p className="mt-1 text-[10px] leading-relaxed text-white/25">Saved securely in this browser.</p>
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
  const resizingRef = useRef(false);

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
    disabled,
  };

  return (
    <>
      <aside
        className="relative hidden h-full flex-shrink-0 border-r border-white/[0.07] bg-[#0b0b10]/85 backdrop-blur-2xl md:block"
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
            className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize transition hover:bg-violet-300/20"
          />
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close chat history"
          />
          <aside className="relative z-10 h-full w-[min(88vw,340px)] border-r border-white/[0.09] bg-[#0b0b10]/95 shadow-[20px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 md:hidden"
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
      className="hidden h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/75 md:flex"
      aria-label="Expand chat history sidebar"
    >
      <ChevronRight size={15} />
    </button>
  ) : (
    <ChevronLeft size={15} className="hidden text-white/20 md:block" aria-hidden="true" />
  );
}