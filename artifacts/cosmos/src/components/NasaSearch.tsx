import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NasaItem {
  data: { title: string; description?: string; date_created?: string }[];
  links?: { href: string; rel: string }[];
}

// ─── NasaSearch ───────────────────────────────────────────────────────────────
export default function NasaSearch() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<NasaItem[]>([]);
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errMsg,  setErrMsg]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (q = query) => {
    const term = q.trim();
    if (!term) return;
    setStatus('loading');
    setResults([]);
    setErrMsg('');
    try {
      const res  = await fetch(
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(term)}&media_type=image`
      );
      if (!res.ok) throw new Error(`NASA API error ${res.status}`);
      const json = await res.json() as { collection: { items: NasaItem[] } };
      setResults(json.collection.items ?? []);
      setStatus('done');
    } catch (err: unknown) {
      setErrMsg((err as Error)?.message ?? String(err));
      setStatus('error');
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden">

      {/* ── Glassmorphism search bar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4">
        <div className="flex gap-3 w-full max-w-2xl mx-auto">
          <div className="flex-1 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 shadow-2xl">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') search(); }}
              placeholder="Search the cosmos..."
              className="w-full bg-transparent outline-none text-white placeholder-white/50 text-[15px] tracking-wide"
              autoFocus
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => search()}
            className="flex-shrink-0 px-6 py-3 rounded-2xl border border-white/20 bg-white/7 backdrop-blur-xl text-white/80 text-[12px] uppercase tracking-[0.2em] font-medium shadow-xl transition-colors duration-200"
          >
            Search
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable results area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">

        {/* Loading */}
        <AnimatePresence>
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 pt-24 text-white/50"
            >
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/50"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <p className="text-[13px] uppercase tracking-[0.25em]">Scanning the universe…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {status === 'error' && (
          <p className="text-center text-red-400/70 text-[13px] tracking-wide pt-24">{errMsg}</p>
        )}

        {/* Empty state */}
        {status === 'done' && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-3 pt-24 text-white/40"
          >
            <p className="text-4xl">🔭</p>
            <p className="text-[13px] uppercase tracking-[0.25em]">No signals found in this region</p>
          </motion.div>
        )}

        {/* Idle prompt */}
        {status === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-3 pt-24 text-white/30"
          >
            <p className="text-5xl">🌌</p>
            <p className="text-[13px] uppercase tracking-[0.25em]">Enter a query to search NASA's image archive</p>
          </motion.div>
        )}

        {/* Results grid */}
        {status === 'done' && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto"
          >
            {results.map((item, idx) => {
              const imgUrl = item.links?.find(l => l.rel === 'preview')?.href ?? item.links?.[0]?.href;
              const title  = item.data?.[0]?.title ?? 'Untitled';
              if (!imgUrl) return null;
              return (
                <motion.div
                  key={`${title}-${idx}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.6) }}
                  className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-xl hover:border-white/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-white/5">
                    <img
                      src={imgUrl}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-white/85 text-[11px] leading-snug tracking-wide line-clamp-2 font-medium">
                      {title}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
