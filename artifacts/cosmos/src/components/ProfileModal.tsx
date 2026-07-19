import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, PRESET_AVATARS } from '../store/authStore';

// ─── Shared glass panel wrapper ───────────────────────────────────────────────
function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{
        background: 'rgba(10, 8, 24, 0.82)',
        border: '1px solid rgba(147, 112, 219, 0.18)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.04), 0 48px 96px rgba(0,0,0,0.7), 0 0 80px rgba(147,112,219,0.07)',
        backdropFilter: 'blur(28px)',
      }}
    >
      {/* top glow line */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.55), transparent)' }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(147,112,219,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(147,112,219,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Stat tile (history view) ─────────────────────────────────────────────────
function StatCard({
  label, value, accentColor,
}: {
  label: string; value: string | number; accentColor: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accentColor }}
      />
      <span
        className="text-[34px] font-extralight tracking-tight text-white leading-none"
        style={{ fontFamily: 'var(--app-font-heading, sans-serif)' }}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.28em] font-mono text-slate-500">
        {label}
      </span>
    </div>
  );
}

// ─── Avatar ring ──────────────────────────────────────────────────────────────
function AvatarRing({ src, size = 96 }: { src: string; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: '0 0 0 2px rgba(147,112,219,0.5), 0 0 28px rgba(147,112,219,0.3)',
        }}
      />
      <img
        src={src}
        alt="avatar"
        className="w-full h-full rounded-full object-cover"
        style={{ border: '2px solid rgba(147,112,219,0.4)' }}
      />
    </div>
  );
}

// ─── Avatar picker sheet ──────────────────────────────────────────────────────
function AvatarSheet({ current, onChange, onClose }: { current: string; onChange: (u: string) => void; onClose: () => void }) {
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrl, setShowUrl]   = useState(false);

  const applyUrl = () => {
    const u = urlDraft.trim();
    if (u) { onChange(u); setUrlDraft(''); }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 flex flex-col rounded-3xl overflow-hidden"
      style={{ background: 'rgba(10,8,24,0.96)', backdropFilter: 'blur(28px)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <span className="text-[11px] uppercase tracking-[0.3em] font-mono text-slate-400">Choose Avatar</span>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* preset grid */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-4 gap-3 mb-5">
          {PRESET_AVATARS.map(av => (
            <motion.button
              key={av.url}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => { onChange(av.url); onClose(); }}
              className="relative aspect-square rounded-xl overflow-hidden"
              style={{
                border: current === av.url ? '2px solid rgba(147,112,219,0.9)' : '2px solid rgba(255,255,255,0.07)',
                boxShadow: current === av.url ? '0 0 14px rgba(147,112,219,0.4)' : 'none',
              }}
            >
              <img src={av.url} alt={av.label} className="w-full h-full object-cover" loading="lazy" />
              {current === av.url && (
                <div className="absolute inset-0 bg-purple-500/20 flex items-end pb-1.5 justify-center">
                  <span className="text-[8px] uppercase tracking-widest font-mono text-purple-200 bg-black/40 px-1.5 py-0.5 rounded-full">Active</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Custom URL */}
        <button
          onClick={() => setShowUrl(s => !s)}
          className="w-full text-[10px] uppercase tracking-[0.22em] font-mono text-slate-500 hover:text-purple-400 transition-colors text-left mb-3"
        >
          {showUrl ? '— Close' : '+ Custom image URL'}
        </button>
        <AnimatePresence>
          {showUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 mb-1">
                <input
                  type="url"
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-purple-400/50 rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-white/20 outline-none font-mono"
                  onKeyDown={e => e.key === 'Enter' && applyUrl()}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={applyUrl}
                  className="px-5 py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest text-purple-200"
                  style={{ background: 'rgba(147,112,219,0.28)', border: '1px solid rgba(147,112,219,0.4)' }}
                >
                  Set
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Level 1: Profile view ────────────────────────────────────────────────────
function ProfileView({ onViewHistory, onClose }: { onViewHistory: () => void; onClose: () => void }) {
  const { user, updateProfile, logout } = useAuthStore();
  const [showPicker, setShowPicker]     = useState(false);
  const [editingName, setEditingName]   = useState(false);
  const [nameDraft, setNameDraft]       = useState('');

  if (!user) return null;

  const startEditName = () => { setNameDraft(user.username); setEditingName(true); };
  const saveName = () => {
    const v = nameDraft.trim();
    if (v.length >= 2) updateProfile({ username: v });
    setEditingName(false);
  };

  return (
    <GlassPanel className="w-full max-w-sm mx-4">
      {/* Avatar picker sheet overlays the card */}
      <AnimatePresence>
        {showPicker && (
          <AvatarSheet
            current={user.avatar}
            onChange={url => updateProfile({ avatar: url })}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* content */}
      <div className="px-8 pt-10 pb-8 flex flex-col items-center gap-0">
        {/* eyebrow */}
        <p className="text-[9px] uppercase tracking-[0.38em] font-mono text-slate-600 mb-6">Cosmic Profile</p>

        {/* Avatar */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowPicker(true)}
          className="relative mb-6 group"
        >
          <AvatarRing src={user.avatar} size={100} />
          {/* edit badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(147,112,219,0.95)', border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(147,112,219,0.4)' }}
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z" />
            </svg>
          </motion.div>
          <p className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] uppercase tracking-[0.2em] font-mono text-purple-400 mt-3 text-center">
            Change photo
          </p>
        </motion.button>

        {/* Username — editable */}
        {editingName ? (
          <form onSubmit={e => { e.preventDefault(); saveName(); }} className="mb-1.5 w-full max-w-[200px]">
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => e.key === 'Escape' && setEditingName(false)}
              className="w-full text-center bg-white/[0.06] border border-purple-400/50 rounded-xl px-3 py-1.5 text-[20px] font-light text-white outline-none tracking-tight font-mono"
            />
          </form>
        ) : (
          <button
            onClick={startEditName}
            className="group flex items-center gap-1.5 mb-1.5"
          >
            <span className="text-[22px] font-light tracking-tight text-white">
              {user.username}
            </span>
            <span className="opacity-0 group-hover:opacity-50 text-[10px] uppercase tracking-widest font-mono text-purple-400 transition-opacity">
              edit
            </span>
          </button>
        )}

        {/* Email */}
        <p className="text-[12px] font-mono text-slate-500 mb-8">{user.email}</p>

        {/* Divider */}
        <div className="w-full h-[1px] mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.2), transparent)' }} />

        {/* View Game History */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onViewHistory}
          className="w-full py-3.5 rounded-2xl text-[12px] font-mono uppercase tracking-[0.18em] text-purple-200 mb-3 flex items-center justify-center gap-2.5 transition-all"
          style={{
            background: 'rgba(147,112,219,0.12)',
            border: '1px solid rgba(147,112,219,0.28)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M3 3h6l2 9 3-6h7"/><path d="M21 17H7l-2-8"/><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          </svg>
          View Game History
        </motion.button>

        {/* Sign out */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { logout(); onClose(); }}
          className="w-full py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-[0.18em] text-red-400/70 hover:text-red-400 border border-red-500/[0.12] hover:border-red-500/25 transition-all"
        >
          Sign Out
        </motion.button>
      </div>
    </GlassPanel>
  );
}

// ─── Level 2: Game history view ───────────────────────────────────────────────
function HistoryView({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  if (!user) return null;

  const total   = user.chessWins + user.chessLosses;
  const winRate = total === 0 ? '—' : `${Math.round((user.chessWins / total) * 100)}%`;

  return (
    <GlassPanel className="w-full max-w-sm mx-4">
      {/* back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] font-mono text-slate-400 hover:text-white hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.14] transition-all"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      <div className="px-8 pt-14 pb-8">
        {/* header */}
        <div className="flex flex-col items-center mb-8">
          <p className="text-[9px] uppercase tracking-[0.38em] font-mono text-slate-600 mb-2">
            Game History
          </p>
          <h2
            className="text-[24px] font-light tracking-wide text-white"
            style={{ fontFamily: 'var(--app-font-heading, sans-serif)' }}
          >
            Grandmaster Chess
          </h2>
          {/* small avatar */}
          <div className="mt-3">
            <AvatarRing src={user.avatar} size={42} />
          </div>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="Wins"
            value={user.chessWins}
            accentColor="linear-gradient(90deg, transparent, rgba(79,195,247,0.7), transparent)"
          />
          <StatCard
            label="Losses"
            value={user.chessLosses}
            accentColor="linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)"
          />
          <StatCard
            label="Win Rate"
            value={winRate}
            accentColor="linear-gradient(90deg, transparent, rgba(147,112,219,0.7), transparent)"
          />
          <StatCard
            label="Games Played"
            value={total}
            accentColor="linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)"
          />
        </div>

        {/* empty state */}
        {total === 0 && (
          <p className="text-center text-[11px] font-mono text-slate-600 mt-2">
            No games recorded yet. Challenge an avatar to get started.
          </p>
        )}

        {/* divider */}
        <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.15), transparent)' }} />
      </div>
    </GlassPanel>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
type View = 'profile' | 'history';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('profile');

  return (
    // Full-screen backdrop
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[350] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <AnimatePresence mode="wait">
        {view === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0,   scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <ProfileView onViewHistory={() => setView('history')} onClose={onClose} />
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{ opacity: 0, x: 24,  scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <HistoryView onBack={() => setView('profile')} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
