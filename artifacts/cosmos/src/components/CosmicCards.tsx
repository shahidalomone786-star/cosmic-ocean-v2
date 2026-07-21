/**
 * Cosmic Intelligence Engine — Specialized Feed Cards
 * Premium glassmorphism cards for each content source:
 * arXiv, NASA, YouTube, X, Telegram, Wikipedia
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Shared type (mirrors CosmicNexus LivePost) ────────────────────────────────
export interface CosmicPost {
  id:              string;
  user_id:         string;
  content:         string;
  type:            string;
  media_url:       string;
  created_at:      string;
  author_username: string;
  author_avatar:   string;
  like_count:      number;
  comment_count:   number;
  user_liked:      boolean;
  user_bookmarked: boolean;
  source:          string;
  external_link:   string;
  extra_json:      string;
  ec_title:        string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const past = new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
  const diff  = Math.floor((Date.now() - past) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function parseExtra<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

// ── Shared action bar (like / comment / share / bookmark) ─────────────────────
function ActionBar({ post, lm, onComment, onRefresh }: {
  post: CosmicPost;
  lm?: boolean;
  onComment: (p: CosmicPost) => void;
  onRefresh?: () => void;
}) {
  const [liked,      setLiked]      = useState(post.user_liked);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);
  const [likeCount,  setLikeCount]  = useState(post.like_count);
  const [likeLoading,  setLikeLoading]  = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const toggleLike = async () => {
    if (likeLoading) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { ok: boolean; liked?: boolean };
      if (!data.ok) throw new Error();
      setLiked(data.liked ?? next);
    } catch { setLiked(!next); setLikeCount(c => next ? Math.max(0, c - 1) : c + 1); }
    finally { setLikeLoading(false); }
  };

  const toggleBookmark = async () => {
    if (bookmarkLoading) return;
    const next = !bookmarked;
    setBookmarked(next);
    setBookmarkLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { ok: boolean; bookmarked?: boolean };
      if (!data.ok) throw new Error();
      setBookmarked(data.bookmarked ?? next);
    } catch { setBookmarked(!next); }
    finally { setBookmarkLoading(false); }
  };

  const share = async () => {
    const url = post.external_link || `${window.location.origin}/api/posts/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.ec_title || post.content.slice(0, 80), url }); } catch { /**/ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /**/ }
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    }
  };

  const base = lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]';

  return (
    <div className={`flex items-center gap-0.5 px-3 py-2 border-t ${lm ? 'border-gray-100' : 'border-white/[0.06]'}`}>
      {/* Like */}
      <button onClick={toggleLike} disabled={likeLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all select-none ${liked ? 'text-red-500' : base}`}>
        <motion.div animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.28 }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </motion.div>
        {likeCount > 0 ? fmt(likeCount) : '0'}
      </button>

      {/* Comment */}
      <button onClick={() => onComment(post)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all ${base}`}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        {post.comment_count > 0 ? fmt(post.comment_count) : '0'}
      </button>

      {/* Share */}
      <button onClick={share}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all relative ${base}`}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
        </svg>
        Share
        {shareToast && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap z-10"
            style={{ background: 'rgba(30,30,50,0.95)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)' }}>
            Link copied!
          </span>
        )}
      </button>

      <div className="flex-1" />

      {/* Bookmark */}
      <button onClick={toggleBookmark} disabled={bookmarkLoading}
        className={`p-2 rounded-xl transition-all select-none ${bookmarked ? 'text-violet-500' : lm ? 'text-gray-400 hover:bg-gray-100' : 'text-white/30 hover:bg-white/[0.06]'}`}>
        <motion.div animate={bookmarked ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.25 }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </motion.div>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// arXiv CARD — paper title, authors, expandable abstract, Read PDF CTA
// ─────────────────────────────────────────────────────────────────────────────
export function ArxivCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const extra = parseExtra<{ authors?: string[]; abstract?: string; arxiv_id?: string; categories?: string[] }>(
    post.extra_json, {},
  );
  const authors = extra.authors ?? [];
  const abstract = extra.abstract ?? post.content;
  const categories = extra.categories ?? [];
  const arxivId = extra.arxiv_id ?? '';

  const authorsDisplay = authors.length <= 3
    ? authors.join(', ')
    : authors.slice(0, 3).join(', ') + ` +${authors.length - 3} more`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm' : 'border-indigo-500/20'
      }`}
      style={lm ? undefined : {
        background: 'linear-gradient(145deg, rgba(20,20,48,0.96) 0%, rgba(12,12,32,0.98) 100%)',
        boxShadow: '0 4px 24px rgba(79,70,229,0.12)',
      }}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b ${lm ? 'border-gray-50' : 'border-white/[0.05]'}`}>
        {/* arXiv badge */}
        <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.18em] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(180,83,9,0.18)', color: '#f59e0b', border: '1px solid rgba(180,83,9,0.35)' }}>
          📄 arXiv
        </span>
        {categories[0] && (
          <span className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded-full ${lm ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-300'}`}>
            {categories[0]}
          </span>
        )}
        <div className="flex-1" />
        <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{timeAgo(post.created_at)}</span>
      </div>

      {/* Title */}
      <div className="px-4 pt-3 pb-2">
        <h3 className={`text-[14px] font-semibold leading-snug mb-1.5 ${lm ? 'text-gray-900' : 'text-white'}`}>
          {post.ec_title}
        </h3>
        {authorsDisplay && (
          <p className={`text-[11.5px] ${lm ? 'text-gray-500' : 'text-white/40'}`}>
            By {authorsDisplay}
          </p>
        )}
      </div>

      {/* Abstract */}
      <div className="px-4 pb-3">
        <div className={`text-[12.5px] leading-relaxed overflow-hidden transition-all duration-300 ${lm ? 'text-gray-600' : 'text-white/55'}`}
          style={{ maxHeight: expanded ? '400px' : '4.5em', overflow: 'hidden' }}>
          {abstract}
        </div>
        <button onClick={() => setExpanded(e => !e)}
          className={`mt-1.5 text-[11px] font-medium transition-colors ${lm ? 'text-indigo-500 hover:text-indigo-700' : 'text-indigo-300/80 hover:text-indigo-200'}`}>
          {expanded ? '↑ Collapse' : '↓ Read abstract'}
        </button>
      </div>

      {/* Read PDF CTA */}
      {post.external_link && (
        <div className="px-4 pb-3">
          <a href={post.external_link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.7), rgba(67,56,202,0.8))', border: '1px solid rgba(99,102,241,0.45)', color: 'white', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Read PDF
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
          {arxivId && (
            <span className={`ml-2 text-[10px] font-mono ${lm ? 'text-gray-400' : 'text-white/25'}`}>
              arXiv:{arxivId}
            </span>
          )}
        </div>
      )}

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NASA CARD — immersive full-width image with modal zoom
// ─────────────────────────────────────────────────────────────────────────────
export function NasaCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const [modal, setModal] = useState(false);
  const extra = parseExtra<{ apod_title?: string; date?: string; hdurl?: string }>(post.extra_json, {});
  const title = extra.apod_title ?? post.ec_title ?? 'NASA Image of the Day';
  const date  = extra.date ?? post.created_at.slice(0, 10);
  const hdurl = extra.hdurl ?? post.media_url;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
        className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
          lm ? 'bg-white border-gray-100 shadow-sm' : 'border-white/[0.08]'
        }`}
        style={lm ? undefined : { background: 'rgba(6,6,12,0.97)' }}
      >
        {/* Image */}
        {post.media_url && (
          <div className="relative cursor-pointer group" onClick={() => setModal(true)}>
            <img src={post.media_url} alt={title}
              className="w-full object-cover block transition-transform duration-500 group-hover:scale-[1.02]"
              style={{ maxHeight: '220px', objectPosition: 'center' }} />
            {/* NASA badge overlay */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="text-[9px] font-black tracking-widest text-white uppercase font-mono">NASA</span>
              <span className="text-[9px] text-white/50 font-mono">APOD</span>
            </div>
            {/* Expand hint */}
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="px-2 py-1 rounded-lg text-[10px] text-white font-medium"
                style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                ⛶ Full Resolution
              </div>
            </div>
            {/* Dark gradient at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        )}

        {/* Caption */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9.5px] uppercase tracking-[0.18em] font-mono ${lm ? 'text-rose-500' : 'text-rose-400/80'}`}>
              APOD · {date}
            </span>
          </div>
          <h3 className={`text-[14.5px] font-semibold leading-snug mb-2 ${lm ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h3>
          <p className={`text-[12.5px] leading-relaxed line-clamp-3 ${lm ? 'text-gray-600' : 'text-white/50'}`}>
            {post.content}
          </p>
        </div>

        {hdurl && hdurl !== post.media_url && (
          <div className="px-4 pb-3">
            <a href={post.external_link || hdurl} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-colors ${lm ? 'text-rose-500 hover:text-rose-700' : 'text-rose-400/80 hover:text-rose-300'}`}>
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
              View on NASA APOD
            </a>
          </div>
        )}

        <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
      </motion.div>

      {/* Full-screen image modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(24px)' }}
            onClick={() => setModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}
            >
              <img src={hdurl || post.media_url} alt={title}
                className="w-full rounded-2xl object-contain shadow-2xl" style={{ maxHeight: '80vh' }} />
              <div className="absolute top-3 right-3">
                <button onClick={() => setModal(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="mt-3 text-center">
                <p className="text-white text-[14px] font-semibold">{title}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{date}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE CARD — cinematic preview frame with sleek overlay player
// ─────────────────────────────────────────────────────────────────────────────
export function YouTubeCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const [playing,   setPlaying]   = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [thumbErr,  setThumbErr]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Pause when scrolled out of view — prevents audio overlap ─────────────
  useEffect(() => {
    if (!playing) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry && !entry.isIntersecting) setPlaying(false); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [playing]);

  const extra = parseExtra<{ youtube_id?: string; channel?: string; views?: string; duration?: string }>(post.extra_json, {});
  const youtubeId = extra.youtube_id ?? '';
  const channel   = extra.channel   ?? '';
  const views     = extra.views     ?? '';
  const duration  = extra.duration  ?? '';
  const isShort   = post.type === 'short-video';

  // Thumbnail with fallback chain: hqdefault → sddefault → mqdefault
  const thumbUrl = youtubeId
    ? thumbErr
      ? `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`
      : `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : '';

  // Long-form videos use 16:9 frame; short-form uses portrait ratio
  const frameStyle: React.CSSProperties = isShort
    ? { aspectRatio: '9/16', maxHeight: '300px' }
    : { aspectRatio: '16/9', maxHeight: '210px' };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm hover:shadow-md' : 'border-white/[0.07] hover:border-white/[0.12]'
      }`}
      style={lm ? undefined : {
        background: 'linear-gradient(160deg, rgba(10,10,20,0.98) 0%, rgba(6,6,14,0.99) 100%)',
        boxShadow: '0 4px 28px rgba(255,0,0,0.06)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* ── Cinematic video frame ── */}
      {youtubeId && (
        <div className="relative overflow-hidden" style={frameStyle}>
          {/* Thumbnail (shown before play) */}
          {!playing && (
            <img
              src={thumbUrl}
              alt={post.ec_title}
              onLoad={() => setImgLoaded(true)}
              onError={() => { if (!thumbErr) setThumbErr(true); }}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* Skeleton while image loads */}
          {!playing && !imgLoaded && (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20,20,40,0.9), rgba(10,10,25,0.95))' }}>
              <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', backgroundSize: '200% 100%' }} />
            </div>
          )}

          {/* Gradient for light mode contrast */}
          {!playing && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          )}

          {/* YouTube iframe player */}
          {playing && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&color=white`}
              title={post.ec_title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-none"
            />
          )}

          {/* ── Overlay controls (only before play) ── */}
          {!playing && (
            <>
              {/* Clickable play zone */}
              <button
                onClick={() => setPlaying(true)}
                aria-label="Play video"
                className="absolute inset-0 w-full h-full flex items-center justify-center group"
              >
                {/* Center play button — premium frosted glass */}
                <motion.div
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                  className="relative flex items-center justify-center"
                >
                  {/* Outer glow ring */}
                  <div className="absolute w-[72px] h-[72px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-400"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }} />
                  {/* Frosted glass button */}
                  <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.35)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}>
                    <svg viewBox="0 0 24 24" className="w-[20px] h-[20px] fill-white ml-1 drop-shadow-sm">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  </div>
                </motion.div>
              </button>

              {/* ── Top-left: YouTube + channel badge ── */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0">
                    <path fill="#FF0000" d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8z"/>
                    <polygon fill="white" points="9.75,15.02 15.5,12 9.75,8.98"/>
                  </svg>
                  <span className="text-[8.5px] font-bold text-white/90 tracking-wide">
                    {isShort ? 'SHORTS' : 'YOUTUBE'}
                  </span>
                </div>
              </div>

              {/* ── Top-right: duration or views ── */}
              {(duration || views) && (
                <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[9px] text-white/90 font-mono font-medium"
                  style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  {duration || `${views} views`}
                </div>
              )}
            </>
          )}

          {/* ── Close button (when playing) ── */}
          {playing && (
            <button onClick={() => setPlaying(false)}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-white fill-none" strokeWidth={2.5}><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      )}

      {/* ── Info section ── */}
      <div className="px-4 pt-3 pb-2">
        {/* Channel name */}
        {channel && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              {channel}
            </span>
            {views && !duration && (
              <span className={`text-[10px] ${lm ? 'text-gray-300' : 'text-white/20'}`}>· {views} views</span>
            )}
          </div>
        )}
        <h3 className={`text-[13.5px] font-semibold leading-snug line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/92'}`}>
          {post.ec_title || post.content}
        </h3>
        {post.content && post.content !== post.ec_title && (
          <p className={`text-[12px] leading-relaxed mt-1.5 line-clamp-2 ${lm ? 'text-gray-500' : 'text-white/38'}`}>
            {post.content}
          </p>
        )}
      </div>

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// X BULLETIN CARD — compact sleek dark micro-alert
// ─────────────────────────────────────────────────────────────────────────────
export function XBulletinCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const extra = parseExtra<{ handle?: string; verified?: boolean; followers?: string; likes?: string; retweets?: string }>(
    post.extra_json, {},
  );
  const handle    = extra.handle ?? post.ec_title;
  const verified  = extra.verified !== false;
  const followers = extra.followers ?? '';
  const likes     = extra.likes ?? '';
  const retweets  = extra.retweets ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm' : 'border-white/[0.08]'
      }`}
      style={lm ? undefined : {
        background: 'linear-gradient(145deg, rgba(9,9,20,0.97) 0%, rgba(5,5,14,0.99) 100%)',
        boxShadow: '0 4px 20px rgba(29,161,242,0.06)',
      }}
    >
      {/* X header */}
      <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
        {/* X Logo */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: lm ? '#f3f4f6' : 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${lm ? 'fill-gray-900' : 'fill-white'}`}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 5.897zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[13px] font-bold ${lm ? 'text-gray-900' : 'text-white'}`}>
              @{handle}
            </span>
            {verified && (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-sky-400 fill-current flex-shrink-0">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1-2.52-1.26-3.91-.8C14.68.88 13.43 0 12 0c-1.43 0-2.68.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1 1.01-1.26 2.52-.8 3.91C2.88 9.32 2 10.57 2 12c0 1.43.88 2.68 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1 2.52 1.26 3.91.8C9.32 21.12 10.57 22 12 22c1.43 0 2.68-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1-1.01 1.26-2.52.8-3.91C21.12 14.68 22 13.43 22 12zm-6.16-2.32l-4.3 4.34-1.74-1.75a.75.75 0 10-1.06 1.06l2.3 2.31c.29.29.77.29 1.06 0l4.84-4.87a.75.75 0 10-1.06-1.06z"/>
              </svg>
            )}
            {followers && (
              <span className={`text-[10px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                · {followers} followers
              </span>
            )}
          </div>
          <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className={`px-4 pb-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${lm ? 'text-gray-800' : 'text-white/80'}`}>
        {post.content}
      </p>

      {/* X engagement stats */}
      {(likes || retweets) && (
        <div className={`flex items-center gap-4 px-4 pb-3 text-[11.5px] ${lm ? 'text-gray-500' : 'text-white/35'}`}>
          {retweets && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
              {retweets}
            </span>
          )}
          {likes && (
            <span className="flex items-center gap-1 text-rose-400/70">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              {likes}
            </span>
          )}
          {post.external_link && (
            <a href={post.external_link} target="_blank" rel="noopener noreferrer"
              className={`ml-auto text-[10.5px] transition-colors ${lm ? 'text-sky-500 hover:text-sky-700' : 'text-sky-400/60 hover:text-sky-300'}`}>
              View on 𝕏 ↗
            </a>
          )}
        </div>
      )}

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM BULLETIN CARD
// ─────────────────────────────────────────────────────────────────────────────
export function TelegramCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const extra = parseExtra<{ channel?: string; subscribers?: string; views?: string; forwarded?: number }>(
    post.extra_json, {},
  );
  const channel     = extra.channel ?? post.ec_title ?? 'Telegram Channel';
  const subscribers = extra.subscribers ?? '';
  const views       = extra.views ?? '';
  const forwarded   = extra.forwarded ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm' : 'border-white/[0.08]'
      }`}
      style={lm ? undefined : {
        background: 'linear-gradient(145deg, rgba(8,12,22,0.98) 0%, rgba(5,8,16,0.99) 100%)',
        boxShadow: '0 4px 20px rgba(38,165,242,0.07)',
      }}
    >
      {/* Telegram header */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        {/* Telegram logo */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(145deg, #2AABEE, #229ED9)', boxShadow: '0 2px 10px rgba(38,165,242,0.3)' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-bold truncate ${lm ? 'text-gray-900' : 'text-white'}`}>{channel}</span>
          </div>
          <div className="flex items-center gap-2">
            {subscribers && <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{subscribers} subscribers</span>}
            <span className={`text-[10.5px] ${lm ? 'text-gray-300' : 'text-white/20'}`}>·</span>
            <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className={`px-4 pb-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${lm ? 'text-gray-800' : 'text-white/80'}`}>
        {post.content}
      </p>

      {/* Telegram stats */}
      <div className={`flex items-center gap-4 px-4 pb-3 text-[11.5px] ${lm ? 'text-gray-500' : 'text-white/35'}`}>
        {views && (
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {views}
          </span>
        )}
        {forwarded > 0 && (
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 004 4h12"/></svg>
            {forwarded.toLocaleString()} forwarded
          </span>
        )}
        {post.external_link && (
          <a href={post.external_link} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-[10.5px] transition-colors"
            style={{ color: '#2AABEE' }}>
            Open Channel ↗
          </a>
        )}
      </div>

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WIKIPEDIA CARD — featured article summary
// ─────────────────────────────────────────────────────────────────────────────
export function WikipediaCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const extra = parseExtra<{ article_url?: string; thumbnail?: string; description?: string }>(post.extra_json, {});
  const thumbnail = extra.thumbnail ?? post.media_url;
  const articleUrl = extra.article_url ?? post.external_link;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm' : 'border-white/[0.08]'
      }`}
      style={lm ? undefined : { background: 'rgba(10,10,22,0.97)' }}
    >
      {/* Thumbnail if available */}
      {thumbnail && (
        <div className="relative">
          <img src={thumbnail} alt={post.ec_title}
            className="w-full object-cover block"
            style={{ maxHeight: '140px', objectPosition: 'center top' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        {/* Wikipedia badge + header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: lm ? '#f3f4f6' : 'rgba(255,255,255,0.06)', border: lm ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.1)' }}>
            <span className={`text-[11px] font-black ${lm ? 'text-gray-700' : 'text-white/80'}`}>W</span>
            <span className={`text-[9px] uppercase tracking-widest font-mono ${lm ? 'text-gray-500' : 'text-white/35'}`}>Wikipedia</span>
          </div>
          <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>· Science Article</span>
        </div>

        <h3 className={`text-[14.5px] font-semibold leading-snug mb-2 ${lm ? 'text-gray-900' : 'text-white'}`}>
          {post.ec_title}
        </h3>

        <p className={`text-[12.5px] leading-relaxed line-clamp-4 ${lm ? 'text-gray-600' : 'text-white/50'}`}>
          {post.content}
        </p>
      </div>

      {articleUrl && (
        <div className="px-4 pb-3">
          <a href={articleUrl} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium transition-colors ${lm ? 'text-blue-500 hover:text-blue-700' : 'text-blue-400/80 hover:text-blue-300'}`}>
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            Read Full Article
          </a>
        </div>
      )}

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTAGRAM CARD — premium gradient header, engagement stats, hashtags
// ─────────────────────────────────────────────────────────────────────────────
export function InstagramCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const extra = parseExtra<{
    handle?: string; verified?: boolean; followers?: string;
    likes?: string; hashtags?: string[]; is_reel?: boolean;
  }>(post.extra_json, {});

  const handle    = extra.handle ?? post.ec_title?.replace(/^@/, '') ?? 'instagram';
  const verified  = extra.verified ?? false;
  const followers = extra.followers ?? '';
  const likes     = extra.likes ?? '';
  const hashtags  = extra.hashtags ?? [];
  const isReel    = extra.is_reel ?? (post.type === 'short-video');
  const thumbnail = post.media_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${
        lm ? 'bg-white border-gray-100 shadow-sm' : 'border-white/[0.08]'
      }`}
      style={lm ? undefined : {
        background: 'linear-gradient(145deg, rgba(10,6,24,0.97) 0%, rgba(6,4,18,0.99) 100%)',
        boxShadow: '0 4px 20px rgba(131,58,180,0.07)',
      }}
    >
      {/* Instagram header */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        {/* Gradient ring avatar */}
        <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center p-[2px]"
          style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}>
          <div className="w-full h-full rounded-full flex items-center justify-center text-[13px] font-bold text-white"
            style={{ background: lm ? '#f9fafb' : 'rgba(10,6,24,0.97)' }}>
            <span className={lm ? 'text-gray-800' : 'text-white'}>
              {(handle[0] ?? 'I').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[13px] font-bold ${lm ? 'text-gray-900' : 'text-white'}`}>
              @{handle}
            </span>
            {verified && (
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none">
                <circle cx="12" cy="12" r="10" fill="#3897f0"/>
                <path d="M8 12l3 3 5-6" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isReel && (
              <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d)' }}>
                REEL
              </span>
            )}
            {followers && (
              <span className={`text-[10px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                · {followers}
              </span>
            )}
          </div>
          <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            {timeAgo(post.created_at)}
          </span>
        </div>

        <button className={`p-1.5 rounded-full transition-colors ${lm ? 'hover:bg-gray-100' : 'hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${lm ? 'fill-gray-400' : 'fill-white/30'}`}>
            <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
      </div>

      {/* Media */}
      {thumbnail && (
        <div className="relative">
          <img src={thumbnail} alt={post.ec_title || post.content}
            className="w-full object-cover block"
            style={{ maxHeight: '260px', objectPosition: 'center' }}
            onError={e => { (e.currentTarget.parentElement ?? e.currentTarget).style.display = 'none'; }}
          />
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent" />
          {isReel && (
            <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(6px)' }}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                <path d="M21 2H3C1.9 2 1 2.9 1 4v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 16V8l8 4-8 4z"/>
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Caption + likes + hashtags */}
      <div className="px-4 pt-3 pb-2">
        {likes && (
          <p className={`text-[12px] font-semibold mb-1.5 ${lm ? 'text-gray-800' : 'text-white'}`}>
            {likes} likes
          </p>
        )}
        {post.content && (
          <p className={`text-[12.5px] leading-relaxed ${lm ? 'text-gray-700' : 'text-white/75'}`}>
            <span className={`font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>@{handle}</span>{' '}
            {post.content}
          </p>
        )}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hashtags.map((tag, i) => (
              <span key={i} className={`text-[11px] ${lm ? 'text-blue-500' : 'text-blue-400/80'}`}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <ActionBar post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COSMIC FEED CARD — dispatch to appropriate specialized card
// ─────────────────────────────────────────────────────────────────────────────
export function CosmicFeedCard({ post, lm, onComment, onRefresh }: {
  post: CosmicPost; lm?: boolean; onComment: (p: CosmicPost) => void; onRefresh?: () => void;
}) {
  const props = { post, lm, onComment, onRefresh };

  switch (post.source) {
    case 'arxiv':     return <ArxivCard     {...props} />;
    case 'nasa':      return <NasaCard      {...props} />;
    case 'youtube':   return <YouTubeCard   {...props} />;
    case 'x':         return <XBulletinCard {...props} />;
    case 'telegram':  return <TelegramCard  {...props} />;
    case 'wikipedia': return <WikipediaCard {...props} />;
    case 'instagram': return <InstagramCard {...props} />;
    default:          return null; // user posts handled by LiveFeedCard in CosmicNexus
  }
}
