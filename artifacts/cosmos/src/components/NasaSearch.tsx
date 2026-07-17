import { motion, AnimatePresence } from 'framer-motion';

// ─── Types (exported so App.tsx can share them) ───────────────────────────────
export interface NasaItem {
  data: { title: string; description?: string; date_created?: string }[];
  links?: { href: string; rel: string }[];
}

export type NasaStatus = 'idle' | 'loading' | 'done' | 'error';

interface Props {
  results: NasaItem[];
  status:  NasaStatus;
  errMsg:  string;
  onClear: () => void;
}

// ─── NasaSearch — pure display, no own state ──────────────────────────────────
export default function NasaSearch({ results, status, errMsg, onClear }: Props) {
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
             `${results.length} transmissions received`}
          </span>
          <button
            onClick={onClear}
            className="text-white/30 hover:text-white/70 text-[11px] uppercase tracking-widest transition-colors duration-200"
          >
            ✕ Clear
          </button>
        </div>

        {/* ── Loading dots ── */}
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
                  transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.8) }}
                  className="group relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl hover:border-white/25 transition-all duration-400"
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
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
