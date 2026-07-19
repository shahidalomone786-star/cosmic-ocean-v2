import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, PRESET_AVATARS } from '../store/authStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const MAX = 480;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no canvas ctx')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Divider ──────────────────────────────────────────────────────────────────
const HR = () => (
  <div className="w-full h-[1px]" style={{ background: 'rgba(255,255,255,0.07)' }} />
);

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 rounded-2xl relative overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />
      <span className="text-[40px] font-extralight text-white leading-none mb-2"
        style={{ fontFamily: 'var(--app-font-heading, system-ui)' }}>{value}</span>
      <span className="text-[9px] uppercase tracking-[0.3em] font-mono text-white/30">{label}</span>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({
  left, center, right,
}: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
      <div className="w-24 flex justify-start">{left}</div>
      <div className="flex-1 text-center">{center}</div>
      <div className="w-24 flex justify-end">{right}</div>
    </div>
  );
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9px] uppercase tracking-[0.38em] font-mono text-white/25">{children}</p>
);

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY VIEW
// ─────────────────────────────────────────────────────────────────────────────
function HistoryView({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  if (!user) return null;

  const total   = user.chessWins + user.chessLosses;
  const winRate = total === 0 ? '—' : `${Math.round((user.chessWins / total) * 100)}%`;

  return (
    <motion.div key="history"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 w-full h-full z-[360] flex flex-col"
      style={{ background: '#0a0a0a' }}
    >
      <TopBar
        left={
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-[11px] uppercase tracking-[0.2em] font-mono py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        }
        center={<Eyebrow>Game History</Eyebrow>}
      />
      <HR />

      <div className="flex-1 overflow-y-auto px-5 py-8">
        {/* identity strip */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 0 20px rgba(139,92,246,0.18)' }}>
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-[18px] font-light text-white tracking-tight">{user.username}</p>
            <p className="text-[12px] font-mono text-white/30 mt-0.5">{user.email}</p>
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/25 mb-4">Grandmaster Chess</p>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Wins"         value={user.chessWins}   accent="linear-gradient(90deg, transparent, rgba(79,195,247,0.7), transparent)" />
          <StatCard label="Losses"       value={user.chessLosses} accent="linear-gradient(90deg, transparent, rgba(239,68,68,0.55), transparent)" />
          <StatCard label="Win Rate"     value={winRate}          accent="linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)" />
          <StatCard label="Games Played" value={total}            accent="linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)" />
        </div>

        {total === 0 && (
          <p className="text-center text-[12px] font-mono text-white/20 mt-8">
            No games recorded yet. Challenge a scientist to begin.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function EditView({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const { user, updateProfile } = useAuthStore();

  const [nameDraft, setNameDraft]     = useState(user?.username ?? '');
  const [avatarDraft, setAvatarDraft] = useState(user?.avatar ?? '');
  const [compressing, setCompressing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // ── File picked from device ──
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const b64 = await compressImage(file);
      setAvatarDraft(b64);
    } catch {
      // silently keep existing avatar
    } finally {
      setCompressing(false);
      // reset so the same file can be re-picked
      e.target.value = '';
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const save = () => {
    const newName = nameDraft.trim();
    updateProfile({
      username: newName.length >= 2 ? newName : user.username,
      avatar:   avatarDraft || user.avatar,
    });
    onSaved();
  };

  return (
    <motion.div key="edit"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 w-full h-full z-[360] flex flex-col"
      style={{ background: '#0a0a0a' }}
    >
      {/* hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* ── Top bar ── */}
      <TopBar
        left={
          <button onClick={onCancel}
            className="text-[11px] uppercase tracking-[0.2em] font-mono text-white/40 hover:text-white transition-colors py-2">
            Cancel
          </button>
        }
        center={<Eyebrow>Edit Profile</Eyebrow>}
        right={
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={save}
            className="text-[11px] uppercase tracking-[0.2em] font-mono text-purple-300 hover:text-purple-200 transition-colors py-2 font-medium">
            Save
          </motion.button>
        }
      />
      <HR />

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-10 flex flex-col gap-8 max-w-lg mx-auto w-full">

        {/* ── Avatar section ── */}
        <div className="flex flex-col items-center gap-4">
          {/* Avatar — click to upload */}
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={openPicker}
            disabled={compressing}
            className="relative group"
          >
            <div className="w-28 h-28 rounded-full overflow-hidden"
              style={{
                border: '3px solid rgba(139,92,246,0.55)',
                boxShadow: '0 0 0 6px rgba(139,92,246,0.10), 0 0 40px rgba(139,92,246,0.22)',
              }}>
              {compressing ? (
                <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 rounded-full border-2 border-purple-400/30 border-t-purple-400"
                  />
                </div>
              ) : (
                <img src={avatarDraft || user.avatar} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            {/* edit ring overlay */}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                <span className="text-[9px] uppercase tracking-widest text-white font-mono">Upload</span>
              </div>
            </div>
          </motion.button>

          {/* Upload button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={openPicker}
            disabled={compressing}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[12px] font-mono uppercase tracking-[0.18em] text-purple-200 transition-all disabled:opacity-50"
            style={{
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.35)',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            {compressing ? 'Processing…' : 'Upload Photo from Device'}
          </motion.button>

          {/* Preset toggle */}
          <button
            onClick={() => setShowPresets(s => !s)}
            className="text-[9px] uppercase tracking-[0.25em] font-mono text-white/25 hover:text-purple-400 transition-colors"
          >
            {showPresets ? '— Hide preset avatars' : '+ Choose a preset avatar'}
          </button>

          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                className="overflow-hidden w-full"
              >
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {PRESET_AVATARS.map(av => (
                    <motion.button
                      key={av.url}
                      whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                      onClick={() => { setAvatarDraft(av.url); setShowPresets(false); }}
                      className="aspect-square rounded-2xl overflow-hidden"
                      style={{
                        border: avatarDraft === av.url
                          ? '2.5px solid rgba(139,92,246,0.9)'
                          : '2px solid rgba(255,255,255,0.08)',
                        boxShadow: avatarDraft === av.url ? '0 0 16px rgba(139,92,246,0.35)' : 'none',
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

        <HR />

        {/* ── Display name ── */}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] uppercase tracking-[0.3em] font-mono text-white/30 pl-1">
            Display Name
          </label>
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            placeholder={user.username}
            className="w-full px-5 py-4 rounded-2xl text-[16px] font-light text-white bg-transparent outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            onFocus={e  => (e.target.style.borderColor = 'rgba(139,92,246,0.6)')}
            onBlur={e   => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        </div>

        {/* ── Save (bottom CTA for easy thumb reach on mobile) ── */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={save}
          className="w-full py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.2em] text-white mt-2"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.45) 0%, rgba(109,40,217,0.5) 100%)',
            border: '1px solid rgba(139,92,246,0.5)',
            boxShadow: '0 0 24px rgba(139,92,246,0.18)',
          }}
        >
          Save Changes
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({
  onEdit, onViewHistory, onClose,
}: {
  onEdit: () => void; onViewHistory: () => void; onClose: () => void;
}) {
  const { user, logout } = useAuthStore();
  if (!user) return null;

  return (
    <motion.div key="profile"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 w-full h-full z-[360] flex flex-col"
      style={{ background: '#0a0a0a' }}
    >
      <TopBar
        center={<Eyebrow>My Profile</Eyebrow>}
        right={
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/[0.07] transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }
      />
      <HR />

      <div className="flex-1 overflow-y-auto flex flex-col items-center px-5 py-10 max-w-lg mx-auto w-full">

        {/* Avatar */}
        <div className="mb-6">
          <div className="w-28 h-28 rounded-full overflow-hidden"
            style={{
              border: '3px solid rgba(139,92,246,0.5)',
              boxShadow: '0 0 0 6px rgba(139,92,246,0.09), 0 0 40px rgba(139,92,246,0.2)',
            }}>
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Identity */}
        <p className="text-[26px] font-light text-white tracking-tight mb-1">{user.username}</p>
        <p className="text-[13px] font-mono text-white/35 mb-10">{user.email}</p>

        <div className="w-full flex flex-col gap-3">
          <HR />

          {/* Edit Profile */}
          <button
            onClick={onEdit}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.15em] transition-all group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-white/55 group-hover:text-white transition-colors">Edit Profile</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="text-white/20 group-hover:text-white/60 transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z"/>
            </svg>
          </button>

          {/* View Game History */}
          <button
            onClick={onViewHistory}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.15em] transition-all group"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-white/55 group-hover:text-white transition-colors">View Game History</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className="text-white/20 group-hover:text-white/60 transition-colors">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <HR />

          {/* Sign out */}
          <button
            onClick={() => { logout(); onClose(); }}
            className="w-full py-3.5 rounded-2xl text-[12px] font-mono uppercase tracking-[0.15em] text-red-400/50 hover:text-red-400/80 transition-all"
            style={{ border: '1px solid rgba(239,68,68,0.08)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
type View = 'profile' | 'edit' | 'history';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('profile');

  return (
    <AnimatePresence mode="wait">
      {view === 'profile' && (
        <ProfileView
          key="profile"
          onEdit={() => setView('edit')}
          onViewHistory={() => setView('history')}
          onClose={onClose}
        />
      )}
      {view === 'edit' && (
        <EditView
          key="edit"
          onCancel={() => setView('profile')}
          onSaved={() => setView('profile')}
        />
      )}
      {view === 'history' && (
        <HistoryView
          key="history"
          onBack={() => setView('profile')}
        />
      )}
    </AnimatePresence>
  );
}
