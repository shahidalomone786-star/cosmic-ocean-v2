import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { CosmicFeedCard } from './CosmicCards';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab     = 'shorts' | 'home' | 'search' | 'chat' | 'profile';
type FeedKind = 'short-video' | 'post' | 'article' | 'long-video';
type SearchFilter = FeedKind | 'all' | 'users';

interface SearchedUser {
  id:       string;
  username: string;
  avatar:   string;
  email?:   string;
}

interface DirectMessage {
  id:          string;
  sender_id:   string;
  receiver_id: string;
  content:     string;
  created_at:  string;
  read:        boolean;
}

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
  // Cosmic Intelligence Engine fields ('' for user posts)
  source:          string;
  external_link:   string;
  extra_json:      string;
  ec_title:        string;
}

interface CommentRow {
  id:                string;
  post_id:           string;
  user_id:           string;
  content:           string;
  created_at:        string;
  author_username:   string;
  author_avatar:     string;
  parent_comment_id: string | null;
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

// (SHORTS static array removed — Shorts tab now uses real data from the feed)

// (static CHATS array removed — ChatTab is now a live AI chat)

// ─── Feed card meta ───────────────────────────────────────────────────────────
const KIND_META: Record<FeedKind, { label: string; color: string; icon: string }> = {
  'short-video': { label: 'Short',   color: 'text-pink-500',    icon: '⚡' },
  'post':        { label: 'Post',    color: 'text-purple-500',  icon: '✏️' },
  'article':     { label: 'Article', color: 'text-blue-500',    icon: '📰' },
  'long-video':  { label: 'Video',   color: 'text-emerald-500', icon: '🎬' },
};

const SEARCH_FILTERS: { kind: SearchFilter; label: string; icon: string }[] = [
  { kind: 'users',       label: 'People',      icon: '👥' },
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
  const [shareToast,   setShareToast]   = useState(false);

  const meta   = KIND_META[post.type] ?? KIND_META['post'];
  const handle = '@' + post.author_username.toLowerCase().replace(/\s+/g, '');
  const timeStr = timeAgo(post.created_at);

  // Detect media type — support both URL extensions and base64 data URIs
  const isVideo = post.media_url
    ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(post.media_url) || post.media_url.startsWith('data:video/')
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
        <button
          onClick={async () => {
            const url = `${window.location.origin}/api/posts/${post.id}`;
            const shareData = { title: `Post by ${post.author_username}`, text: post.content, url };
            if (navigator.share) {
              try { await navigator.share(shareData); } catch { /* user cancelled */ }
            } else {
              try {
                await navigator.clipboard.writeText(url);
                setShareToast(true);
                setTimeout(() => setShareToast(false), 2200);
              } catch {
                setShareToast(true);
                setTimeout(() => setShareToast(false), 2200);
              }
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all relative ${lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          Share
          {shareToast && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap z-10"
              style={{ background: 'rgba(30,30,50,0.95)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
              Link copied!
            </span>
          )}
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
  const [replyTo,    setReplyTo]    = useState<CommentRow | null>(null);
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

  const startReply = (c: CommentRow) => {
    setReplyTo(c);
    setText(`@${c.author_username} `);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setText('');
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
        body:        JSON.stringify({
          content:         text.trim(),
          parentCommentId: replyTo?.id ?? undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; comment?: CommentRow; error?: string };
      if (data.ok && data.comment) {
        setComments(prev => [...prev, data.comment!]);
        setText('');
        setReplyTo(null);
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

  // Organise into tree: top-level comments + replies grouped by parent
  const topLevel = comments.filter(c => !c.parent_comment_id);
  const repliesMap = new Map<string, CommentRow[]>();
  comments.filter(c => c.parent_comment_id).forEach(c => {
    const pid = c.parent_comment_id!;
    if (!repliesMap.has(pid)) repliesMap.set(pid, []);
    repliesMap.get(pid)!.push(c);
  });

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

          {!loading && topLevel.map(c => (
            <div key={c.id} className="space-y-2">
              {/* Parent comment */}
              <div className={`flex gap-3 p-3 rounded-xl ${lm ? 'bg-gray-50' : 'bg-white/[0.04]'}`}>
                <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ${lm ? 'ring-gray-200' : 'ring-white/10'}`}
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                  <img src={c.author_avatar} alt={c.author_username} className="w-full h-full object-cover"
                    onError={e => {
                      const el = e.currentTarget; el.style.display = 'none';
                      const p = el.parentElement;
                      if (p && !p.querySelector('span')) {
                        Object.assign(p.style, { display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'bold', color:'white' });
                        const s = document.createElement('span'); s.textContent = (c.author_username[0]??'?').toUpperCase(); p.appendChild(s);
                      }
                    }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[12px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>{c.author_username}</span>
                    <span className={`text-[10.5px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className={`text-[12.5px] leading-relaxed ${lm ? 'text-gray-700' : 'text-white/65'}`}>{c.content}</p>
                  <button
                    onClick={() => startReply(c)}
                    className={`mt-1.5 text-[10.5px] font-medium transition-colors ${lm ? 'text-purple-500 hover:text-purple-700' : 'text-violet-400/70 hover:text-violet-300'}`}
                  >
                    Reply
                  </button>
                </div>
              </div>

              {/* Nested replies */}
              {(repliesMap.get(c.id) ?? []).map(r => (
                <div key={r.id} className={`flex gap-3 p-3 rounded-xl ml-8 border-l-2 ${lm ? 'bg-gray-50/60 border-purple-200' : 'bg-white/[0.03] border-violet-700/40'}`}>
                  <div className={`w-7 h-7 rounded-full overflow-hidden flex-shrink-0 ring-1 ${lm ? 'ring-gray-200' : 'ring-white/10'}`}
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                    <img src={r.author_avatar} alt={r.author_username} className="w-full h-full object-cover"
                      onError={e => {
                        const el = e.currentTarget; el.style.display = 'none';
                        const p = el.parentElement;
                        if (p && !p.querySelector('span')) {
                          Object.assign(p.style, { display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:'bold', color:'white' });
                          const s = document.createElement('span'); s.textContent = (r.author_username[0]??'?').toUpperCase(); p.appendChild(s);
                        }
                      }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11.5px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>{r.author_username}</span>
                      <span className={`text-[10px] ${lm ? 'text-gray-400' : 'text-white/30'}`}>{timeAgo(r.created_at)}</span>
                    </div>
                    <p className={`text-[12px] leading-relaxed ${lm ? 'text-gray-700' : 'text-white/60'}`}>{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{    opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ originY: 0, transformOrigin: 'top' }}
              className={`mx-4 rounded-xl px-4 py-2 text-[12px] text-red-400 border flex-shrink-0 overflow-hidden ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/[0.07] border-red-500/20'}`}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply-to banner */}
        {replyTo && (
          <div className={`flex items-center justify-between px-4 py-2 border-t text-[11.5px] flex-shrink-0 ${lm ? 'border-gray-100 bg-purple-50 text-purple-600' : 'border-white/[0.06] text-violet-300'}`}
            style={lm ? undefined : { background: 'rgba(109,40,217,0.09)' }}>
            <span>Replying to <strong>{replyTo.author_username}</strong></span>
            <button type="button" onClick={cancelReply} className={`text-[11px] underline ${lm ? 'text-gray-400 hover:text-gray-700' : 'text-white/35 hover:text-white/70'}`}>
              Cancel
            </button>
          </div>
        )}

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
                 ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-gray-50'
                 : 'bg-white/[0.05] border-white/[0.09] text-white placeholder-white/25 focus:border-white/[0.22] focus:bg-white/[0.07]'
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
                   ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white'
                   : 'bg-white/[0.05] border-white/[0.09] text-white placeholder-white/25 focus:border-white/[0.22] focus:bg-white/[0.07]'
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

          {/* ── Media Upload ── */}
          <div>
            <label className={`block text-[10px] uppercase tracking-[0.2em] font-mono mb-2.5 ${lm ? 'text-gray-500' : 'text-white/35'}`}>
              Photo / Video <span className={`normal-case tracking-normal ${lm ? 'text-gray-400' : 'text-white/25'}`}>(optional)</span>
            </label>
            {!mediaUrl ? (
              <label
                className={`flex items-center gap-3 px-4 py-4 rounded-xl border border-dashed cursor-pointer transition-all ${
                  lm
                    ? 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/40'
                    : 'border-white/[0.12] bg-white/[0.03] hover:border-violet-500/50 hover:bg-white/[0.06]'
                }`}
              >
                <svg viewBox="0 0 24 24" className={`w-5 h-5 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={1.75}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <div>
                  <p className={`text-[13px] font-medium ${lm ? 'text-gray-700' : 'text-white/60'}`}>Choose from gallery</p>
                  <p className={`text-[11px] mt-0.5 ${lm ? 'text-gray-400' : 'text-white/30'}`}>Images & videos supported</p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const result = ev.target?.result;
                      if (typeof result === 'string') setMediaUrl(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            ) : (
              <div className="relative">
                <div className={`rounded-xl overflow-hidden border ${lm ? 'border-gray-100' : 'border-white/[0.07]'}`}>
                  {mediaUrl.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(mediaUrl) ? (
                    <video src={mediaUrl} className="w-full max-h-40 object-cover bg-black" preload="metadata" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full max-h-40 object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{    opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0, transformOrigin: 'top' }}
                className={`rounded-xl px-4 py-2.5 text-[12.5px] text-red-400 border overflow-hidden ${lm ? 'bg-red-50 border-red-100' : 'bg-red-500/[0.07] border-red-500/20'}`}
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
// ─────────────────────────────────────────────────────────────────────────────
// STAR CANVAS — animated particle starfield, always rendered as the base layer
// so the Shorts screen is never a blank black box even if the video fails.
// ─────────────────────────────────────────────────────────────────────────────
function StarCanvas({ active, seed = 0 }: { active: boolean; seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || 360;
      canvas.height = canvas.offsetHeight || 640;
    };
    resize();

    // Deterministic-seeded RNG so each slide has a unique but stable star pattern
    let rng = seed * 9301 + 49297;
    const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };

    const W = canvas.width;
    const H = canvas.height;

    // Stars — small bright dots
    const stars = Array.from({ length: 220 }, () => ({
      x:       rand() * W,
      y:       rand() * H,
      r:       rand() * 1.4 + 0.2,
      phase:   rand() * Math.PI * 2,
      speed:   rand() * 0.015 + 0.005,
      drift:   rand() * 0.08 - 0.04,
    }));

    // Nebula clouds — large blurry colour blobs
    const NEBULA_COLOURS = [
      'rgba(109,40,217,', 'rgba(79,70,229,', 'rgba(16,185,129,',
      'rgba(139,92,246,', 'rgba(6,182,212,',
    ];
    const clouds = Array.from({ length: 5 }, (_, i) => ({
      x:    rand() * W,
      y:    rand() * H,
      rx:   rand() * 160 + 80,
      ry:   rand() * 120 + 60,
      col:  NEBULA_COLOURS[(i + seed) % NEBULA_COLOURS.length],
      base: rand() * 0.04 + 0.02,
    }));

    let rafId = 0;
    let t = 0;

    const draw = () => {
      rafId = requestAnimationFrame(draw);
      if (!active) return;
      t += 0.4;

      // Deep space background
      ctx.fillStyle = 'rgba(3,0,12,0.18)';
      ctx.fillRect(0, 0, W, H);

      // Nebula blobs (behind stars)
      clouds.forEach(c => {
        const alpha = c.base + 0.015 * Math.sin(t * 0.008 + c.x);
        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
        grad.addColorStop(0,   c.col + alpha + ')');
        grad.addColorStop(0.5, c.col + (alpha * 0.4) + ')');
        grad.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.save();
        ctx.scale(1, c.ry / c.rx);
        ctx.beginPath();
        ctx.arc(c.x, c.y * (c.rx / c.ry), c.rx, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      // Stars
      stars.forEach(s => {
        s.phase += s.speed;
        s.x     += s.drift;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
        const alpha = 0.35 + 0.65 * Math.abs(Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,210,255,${alpha})`;
        ctx.fill();
      });
    };

    // Initial full clear
    ctx.fillStyle = '#03000c';
    ctx.fillRect(0, 0, W, H);

    draw();
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, seed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

// SHORT VIDEO SLIDE — one full-screen card in the Shorts reel
// ─────────────────────────────────────────────────────────────────────────────
// ── Space gradient palette — one per slide for visual variety ────────────────
const SLIDE_GRADIENTS = [
  'linear-gradient(160deg,#06000f 0%,#130025 50%,#000510 100%)',
  'linear-gradient(160deg,#000a1a 0%,#001630 50%,#00081a 100%)',
  'linear-gradient(160deg,#0a0002 0%,#1f0010 50%,#08000f 100%)',
  'linear-gradient(160deg,#000f08 0%,#001a12 50%,#000c08 100%)',
  'linear-gradient(160deg,#050010 0%,#10002a 50%,#030010 100%)',
];

function ShortVideoSlide({ post, onComment, globalMuted, onToggleMute, srcActive, onBecameActive }: {
  post:            LivePost;
  onComment:       (post: LivePost) => void;
  globalMuted:     boolean;
  onToggleMute:    () => void; // toggles global mute — unmutes on first tap, mutes on second
  srcActive:       boolean;   // true = this slide + next slide (load src)
  onBecameActive:  () => void; // called when slide scrolls into view
}) {
  const [liked,      setLiked]      = useState(post.user_liked);
  const [likeCount,  setLikeCount]  = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);
  const [shareToast, setShareToast] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── IntersectionObserver: play/pause, report active, DO NOT reset mute ───
  useEffect(() => {
    const el = slideRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const vid = videoRef.current;
        if (entry.isIntersecting) {
          onBecameActive();
          if (vid) {
            vid.muted = globalMuted;
            vid.play().catch(() => {/* autoplay blocked */});
          }
          setIsPlaying(true);
        } else {
          if (vid) vid.pause();
          setIsPlaying(false);
          setIsBuffering(false);
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync globalMuted → video element property ─────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted;
  }, [globalMuted]);

  // ── When src becomes active, reset error so video can retry ──────────────
  useEffect(() => {
    if (srcActive) setVideoError(false);
  }, [srcActive]);

  const extra     = (() => { try { return JSON.parse(post.extra_json || '{}') as Record<string, unknown>; } catch { return {} as Record<string, unknown>; } })();
  const videoUrl  = (extra['video_url']  as string) || '';
  const igHandle  = (extra['handle']     as string) || '';
  const igLikes   = (extra['likes']      as string) || '';
  const channel   = (extra['channel']    as string) || '';

  // ── Wired like / bookmark / share ────────────────────────────────────────
  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { ok: boolean; liked?: boolean };
      if (!data.ok) throw new Error();
      setLiked(data.liked ?? next);
    } catch {
      setLiked(!next);
      setLikeCount(c => next ? Math.max(0, c - 1) : c + 1);
    }
  };

  const toggleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      const res  = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST', credentials: 'include' });
      const data = await res.json() as { ok: boolean };
      if (!data.ok) throw new Error();
    } catch { setBookmarked(!next); }
  };

  const handleShare = async () => {
    const url = post.external_link || `${window.location.origin}/api/posts/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.ec_title || post.content.slice(0, 60), url }); } catch { /**/ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /**/ }
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2400);
    }
  };

  const authorName   = post.source === 'instagram' ? `@${igHandle || post.author_username}` : (channel || post.author_username);
  const displayTitle = post.ec_title || post.content;
  const bg           = SLIDE_GRADIENTS[(post.id?.charCodeAt?.(2) ?? 0) % SLIDE_GRADIENTS.length];
  const hasVideo     = !!videoUrl && !videoError;
  const hasFallback  = !!post.media_url;

  return (
    <div ref={slideRef} className="snap-start snap-always h-full w-full relative flex-shrink-0 overflow-hidden bg-black">

      {/* ── Deep-space gradient — always present as base / fallback layer ── */}
      <div className="absolute inset-0" style={{ background: bg }} />

      {/* ── Animated star-particle canvas — always rendered so screen is
           never blank even if every video CDN returns an error ── */}
      <StarCanvas
        active={srcActive || videoError}
        seed={Array.from(post.id || '').reduce((a, c) => a + c.charCodeAt(0), 0)}
      />

      {/* ── Native HTML5 video — lazy: src only attached when srcActive ── */}
      {hasVideo && (
        <video
          ref={videoRef}
          {...(srcActive ? { src: videoUrl } : {})}
          poster={post.media_url || undefined}
          autoPlay
          loop
          muted={globalMuted}
          playsInline
          onError={() => setVideoError(true)}
          onPlay={() => { setIsPlaying(true); setIsBuffering(false); }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => setIsBuffering(false)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
        />
      )}

      {/* ── Image fallback for non-video posts (Instagram / user posts) ── */}
      {!hasVideo && hasFallback && (
        <img
          src={post.media_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}

      {/* ── Gradient scrims — readability over video without hiding content ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.0) 42%, rgba(0,0,0,0.25) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2,
        background: 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 52%)' }} />

      {/* ── LOADING SPINNER — shows while buffering ── */}
      <AnimatePresence>
        {isBuffering && hasVideo && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 8 }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.85)',
              animation: 'cosmos-spin 0.75s linear infinite',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SOURCE / CHANNEL BADGE — top-left ── */}
      <div className="absolute top-4 left-4 flex items-center gap-2" style={{ zIndex: 10 }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.14)' }}>
          {/* Cosmos star badge */}
          <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 fill-violet-400">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span className="text-white text-[9px] font-bold tracking-widest uppercase">Cosmos</span>
        </div>
        {(channel || igHandle) && (
          <span className="text-white/70 text-[11px] font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>
            {channel || `@${igHandle}`}
          </span>
        )}
      </div>

      {/* ── MUTE TOGGLE — top-right (only shown when video is active) ── */}
      {(hasVideo || hasFallback) && (
        <motion.button
          onClick={onToggleMute}
          whileTap={{ scale: 0.86 }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ zIndex: 10, background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.18)' }}
          aria-label={globalMuted ? 'Unmute' : 'Mute'}
        >
          {globalMuted ? (
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-none stroke-white" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] fill-none stroke-white" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </motion.button>
      )}

      {/* ── TAP-TO-UNMUTE pill — appears after 1.2s, disappears when unmuted ── */}
      <AnimatePresence>
        {isPlaying && globalMuted && hasVideo && (
          <motion.button
            key="unmute-cta"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 1.2, duration: 0.3 } }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
            onClick={onToggleMute}
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{ zIndex: 10, bottom: '50%', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 36px rgba(0,0,0,0.5)' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-white/85" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
            <span className="text-white/90 text-[11.5px] font-medium tracking-wide">Tap to unmute</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── BOTTOM-LEFT: author + title ── */}
      <div className="absolute bottom-0 left-0" style={{ right: '86px', zIndex: 10 }}>
        <div className="px-5 pb-8 pt-28"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.0) 0%, transparent 100%)' }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden"
              style={{ border: '2px solid rgba(255,255,255,0.32)', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <img src={post.author_avatar} alt="" className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div>
              <p className="text-white font-semibold text-[13.5px] leading-tight"
                style={{ textShadow: '0 1px 10px rgba(0,0,0,1)' }}>{authorName}</p>
              {igLikes && <p className="text-white/50 text-[10.5px] mt-0.5">{igLikes} likes</p>}
            </div>
          </div>
          <p className="text-white/85 text-[13px] leading-snug line-clamp-3"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,1)' }}>{displayTitle}</p>
        </div>
      </div>

      {/* ── BOTTOM-RIGHT: action bar ── */}
      <div className="absolute bottom-8 right-3.5 flex flex-col items-center gap-5" style={{ zIndex: 10 }}>

        {/* Like */}
        <motion.button onClick={toggleLike} whileTap={{ scale: 0.84 }}
          className="flex flex-col items-center gap-1.5 cursor-pointer">
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: liked ? 'rgba(239,68,68,0.92)' : 'rgba(0,0,0,0.52)',
              backdropFilter: 'blur(22px)',
              border: `1px solid ${liked ? 'rgba(239,68,68,0.65)' : 'rgba(255,255,255,0.2)'}`,
              boxShadow: liked ? '0 0 28px rgba(239,68,68,0.52), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 4px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
            <svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${liked ? 'fill-white' : 'fill-none stroke-white'}`} strokeWidth={1.9}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <span className="text-white text-[11px] font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {likeCount > 0 ? fmt(likeCount) : '0'}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button onClick={() => onComment(post)} whileTap={{ scale: 0.84 }}
          className="flex flex-col items-center gap-1.5 cursor-pointer">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-none stroke-white" strokeWidth={1.9}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <span className="text-white text-[11px] font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {post.comment_count > 0 ? fmt(post.comment_count) : '0'}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button onClick={handleShare} whileTap={{ scale: 0.84 }}
          className="flex flex-col items-center gap-1.5 cursor-pointer relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(22px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-none stroke-white" strokeWidth={1.9}>
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
            </svg>
          </div>
          <span className="text-white text-[11px] font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>Share</span>
          <AnimatePresence>
            {shareToast && (
              <motion.span key="toast"
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[10px] px-2.5 py-1.5 rounded-xl whitespace-nowrap"
                style={{ background: 'rgba(10,10,25,0.95)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.35)', boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
                Copied!
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Save / Bookmark */}
        <motion.button onClick={toggleBookmark} whileTap={{ scale: 0.84 }}
          className="flex flex-col items-center gap-1.5 cursor-pointer">
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: bookmarked ? 'rgba(139,92,246,0.92)' : 'rgba(0,0,0,0.52)',
              backdropFilter: 'blur(22px)',
              border: `1px solid ${bookmarked ? 'rgba(139,92,246,0.65)' : 'rgba(255,255,255,0.2)'}`,
              boxShadow: bookmarked ? '0 0 28px rgba(139,92,246,0.52), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 4px 22px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
            <svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] transition-all duration-200 ${bookmarked ? 'fill-white' : 'fill-none stroke-white'}`} strokeWidth={1.9}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
          </div>
          <span className="text-white text-[11px] font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>Save</span>
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHORTS TAB — full-screen vertical reel from real short-video posts
// Virtualized: only active ± 1 slides are fully mounted; all others are
// lightweight placeholder divs that preserve scroll height without any GPU cost.
// ─────────────────────────────────────────────────────────────────────────────
function ShortsTab({ posts, loading, onComment }: {
  posts:     LivePost[];
  loading:   boolean;
  onComment: (post: LivePost) => void;
}) {
  const shorts = posts.filter(p => p.type === 'short-video');

  // ── Global mute state — persists across slides once user unmutes ──────────
  const [globalMuted,  setGlobalMuted]  = useState(true);
  // ── Active index — primary source of truth for virtualization ────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleMute = useCallback(() => setGlobalMuted(m => !m), []);

  // ── Scroll-based active index tracking (passive, 60fps-safe) ─────────────
  // Uses scrollTop / clientHeight instead of IntersectionObserver so
  // virtualized placeholder divs can also advance the index.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const slideH = container.clientHeight;
        if (slideH <= 0) return;
        const idx = Math.round(container.scrollTop / slideH);
        setActiveIndex(prev => {
          const clamped = Math.max(0, Math.min(idx, shorts.length - 1));
          return prev === clamped ? prev : clamped;
        });
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [shorts.length]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
          <p className="text-white/30 text-[13px]">Loading shorts…</p>
        </div>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">⚡</p>
          <p className="text-white/50 text-[15px] font-medium mb-1">No shorts yet</p>
          <p className="text-white/25 text-[12px]">Short videos will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', scrollBehavior: 'auto' }}
    >
      {shorts.map((post, idx) => {
        // ── Virtualization: only mount heavy slide within ±1 of active ──────
        // Every other position gets a zero-cost placeholder that keeps
        // the scroll height correct for snap-scroll to work.
        const isNear = Math.abs(idx - activeIndex) <= 1;
        if (!isNear) {
          return (
            <div
              key={post.id}
              className="snap-start snap-always h-full w-full flex-shrink-0 bg-black"
            />
          );
        }
        return (
          <ShortVideoSlide
            key={post.id}
            post={post}
            onComment={onComment}
            globalMuted={globalMuted}
            onToggleMute={handleToggleMute}
            // Preload src only for active + immediately next slide
            srcActive={idx >= activeIndex && idx <= activeIndex + 1}
            // IntersectionObserver inside slide acts as secondary confirmation
            onBecameActive={() => setActiveIndex(idx)}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME TAB — live feed from API with infinite scroll
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ posts, loading, error, lm, onComment, onRefresh }: {
  posts:     LivePost[];
  loading:   boolean;
  error:     string;
  lm?:       boolean;
  onComment: (post: LivePost) => void;
  onRefresh: () => void;
}) {
  const [displayCount, setDisplayCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset display count when posts change
  useEffect(() => { setDisplayCount(20); }, [posts.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setDisplayCount(c => c + 20); },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Feed is all posts except short-videos (those live in Shorts tab)
  const feedPosts = posts.filter(p => p.type !== 'short-video');
  const visible   = feedPosts.slice(0, displayCount);
  const hasMore   = displayCount < feedPosts.length;

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
            <button onClick={onRefresh} className="mt-3 px-4 py-2 rounded-xl border text-[12px] transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && feedPosts.length === 0 && (
          <div className={`py-14 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-3xl mb-3">🌌</p>
            <p className="text-[14px] font-medium mb-1">No posts yet</p>
            <p className="text-[12px]">Be the first to share a discovery.</p>
          </div>
        )}

        {/* Live posts — external content gets specialized cards, user posts get LiveFeedCard */}
        {!loading && visible.map(post => (
          post.source
            ? <CosmicFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
            : <LiveFeedCard   key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
        ))}

        {/* Infinite scroll sentinel */}
        {!loading && hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <div className={`w-6 h-6 rounded-full border-2 animate-spin ${lm ? 'border-gray-200 border-t-purple-400' : 'border-white/[0.08] border-t-purple-500/60'}`} />
          </div>
        )}

        {/* End of feed */}
        {!loading && !hasMore && feedPosts.length > 0 && (
          <div className={`py-6 text-center text-[11px] font-mono tracking-widest uppercase ${lm ? 'text-gray-300' : 'text-white/15'}`}>
            · · · end of feed · · ·
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH TAB — filters posts or searches users by username
// ─────────────────────────────────────────────────────────────────────────────
function SearchTab({ posts, loading, lm, onComment, onRefresh, onViewUser }: {
  posts:       LivePost[];
  loading:     boolean;
  lm?:         boolean;
  onComment:   (post: LivePost) => void;
  onRefresh:   () => void;
  onViewUser:  (u: SearchedUser) => void;
}) {
  const [q,            setQ]            = useState('');
  const [active,       setActive]       = useState<SearchFilter>('all');
  const [displayCount, setDisplayCount] = useState(20);
  const [userResults,  setUserResults]  = useState<SearchedUser[]>([]);
  const [userLoading,  setUserLoading]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // User search via Supabase
  const searchUsers = useCallback(async (query: string) => {
    setUserLoading(true);
    setUserResults([]);
    try {
      let req = supabase.from('profiles').select('id, username, avatar, email');
      if (query.trim()) {
        req = req.ilike('username', `%${query.trim()}%`);
      }
      const { data } = await req.order('username').limit(40);
      setUserResults((data ?? []) as SearchedUser[]);
    } catch { /* ignore */ } finally {
      setUserLoading(false);
    }
  }, []);

  // Trigger user search whenever query changes (debounced) or filter switches to 'users'
  useEffect(() => {
    if (active !== 'users') return;
    const t = setTimeout(() => void searchUsers(q), 350);
    return () => clearTimeout(t);
  }, [q, active, searchUsers]);

  // Immediately run search when tab switches to 'users'
  useEffect(() => {
    if (active === 'users') void searchUsers(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const filtered = posts.filter(p => {
    const matchKind = active === 'all' || active === 'users' || p.type === (active as FeedKind);
    const lower     = q.toLowerCase();
    const matchQ    = !q.trim()
      || p.content.toLowerCase().includes(lower)
      || p.author_username.toLowerCase().includes(lower)
      || (p.ec_title ?? '').toLowerCase().includes(lower)
      || (p.source ?? '').toLowerCase().includes(lower);
    return matchKind && matchQ;
  });

  // Reset display count when filter/query changes
  useEffect(() => { setDisplayCount(20); }, [q, active]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setDisplayCount(c => c + 20); },
      { rootMargin: '300px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const visible = filtered.slice(0, displayCount);
  const hasMore = displayCount < filtered.length;

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Sticky controls */}
      <div className={`px-4 pt-4 pb-3 border-b ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${lm ? 'bg-white border-gray-200 shadow-sm focus-within:border-gray-300' : 'bg-white/[0.06] border-white/[0.10] focus-within:border-white/[0.22] focus-within:bg-white/[0.09]'}`}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={active === 'users' ? 'Search by username…' : 'Search the cosmos…'}
             className={`flex-1 bg-transparent outline-none focus:outline-none focus:ring-0 text-[14px] ${lm ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/25'}`} />
          {q && (
            <button onClick={() => setQ('')} className={`text-[18px] leading-none ${lm ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white/60'}`}>×</button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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

      {/* ── User search results ── */}
      {active === 'users' && (
        <div className="flex flex-col gap-2 p-4 pb-6">
          {userLoading && (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border animate-pulse ${lm ? 'bg-white border-gray-100' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                  <div className={`w-11 h-11 rounded-full flex-shrink-0 ${lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-3 rounded-full w-2/5 ${lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`} />
                    <div className={`h-2.5 rounded-full w-1/4 ${lm ? 'bg-gray-50' : 'bg-white/[0.04]'}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!userLoading && userResults.length === 0 && (
            <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">👥</p>
              <p className="text-[14px]">{q ? 'No users found — try a different name.' : 'Search for people in the cosmos.'}</p>
            </div>
          )}

          {!userLoading && userResults.map(u => (
            <motion.button
              key={u.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewUser(u)}
              className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${lm ? 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-sm' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.14]'}`}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[15px]">
                {u.avatar ? (
                  <img src={u.avatar} alt={u.username} className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold truncate ${lm ? 'text-gray-900' : 'text-white'}`}>{u.username}</p>
                <p className={`text-[11.5px] truncate ${lm ? 'text-gray-400' : 'text-white/35'}`}>@{u.username.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
              <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 ${lm ? 'stroke-gray-300' : 'stroke-white/20'}`} fill="none" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </motion.button>
          ))}
        </div>
      )}

      {/* ── Post results ── */}
      {active !== 'users' && (
        <div className="flex flex-col gap-3 p-4 pb-6">
          {loading && [1, 2, 3].map(i => <PostSkeleton key={i} lm={lm} />)}

          {!loading && filtered.length === 0 ? (
            <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">🔭</p>
              <p className="text-[14px]">{q || active !== 'all' ? 'Nothing matched — try a different search or filter.' : 'No posts yet in the cosmos.'}</p>
            </div>
          ) : (
            visible.map(post =>
              post.source
                ? <CosmicFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
                : <LiveFeedCard   key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={onRefresh} />
            )
          )}

          {/* Infinite scroll sentinel */}
          {!loading && hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <div className={`w-6 h-6 rounded-full border-2 animate-spin ${lm ? 'border-gray-200 border-t-purple-400' : 'border-white/[0.08] border-t-purple-500/60'}`} />
            </div>
          )}

          {/* End of results */}
          {!loading && !hasMore && filtered.length > 5 && (
            <div className={`py-6 text-center text-[11px] font-mono tracking-widest uppercase ${lm ? 'text-gray-300' : 'text-white/15'}`}>
              · · · {filtered.length} results · · ·
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE MODAL — view another user's profile with follow + message
// ─────────────────────────────────────────────────────────────────────────────
function UserProfileModal({ target, lm, onClose, onMessage }: {
  target:    SearchedUser;
  lm?:       boolean;
  onClose:   () => void;
  onMessage: (u: SearchedUser) => void;
}) {
  const { user } = useAuthStore();
  const [following,  setFollowing]  = useState(false);
  const [followers,  setFollowers]  = useState(0);
  const [following2, setFollowing2] = useState(0);  // how many they follow
  const [fLoading,   setFLoading]   = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch follower/following counts + whether current user already follows them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      const [followerRes, followingRes, myFollowRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', target.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', target.id),
        user
          ? supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id).eq('following_id', target.id)
          : Promise.resolve({ count: 0 }),
      ]);
      if (!cancelled) {
        setFollowers(followerRes.count ?? 0);
        setFollowing2(followingRes.count ?? 0);
        setFollowing((myFollowRes.count ?? 0) > 0);
        setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target.id, user]);

  const toggleFollow = async () => {
    if (!user || fLoading) return;
    setFLoading(true);
    const next = !following;
    setFollowing(next);
    setFollowers(c => next ? c + 1 : Math.max(0, c - 1));
    try {
      if (next) {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: target.id });
      } else {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target.id);
      }
    } catch {
      // Revert on error
      setFollowing(!next);
      setFollowers(c => next ? Math.max(0, c - 1) : c + 1);
    } finally {
      setFLoading(false);
    }
  };

  const isOwnProfile = user?.id === target.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col overflow-hidden ${lm ? 'bg-white' : 'bg-[#0e0e1c]'}`}
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`w-10 h-1 rounded-full ${lm ? 'bg-gray-200' : 'bg-white/15'}`} />
        </div>

        {/* Close button */}
        <button onClick={onClose} className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${lm ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-white/[0.08] text-white/50 hover:bg-white/[0.14]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Profile header */}
          <div className={`px-5 pt-4 pb-5 border-b ${lm ? 'border-gray-100' : 'border-white/[0.06]'}`}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[28px]"
                style={{ border: '3px solid rgba(139,92,246,0.5)', boxShadow: '0 0 24px rgba(139,92,246,0.2)' }}>
                {target.avatar ? (
                  <img src={target.avatar} alt={target.username} className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                ) : (target.username[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-[20px] font-bold leading-tight mb-0.5 ${lm ? 'text-gray-900' : 'text-white'}`}>{target.username}</h2>
                <p className={`text-[12px] mb-3 ${lm ? 'text-gray-400' : 'text-white/40'}`}>@{target.username.toLowerCase().replace(/\s+/g, '')}</p>
                {statsLoading ? (
                  <div className="flex gap-5">
                    {[0, 1].map(i => <div key={i} className={`h-7 w-16 rounded-lg animate-pulse ${lm ? 'bg-gray-100' : 'bg-white/[0.06]'}`} />)}
                  </div>
                ) : (
                  <div className="flex items-center gap-5">
                    {[
                      { label: 'Followers', value: followers },
                      { label: 'Following', value: following2 },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col items-center">
                        <span className={`text-[16px] font-bold leading-none ${lm ? 'text-gray-900' : 'text-white'}`}>{s.value}</span>
                        <span className={`text-[10px] uppercase tracking-[0.14em] font-mono mt-0.5 ${lm ? 'text-gray-400' : 'text-white/35'}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {!isOwnProfile && (
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => void toggleFollow()}
                  disabled={fLoading || statsLoading}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                    following
                      ? lm ? 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-white/[0.08] text-white/70 border border-white/[0.12] hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25'
                      : lm ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100' : 'text-white'
                  }`}
                  style={!following && !lm ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.55), rgba(109,40,217,0.6))', border: '1px solid rgba(139,92,246,0.4)' } : undefined}
                >
                  {fLoading ? '…' : following ? 'Following' : '+ Follow'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { onClose(); onMessage(target); }}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all flex items-center justify-center gap-2 ${lm ? 'border-gray-200 text-gray-700 hover:bg-gray-50' : 'border-white/[0.12] text-white/70 hover:bg-white/[0.06]'}`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Message
                </motion.button>
              </div>
            )}
          </div>

          {/* Empty state for posts (would need API call to load their posts; out of scope) */}
          <div className={`py-14 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-3xl mb-3">🌌</p>
            <p className="text-[13px]">Explore their cosmic journey.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT MESSAGE MODAL — real-time DM chat via Supabase
// ─────────────────────────────────────────────────────────────────────────────
function DirectMessageModal({ peer, lm, onClose }: {
  peer:    SearchedUser;
  lm?:     boolean;
  onClose: () => void;
}) {
  const { user } = useAuthStore();
  const [msgs,    setMsgs]    = useState<DirectMessage[]>([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Fetch conversation history
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${peer.id}),` +
        `and(sender_id.eq.${peer.id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .limit(200);
    setMsgs((data ?? []) as DirectMessage[]);
    setLoading(false);

    // Mark unread messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', peer.id)
      .eq('read', false);
  }, [user, peer.id]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Real-time subscription via Supabase Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-${[user.id, peer.id].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new as DirectMessage;
          if (m.sender_id === peer.id) {
            setMsgs(prev => [...prev, m]);
            // Mark it read immediately
            void supabase.from('messages').update({ read: true }).eq('id', m.id);
          }
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, peer.id]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setInput('');
    setSending(true);
    const optimistic: DirectMessage = {
      id:          `opt-${Date.now()}`,
      sender_id:   user.id,
      receiver_id: peer.id,
      content:     text,
      created_at:  new Date().toISOString(),
      read:        false,
    };
    setMsgs(prev => [...prev, optimistic]);
    try {
      const { data } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, receiver_id: peer.id, content: text })
        .select()
        .single();
      if (data) {
        // Replace optimistic with real
        setMsgs(prev => prev.map(m => m.id === optimistic.id ? (data as DirectMessage) : m));
      }
    } catch {
      // Remove optimistic on failure
      setMsgs(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 320 }}
      className={`fixed inset-0 z-[200] flex flex-col ${lm ? 'bg-gray-50' : 'bg-[#080810]'}`}
    >
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center gap-3 px-4 h-14 border-b ${lm ? 'bg-white border-gray-100' : 'bg-[#0e0e1c] border-white/[0.06]'}`}>
        <button onClick={onClose} className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-mono transition-colors ${lm ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[14px]">
          {peer.avatar ? (
            <img src={peer.avatar} alt={peer.username} className="w-full h-full object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; }} />
          ) : (peer.username[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold leading-tight truncate ${lm ? 'text-gray-900' : 'text-white'}`}>{peer.username}</p>
          <p className={`text-[11px] ${lm ? 'text-gray-400' : 'text-white/35'}`}>@{peer.username.toLowerCase().replace(/\s+/g, '')}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {loading && (
          <div className="flex justify-center pt-12">
            <div className={`w-6 h-6 rounded-full border-2 animate-spin ${lm ? 'border-gray-200 border-t-purple-400' : 'border-white/[0.08] border-t-purple-500/60'}`} />
          </div>
        )}

        {!loading && msgs.length === 0 && (
          <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            <p className="text-4xl mb-3">💬</p>
            <p className="text-[14px] font-medium mb-1">No messages yet</p>
            <p className="text-[12px]">Start the conversation with {peer.username}.</p>
          </div>
        )}

        {msgs.map(msg => {
          const isMe = msg.sender_id === user?.id;
          const t = new Date(msg.created_at);
          const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-0.5 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                  {peer.avatar
                    ? <img src={peer.avatar} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : (peer.username[0] ?? '?').toUpperCase()}
                </div>
              )}
              <div className="flex flex-col gap-0.5" style={{ maxWidth: '72%' }}>
                <div className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                  isMe
                    ? lm ? 'bg-purple-600 text-white rounded-br-sm' : 'text-white rounded-br-sm'
                    : lm ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm' : 'bg-white/[0.08] border border-white/[0.08] text-white/85 rounded-bl-sm'
                }`}
                  style={isMe && !lm
                    ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.88),rgba(91,33,182,0.92))', border: '1px solid rgba(139,92,246,0.4)' }
                    : undefined}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] ${isMe ? 'text-right' : 'text-left'} ${lm ? 'text-gray-300' : 'text-white/20'}`}>{timeStr}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`flex-shrink-0 px-4 py-3 border-t flex gap-2 items-end ${lm ? 'bg-white border-gray-100' : 'bg-[#0e0e1c] border-white/[0.05]'}`}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
          placeholder={`Message ${peer.username}…`}
          rows={1}
          style={{ resize: 'none' }}
          className={`flex-1 px-3.5 py-2.5 rounded-2xl border text-[13px] leading-relaxed outline-none transition-all ${
            lm
               ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-gray-50'
               : 'bg-white/[0.06] border-white/[0.09] text-white placeholder-white/25 focus:border-white/[0.22] focus:bg-white/[0.08]'
          }`}
        />
        <motion.button
          onClick={() => void sendMessage()}
          disabled={!input.trim() || sending}
          whileTap={input.trim() && !sending ? { scale: 0.92 } : {}}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
            !input.trim() || sending
              ? lm ? 'bg-gray-100 text-gray-300' : 'bg-white/[0.04] text-white/20'
              : lm ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-white'
          }`}
          style={input.trim() && !sending && !lm
            ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.85),rgba(91,33,182,0.9))', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 4px 16px rgba(91,33,182,0.35)' }
            : undefined}
        >
          {sending
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'cosmos-spin 0.7s linear infinite' }} />
            : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT TAB — functional AI chat powered by Groq via /api/chat
// ─────────────────────────────────────────────────────────────────────────────
function ChatTab({ lm }: { lm?: boolean }) {
  interface ChatMsg { role: 'user' | 'assistant'; content: string; id: string; }

  const [messages, setMessages] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: "Hello! I'm your Cosmic AI Assistant — powered by Groq. Ask me anything about space, astrophysics, quantum mechanics, or any science topic! 🚀🌌",
    id: 'welcome',
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { role: 'user', content: text, id: String(Date.now()) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build Gemini-style history from current messages (excluding the new one)
      const history = messages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch('/api/chat', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    text,
          history,
          avatarName: 'Cosmic AI',
          language:   'English',
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: data.reply ?? (data.error ? `⚠️ ${data.error}` : 'Sorry, I had trouble responding. Please try again.'),
        id:      String(Date.now() + 1),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: '⚠️ Network error — please check your connection and try again.',
        id:      String(Date.now() + 1),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b flex items-center gap-3 ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${lm ? 'bg-purple-100' : 'bg-purple-500/20'}`}>🤖</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={`text-[15px] font-semibold leading-tight ${lm ? 'text-gray-900' : 'text-white'}`}>Cosmic AI Assistant</h2>
            <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-full ${lm ? 'bg-purple-100 text-purple-600' : 'bg-purple-500/20 text-purple-300'}`}>AI</span>
          </div>
          <p className={`text-[11px] ${lm ? 'text-emerald-600' : 'text-emerald-400'}`}>● Online · Powered by Groq llama-3.3-70b</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.role === 'assistant' && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-0.5 ${lm ? 'bg-purple-100' : 'bg-purple-500/20'}`}>🤖</div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? lm
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'text-white rounded-br-sm'
                  : lm
                    ? 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                    : 'bg-white/[0.07] border border-white/[0.08] text-white/85 rounded-bl-sm'
              }`}
              style={msg.role === 'user' && !lm
                ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.88),rgba(91,33,182,0.92))', border: '1px solid rgba(139,92,246,0.4)' }
                : undefined}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-0.5 ${lm ? 'bg-purple-100' : 'bg-purple-500/20'}`}>🤖</div>
            <div className={`px-4 py-3 rounded-2xl rounded-bl-sm ${lm ? 'bg-white border border-gray-100 shadow-sm' : 'bg-white/[0.07] border border-white/[0.08]'}`}>
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i}
                    className={`w-1.5 h-1.5 rounded-full ${lm ? 'bg-purple-300' : 'bg-purple-400/60'}`}
                    style={{ animation: `bounce-dot 0.6s ease-in-out ${i * 0.15}s infinite alternate` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`flex-shrink-0 px-4 py-3 border-t flex gap-2 items-end ${lm ? 'bg-white border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask about space, physics, astronomy…"
          rows={1}
          style={{ resize: 'none' }}
          className={`flex-1 px-3.5 py-2.5 rounded-2xl border text-[13px] leading-relaxed outline-none transition-all ${
            lm
              ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-gray-50'
              : 'bg-white/[0.06] border-white/[0.09] text-white placeholder-white/25 focus:border-white/[0.22] focus:bg-white/[0.08]'
          }`}
        />
        <motion.button
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          whileTap={input.trim() && !loading ? { scale: 0.92 } : {}}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
            !input.trim() || loading
              ? lm ? 'bg-gray-100 text-gray-300' : 'bg-white/[0.04] text-white/20'
              : lm ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-white'
          }`}
          style={input.trim() && !loading && !lm
            ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.85),rgba(91,33,182,0.9))', border: '1px solid rgba(139,92,246,0.45)', boxShadow: '0 4px 16px rgba(91,33,182,0.35)' }
            : undefined}
        >
          {loading
            ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', animation: 'cosmos-spin 0.7s linear infinite' }} />
            : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          }
        </motion.button>
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
  const [likedPosts,    setLikedPosts]    = useState<LivePost[]>([]);
  const [savedPosts,    setSavedPosts]    = useState<LivePost[]>([]);
  const [likedLoading,  setLikedLoading]  = useState(false);
  const [savedLoading,  setSavedLoading]  = useState(false);
  const [likedFetched,  setLikedFetched]  = useState(false);
  const [savedFetched,  setSavedFetched]  = useState(false);

  const fetchLiked = useCallback(async () => {
    setLikedLoading(true);
    try {
      const res  = await fetch('/api/users/me/likes', { credentials: 'include' });
      const data = await res.json() as { ok: boolean; posts?: LivePost[] };
      if (data.ok && data.posts) setLikedPosts(data.posts);
    } catch { /* ignore */ } finally {
      setLikedLoading(false);
      setLikedFetched(true);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res  = await fetch('/api/users/me/bookmarks', { credentials: 'include' });
      const data = await res.json() as { ok: boolean; posts?: LivePost[] };
      if (data.ok && data.posts) setSavedPosts(data.posts);
    } catch { /* ignore */ } finally {
      setSavedLoading(false);
      setSavedFetched(true);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'liked' && !likedFetched) void fetchLiked();
    if (activeSection === 'saved' && !savedFetched) void fetchSaved();
  }, [activeSection, likedFetched, savedFetched, fetchLiked, fetchSaved]);

  const myPosts = posts.filter(p => p.user_id === user?.id);

  const [followerCount,  setFollowerCount]  = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [fR, fG] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]);
      if (!cancelled) {
        setFollowerCount(fR.count ?? 0);
        setFollowingCount(fG.count ?? 0);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const stats = [
    { label: 'Posts',     value: loading ? '…' : String(myPosts.length) },
    { label: 'Followers', value: followerCount === null ? '…' : String(followerCount) },
    { label: 'Following', value: followingCount === null ? '…' : String(followingCount) },
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

      {/* ── Liked Tab ── */}
      {activeSection === 'liked' && (
        <div className="flex flex-col gap-3 p-4 pb-6">
          {likedLoading && [1, 2].map(i => <PostSkeleton key={i} lm={lm} />)}
          {!likedLoading && likedPosts.length === 0 && (
            <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">♥</p>
              <p className="text-[14px] font-medium mb-1">No liked posts yet</p>
              <p className="text-[12px]">Posts you like will appear here.</p>
            </div>
          )}
          {!likedLoading && likedPosts.map(post => (
            <LiveFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={() => { void fetchLiked(); onRefresh(); }} />
          ))}
        </div>
      )}

      {/* ── Saved Tab ── */}
      {activeSection === 'saved' && (
        <div className="flex flex-col gap-3 p-4 pb-6">
          {savedLoading && [1, 2].map(i => <PostSkeleton key={i} lm={lm} />)}
          {!savedLoading && savedPosts.length === 0 && (
            <div className={`py-16 text-center ${lm ? 'text-gray-400' : 'text-white/30'}`}>
              <p className="text-3xl mb-3">🔖</p>
              <p className="text-[14px] font-medium mb-1">No saved posts yet</p>
              <p className="text-[12px]">Bookmark posts to find them here.</p>
            </div>
          )}
          {!savedLoading && savedPosts.map(post => (
            <LiveFeedCard key={post.id} post={post} lm={lm} onComment={onComment} onRefresh={() => { void fetchSaved(); onRefresh(); }} />
          ))}
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

function CosmicNexus({ onClose, lm }: { onClose: () => void; lm?: boolean }) {
  const [activeTab,      setActiveTab]      = useState<Tab>('home');
  const [direction,      setDirection]      = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentingPost, setCommentingPost] = useState<LivePost | null>(null);
  const [viewingUser,    setViewingUser]    = useState<SearchedUser | null>(null);
  const [messagingUser,  setMessagingUser]  = useState<SearchedUser | null>(null);

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
              {activeTab === 'shorts'  && <ShortsTab  posts={posts} loading={postsLoading} onComment={handleComment} />}
              {activeTab === 'home'    && <HomeTab    posts={posts} loading={postsLoading} error={postsError} lm={lm} onComment={handleComment} onRefresh={fetchPosts} />}
              {activeTab === 'search'  && <SearchTab  posts={posts} loading={postsLoading} lm={lm} onComment={handleComment} onRefresh={fetchPosts} onViewUser={u => setViewingUser(u)} />}
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

      <AnimatePresence>
        {viewingUser && (
          <UserProfileModal
            key={`profile-${viewingUser.id}`}
            target={viewingUser}
            lm={lm}
            onClose={() => setViewingUser(null)}
            onMessage={u => { setViewingUser(null); setMessagingUser(u); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {messagingUser && (
          <DirectMessageModal
            key={`dm-${messagingUser.id}`}
            peer={messagingUser}
            lm={lm}
            onClose={() => setMessagingUser(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(CosmicNexus);
