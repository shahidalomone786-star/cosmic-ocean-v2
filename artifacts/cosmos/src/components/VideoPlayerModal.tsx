import { useEffect } from 'react';
import { motion } from 'framer-motion';

// ─── Type ─────────────────────────────────────────────────────────────────────
export interface VideoItem {
  videoId:      string;
  title:        string;
  thumbnail:    string;
  channelTitle: string;
  description:  string;
  isShort?:     boolean;
}

// ─── Video Player Modal ────────────────────────────────────────────────────────
export default function VideoPlayerModal({
  video,
  onClose,
  lm,
}: {
  video:   VideoItem;
  onClose: () => void;
  lm?:     boolean;
}) {
  // Escape key to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const embedUrl =
    `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1&color=white`;

  return (
    <motion.div
      key="video-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`absolute inset-0 z-[350] flex flex-col ${
        lm ? 'bg-slate-50' : 'bg-[#080a10]'
      }`}
    >
      {/* ── Header ── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b ${
          lm ? 'border-slate-200 bg-white' : 'border-white/[0.07] bg-[#0c0e18]'
        }`}
      >
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium border transition-all flex-shrink-0 ${
            lm
              ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              : 'border-white/[0.14] bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white'
          }`}
        >
          <span className="text-[15px] leading-none">&#8592;</span>
          <span>Back</span>
        </motion.button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-[13px] font-semibold truncate leading-tight ${
              lm ? 'text-slate-900' : 'text-white/90'
            }`}
          >
            {video.title}
          </p>
          {video.channelTitle && (
            <p
              className={`text-[11px] truncate mt-0.5 ${
                lm ? 'text-slate-500' : 'text-white/40'
              }`}
            >
              {video.channelTitle}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className={`w-8 h-8 flex-shrink-0 rounded-lg border flex items-center justify-center text-[13px] transition-all ${
            lm
              ? 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              : 'border-white/[0.12] bg-white/[0.05] text-white/35 hover:bg-white/[0.10] hover:text-white'
          }`}
        >
          &#x2715;
        </button>
      </div>

      {/* ── Player: fills all remaining space ── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Subtle inner shadow frame */}
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-5">
          <div
            className="w-full h-full rounded-xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)]"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          >
            <iframe
              src={embedUrl}
              title={video.title}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0 rounded-xl"
              style={{ display: 'block' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
