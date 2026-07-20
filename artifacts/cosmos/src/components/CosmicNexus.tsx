import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'shorts' | 'home' | 'search' | 'chat' | 'profile';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const SHORTS = [
  { id: 1, title: 'Quantum Entanglement Explained',        sub: 'Quantum Physics',   gradient: 'from-violet-900 via-indigo-900 to-blue-900',   emoji: '⚛️', views: '2.4M', likes: '182K' },
  { id: 2, title: "Inside a Black Hole's Event Horizon",   sub: 'Astrophysics',      gradient: 'from-gray-900 via-black to-purple-900',         emoji: '🕳️', views: '5.1M', likes: '430K' },
  { id: 3, title: 'How Dark Matter Shapes the Universe',   sub: 'Cosmology',         gradient: 'from-blue-900 via-cyan-900 to-teal-900',        emoji: '🌌', views: '3.8M', likes: '297K' },
  { id: 4, title: 'CRISPR: Editing the Code of Life',      sub: 'Biology',           gradient: 'from-emerald-900 via-green-900 to-lime-900',    emoji: '🧬', views: '1.9M', likes: '154K' },
  { id: 5, title: 'The Speed of Light Is Really Weird',    sub: 'Special Relativity',gradient: 'from-orange-900 via-red-900 to-pink-900',       emoji: '💫', views: '7.2M', likes: '612K' },
  { id: 6, title: 'Neutron Stars: Ultra-Dense Matter',     sub: 'Stellar Physics',   gradient: 'from-slate-900 via-blue-900 to-indigo-900',     emoji: '✨', views: '2.1M', likes: '178K' },
];

interface FeedPost {
  id: number; kind: 'nasa' | 'wiki' | 'user';
  author: string; handle: string; avatarEmoji: string; time: string;
  title?: string; body: string; imageUrl?: string;
  likes: number; comments: number; shares: number;
}

const FEED: FeedPost[] = [
  { id: 1, kind: 'nasa',  author: 'NASA Astronomy',   handle: '@nasa',         avatarEmoji: '🔭', time: '2h',
    title: 'Webb Captures a Star-Forming Pillar',
    body:  'The James Webb Space Telescope reveals unprecedented detail inside the Carina Nebula — star-forming pillars stretching light-years high.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/NGC_6302_Butterfly_nebula.jpg/400px-NGC_6302_Butterfly_nebula.jpg',
    likes: 14200, comments: 892, shares: 3401 },
  { id: 2, kind: 'user',  author: 'Dr. Elena Vasquez',handle: '@evasquez',     avatarEmoji: '👩‍🔬', time: '4h',
    body: 'Just finished peer-reviewing a groundbreaking paper on gravitational wave detection using quantum sensors. The future of observational astronomy is going to be absolutely wild. 🌊',
    likes: 2847, comments: 134, shares: 289 },
  { id: 3, kind: 'wiki',  author: 'Wikipedia Science', handle: '@wikipedia',   avatarEmoji: '📖', time: '6h',
    title: 'Quantum Chromodynamics',
    body: 'QCD is the theory of the strong interaction between quarks mediated by gluons — a non-abelian gauge theory with the gauge group SU(3).',
    likes: 5620, comments: 217, shares: 1834 },
  { id: 4, kind: 'nasa',  author: 'Mars Perseverance', handle: '@nasapersev',  avatarEmoji: '🚀', time: '8h',
    title: 'Organic Molecules Found in Jezero Crater',
    body: "NASA's Perseverance rover confirms organic molecules in ancient lake sediments, strengthening the case for ancient microbial life on Mars.",
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/400px-OSIRIS_Mars_true_color.jpg',
    likes: 22100, comments: 1456, shares: 8790 },
  { id: 5, kind: 'user',  author: 'Prof. Kenji Nakamura',handle: '@kenjinaka', avatarEmoji: '👨‍💻', time: '10h',
    body: 'New preprint on quantum error correction using topological qubits. We achieved 99.7% gate fidelity over 1,000 operations. Link in bio. 🎯',
    likes: 9340, comments: 445, shares: 2100 },
  { id: 6, kind: 'wiki',  author: 'Wikipedia Science', handle: '@wikipedia',   avatarEmoji: '📖', time: '12h',
    title: 'Dark Energy',
    body: 'Dark energy is an unknown form of energy that dominates the universe. First evidenced by Type Ia supernova measurements in 1998, it accounts for ~68% of total energy.',
    likes: 7830, comments: 362, shares: 2140 },
];

const TOPICS = [
  { label: 'Quantum Physics',  emoji: '⚛️', from: 'from-violet-500/20', border: 'border-violet-500/40' },
  { label: 'Black Holes',      emoji: '🕳️', from: 'from-purple-900/30', border: 'border-purple-500/40' },
  { label: 'Dark Matter',      emoji: '🌑', from: 'from-blue-900/30',   border: 'border-blue-500/40' },
  { label: 'Exoplanets',       emoji: '🪐', from: 'from-orange-500/20', border: 'border-orange-400/40' },
  { label: 'CRISPR',           emoji: '🧬', from: 'from-emerald-500/20',border: 'border-emerald-400/40' },
  { label: 'Relativity',       emoji: '💡', from: 'from-yellow-500/20', border: 'border-yellow-400/40' },
  { label: 'Neuroscience',     emoji: '🧠', from: 'from-pink-500/20',   border: 'border-pink-400/40' },
  { label: 'String Theory',    emoji: '🔮', from: 'from-cyan-500/20',   border: 'border-cyan-400/40' },
  { label: 'Astrobiology',     emoji: '🦠', from: 'from-lime-500/20',   border: 'border-lime-400/40' },
  { label: 'Cosmology',        emoji: '🌌', from: 'from-indigo-500/20', border: 'border-indigo-400/40' },
];

const VIDEO_THUMBS = [
  { id: 1, title: 'Hawking Radiation Explained',         channel: 'Cosmos Lab',  gradient: 'from-slate-800 to-purple-900',   views: '1.2M' },
  { id: 2, title: 'How Fast Is the Universe Expanding?', channel: 'PBS Space Time',gradient:'from-blue-800 to-indigo-900',    views: '3.4M' },
  { id: 3, title: 'What Is Spacetime Made Of?',          channel: 'PBS Nova',    gradient: 'from-emerald-800 to-teal-900',   views: '892K' },
  { id: 4, title: 'The Fermi Paradox: Where Are Aliens?',channel: 'Kurzgesagt',  gradient: 'from-orange-800 to-red-900',     views: '22M'  },
];

interface ChatConvo { id: number; name: string; emoji: string; lastMsg: string; time: string; unread: number; online: boolean; isBot: boolean; }
const CHATS: ChatConvo[] = [
  { id: 1, name: 'Dr. Amara Chen',        emoji: '👩‍🔬', lastMsg: 'Did you read the paper on quantum teleportation?', time: '2m',  unread: 3,  online: true,  isBot: false },
  { id: 2, name: 'Cosmos AI',             emoji: '🤖', lastMsg: 'I can help you understand any concept in science...',time: '15m', unread: 0,  online: true,  isBot: true  },
  { id: 3, name: 'Prof. Rivera',          emoji: '👨‍🏫', lastMsg: 'Great observation about the dark energy flux!',    time: '1h',  unread: 1,  online: false, isBot: false },
  { id: 4, name: 'Stellara Bot',          emoji: '⭐', lastMsg: 'New supernova detected in NGC 4526 galaxy!',         time: '2h',  unread: 2,  online: true,  isBot: true  },
  { id: 5, name: 'Kenji Nakamura',        emoji: '👨‍💻', lastMsg: 'See you at the symposium next week 🚀',            time: '3h',  unread: 0,  online: false, isBot: false },
  { id: 6, name: 'Quantum Research Group',emoji: '🔬', lastMsg: 'Meeting rescheduled to Thursday at 14:00 UTC',       time: '5h',  unread: 0,  online: false, isBot: false },
  { id: 7, name: 'ArXiv Feed Bot',        emoji: '📄', lastMsg: '12 new papers matching your interests found',        time: '8h',  unread: 12, online: true,  isBot: true  },
];

const PROFILE_POSTS = [
  { id: 1, gradient: 'from-violet-700 to-indigo-800',   emoji: '⚛️', likes: 284  },
  { id: 2, gradient: 'from-blue-700 to-cyan-800',       emoji: '🌊', likes: 1200 },
  { id: 3, gradient: 'from-emerald-700 to-teal-800',    emoji: '🧬', likes: 540  },
  { id: 4, gradient: 'from-orange-700 to-red-800',      emoji: '🔥', likes: 892  },
  { id: 5, gradient: 'from-slate-700 to-gray-900',      emoji: '🕳️', likes: 3400 },
  { id: 6, gradient: 'from-pink-700 to-rose-800',       emoji: '💫', likes: 678  },
  { id: 7, gradient: 'from-yellow-700 to-amber-800',    emoji: '⭐', likes: 431  },
  { id: 8, gradient: 'from-cyan-700 to-blue-800',       emoji: '🌌', likes: 1890 },
  { id: 9, gradient: 'from-purple-700 to-violet-800',   emoji: '🔮', likes: 756  },
];

// ─── Tab motion variants ──────────────────────────────────────────────────────
const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '25%' : '-25%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? '-25%' : '25%', opacity: 0 }),
};
const tabTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

// ─────────────────────────────────────────────────────────────────────────────
// SHORTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ShortsTab({ lm }: { lm?: boolean }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = (id: number) => setLiked(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {SHORTS.map(s => (
        <div key={s.id} className="snap-start snap-always h-full relative flex-shrink-0 overflow-hidden">
          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />

          {/* Subtle noise overlay */}
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

          {/* Center emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="text-[100px] drop-shadow-2xl select-none"
            >
              {s.emoji}
            </motion.div>
          </div>

          {/* Right-side actions */}
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
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth={2}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <span className="text-white text-[11px] drop-shadow">128</span>
            </button>

            <button className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/20 transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth={2}>
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              </div>
              <span className="text-white text-[11px] drop-shadow">Share</span>
            </button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-16 bg-gradient-to-t from-black/70 to-transparent">
            <span className="inline-block text-[9px] uppercase tracking-[0.22em] font-mono text-white/50 border border-white/20 bg-white/10 px-2.5 py-0.5 rounded-full mb-2">
              {s.sub}
            </span>
            <h2 className="text-white text-[20px] font-semibold leading-tight mb-3 drop-shadow-lg max-w-[80%]">
              {s.title}
            </h2>
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
// HOME TAB
// ─────────────────────────────────────────────────────────────────────────────
function FeedCard({ post, lm }: { post: FeedPost; lm?: boolean }) {
  const [liked, setLiked] = useState(false);

  const kindColor = post.kind === 'nasa' ? 'text-blue-500' : post.kind === 'wiki' ? 'text-emerald-600' : 'text-purple-500';
  const kindLabel = post.kind === 'nasa' ? 'NASA' : post.kind === 'wiki' ? 'Wikipedia' : 'Scientist';

  return (
    <div className={`rounded-2xl overflow-hidden border transition-colors duration-300 ${lm ? 'bg-white border-gray-100 shadow-sm' : 'bg-white/[0.04] border-white/[0.08]'}`}>
      {/* Post header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${lm ? 'bg-gray-100' : 'bg-white/[0.08]'}`}>
          {post.avatarEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[14px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>{post.author}</span>
            <span className={`text-[10px] uppercase tracking-[0.15em] font-mono px-2 py-0.5 rounded-full ${lm ? 'bg-gray-100 text-gray-500' : 'bg-white/[0.08] text-white/40'} ${kindColor}`}>
              {kindLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] ${lm ? 'text-gray-400' : 'text-white/35'}`}>{post.handle}</span>
            <span className={`text-[10px] ${lm ? 'text-gray-300' : 'text-white/20'}`}>·</span>
            <span className={`text-[11px] ${lm ? 'text-gray-400' : 'text-white/35'}`}>{post.time}</span>
          </div>
        </div>
        <button className={`text-[18px] p-1 rounded-full transition-colors ${lm ? 'hover:bg-gray-100' : 'hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2}>
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {/* Title */}
      {post.title && (
        <p className={`px-4 pb-2 text-[15px] font-semibold leading-snug ${lm ? 'text-gray-900' : 'text-white'}`}>{post.title}</p>
      )}

      {/* Body */}
      <p className={`px-4 pb-3 text-[13.5px] leading-relaxed ${lm ? 'text-gray-600' : 'text-white/60'}`}>{post.body}</p>

      {/* Image */}
      {post.imageUrl && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden aspect-[16/9] bg-gray-800">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-1 px-3 py-2.5 border-t ${lm ? 'border-gray-100' : 'border-white/[0.05]'}`}>
        {/* Like */}
        <button onClick={() => setLiked(l => !l)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${liked ? 'text-red-500' : lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {fmt(post.likes + (liked ? 1 : 0))}
        </button>
        {/* Comment */}
        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all ${lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          {fmt(post.comments)}
        </button>
        {/* Share */}
        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all ${lm ? 'text-gray-500 hover:bg-gray-100' : 'text-white/45 hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
          {fmt(post.shares)}
        </button>
        <div className="flex-1" />
        {/* Bookmark */}
        <button className={`p-2 rounded-xl transition-all ${lm ? 'text-gray-400 hover:bg-gray-100' : 'text-white/30 hover:bg-white/[0.06]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function HomeTab({ lm }: { lm?: boolean }) {
  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Stories row */}
      <div className={`sticky top-0 z-10 px-4 py-3 border-b flex gap-3 overflow-x-auto ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}
        style={{ scrollbarWidth: 'none' }}>
        {['You', 'NASA', 'SpaceX', 'CERN', 'ArXiv', 'ESA', 'Hubble', 'Webb'].map((name, i) => (
          <button key={name} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl p-0.5 ${i === 0 ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : 'bg-gradient-to-br from-purple-500/30 to-blue-500/30'} ${lm ? 'ring-2 ring-offset-2 ring-purple-300 ring-offset-gray-50' : 'ring-2 ring-offset-2 ring-purple-500/30 ring-offset-[#080810]'}`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center text-base ${lm ? 'bg-gray-100' : 'bg-[#080810]'}`}>
                {['🧑‍🚀', '🔭', '🚀', '⚗️', '📄', '🛰️', '🌌', '🔬'][i]}
              </div>
            </div>
            <span className={`text-[10px] truncate w-12 text-center ${lm ? 'text-gray-600' : 'text-white/50'}`}>{name}</span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 p-4 pb-6">
        {FEED.map(post => <FeedCard key={post.id} post={post} lm={lm} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH TAB
// ─────────────────────────────────────────────────────────────────────────────
function SearchTab({ lm }: { lm?: boolean }) {
  const [q, setQ] = useState('');

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Search bar */}
      <div className={`sticky top-0 z-10 px-4 pt-4 pb-3 border-b ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${lm ? 'bg-white border-gray-200 shadow-sm focus-within:border-purple-300 focus-within:shadow-md' : 'bg-white/[0.06] border-white/[0.10] focus-within:border-white/[0.22] focus-within:bg-white/[0.09]'}`}>
          <svg viewBox="0 0 24 24" className={`w-4 h-4 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search the cosmos…"
            className={`flex-1 bg-transparent outline-none text-[14px] placeholder:text-[14px] ${lm ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/25'}`}
          />
          {q && (
            <button onClick={() => setQ('')} className={`text-[18px] leading-none ${lm ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white/60'}`}>×</button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 flex flex-col gap-6">
        {/* Trending topics */}
        <div>
          <p className={`text-[10px] uppercase tracking-[0.28em] font-mono mb-3 ${lm ? 'text-gray-400' : 'text-white/35'}`}>🔥 Trending Topics</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TOPICS.map(t => (
              <motion.button key={t.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all bg-gradient-to-r ${t.from} to-transparent ${t.border} ${lm ? 'hover:bg-gray-100/80' : 'hover:bg-white/[0.06]'}`}>
                <span className="text-[18px]">{t.emoji}</span>
                <span className={`text-[12px] font-medium ${lm ? 'text-gray-800' : 'text-white/80'}`}>{t.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Video thumbnails */}
        <div>
          <p className={`text-[10px] uppercase tracking-[0.28em] font-mono mb-3 ${lm ? 'text-gray-400' : 'text-white/35'}`}>🎬 Recommended Videos</p>
          <div className="grid grid-cols-2 gap-3">
            {VIDEO_THUMBS.map(v => (
              <motion.div key={v.id} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                className={`rounded-xl overflow-hidden border cursor-pointer ${lm ? 'border-gray-200 bg-gray-100' : 'border-white/[0.08]'}`}>
                <div className={`aspect-video bg-gradient-to-br ${v.gradient} flex items-center justify-center`}>
                  <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5 fill-white"><polygon points="5,3 19,12 5,21"/></svg>
                  </div>
                </div>
                <div className={`px-2.5 py-2 ${lm ? 'bg-white' : 'bg-white/[0.03]'}`}>
                  <p className={`text-[11px] font-medium leading-tight line-clamp-2 ${lm ? 'text-gray-900' : 'text-white/80'}`}>{v.title}</p>
                  <p className={`text-[10px] mt-0.5 ${lm ? 'text-gray-400' : 'text-white/30'}`}>{v.channel} · {v.views}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT TAB
// ─────────────────────────────────────────────────────────────────────────────
function ChatTab({ lm }: { lm?: boolean }) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 py-3.5 border-b flex items-center justify-between ${lm ? 'bg-gray-50 border-gray-100' : 'bg-[#080810] border-white/[0.05]'}`}>
        <h2 className={`text-[16px] font-semibold ${lm ? 'text-gray-900' : 'text-white'}`}>Direct Messages</h2>
        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${lm ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/[0.07] text-white/50'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${lm ? 'bg-gray-100 border-gray-200' : 'bg-white/[0.05] border-white/[0.08]'}`}>
          <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 flex-shrink-0 ${lm ? 'stroke-gray-400' : 'stroke-white/30'}`} fill="none" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input placeholder="Search messages…" className={`flex-1 bg-transparent outline-none text-[13px] ${lm ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/25'}`} />
        </div>
      </div>

      {/* Conversation list */}
      <div className="px-2 pb-6">
        {CHATS.map(c => (
          <motion.button key={c.id} whileTap={{ scale: 0.99 }} onClick={() => setOpenId(id => id === c.id ? null : c.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-1 text-left transition-all ${
              openId === c.id
                ? lm ? 'bg-purple-50 border border-purple-100' : 'bg-white/[0.08] border border-white/[0.10]'
                : lm ? 'hover:bg-gray-100' : 'hover:bg-white/[0.04]'
            }`}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${c.isBot ? lm ? 'bg-purple-100' : 'bg-purple-500/15' : lm ? 'bg-gray-100' : 'bg-white/[0.07]'}`}>
                {c.emoji}
              </div>
              {c.online && (
                <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 bg-emerald-400 ${lm ? 'border-gray-50' : 'border-[#080810]'}`} />
              )}
            </div>

            {/* Content */}
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

            {/* Unread badge */}
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
// PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ lm }: { lm?: boolean }) {
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'posts' | 'liked' | 'saved'>('posts');

  const stats = [
    { label: 'Posts',     value: PROFILE_POSTS.length },
    { label: 'Followers', value: '14.2K' },
    { label: 'Following', value: '892' },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Profile header */}
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
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${lm ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100' : 'text-white'}`}
            style={lm ? undefined : { background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(109,40,217,0.55))', border: '1px solid rgba(139,92,246,0.4)' }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
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

      {/* Chess stats ribbon */}
      {user && (user.chessWins + user.chessLosses > 0) && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl border flex items-center gap-3 ${lm ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
          <span className="text-[22px]">♟️</span>
          <div>
            <p className={`text-[12px] font-semibold ${lm ? 'text-amber-800' : 'text-amber-300'}`}>Grandmaster Chess Record</p>
            <p className={`text-[11px] ${lm ? 'text-amber-600' : 'text-amber-400/70'}`}>{user.chessWins}W · {user.chessLosses}L · {user.chessWins + user.chessLosses > 0 ? Math.round((user.chessWins / (user.chessWins + user.chessLosses)) * 100) : 0}% win rate</p>
          </div>
        </div>
      )}

      {/* Section tabs */}
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

      {/* Post grid */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5 pb-6">
        {PROFILE_POSTS.map(p => (
          <motion.div key={p.id} whileHover={{ opacity: 0.85 }} className={`aspect-square bg-gradient-to-br ${p.gradient} flex items-center justify-center cursor-pointer relative group`}>
            <span className="text-[28px] select-none">{p.emoji}</span>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <span className="text-white text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">♥ {fmt(p.likes)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
const NAV_TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'shorts', label: 'Shorts',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id: 'home', label: 'Home',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'search', label: 'Search',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.75}>
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
  },
  {
    id: 'chat', label: 'Chat',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    id: 'profile', label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
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
              {/* Active indicator dot */}
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
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [direction, setDirection]  = useState(0);

  const handleSelect = (t: Tab) => {
    if (t === activeTab) return;
    setDirection(TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(activeTab) ? 1 : -1);
    setActiveTab(t);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1,  y: 0  }}
      exit={{ opacity: 0,     y: 20 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 z-[150] flex flex-col transform-gpu transition-colors duration-300 ${lm ? 'bg-gray-50' : 'bg-[#080810]'}`}
    >
      {/* ── Top header ── */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 h-14 border-b transition-colors duration-300 ${lm ? 'bg-white/90 border-gray-100' : 'bg-[#080810]/90 border-white/[0.06]'}`}
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

        {/* Back button */}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] font-mono transition-colors ${lm ? 'text-gray-500 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Cosmos
        </motion.button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-[16px]">🌐</span>
          <span className={`text-[14px] font-bold tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>
            Cosmic Nexus
          </span>
        </div>

        {/* Right action */}
        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${lm ? 'text-gray-400 hover:bg-gray-100' : 'text-white/35 hover:bg-white/[0.07]'}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
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
            {activeTab === 'home'    && <HomeTab    lm={lm} />}
            {activeTab === 'search'  && <SearchTab  lm={lm} />}
            {activeTab === 'chat'    && <ChatTab    lm={lm} />}
            {activeTab === 'profile' && <ProfileTab lm={lm} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav ── */}
      <BottomNav active={activeTab} onSelect={handleSelect} lm={lm} />
    </motion.div>
  );
}
