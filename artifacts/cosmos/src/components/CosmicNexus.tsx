import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab     = 'shorts' | 'home' | 'search' | 'chat' | 'profile';
type FeedKind = 'short-video' | 'post' | 'article' | 'long-video';

interface LivePost {
  id:              string;
  user_id:         string;
  content:         string;
  type:            FeedKind;
  media_url:       string;
  created_at:      string;
  author_username: string;
  author_avatar:   string;
  like_count:      number;
  comment_count:   number;
  user_liked:      boolean;
  user_bookmarked: boolean;
}

interface CommentRow {
  id:              string;
  post_id:         string;
  user_id:         string;
  content:         string;
  created_at:      string;
  author_username: string;
  author_avatar:   string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Cosmetic dummy data (Shorts & Chat only) ─────────────────────────────────
const SHORTS = [
  { id: 1, title: 'Quantum Entanglement Explained',       sub: 'Quantum Physics',    gradient: 'from-violet-900 via-indigo-900 to-blue-900',   emoji: '⚛️', views: '2.4M', likes: '182K' },
  { id: 2, title: "Inside a Black Hole's Event Horizon",  sub: 'Astrophysics',       gradient: 'from-gray-900 via-black to-purple-900',         emoji: '🕳️', views: '5.1M', likes: '430K' },
  { id: 3, title: 'How Dark Matter Shapes the Universe',  sub: 'Cosmology',          gradient: 'from-blue-900 via-cyan-900 to-teal-900',        emoji: '🌌', views: '3.8M', likes: '297K' },
  { id: 4, title: 'CRISPR: Editing the Code of Life',     sub: 'Biology',            gradient: 'from-emerald-900 via-green-900 to-lime-900',    emoji: '🧬', views: '1.9M', likes: '154K' },
  { id: 5, title: 'The Speed of Light Is Really Weird',   sub: 'Special Relativity', gradient: 'from-orange-900 via-red-900 to-pink-900',       emoji: '💫', views: '7.2M', likes: '612K' },
  { id: 6, title: 'Neutron Stars: Ultra-Dense Matter',    sub: 'Stellar Physics',    gradient: 'from-slate-900 via-blue-900 to-indigo-900',     emoji: '✨', views: '2.1M', likes: '178K' },
];

interface ChatConvo { id: number; name: string; emoji: string; lastMsg: string; time: string; unread: number; online: boolean; isBot: boolean; }
const CHATS: ChatConvo[] = [
  { id: 1, name: 'Dr. Amara Chen',         emoji: '👩‍🔬', lastMsg: 'Did you read the paper on quantum teleportation?',  time: '2m',  unread: 3,  online: true,  isBot: false },
  { id: 2, name: 'Cosmos AI',              emoji: '🤖', lastMsg: 'I can help you understand any concept in science…', time: '15m', unread: 0,  online: true,  isBot: true  },
  { id: 3, name: 'Prof. Rivera',           emoji: '👨‍🏫', lastMsg: 'Great observation about the dark energy flux!',     time: '1h',  unread: 1,  online: false, isBot: false },
  { id: 4, name: 'Stellara Bot',           emoji: '⭐', lastMsg: 'New supernova detected in NGC 4526 galaxy!',          time: '2h',  unread: 2,  online: true,  isBot: true  },
  { id: 5, name: 'Kenji Nakamura',         emoji: '👨‍💻', lastMsg: 'See you at the symposium next week 🚀',             time: '3h',  unread: 0,  online: false, isBot: false },
  { id: 6, name: 'Quantum Research Group', emoji: '🔬', lastMsg: 'Meeting rescheduled to Thursday at 14:00 UTC',        time: '5h',  unread: 0,  online: false, isBot: false },
  { id: 7, name: 'ArXiv Feed Bot',         emoji: '📄', lastMsg: '12 new papers matching your interests found',         time: '8h',  unread: 12, online: true,  isBot: true  },
];

// ─── Feed card meta ───────────────────────────────────────────────────────────
const KIND_META: Record<FeedKind, { label: string; color: string; icon: string }> = {
  'short-video': { label: 'Short',   color: 'text-pink-500',    icon: '⚡' },
  'post':        { label: 'Post',    color: 'text-purple-500',  icon: '✏️' },
  'article':     { label: 'Article', color: 'text-blue-500',    icon: '📰' },
  'long-video':  { label: 'Video',   color: 'text-emerald-500', icon: '🎬' },
};

const SEARCH_FILTERS: { kind: FeedKind; label: string; icon: string }[] = [
  { kind: 'short-video', label: 'Short Video', icon: '⚡' },
  { kind: 'post',        label: 'Post',        icon: '✏️' },
  { kind: 'article',     label: 'Article',     icon: '📰' },
  { kind: 'long-video',  label: 'Long Video',  icon: '🎬' },
];

// ─── Tab animation ────────────────────────────────────────────────────────────
const tabVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? '25%' : '-25%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? '-25%' : '25%', opacity: 0 }),
};
const tabTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON — loading placeholder
// ─────────────────────────────────────────────────────────────────────────────
function PostSkeleton({ lm }: { lm?: boolean }) {
  return (
    <div className={`rounded-2xl overflow-hidden border ${lm ? 'bg-white border-gray-100' : 'bg-white/[0.03] border-white/[0.06]'}`}>
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <div className={`w-9 h-9 rounded-full flex-shrink-0 animate-pulse ${lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 rounded-full animate-pulse w-2/5 ${lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`} />
          <div className={`h-2.5 rounded-full animate-pulse w-1/4 ${lm ? 'bg-gray-50' : 'bg-white/[0.04]'}`} />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className={`h-3 rounded-full animate-pulse ${lm ? 'bg-gray-100' : 'bg-white/[0.06]'}`} />
        <div className={`h-3 rounded-full animate-pulse w-4/5 ${lm ? 'bg-gray-100' : 'bg-white/[0.06]'}`} />
        <div className={`h-3 rounded-full animate-pulse w-3/5 ${lm ? 'bg-gray-50' : 'bg-white/[0.04]'}`} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR helper — reusable inline avatar with initial fallback
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 'md', ring, lm }: {
  src:  string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
  lm?:  boolean;
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-[12px]' : size === 'lg' ? 'w-20 h-20 text-[28px]' : 'w-9 h-9 text-[14px]';
  const ringClass = ring ? `ring-1 ${lm ? 'ring-gray-200' : 'ring-white/10'}` : '';
  return (
    <div className={`${sizeClass} ${ringClass} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none'; }} />
      ) : null}
      <span className="absolute" style={{ display: src ? 'none' : 'block' }}>
        {(name[0] ?? '?').toUpperCase()}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE FEED CARD — renders a post from the database
// ─────────────────────────────────────────────────────────────────────────────
function LiveFeedCard({ post, lm, onComment, onRefresh }: {
  post:       LivePost;
  lm?:        boolean;
  onComment:  (post: LivePost) => void;
  onRefresh?: () => void;
}) {
  const [liked,      setLiked]      = useState(post.user_liked);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);
  const [likeCount,  setLikeCount]  = useState(post.like_count);
  const [likeLoading,  setLikeLoading]  = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const meta   = KIND_META[post.type] ?? KIND_META['post'];
  const handle = '@' + post.author_username.toLowerCase().replace(/\s+/g, '');
  const timeStr = timeAgo(post.created_at);

  // Detect media type
  const isVideo = post.media_url
    ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(post.media_url)
    : false;

  const toggleLike = async () => {
    if (likeLoading) return;
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
    setLikeLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json() as { ok: boolean; liked?: boolean };
      if (!data.ok) throw new Error('failed');
      // Sync with server truth
      setLiked(data.liked ?? next);
    } catch {
      // Revert on error
      setLiked(!next);
      setLikeCount(c => next ? Math.max(0, c - 1) : c + 1);
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleBookmark = async () => {
    if (bookmarkLoading) return;
    const next = !bookmarked;
    setBookmarked(next);
    setBookmarkLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json() as { ok: boolean; bookmarked?: boolean };
      if (!data.ok) throw new Error('failed');
      setBookmarked(data.bookmarked ?? next);
    } catch {
      setBookmarked(!next);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${lm ? 'bg-white border-gray-100 shadow-sm' : 'bg-white/[0.04] border-white/[0.08]'}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ${lm ? 'ring-gray-200' : 'ring-white/10'}`}
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
          <img
            src={post.author_avatar}
            alt={post.author_username}
            className="w-full h-full object-cover"
            onError={e => {
              e.currentTarget.style.display = 'none';
              const p = e.currentTarget.parentElement;
              if (p) {
                p.style.display    = 'flex';
                p.style.alignItems = 'center';
                p.style.justifyContent = 'center';
                p.style.fontSize   = '14px';
                p.style.fontWeight = 'bold';
                p.style.color      = 'white';
                if (!p.querySelector('span')) {
                  const s = document.createElement('span');
                  s.textContent = (post.author_username[0] ?? '?').toUpperCase();
                  p.appendChild(s);
                }
              }
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13.5px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>
              {post.author_username}
            </span>
            <span className={`text-[9.5px] uppercase tracking-[0.14em] font-mono px-1.5 py-0.5 rounded-full ${lm ? 'bg-gray-100' : 'bg-white/[0.07]'} ${meta.color}`}>
              {meta.icon} {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[11px] ${lm ? 'text-gray-400' : 'text-white/35'}`}>{handle}</span>
            <span className={`text-[10px] ${lm ? 'text-gray-300' : 'text-white/20'}`}>·</span>
            <span className={`text-[11px] ${lm ? 'text-gray-400' : 'text-white/35'}`}>{timeStr}</span>
          </div>
        </div>

        <button className={`p-1.5 rounded-full transition-colors ${lm ? 'hover:bg-gray-100' : 'hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2}>
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {/* ── Content ── */}
      <p className={`px-4 pb-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${lm ? 'text-gray-700' : 'text-white/70'}`}>
        {post.content}
      </p>

      {/* ── Media ── */}
      {post.media_url && (
        <div className="mx-4 mb-3.5 rounded-xl overflow-hidden border" style={lm ? { borderColor: '#f3f4f6' } : { borderColor: 'rgba(255,255,255,0.07)' }}>
          {isVideo ? (
            <video
              src={post.media_url}
              controls
              className="w-full max-h-64 object-cover bg-black block"
              preload="metadata"
            />
          ) : (
            <img
              src={post.media_url}
              alt="Post media"
              className="w-full max-h-64 object-cover block"
              onError={e => {
                // Show a broken-media placeholder instead of hiding
                const el = e.currentTarget;
                el.style.display = 'none';
                const wrap = el.parentElement;
                if (wrap && !wrap.querySelector('[data-broken]')) {
                  const fb = document.createElement('div');
                  fb.setAttribute('data-broken', '1');
                  fb.style.cssText = 'display:flex;align-items:center;justify-content:center;height:80px;opacity:0.3;font-size:13px;';
                  fb.textContent = '⚠️ Media unavailable';
                  wrap.appendChild(fb);
                }
              }}
            />
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className={`flex items-center gap-0.5 px-3 py-2 border-t ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
        {/* Like */}
        <button
          onClick={toggleLike}
          disabled={likeLoading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all select-none ${
            liked
              ? 'text-red-500'
              : lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'
          }`}
        >
          <motion.div
            animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </motion.div>
          {likeCount > 0 ? fmt(likeCount) : '0'}
        </button>

        {/* Comment */}
        <button
          onClick={() => onComment(post)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all ${lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          {post.comment_count > 0 ? fmt(post.comment_count) : '0'}
        </button>

        {/* Share */}
        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all ${lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          Share
        </button>

        <div className="flex-1" />

        {/* Bookmark */}
        <button
          onClick={toggleBookmark}
          disabled={bookmarkLoading}
          className={`p-2 rounded-xl transition-all select-none ${
            bookmarked
              ? 'text-violet-500'
              : lm ? 'text-gray-400 hover:bg-gray-100' : 'text-white/30 hover:bg-white/[0.06]'
          }`}
        >
          <motion.div
            animate={bookmarked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </motion.div>
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CommentModal({ post, lm, onClose, onRefresh }: {
  post:      LivePost;
  lm?:       boolean;
  onClose:   () => void;
  onRefresh: () => void;
}) {
  const [comments,   setComments]   = useState<CommentRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/posts/${post.id}/comments`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok: boolean; comments?: CommentRow[] }) => {
        if (d.ok && d.comments) setComments(d.comments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Focus textarea after spring animation settles
    const t = setTimeout(() => textareaRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [post.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    if (text.length > 500) { setError('Comment must be under 500 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json() as { ok: boolean; comment?: CommentRow; error?: string };
      if (data.ok && data.comment) {
        setComments(prev => [...prev, data.comment!]);
        setText('');
        onRefresh(); // bump comment_count in parent
        scrollToBottom();
      } else {
        setError(data.error ?? 'Failed to post comment.');
      }
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className={`w-full max-w-lg rounded-t-3xl overflow-hidden flex flex-col ${lm ? 'bg-white shadow-2xl' : ''}`}
        style={lm
          ? { maxHeight: '82vh' }
          : {
              background:    'linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(9,9,18,0.99) 100%)',
              border:        '1px solid rgba(139,92,246,0.22)',
              borderBottom:  'none',
              boxShadow:     '0 -24px 80px rgba(0,0,0,0.7), 0 0 80px rgba(109,40,217,0.07)',
              maxHeight:     '82vh',
            }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-10 h-1 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.12]'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 pt-3 pb-4 border-b flex-shrink-0 ${lm ? 'border-gray-100' : 'border-white/[0.07]'}`}>
          <div>
            <h2 className={`text-[17px] font-bold tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>Comments</h2>
            <p className={`text-[12px] mt-0.5 ${lm ? 'text-gray-400' : 'text-white/35'}`}>
              {loading ? '…' : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${lm ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/[0.08] text-white/40'}`}
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Post preview */}
        <div className={`px-6 py-3 border-b flex-shrink-0 ${lm ? 'border-gray-100 bg-gray-50' : 'border-white/[0.05] bg-white/[0.02]'}`}>
          <p className={`text-[12px] font-semibold mb-0.5 ${lm ? 'text-gray-500' : 'text-white/35'}`}>
            {post.author_username}
          </p>
          <p className={`text-[12.5px] leading-relaxed line-clamp-2 ${lm ? 'text-gray-600' : 'text-white/50'}`}>
            {post.content}
          </p>
        </div>

        {/* Comments list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ scrollbarWidth: 'none' }}>
          {loading && [1, 2].map(i => <PostSkeleton key={i} lm={lm} />)}

          {!loading && comments.length === 0 && (
            <div className={`py-12 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">💬</p>
              <p className="text-[14px] font-medium mb-1">No comments yet</p>
              <p className="text-[12px]">Be the first to reply!</p>
            </div>
          )}

          {!loading && comments.map(c => (
            <div key={c.id} className={`flex gap-3 p-3 rounded-xl ${lm ? 'bg-gray-50' : 'bg-white/[0.04]'}`}>
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ${lm ? 'ring-gray-200' : 'ring-white/10'}`}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
              >
                <img
                  src={c.author_avatar}
                  alt={c.author_username}
                  className="w-full h-full object-cover"
                  onError={e => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    const p = el.parentElement;
                    if (p) {
                      p.style.display = 'flex';
                      p.style.alignItems = 'center';
                      p.style.justifyContent = 'center';
                      p.style.fontSize = '12px';
                      p.style.fontWeight = 'bold';
                      p.style.color = 'white';
                      if (!p.querySelector('span')) {
                        const s = document.createElement('span');
                        s.textContent = (c.author_username[0] ?? '?').toUpperCase();
                        p.appendChild(s);
                      }
                    }
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[12px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>
                    {c.author_username}
                  </span>
                  <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className={`text-[12.5px] leading-relaxed ${lm ? 'text-gray-700' : 'text-white/65'}`}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{    opacity: 0, height: 0 }}
              className={`mx-4 rounded-xl px-4 py-2 text-[12px] text-red-400 border flex-shrink-0 ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/[0.07] border-red-500/20'}`}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input row */}
        <form
          onSubmit={submit}
          className={`flex gap-3 px-4 py-3 border-t flex-shrink-0 ${lm ? 'border-gray-100 bg-white' : 'border-white/[0.07]'}`}
          style={lm ? undefined : { background: 'rgba(13,13,26,0.98)' }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Add a comment…"
            rows={1}
            style={{ resize: 'none' }}
            className={`flex-1 px-3.5 py-2.5 rounded-xl border text-[13px] leading-relaxed outline-none transition-all ${
              lm
                ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]'
                : 'bg-white/[0.05] border-white/[0.09] text-white placeholder-white/25 focus:border-violet-500/60 focus:bg-white/[0.07]'
            }`}
          />
          <motion.button
            type="submit"
            disabled={!text.trim() || submitting}
            whileHover={text.trim() && !submitting ? { scale: 1.06 } : {}}
            whileTap={text.trim()   && !submitting ? { scale: 0.94 } : {}}
            className={`w-10 h-10 self-end rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
              !text.trim() || submitting
                ? lm ? 'bg-gray-100 text-gray-300' : 'bg-white/[0.04] text-white/20'
                : lm ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-white'
            }`}
            style={text.trim() && !submitting && !lm
              ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.85),rgba(91,33,182,0.9))', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 4px 16px rgba(91,33,182,0.35)' }
              : undefined}
          >
            {submitting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE POST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onSuccess, lm }: {
  onClose:   () => void;
  onSuccess: () => void;
  lm?:       boolean;
}) {
  const [content,    setContent]    = useState('');
  const [mediaUrl,   setMediaUrl]   = useState('');
  const [postType,   setPostType]   = useState<FeedKind>('post');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError('Post content cannot be empty.'); return; }
    if (content.length > 1000) { setError('Content must be under 1000 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          content:  content.trim(),
          type:     postType,
          mediaUrl: mediaUrl.trim() || undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? 'Failed to create post.'); setSubmitting(false); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  };

  const POST_TYPES: { kind: FeedKind; icon: string; label: string }[] = [
    { kind: 'post',        icon: '✏️', label: 'Post'    },
    { kind: 'article',     icon: '📰', label: 'Article' },
    { kind: 'short-video', icon: '⚡', label: 'Short'   },
    { kind: 'long-video',  icon: '🎬', label: 'Video'   },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', background: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className={`w-full max-w-lg rounded-t-3xl overflow-hidden ${lm ? 'bg-white shadow-2xl' : ''}`}
        style={lm ? undefined : {
          background:   'linear-gradient(160deg, rgba(18,18,32,0.99) 0%, rgba(9,9,18,0.99) 100%)',
          border:       '1px solid rgba(139,92,246,0.22)',
          borderBottom: 'none',
          boxShadow:    '0 -24px 80px rgba(0,0,0,0.7), 0 0 80px rgba(109,40,217,0.07)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/[0.12]'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 pt-3 pb-4 border-b ${lm ? 'border-gray-100' : 'border-white/[0.07]'}`}>
          <div>
            <h2 className={`text-[17px] font-bold tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>Create Post</h2>
            <p className={`text-[12px] mt-0.5 ${lm ? 'text-gray-400' : 'text-white/35'}`}>Share your cosmic discovery</p>
          </div>
          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${lm ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/[0.08] text-white/40'}`}
          >
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Post Type ── */}
          <div>
            <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono mb-2.5 ${lm ? 'text-gray-500' : 'text-white/35'}`}>
              Post Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {POST_TYPES.map(({ kind, icon, label }) => {
                const active = postType === kind;
                return (
                  <button key={kind} type="button" onClick={() => setPostType(kind)}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border transition-all ${
                      active
                        ? lm
                          ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-100'
                          : 'border-violet-500 text-white'
                        : lm
                          ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                          : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:border-white/[0.15]'
                    }`}
                    style={active && !lm ? { background: 'linear-gradient(145deg, rgba(109,40,217,0.75), rgba(91,33,182,0.8))', boxShadow: '0 4px 20px rgba(109,40,217,0.35)' } : undefined}
                  >
                    <span className="text-[20px]">{icon}</span>
                    <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ── */}
          <div>
            <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono mb-2.5 ${lm ? 'text-gray-500' : 'text-white/35'}`}>
              Content
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => { setContent(e.target.value); setError(''); }}
              placeholder="What's happening in the cosmos?"
              rows={4}
              className={`w-full px-4 py-3 rounded-xl border text-[14px] leading-relaxed outline-none resize-none transition-all ${
                lm
                  ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]'
                  : 'bg-white/[0.05] border-white/[0.09] text-white placeholder-white/25 focus:border-violet-500/60 focus:bg-white/[0.07]'
              }`}
            />
            {/* Character counter */}
            <div className={`flex justify-between items-center mt-1.5 ${lm ? 'text-gray-300' : 'text-white/20'}`}>
              <span className="text-[10px] font-mono">
                {content.length > 900 && (
                  <span className={content.length > 1000 ? 'text-red-400' : 'text-amber-400'}>
                    {1000 - content.length} remaining
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-mono ${content.length > 1000 ? 'text-red-400' : ''}`}>
                {content.length} / 1000
              </span>
            </div>
          </div>

          {/* ── Media URL ── */}
          <div>
            <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono mb-2.5 ${lm ? 'text-gray-500' : 'text-white/35'}`}>
              Image / Video URL <span className={`normal-case tracking-normal ${lm ? 'text-gray-400' : 'text-white/25'}`}>(optional)</span>
            </label>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
              lm
                ? 'bg-white border-gray-200 focus-within:border-purple-400 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]'
                : 'bg-white/[0.05] border-white/[0.09] focus-within:border-violet-500/60 focus-within:bg-white/[0.07]'
            }`}>
              {/* Media icon */}
              <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <input
                type="url"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={`flex-1 bg-transparent outline-none text-[13px] min-w-0 ${
                  lm
                    ? 'text-gray-900 placeholder-gray-400'
                    : 'text-white placeholder-white/25'
                }`}
              />
              {mediaUrl && (
                <button type="button" onClick={() => setMediaUrl('')}
                  className={`text-[18px] leading-none flex-shrink-0 ${lm ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white/60'}`}>
                  ×
                </button>
              )}
            </div>
            {/* Media preview thumbnail */}
            {mediaUrl.trim() && (
              <div className={`mt-2 rounded-xl overflow-hidden border ${lm ? 'border-gray-100' : 'border-white/[0.07]'}`}>
                {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl.trim()) ? (
                  <video src={mediaUrl.trim()} className="w-full max-h-32 object-cover bg-black" preload="metadata" />
                ) : (
                  <img src={mediaUrl.trim()} alt="Preview" className="w-full max-h-32 object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const wrap = e.currentTarget.parentElement;
                      if (wrap) wrap.style.display = 'none';
                    }} />
                )}
              </div>
            )}
          </div>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{    opacity: 0, height: 0 }}
                className={`rounded-xl px-4 py-2.5 text-[12.5px] text-red-400 border ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/[0.07] border-red-500/20'}`}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Actions ── */}
          <div className="flex gap-3 pb-2">
            <button type="button" onClick={onClose}
              className={`flex-none px-5 py-3 rounded-xl text-[13px] font-medium border transition-all ${lm ? 'border-gray-200 text-gray-700 hover:bg-gray-100' : 'border-white/[0.10] text-white/50 hover:bg-white/[0.06]'}`}>
              Cancel
            </button>

            <motion.button
              type="submit"
              disabled={submitting || !content.trim() || content.length > 1000}
              whileHover={!submitting && !!content.trim() ? { scale: 1.02 } : {}}
              whileTap={!submitting && !!content.trim()  ? { scale: 0.97 } : {}}
              className={`flex-1 py-3 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
                submitting || !content.trim() || content.length > 1000
                  ? lm
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white/[0.05] text-white/25 cursor-not-allowed border border-white/[0.07]'
                  : lm
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100'
                    : 'text-white'
              }`}
              style={
                !submitting && !!content.trim() && content.length <= 1000 && !lm
                  ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(91,33,182,0.9))', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 8px 28px rgba(91,33,182,0.35)' }
                  : undefined
              }
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Posting…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  Publish Post
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHORTS TAB (cosmetic — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ShortsTab({ lm }: { lm?: boolean }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const toggle = (id: number) => setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div ref={containerRef} className="h-full overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
      {SHORTS.map(s => (
        <div key={s.id} className="snap-start snap-always h-full relative flex-shrink-0 overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="text-[100px] drop-shadow-2xl select-none">{s.emoji}</motion.div>
          </div>
          <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
            <button onClick={() => toggle(s.id)} className="flex flex-col items-center gap-1">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 ${liked.has(s.id) ? 'bg-red-500/90 border-red-400 scale-110' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}>
                <svg viewBox="0 0 24 24" className={`w-5 h-5 ${liked.has(s.id) ? 'fill-white' : 'fill-none stroke-white'}`} strokeWidth={2}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              </div>
              <span className="text-white text-[11px] font-medium drop-shadow">{s.likes}</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/20 transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <span className="text-white text-[11px] drop-shadow">128</span>
            </button>
            <button className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/20 transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth={2}><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </div>
              <span className="text-white text-[11px] drop-shadow">Share</span>
            </button>
          </div>
          <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-16 bg-gradient-to-t from-black/70 to-transparent">
            <span className="inline-block text-[9px] uppercase tracking-[0.22em] font-mono text-white/50 border border-white/20 bg-white/10 px-2.5 py-0.5 rounded-full mb-2">{s.sub}</span>
            <h2 className="text-white text-[20px] font-semibold leading-tight mb-3 drop-shadow-lg max-w-[80%]">{s.title}</h2>
            <div className="flex items-center gap-4">
              <span className="text-white/50 text-[12px]">👁 {s.views} views</span>
              <span className="text-white/50 text-[12px]">💜 {s.likes} likes</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME TAB — live feed from API
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ posts, loading, error, lm, onComment, onRefresh }: {
  posts:     LivePost[];
  loading:   boolean;
  error:     string;
  lm?:       boolean;
  onComment: (post: LivePost) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex flex-col gap-3 p-4 pb-6">
        {/* Loading */}
        {loading && [1, 2, 3].map(i => <PostSkeleton key={i} lm={lm} />)}

        {/* Error */}
        {!loading && error && (
          <div className={`py-14 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-3xl mb-3">⚠️</p>
            <p className="text-[13px]">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && posts.length === 0 && (
          <div className={`py-14 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-3xl mb-3">🌌</p>
            <p className="text-[14px] font-medium mb-1">No posts yet</p>
            <p className="text-[12px]">Be the first to share a discovery.</p>
          </div>
        )}

        {/* Live posts */}
        {!loading && posts.map(post => (
          <LiveFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH TAB — filters live posts by type and query
// ─────────────────────────────────────────────────────────────────────────────
function SearchTab({ posts, loading, lm, onComment, onRefresh }: {
  posts:     LivePost[];
  loading:   boolean;
  lm?:       boolean;
  onComment: (post: LivePost) => void;
  onRefresh: () => void;
}) {
  const [q,      setQ]      = useState('');
  const [active, setActive] = useState<FeedKind | 'all'>('all');

  const filtered = posts.filter(p => {
    const matchKind = active === 'all' || p.type === active;
    const matchQ    = !q.trim() || p.content.toLowerCase().includes(q.toLowerCase()) || p.author_username.toLowerCase().includes(q.toLowerCase());
    return matchKind && matchQ;
  });

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Sticky controls */}
      <div className={`sticky top-0 z-10 px-4 pt-4 pb-3 border-b ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${lm ? 'bg-white border-gray-200 shadow-sm focus-within:border-purple-300 focus-within:shadow-md' : 'bg-white/[0.06] border-white/[0.10] focus-within:border-white/[0.22] focus-within:bg-white/[0.09]'}`}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the cosmos…"
            className={`flex-1 bg-transparent outline-none text-[14px] ${lm ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/25'}`} />
          {q && (
            <button onClick={() => setQ('')} className={`text-[18px] leading-none ${lm ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white/60'}`}>×</button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-3">
          {SEARCH_FILTERS.map(f => {
            const isOn = active === f.kind;
            return (
              <motion.button key={f.kind} whileTap={{ scale: 0.94 }}
                onClick={() => setActive(a => a === f.kind ? 'all' : f.kind)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-medium transition-all flex-shrink-0 ${
                  isOn
                    ? lm ? 'bg-violet-600 border-violet-600 text-white shadow-sm' : 'bg-violet-600 border-violet-500 text-white'
                    : lm ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50' : 'bg-white/[0.05] border-white/[0.10] text-white/55 hover:bg-white/[0.09] hover:border-white/[0.18]'
                }`}>
                <span className="text-[12px]">{f.icon}</span>
                <span>{f.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3 p-4 pb-6">
        {loading && [1, 2, 3].map(i => <PostSkeleton key={i} lm={lm} />)}

        {!loading && filtered.length === 0 ? (
          <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-3xl mb-3">🔭</p>
            <p className="text-[14px]">{q || active !== 'all' ? 'Nothing matched — try a different search or filter.' : 'No posts yet in the cosmos.'}</p>
          </div>
        ) : (
          filtered.map(post => <LiveFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />)
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT TAB (cosmetic — unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ChatTab({ lm }: { lm?: boolean }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className={`sticky top-0 z-10 px-4 py-3.5 border-b flex items-center justify-between ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        <h2 className={`text-[16px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>Direct Messages</h2>
        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${lm ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/[0.07] text-white/50'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div className="px-4 pt-3 pb-2">
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${lm ? 'bg-gray-100 border-gray-200' : 'bg-white/[0.05] border-white/[0.08]'}`}>
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input placeholder="Search messages…" className={`flex-1 bg-transparent outline-none text-[13px] ${lm ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/25'}`} />
        </div>
      </div>
      <div className="px-2 pb-6">
        {CHATS.map(c => (
          <motion.button key={c.id} whileTap={{ scale: 0.99 }} onClick={() => setOpenId(id => id === c.id ? null : c.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 text-left transition-all ${
              openId === c.id
                ? lm ? 'bg-purple-50 border border-purple-100' : 'bg-white/[0.08] border border-white/[0.10]'
                : lm ? 'hover:bg-gray-100' : 'hover:bg-white/[0.04]'
            }`}>
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${c.isBot ? lm ? 'bg-purple-100' : 'bg-purple-500/15' : lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`}>{c.emoji}</div>
              {c.online && <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 bg-emerald-400 ${lm ? 'border-gray-50' : 'border-[#080810]'}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[14px] font-semibold flex items-center gap-1.5 ${lm ? 'text-gray-900' : 'text-white'}`}>
                  {c.name}
                  {c.isBot && <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-full ${lm ? 'bg-purple-100 text-purple-600' : 'bg-purple-500/20 text-purple-300'}`}>AI</span>}
                </span>
                <span className={`text-[11px] flex-shrink-0 ml-2 ${lm ? 'text-gray-400' : 'text-white/30'}`}>{c.time}</span>
              </div>
              <p className={`text-[12px] truncate ${lm ? 'text-gray-500' : 'text-white/40'}`}>{c.lastMsg}</p>
            </div>
            {c.unread > 0 && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{c.unread > 9 ? '9+' : c.unread}</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB — shows the current user's real posts
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ posts, loading, onCreatePost, lm, onComment, onRefresh }: {
  posts:        LivePost[];
  loading:      boolean;
  onCreatePost: () => void;
  lm?:          boolean;
  onComment:    (post: LivePost) => void;
  onRefresh:    () => void;
}) {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'posts' | 'liked' | 'saved'>('posts');

  const myPosts = posts.filter(p => p.user_id === user?.id);

  const stats = [
    { label: 'Posts',     value: loading ? '…' : String(myPosts.length) },
    { label: 'Followers', value: '0'    },
    { label: 'Following', value: '0'    },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* ── Profile header ── */}
      <div className={`px-5 pt-5 pb-4 border-b ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '3px solid rgba(139,92,246,0.5)', boxShadow: '0 0 24px rgba(139,92,246,0.2)' }}>
            <img src={user?.avatar ?? 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg'}
              alt="" className="w-full h-full object-cover" />
          </div>
          {/* Name & stats */}
          <div className="flex-1 min-w-0">
            <h2 className={`text-[18px] font-bold leading-tight mb-0.5 ${lm ? 'text-gray-900' : 'text-white'}`}>{user?.username ?? 'Cosmos User'}</h2>
            <p className={`text-[12px] mb-3 ${lm ? 'text-gray-400' : 'text-white/40'}`}>{user?.email ?? 'explorer@cosmos.app'}</p>
            <div className="flex items-center gap-5">
              {stats.map(s => (
                <div key={s.label} className="flex flex-col items-center">
                  <span className={`text-[16px] font-bold leading-none ${lm ? 'text-gray-900' : 'text-white'}`}>{s.value}</span>
                  <span className={`text-[10px] uppercase tracking-[0.14em] font-mono mt-0.5 ${lm ? 'text-gray-400' : 'text-white/35'}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className={`text-[13px] leading-relaxed mb-4 ${lm ? 'text-gray-600' : 'text-white/55'}`}>
          🌌 Science communicator & astrophysics enthusiast · Exploring the cosmos one post at a time · 📍 Earth, Solar System
        </p>

        {/* Buttons row */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onCreatePost}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${lm ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100' : 'text-white'}`}
            style={lm ? undefined : { background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(109,40,217,0.55))', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            Create Post
          </motion.button>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${lm ? 'border-gray-200 text-gray-700 hover:bg-gray-100' : 'border-white/[0.12] text-white/60 hover:bg-white/[0.06]'}`}>
            Edit Profile
          </motion.button>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className={`w-10 rounded-xl flex items-center justify-center border transition-all ${lm ? 'border-gray-200 text-gray-500 hover:bg-gray-100' : 'border-white/[0.12] text-white/40 hover:bg-white/[0.06]'}`}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
            </svg>
          </motion.button>
        </div>
      </div>

      {/* ── Chess stats ribbon ── */}
      {user && (user.chessWins + user.chessLosses > 0) && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 ${lm ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <span className="text-[22px]">♟️</span>
          <div>
            <p className={`text-[12px] font-semibold ${lm ? 'text-amber-800' : 'text-amber-300'}`}>Grandmaster Chess Record</p>
            <p className={`text-[11px] ${lm ? 'text-amber-600' : 'text-amber-400/70'}`}>
              {user.chessWins}W · {user.chessLosses}L · {Math.round((user.chessWins / (user.chessWins + user.chessLosses)) * 100)}% win rate
            </p>
          </div>
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className={`flex mt-4 border-b ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
        {(['posts', 'liked', 'saved'] as const).map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`flex-1 py-3 text-[11px] uppercase tracking-[0.2em] font-mono transition-all border-b-2 ${
              activeSection === s
                ? lm ? 'border-purple-500 text-purple-600' : 'border-purple-400 text-purple-300'
                : lm ? 'border-transparent text-gray-400 hover:text-gray-600' : 'border-transparent text-white/30 hover:text-white/60'
            }`}>
            {s === 'posts' ? '⊞ Posts' : s === 'liked' ? '♥ Liked' : '🔖 Saved'}
          </button>
        ))}
      </div>

      {/* ── Posts section ── */}
      {activeSection === 'posts' && (
        <div className="flex flex-col gap-3 p-4 pb-6">
          {/* Loading */}
          {loading && [1, 2].map(i => <PostSkeleton key={i} lm={lm} />)}

          {/* Empty state */}
          {!loading && myPosts.length === 0 && (
            <div className={`py-14 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">✨</p>
              <p className="text-[14px] font-medium mb-1">No posts yet</p>
              <p className="text-[12px] mb-5">Share your first cosmic discovery.</p>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={onCreatePost}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold ${lm ? 'bg-purple-600 text-white hover:bg-purple-700' : 'text-white'}`}
                style={lm ? undefined : { background: 'linear-gradient(135deg,rgba(124,58,237,0.7),rgba(91,33,182,0.75))', border: '1px solid rgba(139,92,246,0.4)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                Create your first post
              </motion.button>
            </div>
          )}

          {/* Real posts */}
          {!loading && myPosts.map(post => (
            <LiveFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {/* ── Liked / Saved (placeholder until backend support) ── */}
      {activeSection !== 'posts' && (
        <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
          <p className="text-3xl mb-3">{activeSection === 'liked' ? '♥' : '🔖'}</p>
          <p className="text-[14px]">{activeSection === 'liked' ? 'Liked posts will appear here.' : 'Saved posts will appear here.'}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
const NAV_TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: 'shorts',  label: 'Shorts',
    icon: a => <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={a?0:2}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  { id: 'home',    label: 'Home',
    icon: a => <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={a?0:2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'search',  label: 'Search',
    icon: a => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={a?2.5:1.75}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
  { id: 'chat',    label: 'Chat',
    icon: a => <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={a?0:2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { id: 'profile', label: 'Profile',
    icon: a => <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth={a?0:2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
];

function BottomNav({ active, onSelect, lm }: { active: Tab; onSelect: (t: Tab) => void; lm?: boolean }) {
  return (
    <div className={`flex-shrink-0 border-t transition-colors duration-300 ${lm ? 'bg-white/95 border-gray-100' : 'bg-[#080810]/95 border-white/[0.06]'}`}
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {NAV_TABS.map(tab => {
          const isActive = active === tab.id;
          return (
            <button key={tab.id} onClick={() => onSelect(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${lm ? isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-700' : isActive ? 'text-purple-400' : 'text-white/35 hover:text-white/60'}`}>
              {isActive && (
                <motion.div layoutId="nav-indicator"
                  className="absolute top-1.5 w-1 h-1 rounded-full bg-purple-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ duration: 0.18 }}>
                {tab.icon(isActive)}
              </motion.div>
              <span className={`text-[10px] font-medium tracking-wide transition-all ${isActive ? '' : 'opacity-60'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
const TAB_ORDER: Tab[] = ['shorts', 'home', 'search', 'chat', 'profile'];

export default function CosmicNexus({ onClose, lm }: { onClose: () => void; lm?: boolean }) {
  const [activeTab,      setActiveTab]      = useState<Tab>('home');
  const [direction,      setDirection]      = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentingPost, setCommentingPost] = useState<LivePost | null>(null);

  // ── Live posts state ──────────────────────────────────────────────────────
  const [posts,        setPosts]        = useState<LivePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError,   setPostsError]   = useState('');

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError('');
    try {
      const res  = await fetch('/api/posts', { credentials: 'include' });
      const data = await res.json() as { ok: boolean; posts?: LivePost[]; error?: string };
      if (data.ok && data.posts) {
        setPosts(data.posts);
      } else {
        setPostsError(data.error ?? 'Failed to load posts.');
      }
    } catch {
      setPostsError('Network error — could not load posts.');
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Tab navigation ────────────────────────────────────────────────────────
  const handleSelect = (t: Tab) => {
    if (t === activeTab) return;
    setDirection(TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(t);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openCreatePost = () => setShowCreatePost(true);
  const handlePostSuccess = () => { fetchPosts(); };
  const handleComment = (post: LivePost) => setCommentingPost(post);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1,  y: 0  }}
        exit={{    opacity: 0,  y: 20 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-0 z-[150] flex flex-col transform-gpu transition-colors duration-300 ${lm ? 'bg-gray-50' : 'bg-[#080810]'}`}
      >
        {/* ── Top header ── */}
        <div
          className={`flex-shrink-0 flex items-center justify-between px-4 h-14 border-b transition-colors duration-300 ${lm ? 'bg-white/90 border-gray-100' : 'bg-[#080810]/90 border-white/[0.06]'}`}
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose}
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-mono transition-colors ${lm ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
            Cosmos
          </motion.button>

          <div className="flex items-center gap-2">
            <span className="text-[16px]">🌐</span>
            <span className={`text-[14px] font-bold tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>Cosmic Nexus</span>
          </div>

          {/* Compose button in header */}
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={openCreatePost}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${lm ? 'text-purple-600 hover:bg-purple-50' : 'text-purple-400 hover:bg-purple-500/15'}`}
            title="Create post"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </motion.button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeTab}
              custom={direction}
              variants={tabVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={tabTransition}
              className="absolute inset-0 transform-gpu"
            >
              {activeTab === 'shorts'  && <ShortsTab  lm={lm} />}
              {activeTab === 'home'    && <HomeTab    posts={posts} loading={postsLoading} error={postsError} lm={lm} onComment={handleComment} onRefresh={fetchPosts} />}
              {activeTab === 'search'  && <SearchTab  posts={posts} loading={postsLoading} lm={lm} onComment={handleComment} onRefresh={fetchPosts} />}
              {activeTab === 'chat'    && <ChatTab    lm={lm} />}
              {activeTab === 'profile' && <ProfileTab posts={posts} loading={postsLoading} onCreatePost={openCreatePost} lm={lm} onComment={handleComment} onRefresh={fetchPosts} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom nav ── */}
        <BottomNav active={activeTab} onSelect={handleSelect} lm={lm} />
      </motion.div>

      {/* ── Modals rendered at root to escape tab AnimatePresence/transform ── */}
      <AnimatePresence>
        {showCreatePost && (
          <CreatePostModal
            key="create-post"
            onClose={() => setShowCreatePost(false)}
            onSuccess={handlePostSuccess}
            lm={lm}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {commentingPost && (
          <CommentModal
            key={`comment-${commentingPost.id}`}
            post={commentingPost}
            lm={lm}
            onClose={() => setCommentingPost(null)}
            onRefresh={fetchPosts}
          />
        )}
      </AnimatePresence>
    </>
  );
}
