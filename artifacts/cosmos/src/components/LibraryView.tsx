import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ArxivItem } from './NasaSearch';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReaderTheme = 'dark' | 'light';

export interface LibrarySharedContext {
  title: string;
  description: string;
  source: 'arxiv';
}

interface LibraryViewProps {
  onClose: () => void;
  onDiscussWithAvatar: (avatarName: string, ctx: LibrarySharedContext) => void;
  avatars: { name: string; image: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_QUERY = 'astrophysics cosmology';
const PAGE_SIZE     = 10;

// ─── arXiv browser-side helpers ───────────────────────────────────────────────
// arXiv's export API supports CORS (Access-Control-Allow-Origin: *), so we can
// call it directly from the browser — no server proxy needed. This avoids the
// server-side 8 s timeout that was silently returning empty results.

function parseArxivTotal(xml: string): number {
  const m = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
  return m ? parseInt(m[1], 10) : 0;
}

function xmlText(chunk: string, tag: string): string {
  const m = chunk.match(new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`));
  return m ? m[1].replace(/\n+/g, ' ').trim() : '';
}

function parseArxivEntries(xml: string): ArxivItem[] {
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  const items: ArxivItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const e         = m[1];
    const id        = xmlText(e, 'id');
    const title     = xmlText(e, 'title');
    const summary   = xmlText(e, 'summary').slice(0, 400);
    const published = xmlText(e, 'published').slice(0, 10);
    const authors   = [...e.matchAll(/<name>\s*(.*?)\s*<\/name>/g)].map(a => a[1]);
    items.push({ id, title, summary, authors, published, link: id });
  }
  return items;
}

async function fetchArxiv(
  q: string,
  start: number,
  maxResults: number,
): Promise<{ items: ArxivItem[]; total: number }> {
  const url =
    `https://export.arxiv.org/api/query` +
    `?search_query=all:${encodeURIComponent(q)}` +
    `&max_results=${maxResults}` +
    `&start=${start}` +
    `&sortBy=relevance`;

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return { items: [], total: 0 };
  const xml   = await res.text();
  const total = parseArxivTotal(xml);
  const items = parseArxivEntries(xml);
  return { items, total };
}

// ─── Paper Card ───────────────────────────────────────────────────────────────
function PaperCard({
  paper, isDark, isDiscussOpen, onToggleDiscuss, avatars, onDiscuss,
}: {
  paper:           ArxivItem;
  isDark:          boolean;
  isDiscussOpen:   boolean;
  onToggleDiscuss: () => void;
  avatars:         { name: string; image: string }[];
  onDiscuss:       (avatarName: string) => void;
}) {
  const authorsDisplay = paper.authors.length > 0
    ? paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '')
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border p-5 transition-colors duration-300 ${
        isDark
          ? 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.13] hover:bg-white/[0.042]'
          : 'border-black/[0.07] bg-black/[0.02] hover:border-black/[0.13] hover:bg-black/[0.038]'
      }`}
    >
      {/* Meta row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border ${
          isDark
            ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300/90'
            : 'bg-emerald-600/10 border-emerald-600/15 text-emerald-700'
        }`}>
          📚 arXiv
        </span>
        {paper.published && (
          <span className={`text-[10px] uppercase tracking-[0.16em] ${isDark ? 'text-white/30' : 'text-black/35'}`}>
            {paper.published}
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className={`text-[14.5px] font-semibold leading-snug mb-2 tracking-[-0.01em] ${isDark ? 'text-white' : 'text-[#0d0d0d]'}`}
        style={{ fontFamily: 'var(--app-font-heading)' }}
      >
        {paper.title}
      </h3>

      {/* Authors */}
      {authorsDisplay && (
        <p className={`text-[11px] mb-3 tracking-wide ${isDark ? 'text-white/35' : 'text-black/40'}`}>
          {authorsDisplay}
        </p>
      )}

      {/* Abstract */}
      <p className={`text-[12.5px] leading-relaxed tracking-wide line-clamp-3 mb-4 ${isDark ? 'text-white/55' : 'text-black/60'}`}>
        {paper.summary}
      </p>

      {/* Action row */}
      <div className="flex items-center justify-between">
        <a
          href={paper.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className={`text-[10px] uppercase tracking-[0.14em] transition-colors duration-200 ${
            isDark ? 'text-emerald-400/60 hover:text-emerald-300' : 'text-emerald-700/60 hover:text-emerald-600'
          }`}
        >
          Read on arXiv →
        </a>
        <button
          onClick={onToggleDiscuss}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ${
            isDiscussOpen
              ? isDark
                ? 'border-violet-400/35 bg-violet-500/15 text-violet-300'
                : 'border-violet-600/25 bg-violet-600/10 text-violet-700'
              : isDark
                ? 'border-white/[0.10] bg-white/[0.04] text-white/50 hover:border-white/[0.22] hover:text-white/80 hover:bg-white/[0.07]'
                : 'border-black/[0.10] bg-black/[0.03] text-black/50 hover:border-black/[0.20] hover:text-black/75 hover:bg-black/[0.06]'
          }`}
        >
          <span className="text-[9px]">✦</span>
          <span>Discuss</span>
        </button>
      </div>

      {/* Avatar picker — animated reveal */}
      <AnimatePresence>
        {isDiscussOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
              <p className={`text-[9px] uppercase tracking-[0.22em] mb-3 ${isDark ? 'text-white/28' : 'text-black/30'}`}>
                💬 Pick a scientist to discuss with
              </p>
              <div className="flex gap-3 flex-wrap">
                {avatars.map(av => (
                  <button
                    key={av.name}
                    onClick={() => onDiscuss(av.name)}
                    className="flex flex-col items-center gap-1.5 group focus:outline-none"
                    title={`Discuss with ${av.name}`}
                  >
                    {av.image ? (
                      <img
                        src={av.image} alt={av.name}
                        className={`w-10 h-10 rounded-full object-cover border transition-all duration-200 group-hover:scale-110 shadow-md ${
                          isDark ? 'border-white/15 group-hover:border-white/50' : 'border-black/12 group-hover:border-black/35'
                        }`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border transition-all duration-200 group-hover:scale-110 ${
                        isDark ? 'bg-white/10 border-white/15' : 'bg-black/06 border-black/12'
                      }`}>
                        {av.name.charAt(0)}
                      </div>
                    )}
                    <span className={`text-[8.5px] w-12 text-center truncate leading-tight transition-colors duration-200 ${
                      isDark ? 'text-white/35 group-hover:text-white/70' : 'text-black/35 group-hover:text-black/70'
                    }`}>
                      {av.name.split(' ').slice(-1)[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Library View ─────────────────────────────────────────────────────────────
export default function LibraryView({ onClose, onDiscussWithAvatar, avatars }: LibraryViewProps) {
  const [readerTheme,   setReaderTheme]   = useState<ReaderTheme>('dark');
  const [query,         setQuery]         = useState('');
  const [activeQuery,   setActiveQuery]   = useState(DEFAULT_QUERY);
  const [papers,        setPapers]        = useState<ArxivItem[]>([]);
  const [total,         setTotal]         = useState(0);
  const [offset,        setOffset]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [fetchError,    setFetchError]    = useState('');
  const [activeDiscuss, setActiveDiscuss] = useState<string | null>(null);

  // Refs — stable across renders, no effect teardown needed
  const scrollRef     = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef(activeQuery);
  const offsetRef      = useRef(offset);
  const totalRef       = useRef(total);
  const papersLenRef   = useRef(papers.length);
  const loadingRef     = useRef(false);
  const loadingMoreRef = useRef(false);

  // Keep refs in sync
  activeQueryRef.current = activeQuery;
  offsetRef.current      = offset;
  totalRef.current       = total;
  papersLenRef.current   = papers.length;
  loadingRef.current     = loading;
  loadingMoreRef.current = loadingMore;

  const isDark = readerTheme === 'dark';

  // ── Core fetch (replace = initial/new search; !replace = load more) ────────
  const fetchPapers = useCallback(async (
    q: string,
    start: number,
    replace: boolean,
  ) => {
    // Guard: don't run two fetches in parallel
    if (loadingRef.current || loadingMoreRef.current) return;

    if (replace) {
      setLoading(true);
      setFetchError('');
      setPapers([]);
      setTotal(0);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const { items, total: newTotal } = await fetchArxiv(q, start, PAGE_SIZE);
      setPapers(prev => replace ? items : [...prev, ...items]);
      setTotal(newTotal);
      setOffset(start + items.length);
    } catch (err) {
      setFetchError((err as Error)?.message ?? 'Fetch failed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // stable — all mutable values read via refs or params

  // Initial load
  useEffect(() => { fetchPapers(DEFAULT_QUERY, 0, true); }, [fetchPapers]);

  // ── Search submit ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const q = query.trim() || DEFAULT_QUERY;
    setActiveQuery(q);
    setActiveDiscuss(null);
    fetchPapers(q, 0, true);
  }, [query, fetchPapers]);

  // ── Load more (called from scroll handler — reads refs, never stale) ───────
  const triggerLoadMore = useCallback(() => {
    if (loadingRef.current || loadingMoreRef.current) return;
    if (totalRef.current > 0 && papersLenRef.current >= totalRef.current) return;
    if (papersLenRef.current === 0) return;
    fetchPapers(activeQueryRef.current, offsetRef.current, false);
  }, [fetchPapers]);

  // ── Infinite scroll via scroll event on the container ─────────────────────
  // Using a scroll listener (instead of IntersectionObserver) so the effect is
  // stable — no teardown/reattach on every state change.
  const triggerLoadMoreRef = useRef(triggerLoadMore);
  triggerLoadMoreRef.current = triggerLoadMore;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Fire when within 300px of the bottom
      if (scrollHeight - scrollTop - clientHeight < 300) {
        triggerLoadMoreRef.current();
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []); // mount-once — triggerLoadMoreRef.current is always fresh

  // ─ Theme-aware class helpers ──────────────────────────────────────────────
  const bg    = isDark ? 'bg-[#06060b]'       : 'bg-[#fafaf8]';
  const text  = isDark ? 'text-white'          : 'text-[#0d0d0d]';
  const muted = isDark ? 'text-white/35'       : 'text-black/40';
  const div   = isDark ? 'border-white/[0.06]' : 'border-black/[0.07]';

  return (
    <motion.div
      key="library"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-0 z-30 flex flex-col overflow-hidden transition-colors duration-500 ${bg}`}
    >
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b ${div}`}>
        <div className="flex items-center gap-4">
          {/* Back */}
          <motion.button
            whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`flex items-center gap-2 text-[12px] uppercase tracking-widest transition-colors duration-200 ${
              isDark ? 'text-white/55 hover:text-white' : 'text-black/45 hover:text-black'
            }`}
          >
            <span className="text-base leading-none">←</span>
            <span>Back</span>
          </motion.button>

          {/* Title */}
          <div>
            <h1 className={`text-[15px] font-semibold tracking-tight leading-none ${text}`}
              style={{ fontFamily: 'var(--app-font-heading)' }}>
              ✦ Library
            </h1>
            <p className={`text-[9px] uppercase tracking-[0.2em] mt-0.5 ${muted}`}>
              arXiv Research Papers
            </p>
          </div>
        </div>

        {/* Reader theme toggle */}
        <button
          onClick={() => setReaderTheme(t => t === 'dark' ? 'light' : 'dark')}
          title={isDark ? 'Switch to Paper Light' : 'Switch to OLED Dark'}
          className={`w-9 h-9 rounded-full border flex items-center justify-center text-[16px] transition-all duration-300 ${
            isDark
              ? 'border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.11] text-white/55 hover:text-white'
              : 'border-black/[0.10] bg-black/[0.04] hover:bg-black/[0.08] text-black/50 hover:text-black'
          }`}
        >
          {isDark ? '☀' : '◑'}
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className={`px-5 py-4 flex-shrink-0 border-b ${div}`}>
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border transition-all duration-300 ${
          isDark
            ? 'bg-white/[0.05] border-white/[0.07] focus-within:border-white/[0.18] focus-within:bg-white/[0.08]'
            : 'bg-black/[0.04] border-black/[0.06] focus-within:border-black/[0.18] focus-within:bg-black/[0.06]'
        }`}>
          <span className={`flex-shrink-0 ${muted}`}>🔬</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search research papers…"
            className={`flex-1 bg-transparent outline-none text-[14px] tracking-wide font-light ${
              isDark ? 'text-white placeholder-white/30' : 'text-[#0d0d0d] placeholder-black/30'
            }`}
          />
          <button
            onClick={handleSearch}
            className={`flex-shrink-0 text-[10px] uppercase tracking-[0.14em] px-3 py-1 rounded-full border transition-all duration-200 ${
              isDark
                ? 'border-white/[0.12] text-white/50 hover:text-white hover:border-white/[0.28] hover:bg-white/[0.06]'
                : 'border-black/[0.12] text-black/50 hover:text-black hover:border-black/[0.28] hover:bg-black/[0.05]'
            }`}
          >
            Search
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          // Loading skeleton
          <div className="flex justify-center gap-2 py-16">
            {[0, 1, 2].map(i => (
              <motion.div key={i}
                className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/50' : 'bg-black/25'}`}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : fetchError ? (
          <div className={`flex flex-col items-center gap-3 py-16 ${muted}`}>
            <p className="text-4xl">⚠️</p>
            <p className="text-[12px] uppercase tracking-[0.25em]">Connection error</p>
            <p className="text-[11px] opacity-60 max-w-xs text-center">{fetchError}</p>
            <button
              onClick={() => fetchPapers(activeQuery, 0, true)}
              className={`mt-2 px-4 py-2 rounded-full border text-[10px] uppercase tracking-[0.14em] transition-all duration-200 ${
                isDark
                  ? 'border-white/[0.12] text-white/50 hover:text-white hover:border-white/[0.28]'
                  : 'border-black/[0.12] text-black/50 hover:text-black hover:border-black/[0.28]'
              }`}
            >
              Retry
            </button>
          </div>
        ) : papers.length === 0 ? (
          <div className={`flex flex-col items-center gap-3 py-16 ${muted}`}>
            <p className="text-4xl">📭</p>
            <p className="text-[12px] uppercase tracking-[0.25em]">No papers found</p>
          </div>
        ) : (
          <div className="px-5 py-5 flex flex-col gap-4 max-w-3xl mx-auto w-full">
            {/* Result count */}
            {total > 0 && (
              <p className={`text-[10px] uppercase tracking-[0.2em] px-1 ${muted}`}>
                {total.toLocaleString()} papers · showing {papers.length.toLocaleString()}
              </p>
            )}

            {papers.map((paper, idx) => (
              <PaperCard
                key={`${paper.id}-${idx}`}
                paper={paper}
                isDark={isDark}
                isDiscussOpen={activeDiscuss === paper.id}
                onToggleDiscuss={() =>
                  setActiveDiscuss(id => id === paper.id ? null : paper.id)
                }
                avatars={avatars}
                onDiscuss={avatarName =>
                  onDiscussWithAvatar(avatarName, {
                    title:       paper.title,
                    description: paper.summary,
                    source:      'arxiv',
                  })
                }
              />
            ))}

            {/* Load-more indicator */}
            <div className="w-full py-6 flex justify-center">
              {loadingMore ? (
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i}
                      className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/35' : 'bg-black/20'}`}
                      animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              ) : total > 0 && papers.length < total ? (
                <span className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-white/12' : 'text-black/12'}`}>
                  Scroll for more
                </span>
              ) : papers.length > 0 ? (
                <span className={`text-[10px] uppercase tracking-[0.2em] ${isDark ? 'text-white/12' : 'text-black/12'}`}>
                  {papers.length.toLocaleString()} papers loaded
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
