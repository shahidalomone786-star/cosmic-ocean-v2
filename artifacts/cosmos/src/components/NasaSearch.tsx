import { RefObject, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SharedContext {
  title: string;
  description: string;
  source: 'nasa' | 'wiki';
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

export type UnifiedItem =
  | { source: 'nasa';  item: NasaItem }
  | { source: 'wiki';  item: WikiItem  };

export type NasaStatus = 'idle' | 'loading' | 'done' | 'error';

// ─── Source badge ──────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: 'nasa' | 'wiki' }) {
  return source === 'nasa' ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/25 text-sky-300/90 backdrop-blur-md">
      ✦ NASA
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/20 text-amber-200/90 backdrop-blur-md">
      ◈ WIKI
    </span>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
export function DetailModal({ item: unified, onClose, chatAvatars, onShareToChat }: {
  item: UnifiedItem;
  onClose: () => void;
  chatAvatars?: { name: string; image?: string }[];
  onShareToChat?: (avatarName: string) => void;
}) {
  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const imgUrl = unified.source === 'nasa'
    ? (unified.item.links?.find(l => l.rel === 'preview')?.href ?? unified.item.links?.[0]?.href)
    : unified.item.thumbnail?.source;

  const title  = unified.source === 'nasa' ? (unified.item.data?.[0]?.title ?? 'Untitled') : unified.item.title;
  const desc   = unified.source === 'nasa' ? (unified.item.data?.[0]?.description ?? '') : (unified.item.extract ?? '');
  const date   = unified.source === 'nasa' ? (unified.item.data?.[0]?.date_created?.slice(0, 10) ?? '') : '';
  const source = unified.source;

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
        {imgUrl && (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30">
            <img src={imgUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Info — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          <div className="flex items-center gap-2.5 mb-3">
            <SourceBadge source={source} />
            {date && (
              <span className="text-[10px] text-white/35 uppercase tracking-[0.22em]">{date}</span>
            )}
          </div>
          <h2 className="text-white text-[17px] font-semibold leading-snug tracking-[-0.01em] mb-3" style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</h2>
          {desc && (
            <p className="text-white/55 text-[13px] leading-relaxed tracking-wide">{desc}</p>
          )}

          {/* ── Discuss with a Scientist ── */}
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

// ─── Card ─────────────────────────────────────────────────────────────────────
function ResultCard({ unified, idx, onClick }: {
  unified: UnifiedItem;
  idx: number;
  onClick: () => void;
}) {
  const isNasa = unified.source === 'nasa';
  const imgUrl = isNasa
    ? (unified.item.links?.find(l => l.rel === 'preview')?.href ?? unified.item.links?.[0]?.href)
    : unified.item.thumbnail?.source;
  const title  = isNasa ? (unified.item.data?.[0]?.title ?? 'Untitled') : unified.item.title;
  const desc   = isNasa ? (unified.item.data?.[0]?.description ?? '') : (unified.item.extract ?? '');
  const date   = isNasa ? (unified.item.data?.[0]?.date_created?.slice(0, 10) ?? '') : '';

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
          /* Wikipedia placeholder when no thumbnail */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 via-black/40 to-transparent">
            <span className="text-5xl font-thin text-amber-200/20 select-none">W</span>
          </div>
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
        <p className="text-white text-[14px] font-medium leading-snug tracking-[0.01em] mb-2" style={{ fontFamily: 'var(--app-font-heading)' }}>{title}</p>
        {desc && (
          <p className="text-white/50 text-[12.5px] leading-relaxed tracking-wide line-clamp-3">{desc}</p>
        )}
      </div>
    </motion.div>
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
}

// ─── SearchResults — pure display ─────────────────────────────────────────────
export default function NasaSearch({
  results, status, errMsg, onClear, onCardClick, sentinelRef, isEverythingMode, isLoadingMore,
}: Props) {
  if (status === 'idle') return null;

  const nasaCount = results.filter(r => r.source === 'nasa').length;
  const wikiCount = results.filter(r => r.source === 'wiki').length;

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
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-white/40 text-[11px] uppercase tracking-[0.2em]">
            {status === 'loading' ? 'Scanning NASA & Wikipedia…' :
             status === 'error'   ? 'Transmission error' :
             results.length === 0 ? 'No signals found' :
             isEverythingMode
               ? `${results.length} results — scroll for more`
               : `${nasaCount} NASA · ${wikiCount} Wikipedia`}
          </span>
          <button onClick={onClear}
            className="text-white/30 hover:text-white/70 text-[11px] uppercase tracking-widest transition-colors duration-200">
            ✕ Clear
          </button>
        </div>

        {/* Loading */}
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
        {status === 'done' && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-white/40">
            <p className="text-4xl">🔭</p>
            <p className="text-[12px] uppercase tracking-[0.25em]">No signals found in this region</p>
          </div>
        )}

        {/* Cards */}
        {status === 'done' && results.length > 0 && (
          <div className="flex flex-col gap-5">
            {results.map((unified, idx) => (
              <ResultCard
                key={unified.source === 'nasa'
                  ? `nasa-${unified.item.data?.[0]?.title}-${idx}`
                  : `wiki-${unified.item.pageid}-${idx}`}
                unified={unified}
                idx={idx}
                onClick={() => onCardClick(unified)}
              />
            ))}

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
                      Loading more from NASA & Wikipedia…
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
        )}
      </motion.div>
    </AnimatePresence>
  );
}
