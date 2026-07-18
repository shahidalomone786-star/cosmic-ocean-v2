import { useRef, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types (exported so App.tsx can share them) ───────────────────────────────
export interface NasaItem {
  data: { title: string; description?: string; date_created?: string }[];
  links?: { href: string; rel: string }[];
}

export type NasaStatus = 'idle' | 'loading' | 'done' | 'error';

// ─── Detail Modal ─────────────────────────────────────────────────────────────
export function NasaDetailModal({
  item,
  onClose,
}: {
  item: NasaItem;
  onClose: () => void;
}) {
  const imgUrl = item.links?.find(l => l.rel === 'preview')?.href ?? item.links?.[0]?.href;
  const title  = item.data?.[0]?.title ?? 'Untitled';
  const desc   = item.data?.[0]?.description ?? '';
  const date   = item.data?.[0]?.date_created?.slice(0, 10) ?? '';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      key="nasa-detail-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/75 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 28 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-white/15 bg-black/50 backdrop-blur-md text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200 text-lg leading-none"
        >
          ×
        </button>

        {/* High-res image */}
        {imgUrl && (
          <div className="w-full aspect-[16/9] flex-shrink-0 overflow-hidden bg-black/30">
            <img
              src={imgUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Info panel — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          {date && (
            <span className="inline-block mb-2 text-[10px] text-white/40 uppercase tracking-[0.22em] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
              {date}
            </span>
          )}
          <h2 className="text-white text-[17px] font-medium leading-snug tracking-wide mb-3">
            {title}
          </h2>
          {desc && (
            <p className="text-white/55 text-[13px] leading-relaxed tracking-wide">
              {desc}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  results:         NasaItem[];
  status:          NasaStatus;
  errMsg:          string;
  onClear:         () => void;
  onCardClick:     (item: NasaItem) => void;
  sentinelRef:     RefObject<HTMLDivElement>;
  isEverythingMode: boolean;
  isLoadingMore:   boolean;
}

// ─── NasaSearch — pure display, no own state ──────────────────────────────────
export default function NasaSearch({
  results,
  status,
  errMsg,
  onClear,
  onCardClick,
  sentinelRef,
  isEverythingMode,
  isLoadingMore,
}: Props) {
  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        key="nasa-results"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-2xl pointer-events-auto"
      >
        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-white/40 text-[11px] uppercase tracking-[0.2em]">
            {status === 'loading' ? 'Scanning the universe…' :
             status === 'error'   ? 'Transmission error' :
             results.length === 0 ? 'No signals found' :
             isEverythingMode     ? `${results.length} cosmic transmissions — scroll for more` :
             `${results.length} transmissions received`}
          </span>
          <button
            onClick={onClear}
            className="text-white/30 hover:text-white/70 text-[11px] uppercase tracking-widest transition-colors duration-200"
          >
            ✕ Clear
          </button>
        </div>

        {/* ── Loading dots (initial) ── */}
        {status === 'loading' && (
          <div className="flex justify-center gap-2 py-12">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-white/50"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <p className="text-center text-red-400/70 text-[13px] tracking-wide py-8">{errMsg}</p>
        )}

        {/* ── Empty ── */}
        {status === 'done' && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-white/40">
            <p className="text-4xl">🔭</p>
            <p className="text-[12px] uppercase tracking-[0.25em]">No signals found in this region</p>
          </div>
        )}

        {/* ── 1-column large cards ── */}
        {status === 'done' && results.length > 0 && (
          <div className="flex flex-col gap-5">
            {results.map((item, idx) => {
              const imgUrl = item.links?.find(l => l.rel === 'preview')?.href ?? item.links?.[0]?.href;
              const title  = item.data?.[0]?.title       ?? 'Untitled';
              const desc   = item.data?.[0]?.description ?? '';
              const date   = item.data?.[0]?.date_created?.slice(0, 10) ?? '';
              if (!imgUrl) return null;
              return (
                <motion.div
                  key={`${title}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min((idx % 10) * 0.04, 0.6) }}
                  onClick={() => onCardClick(item)}
                  className="group relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl hover:border-white/30 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-all duration-400 cursor-pointer"
                >
                  {/* Full-width image */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/5">
                    <img
                      src={imgUrl}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* "Tap to expand" hint */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-[10px] text-white/60 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full tracking-widest uppercase">
                        View details
                      </span>
                    </div>

                    {date && (
                      <span className="absolute top-3 right-3 text-[10px] text-white/50 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full tracking-widest">
                        {date}
                      </span>
                    )}
                  </div>

                  {/* Text below image */}
                  <div className="px-5 py-4">
                    <p className="text-white text-[14px] font-medium leading-snug tracking-wide mb-1.5">
                      {title}
                    </p>
                    {desc && (
                      <p className="text-white/45 text-[12px] leading-relaxed tracking-wide line-clamp-3">
                        {desc}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* ── Infinite scroll sentinel (Everything mode only) ── */}
            {isEverythingMode && (
              <div ref={sentinelRef} className="w-full flex flex-col items-center py-6 gap-3">
                {isLoadingMore ? (
                  <>
                    <div className="flex gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-white/40"
                          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                        />
                      ))}
                    </div>
                    <span className="text-white/25 text-[10px] uppercase tracking-[0.25em]">
                      Loading more cosmic wonders…
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
