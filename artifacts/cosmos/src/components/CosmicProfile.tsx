import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, PRESET_AVATARS } from '../store/authStore';

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-xl relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: accent }} />
      )}
      <span className="text-[9px] uppercase tracking-[0.25em] font-mono text-slate-500">{label}</span>
      <span className="text-[20px] font-light tracking-tight text-white"
        style={{ fontFamily: 'var(--app-font-heading, sans-serif)' }}>{value}</span>
    </div>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────
function EditableField({
  value, onSave, placeholder, className = '',
}: { value: string; onSave: (v: string) => void; placeholder?: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => inputRef.current?.focus(), 10); };
  const save  = () => { const v = draft.trim(); if (v.length >= 2) onSave(v); setEditing(false); };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <form onSubmit={e => { e.preventDefault(); save(); }} className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => e.key === 'Escape' && cancel()}
          className="bg-white/[0.06] border border-purple-400/40 rounded-lg px-3 py-1.5 text-white text-[15px] font-mono outline-none w-full"
        />
      </form>
    );
  }
  return (
    <button onClick={start} className={`group flex items-center gap-2 text-left ${className}`}>
      <span>{value || placeholder}</span>
      <span className="opacity-0 group-hover:opacity-50 text-[10px] uppercase tracking-widest font-mono text-purple-400 transition-opacity">
        edit
      </span>
    </button>
  );
}

// ─── Avatar picker ────────────────────────────────────────────────────────────
function AvatarPicker({
  current, onChange,
}: { current: string; onChange: (url: string) => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customUrl, setCustomUrl]   = useState('');
  const [customError, setCustomError] = useState('');

  const applyCustom = () => {
    if (!customUrl.trim()) return;
    onChange(customUrl.trim());
    setShowCustom(false);
    setCustomUrl('');
    setCustomError('');
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[9px] uppercase tracking-[0.25em] font-mono text-slate-500">Select Avatar</p>
      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-2">
        {PRESET_AVATARS.map(av => (
          <motion.button
            key={av.url}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(av.url)}
            className="relative rounded-xl overflow-hidden aspect-square"
            style={{
              border: current === av.url
                ? '2px solid rgba(147,112,219,0.9)'
                : '2px solid rgba(255,255,255,0.06)',
              boxShadow: current === av.url ? '0 0 12px rgba(147,112,219,0.4)' : 'none',
            }}
          >
            <img src={av.url} alt={av.label} className="w-full h-full object-cover" loading="lazy" />
            {current === av.url && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-purple-500/20 flex items-center justify-center"
              >
                <div className="w-4 h-4 rounded-full bg-purple-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Custom URL toggle */}
      <button
        onClick={() => setShowCustom(s => !s)}
        className="text-[10px] uppercase tracking-[0.2em] font-mono text-slate-500 hover:text-purple-400 transition-colors text-left"
      >
        {showCustom ? '— Close custom URL' : '+ Custom image URL'}
      </button>
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top' }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] focus:border-purple-400/50 rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/20 outline-none font-mono"
              />
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={applyCustom}
                className="px-4 py-2 rounded-lg text-[11px] font-mono uppercase tracking-widest text-purple-200"
                style={{ background: 'rgba(147,112,219,0.25)', border: '1px solid rgba(147,112,219,0.35)' }}
              >
                Apply
              </motion.button>
            </div>
            {customError && <p className="text-[10px] text-red-400 font-mono mt-1">{customError}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CosmicProfile({ lm }: { lm?: boolean }) {
  const { user, updateProfile, logout } = useAuthStore();
  const [showPicker, setShowPicker] = useState(false);

  if (!user) return null;

  const joinDate = new Date(user.joinDate);
  const joinFormatted = joinDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const winRate = user.chessWins + user.chessLosses === 0
    ? '—'
    : `${Math.round((user.chessWins / (user.chessWins + user.chessLosses)) * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6"
    >
      {/* Section header */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2
          className={`text-[15px] font-medium tracking-wide ${lm ? 'text-slate-900' : 'text-white'}`}
          style={{ fontFamily: 'var(--app-font-heading)' }}
        >
          Command Center
        </h2>
        <span className={`text-[11px] uppercase tracking-[0.18em] ${lm ? 'text-slate-500' : 'text-white/30'}`}>
          Cosmic Profile
        </span>
      </div>

      {/* Main glass card */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={lm ? {
          background: 'rgba(248,247,255,0.95)',
          border: '1px solid rgba(139,92,246,0.15)',
          boxShadow: '0 8px 32px rgba(139,92,246,0.08)',
        } : {
          background: 'rgba(12,10,28,0.7)',
          border: '1px solid rgba(147,112,219,0.14)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Top accent glow (dark mode) */}
        {!lm && (
          <div className="absolute inset-x-0 top-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.5), transparent)' }} />
        )}

        {/* Scan-line grid (dark mode) */}
        {!lm && (
          <div className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(rgba(147,112,219,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(147,112,219,0.03) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />
        )}

        <div className="relative z-10 p-6">
          {/* Top row: avatar + identity */}
          <div className="flex gap-5 items-start mb-6">
            {/* Avatar */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPicker(s => !s)}
              className="relative flex-shrink-0 group"
            >
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden"
                style={{
                  border: '2px solid rgba(147,112,219,0.4)',
                  boxShadow: '0 0 20px rgba(147,112,219,0.2)',
                }}
              >
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(147,112,219,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/20 transition-colors" />
            </motion.button>

            {/* Identity */}
            <div className="flex-1 min-w-0 pt-1">
              <p className={`text-[9px] uppercase tracking-[0.3em] font-mono mb-1 ${lm ? 'text-slate-400' : 'text-slate-500'}`}>
                Username
              </p>
              <EditableField
                value={user.username}
                onSave={username => updateProfile({ username })}
                placeholder="Set a username"
                className={`text-[22px] font-light tracking-tight mb-2 ${lm ? 'text-slate-900' : 'text-white'}`}
              />
              <div className={`flex items-center gap-2 ${lm ? 'text-slate-500' : 'text-slate-400'}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-[12px] font-mono truncate">{user.email}</span>
              </div>
              <div className={`flex items-center gap-2 mt-1 ${lm ? 'text-slate-400' : 'text-slate-500'}`}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-[11px] font-mono">Joined {joinFormatted}</span>
              </div>
            </div>
          </div>

          {/* Avatar picker (collapsible) */}
          <AnimatePresence>
            {showPicker && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{ originY: 0, transformOrigin: 'top' }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(147,112,219,0.06)', border: '1px solid rgba(147,112,219,0.12)' }}>
                  <AvatarPicker
                    current={user.avatar}
                    onChange={url => { updateProfile({ avatar: url }); setShowPicker(false); }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <StatTile label="Chess Wins" value={user.chessWins}
              accent="linear-gradient(90deg, transparent, rgba(79,195,247,0.6), transparent)" />
            <StatTile label="Chess Losses" value={user.chessLosses}
              accent="linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" />
            <StatTile label="Win Rate" value={winRate}
              accent="linear-gradient(90deg, transparent, rgba(147,112,219,0.6), transparent)" />
            <StatTile label="Games Played" value={user.chessWins + user.chessLosses}
              accent="linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" />
          </div>

          {/* Divider */}
          <div className="h-[1px] mb-4"
            style={{ background: lm ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.05)' }} />

          {/* Logout */}
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-mono uppercase tracking-[0.2em] ${lm ? 'text-slate-400' : 'text-slate-600'}`}>
              Authenticated via local session
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className={`px-4 py-2 rounded-lg text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${
                lm
                  ? 'text-red-500 border border-red-200 bg-red-50 hover:bg-red-100'
                  : 'text-red-400/80 border border-red-500/20 bg-red-500/[0.05] hover:bg-red-500/10'
              }`}
            >
              Sign Out
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
