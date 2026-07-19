import { RefObject, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VideoItem } from './VideoPlayerModal';

// ─── Types ────────────────────────────────────────────────────────────────────
export type { VideoItem };

export interface SharedContext {
  title: string;
  description: string;
  source: 'nasa' | 'wiki' | 'arxiv' | 'spacex' | 'cern';
}

export interface NasaItem {
  data:  { title: string; description?: string; date_created?: string }[];
  links?: { href: string; rel: string }[];
}

export interface WikiItem {
  pageid:    number;
  title:     string;
  extract?:  string;
  thumbnail?: { source: string; width: number; height: number };
}

export interface ArxivItem {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  link: string;
}

export interface SpaceXItem {
  id: string;
  name: string;
  details: string | null;
  date_utc: string;
  success: boolean | null;
  links?: { patch?: { small?: string } };
}

export interface CernItem {
  id: number;
  title: string;
  description: string;
}

export type UnifiedItem =
  | { source: 'nasa';   item: NasaItem   }
  | { source: 'wiki';   item: WikiItem   }
  | { source: 'arxiv';  item: ArxivItem  }
  | { source: 'spacex'; item: SpaceXItem }
  | { source: 'cern';   item: CernItem   };

export type NasaStatus = 'idle' | 'loading' | 'done' | 'error';

// ─── Source badge ──────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<UnifiedItem['source'], { emoji: string; label: string; cls: string }> = {
  nasa:   { emoji: '🪐', label: 'NASA',      cls: 'bg-sky-500/20 border-sky-400/25 text-sky-300/90'       },
  wiki:   { emoji: '🔍', label: 'Wikipedia', cls: 'bg-amber-400/15 border-amber-300/20 text-amber-200/90' },
  arxiv:  { emoji: '📚', label: 'arXiv',    cls: 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300/90' },
  spacex: { emoji: '🚀', label: 'SpaceX',   cls: 'bg-slate-400/15 border-slate-300/20 text-slate-200/90'  },
  cern:   { emoji: '⚛️', label: 'CERN',     cls: 'bg-purple-500/15 border-purple-400/20 text-purple-300/90' },
};

export function SourceBadge({ source }: { source: UnifiedItem['source'] }) {
  const { emoji, label, cls } = SOURCE_CONFIG[source];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border backdrop-blur-md ${cls}`}>
      {emoji} {label}
    </span>
  );
}

// ─── Extract display data from any source ─────────────────────────────────────
function extractDisplay(unified: UnifiedItem): {
  imgUrl?: string; title: string; desc: string; date: string;
} {
  switch (unified.source) {
    case 'nasa': return {
      imgUrl: unified.item.links?.find(l => l.rel === 'preview')?.href ?? unified.item.links?.[0]?.href,
      title:  unified.item.data?.[0]?.title ?? 'Untitled',
      desc:   unified.item.data?.[0]?.description ?? '',
      date:   unified.item.data?.[0]?.date_created?.slice(0, 10) ?? '',
    };
    case 'wiki': return {
      imgUrl: unified.item.thumbnail?.source,
      title:  unified.item.title,
      desc:   unified.item.extract ?? '',
      date:   '',
    };
    case 'arxiv': return {
      imgUrl: undefined,
      title:  unified.item.title,
      desc:   unified.item.summary,
      date:   unified.item.published,
    };
    case 'spacex': return {
      imgUrl: unified.item.links?.patch?.small,
      title:  unified.item.name,
      desc:   unified.item.details ?? '',
      date:   unified.item.date_utc?.slice(0, 10) ?? '',
    };
    case 'cern': return {
      imgUrl: undefined,
      title:  unified.item.title,
      desc:   unified.item.description,
      date:   '',
    };
  }
}

// ─── Placeholder tile when no image available ─────────────────────────────────
function NoImagePlaceholder({ source }: { source: UnifiedItem['source'] }) {
  const glyphs: Record<UnifiedItem['source'], { glyph: string; style: string }> = {
    nasa:   { glyph: '✦',  style: 'from-sky-900/30 via-black/40 to-transparent text-sky-200/20'     },
    wiki:   { glyph: 'W',  style: 'from-amber-900/25 via-black/40 to-transparent text-amber-200/20' },
    arxiv:  { glyph: 'Σ',  style: 'from-emerald-900/25 via-black/40 to-transparent text-emerald-200/20' },
    spacex: { glyph: '🚀', style: 'from-slate-900/35 via-black/40 to-transparent text-slate-200/20' },
    cern:   { glyph: '⚛', style: 'from-purple-900/25 via-black/40 to-transparent text-purple-200/20' },
  };
  const { glyph, style } = glyphs[source];
  return (
    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${style}`}>
      <span className="text-5xl font-thin select-none opacity-60">{glyph}</span>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
export function DetailModal({ item: unified, onClose, chatAvatars, onShareToChat }: {
  item: UnifiedItem;
  onClose: () => void;
  chatAvatars?: { name: string; image?: string }[];
  onShareToChat?: (avatarName: string) => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const { imgUrl, title, desc, date } = extractDisplay(unified);

  return (
    <motion.div
      key="detail-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/80 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 28 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0,    scale: 0.93, y: 28 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2rem] overflow-hidden border border-white/[0.09] bg-[rgba(7,7,12,0.88)] backdrop-blur-[28px] shadow-[0_40px_80px_-16px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-white/15 bg-black/50 backdrop-blur-md text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200 text-lg leading-none"
        >
          ×
        </button>

        {/* Image */}
        {imgUrl ? (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30">
            <img src={imgUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30">
            <NoImagePlaceholder source={unified.source} />
          </div>
        )}

        {/* Info — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          <div className="flex items-center gap-2.5 mb-3">
            <SourceBadge source={unified.source} />
            {date && (
              <span className="text-[10px] text-white/35 uppercase tracking-[0.22em]">{date}</span>
            )}
          </div>
          <h2 className="text-white text-[17px] font-semibold leading-snug tracking-[-0.01em] mb-3"
            style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</h2>
          {desc && (
            <p className="text-white/55 text-[13px] leading-relaxed tracking-wide">{desc}</p>
          )}

          {/* arXiv authors */}
          {unified.source === 'arxiv' && unified.item.authors.length > 0 && (
            <p className="mt-3 text-white/30 text-[11px] tracking-wide">
              {unified.item.authors.slice(0, 3).join(', ')}{unified.item.authors.length > 3 ? ' et al.' : ''}
            </p>
          )}

          {/* SpaceX status */}
          {unified.source === 'spacex' && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                unified.item.success === true  ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-300' :
                unified.item.success === false ? 'bg-red-500/15 border-red-400/20 text-red-300' :
                'bg-white/5 border-white/10 text-white/35'
              }`}>
                {unified.item.success === true ? '✓ SUCCESS' : unified.item.success === false ? '✗ FAILED' : '— UNKNOWN'}
              </span>
            </div>
          )}

          {/* Discuss with a Scientist */}
          {chatAvatars && onShareToChat && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-white/35 text-[9px] uppercase tracking-[0.22em] mb-3">
                💬 Discuss with a Scientist
              </p>
              <div className="flex gap-4">
                {chatAvatars.map(av => (
                  <button
                    key={av.name}
                    onClick={() => { onShareToChat(av.name); onClose(); }}
                    className="flex flex-col items-center gap-1.5 group focus:outline-none"
                    title={`Chat with ${av.name}`}
                  >
                    {av.image ? (
                      <img
                        src={av.image} alt={av.name}
                        className="w-11 h-11 rounded-full object-cover border border-white/15 group-hover:border-white/50 group-hover:scale-105 transition-all duration-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm text-white/60 group-hover:border-white/40 group-hover:scale-105 transition-all duration-200">
                        {av.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-white/40 text-[9px] group-hover:text-white/70 transition-colors duration-200 w-12 text-center truncate leading-tight">
                      {av.name.split(' ').slice(-1)[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Article Card ──────────────────────────────────────────────────────────────
function ResultCard({ unified, idx, onClick }: {
  unified: UnifiedItem;
  idx: number;
  onClick: () => void;
}) {
  const { imgUrl, title, desc, date } = extractDisplay(unified);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: Math.min((idx % 12) * 0.04, 0.6) }}
      onClick={onClick}
      className="group relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04] backdrop-blur-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-white/[0.18] hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 ease-out cursor-pointer"
    >
      {/* Image area */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-black/30">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.background = '#111'; }}
          />
        ) : (
          <NoImagePlaceholder source={unified.source} />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Source badge — top-left over image */}
        <div className="absolute top-3 left-3">
          <SourceBadge source={unified.source} />
        </div>

        {/* Date badge — top-right */}
        {date && (
          <span className="absolute top-3 right-3 text-[10px] text-white/45 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full tracking-widest">
            {date}
          </span>
        )}

        {/* Hover hint */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] text-white/60 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full tracking-widest uppercase">
            View details
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="px-5 py-5">
        <p className="text-white text-[14px] font-medium leading-snug tracking-[0.01em] mb-2"
          style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</p>
        {desc && (
          <p className="text-white/50 text-[12.5px] leading-relaxed tracking-wide line-clamp-3">{desc}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ video, idx, onClick }: {
  video:   VideoItem;
  idx:     number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ duration: 0.38, delay: Math.min(idx * 0.06, 0.5) }}
      onClick={onClick}
      className="group relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.04] backdrop-blur-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-white/[0.22] hover:-translate-y-[3px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-300 ease-out cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-black/40">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* ▶ Play button — always visible, scales on hover */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.6)] group-hover:bg-white/35 group-hover:scale-110 group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-all duration-300">
            {/* Solid triangle play icon */}
            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-0.5 fill-white drop-shadow">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>

        {/* Video badge — top-left */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-full border backdrop-blur-md bg-red-500/25 border-red-400/30 text-red-200/90">
            ▶ Video
          </span>
        </div>

        {/* Hover label */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-[10px] text-white/70 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full tracking-widest uppercase font-medium">
            Watch now
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="px-4 py-4">
        <p className="text-white text-[13px] font-medium leading-snug tracking-[0.01em] mb-1.5 line-clamp-2"
          style={{ fontFamily: 'var(--app-font-heading)' }}>{video.title}</p>
        {video.channelTitle && (
          <p className="text-white/40 text-[11px] tracking-wide">{video.channelTitle}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionHeader({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 px-1">
      <span className="text-[16px]">{icon}</span>
      <div className="flex items-baseline gap-2.5">
        <span className="text-white/80 text-[13px] font-semibold tracking-wide">{label}</span>
        <span className="text-white/30 text-[10px] uppercase tracking-[0.2em]">{sub}</span>
      </div>
      <div className="flex-1 h-px bg-white/[0.07]" />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  results:          UnifiedItem[];
  status:           NasaStatus;
  errMsg:           string;
  onClear:          () => void;
  onCardClick:      (item: UnifiedItem) => void;
  sentinelRef:      RefObject<HTMLDivElement | null>;
  isEverythingMode: boolean;
  isLoadingMore:    boolean;
  // Video Media Hub
  videoResults?:    VideoItem[];
  videoStatus?:     'idle' | 'loading' | 'done' | 'error';
  onVideoClick?:    (video: VideoItem) => void;
}

// ─── SearchResults — pure display ─────────────────────────────────────────────
export default function NasaSearch({
  results, status, errMsg, onClear, onCardClick, sentinelRef, isEverythingMode, isLoadingMore,
  videoResults = [], videoStatus = 'idle', onVideoClick,
}: Props) {
  if (status === 'idle') return null;

  const sourceCounts = results.reduce<Partial<Record<UnifiedItem['source'], number>>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  const sourceLabel = (Object.entries(sourceCounts) as [UnifiedItem['source'], number][])
    .map(([s, n]) => `${SOURCE_CONFIG[s].emoji} ${n} ${SOURCE_CONFIG[s].label}`)
    .join(' · ');

  const showVideos = videoStatus !== 'idle' && (videoResults.length > 0 || videoStatus === 'loading');

  return (
    <AnimatePresence>
      <motion.div
        key="search-results"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1,  y: 0  }}
        exit={{ opacity: 0,     y: 12 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-2xl pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 px-1">
          <span className="text-white/40 text-[11px] uppercase tracking-[0.2em]">
            {status === 'loading' ? 'Scanning NASA · Wikipedia · arXiv · SpaceX · CERN…' :
             status === 'error'   ? 'Transmission error' :
             results.length === 0 ? 'No signals found' :
             isEverythingMode
               ? `${results.length} results — scroll for more`
               : sourceLabel}
          </span>
          <button onClick={onClear}
            className="text-white/30 hover:text-white/70 text-[11px] uppercase tracking-widest transition-colors duration-200">
            ✕ Clear
          </button>
        </div>

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex justify-center gap-2 py-12">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-white/50"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <p className="text-center text-red-400/70 text-[13px] tracking-wide py-8">{errMsg}</p>
        )}

        {/* Empty */}
        {status === 'done' && results.length === 0 && videoResults.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-white/40">
            <p className="text-4xl">🔭</p>
            <p className="text-[12px] uppercase tracking-[0.25em]">No signals found in this region</p>
          </div>
        )}

        {/* ══ COSMIC CINEMA — Video section ══════════════════════════════════ */}
        {showVideos && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <SectionHeader icon="🎬" label="Cosmic Cinema" sub="YouTube Videos" />

            {/* Loading spinner for videos */}
            {videoStatus === 'loading' && (
              <div className="flex items-center gap-3 py-6 px-2">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-red-400/60"
                      animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                  ))}
                </div>
                <span className="text-white/30 text-[11px] uppercase tracking-[0.2em]">
                  Scanning for videos…
                </span>
              </div>
            )}

            {/* 2-column video grid */}
            {videoStatus === 'done' && videoResults.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {videoResults.slice(0, 8).map((v, i) => (
                  <VideoCard
                    key={v.videoId}
                    video={v}
                    idx={i}
                    onClick={() => onVideoClick?.(v)}
                  />
                ))}
              </div>
            )}

            {/* No videos found */}
            {videoStatus === 'done' && videoResults.length === 0 && (
              <p className="text-white/25 text-[11px] tracking-wide px-1 pb-2">
                No videos found — try a different search term.
              </p>
            )}
          </motion.div>
        )}

        {/* ══ ARTICLES & DATA — original results ═════════════════════════════ */}
        {status === 'done' && results.length > 0 && (
          <div>
            {showVideos && (
              <SectionHeader icon="📝" label="Articles & Data" sub={sourceLabel} />
            )}
            <div className="flex flex-col gap-5">
              {results.map((unified, idx) => {
                const key = unified.source === 'nasa'   ? `nasa-${unified.item.data?.[0]?.title}-${idx}` :
                            unified.source === 'wiki'   ? `wiki-${unified.item.pageid}-${idx}` :
                            unified.source === 'arxiv'  ? `arxiv-${unified.item.id}-${idx}` :
                            unified.source === 'spacex' ? `spacex-${unified.item.id}-${idx}` :
                            `cern-${unified.item.id}-${idx}`;
                return (
                  <ResultCard
                    key={key}
                    unified={unified}
                    idx={idx}
                    onClick={() => onCardClick(unified)}
                  />
                );
              })}

              {/* Infinite scroll sentinel — Everything mode only */}
              {isEverythingMode && (
                <div ref={sentinelRef} className="w-full flex flex-col items-center py-6 gap-3">
                  {isLoadingMore ? (
                    <>
                      <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"
                            animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                        ))}
                      </div>
                      <span className="text-white/25 text-[10px] uppercase tracking-[0.25em]">
                        Loading more results…
                      </span>
                    </>
                  ) : (
                    <span className="text-white/15 text-[10px] uppercase tracking-[0.2em]">
                      Scroll to explore the universe
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
