import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, PRESET_AVATARS } from '../store/authStore';

// ─── Shared overlay + panel styles ───────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.78)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};

const panelStyle: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.9)',
};

// ─── Tiny avatar ring ─────────────────────────────────────────────────────────
function Av({ src, size = 80 }: { src: string; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        border: '2px solid rgba(139,92,246,0.55)',
        boxShadow: '0 0 0 4px rgba(139,92,246,0.12), 0 0 24px rgba(139,92,246,0.2)',
      }}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
    </div>
  );
}

// ─── Stat card (History view) ─────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-5 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 1px 0 0 ${color} inset`,
      }}
    >
      <span
        className="text-[36px] font-extralight text-white leading-none mb-1.5"
        style={{ fontFamily: 'var(--app-font-heading, system-ui)' }}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-[0.3em] font-mono text-white/30">{label}</span>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="h-[1px] w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
  );
}

// ─── Level 2: Game History ────────────────────────────────────────────────────
function HistoryModal({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  if (!user) return null;

  const total   = user.chessWins + user.chessLosses;
  const winRate = total === 0 ? '—' : `${Math.round((user.chessWins / total) * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 32, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,   scale: 1 }}
      exit={{ opacity: 0,  x: 32,  scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden flex flex-col"
      style={panelStyle}
    >
      {/* header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-[11px] uppercase tracking-[0.2em] font-mono"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/25">Game History</p>
        </div>
        <div className="w-[48px]" /> {/* balance */}
      </div>

      <Divider />

      <div className="px-6 pt-6 pb-8 flex flex-col gap-6">
        {/* identity strip */}
        <div className="flex items-center gap-3">
          <Av src={user.avatar} size={40} />
          <div>
            <p className="text-[15px] font-light text-white tracking-tight">{user.username}</p>
            <p className="text-[11px] font-mono text-white/30">{user.email}</p>
          </div>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Wins"         value={user.chessWins}   color="rgba(79,195,247,0.6)"  />
          <StatCard label="Losses"       value={user.chessLosses} color="rgba(239,68,68,0.5)"   />
          <StatCard label="Win Rate"     value={winRate}          color="rgba(139,92,246,0.6)"  />
          <StatCard label="Games Played" value={total}            color="rgba(201,168,76,0.5)"  />
        </div>

        {total === 0 && (
          <p className="text-center text-[11px] font-mono text-white/20">
            No chess games recorded yet. Challenge a scientist to start.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Level 1: Profile + Edit ──────────────────────────────────────────────────
function ProfilePanel({
  onViewHistory,
  onClose,
}: {
  onViewHistory: () => void;
  onClose: () => void;
}) {
  const { user, updateProfile, logout } = useAuthStore();

  // edit state
  const [editing, setEditing]       = useState(false);
  const [nameDraft, setNameDraft]   = useState('');
  const [urlDraft, setUrlDraft]     = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imgError, setImgError]     = useState(false);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);

  if (!user) return null;

  const openEdit = () => {
    setNameDraft(user.username);
    setUrlDraft(user.avatar);
    setPreviewUrl(user.avatar);
    setImgError(false);
    setShowAvatarGrid(false);
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setShowAvatarGrid(false); };

  const saveChanges = () => {
    const newName = nameDraft.trim();
    const newUrl  = urlDraft.trim();
    updateProfile({
      username: newName.length >= 2 ? newName : user.username,
      avatar: newUrl || user.avatar,
    });
    setEditing(false);
    setShowAvatarGrid(false);
  };

  const handleUrlChange = (v: string) => {
    setUrlDraft(v);
    setImgError(false);
    setPreviewUrl(v.trim());
  };

  const pickPreset = (url: string) => {
    setUrlDraft(url);
    setPreviewUrl(url);
    setImgError(false);
    setShowAvatarGrid(false);
  };

  const displayAvatar = editing
    ? (imgError || !previewUrl ? user.avatar : previewUrl)
    : user.avatar;

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,   scale: 1 }}
      exit={{ opacity: 0,  x: -24, scale: 0.97 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden flex flex-col"
      style={panelStyle}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <p className="text-[9px] uppercase tracking-[0.38em] font-mono text-white/25">
          {editing ? 'Edit Profile' : 'My Profile'}
        </p>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <Divider />

      {/* ── Body ── */}
      <div className="px-6 py-6 flex flex-col gap-5">

        {/* Avatar + identity row */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Av src={displayAvatar} size={72} />
            {editing && (
              <button
                onClick={() => setShowAvatarGrid(s => !s)}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(139,92,246,0.9)', border: '1.5px solid #0a0a0a' }}
              >
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z"/>
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-light text-white tracking-tight truncate">{user.username}</p>
            <p className="text-[11px] font-mono text-white/35 truncate mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* ── EDIT FIELDS (animated) ── */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden flex flex-col gap-4"
            >
              {/* Display name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.28em] font-mono text-white/30">
                  Display Name
                </label>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  placeholder={user.username}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-[14px] text-white font-light outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.55)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              {/* Avatar URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase tracking-[0.28em] font-mono text-white/30">
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={urlDraft}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-3 rounded-xl text-[13px] font-mono text-white/80 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.55)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
                {/* hidden img for validation */}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt=""
                    className="hidden"
                    onError={() => setImgError(true)}
                    onLoad={() => setImgError(false)}
                  />
                )}
                {imgError && (
                  <p className="text-[10px] font-mono text-red-400/80">
                    Could not load that URL. Check the address and try again.
                  </p>
                )}
                {/* preset grid toggle */}
                <button
                  onClick={() => setShowAvatarGrid(s => !s)}
                  className="text-[9px] uppercase tracking-[0.2em] font-mono text-white/25 hover:text-purple-400 transition-colors text-left"
                >
                  {showAvatarGrid ? '— Hide presets' : '+ Choose from presets'}
                </button>
                <AnimatePresence>
                  {showAvatarGrid && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {PRESET_AVATARS.map(av => (
                          <motion.button
                            key={av.url}
                            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                            onClick={() => pickPreset(av.url)}
                            className="aspect-square rounded-xl overflow-hidden"
                            style={{
                              border: urlDraft === av.url
                                ? '2px solid rgba(139,92,246,0.9)'
                                : '2px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            <img src={av.url} alt={av.label} className="w-full h-full object-cover" loading="lazy" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={saveChanges}
                  className="flex-1 py-3 rounded-xl text-[12px] font-mono uppercase tracking-[0.18em] text-white transition-all"
                  style={{
                    background: 'rgba(139,92,246,0.35)',
                    border: '1px solid rgba(139,92,246,0.5)',
                  }}
                >
                  Save Changes
                </motion.button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-3 rounded-xl text-[12px] font-mono uppercase tracking-[0.18em] text-white/40 hover:text-white/70 transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Divider />

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-2">
          {!editing && (
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={openEdit}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-[12px] font-mono uppercase tracking-[0.15em] transition-all group"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span className="text-white/60 group-hover:text-white transition-colors">Edit Profile</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-white/25 group-hover:text-white/60 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z"/>
              </svg>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={onViewHistory}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-[12px] font-mono uppercase tracking-[0.15em] transition-all group"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span className="text-white/60 group-hover:text-white transition-colors">View Game History</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-white/25 group-hover:text-white/60 transition-colors">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </motion.button>

          <Divider />

          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full py-3 rounded-xl text-[11px] font-mono uppercase tracking-[0.15em] text-red-400/50 hover:text-red-400/80 transition-all"
            style={{ border: '1px solid rgba(239,68,68,0.08)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
type View = 'profile' | 'history';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('profile');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[350] flex items-center justify-center"
      style={overlayStyle}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <AnimatePresence mode="wait">
        {view === 'profile' ? (
          <ProfilePanel key="profile" onViewHistory={() => setView('history')} onClose={onClose} />
        ) : (
          <HistoryModal key="history" onBack={() => setView('profile')} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
