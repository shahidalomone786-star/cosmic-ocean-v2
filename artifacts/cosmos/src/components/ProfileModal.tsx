import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, PRESET_AVATARS } from '../store/authStore';
import { supabase } from '../lib/supabase';

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
const HR = ({ lm }: { lm?: boolean }) => (
  <div className="w-full h-[1px]" style={{ background: lm ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)' }} />
);

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, lm }: { label: string; value: string | number; accent: string; lm?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-6 rounded-2xl relative overflow-hidden transition-colors duration-300 ${lm ? 'bg-black/[0.03] border border-black/[0.08]' : ''}`}
      style={lm ? undefined : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: accent }} />
      <span className={`text-[40px] font-extralight leading-none mb-2 ${lm ? 'text-gray-900' : 'text-white'}`}
        style={{ fontFamily: 'var(--app-font-heading, system-ui)' }}>{value}</span>
      <span className={`text-[9px] uppercase tracking-[0.3em] font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>{label}</span>
    </div>
  );
}

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ left, center, right, lm }: {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  lm?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 flex-shrink-0 transition-colors duration-300 ${lm ? 'bg-gray-50' : ''}`}>
      <div className="w-24 flex justify-start">{left}</div>
      <div className="flex-1 text-center">{center}</div>
      <div className="w-24 flex justify-end">{right}</div>
    </div>
  );
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────
const Eyebrow = ({ children, lm }: { children: React.ReactNode; lm?: boolean }) => (
  <p className={`text-[9px] uppercase tracking-[0.38em] font-mono ${lm ? 'text-gray-400' : 'text-white/25'}`}>{children}</p>
);

// ─── Time formatter ───────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// ─── Carrom history row type ──────────────────────────────────────────────────
interface CarromHistoryRow {
  id:        string;
  mode:      string;
  opponent:  string | null;
  result:    string;
  my_score:  number;
  opp_score: number;
  profit:    number;
  played_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY VIEW
// ─────────────────────────────────────────────────────────────────────────────
function HistoryView({ onBack, lm }: { onBack: () => void; lm?: boolean }) {
  const { user } = useAuthStore();
  const [carromRows,    setCarromRows]    = useState<CarromHistoryRow[]>([]);
  const [carromLoading, setCarromLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from('carrom_history')
      .select('*')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCarromRows((data ?? []) as CarromHistoryRow[]);
        setCarromLoading(false);
      }, () => setCarromLoading(false));
  }, [user]);

  if (!user) return null;

  const total   = user.chessWins + user.chessLosses;
  const winRate = total === 0 ? '—' : `${Math.round((user.chessWins / total) * 100)}%`;

  // Carrom aggregates
  const carromWins   = carromRows.filter(r => r.result === 'win').length;
  const carromLosses = carromRows.filter(r => r.result === 'loss').length;
  const carromProfit = carromRows.reduce((s, r) => s + r.profit, 0);
  const carromTotal  = carromRows.length;

  return (
    <motion.div key="history"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 w-full h-full z-[360] flex flex-col transform-gpu transition-colors duration-300 ${lm ? 'bg-gray-50' : 'bg-[#0a0a0a]'}`}
    >
      <TopBar lm={lm}
        left={
          <button onClick={onBack}
            className={`flex items-center gap-1.5 transition-colors text-[11px] uppercase tracking-[0.2em] font-mono py-2 ${lm ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        }
        center={<Eyebrow lm={lm}>History</Eyebrow>}
      />
      <HR lm={lm} />

      <div className="flex-1 overflow-y-auto px-5 py-8">
        {/* identity strip */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 0 20px rgba(139,92,246,0.18)' }}>
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className={`text-[18px] font-light tracking-tight ${lm ? 'text-gray-900' : 'text-white'}`}>{user.username}</p>
            <p className={`text-[12px] font-mono mt-0.5 ${lm ? 'text-gray-400' : 'text-white/30'}`}>{user.email}</p>
          </div>
        </div>

        {/* ── Grandmaster Chess ── */}
        <p className={`text-[10px] uppercase tracking-[0.3em] font-mono mb-4 ${lm ? 'text-gray-400' : 'text-white/25'}`}>Grandmaster Chess</p>

        <div className="grid grid-cols-2 gap-3">
          <StatCard lm={lm} label="Wins"         value={user.chessWins}   accent="linear-gradient(90deg, transparent, rgba(79,195,247,0.7), transparent)" />
          <StatCard lm={lm} label="Losses"       value={user.chessLosses} accent="linear-gradient(90deg, transparent, rgba(239,68,68,0.55), transparent)" />
          <StatCard lm={lm} label="Win Rate"     value={winRate}          accent="linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)" />
          <StatCard lm={lm} label="Games Played" value={total}            accent="linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)" />
        </div>

        {total === 0 && (
          <p className={`text-center text-[12px] font-mono mt-4 mb-2 ${lm ? 'text-gray-400' : 'text-white/20'}`}>
            No chess games recorded yet. Challenge a scientist to begin.
          </p>
        )}

        {/* ── Premium Carrom History ── */}
        <div className={`mt-10 mb-4 flex items-center gap-3`}>
          <p className={`text-[10px] uppercase tracking-[0.3em] font-mono ${lm ? 'text-gray-400' : 'text-white/25'}`}>🎯 Premium Carrom History</p>
          {carromLoading && (
            <div className={`w-3.5 h-3.5 rounded-full border-2 animate-spin ${lm ? 'border-gray-200 border-t-amber-500' : 'border-white/10 border-t-amber-400'}`} />
          )}
        </div>

        {!carromLoading && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard lm={lm} label="Wins"         value={carromWins}   accent="linear-gradient(90deg, transparent, rgba(245,158,11,0.8), transparent)" />
              <StatCard lm={lm} label="Losses"       value={carromLosses} accent="linear-gradient(90deg, transparent, rgba(239,68,68,0.55), transparent)" />
              <StatCard lm={lm} label="Profit (pts)" value={carromProfit >= 0 ? `+${carromProfit}` : `${carromProfit}`} accent="linear-gradient(90deg, transparent, rgba(34,197,94,0.65), transparent)" />
              <StatCard lm={lm} label="Games Played" value={carromTotal}  accent="linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)" />
            </div>

            {carromTotal === 0 ? (
              <p className={`text-center text-[12px] font-mono mt-2 mb-2 ${lm ? 'text-gray-400' : 'text-white/20'}`}>
                No carrom games yet. Pocket some coins to get started!
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className={`text-[9px] uppercase tracking-[0.25em] font-mono mb-1 ${lm ? 'text-gray-400' : 'text-white/20'}`}>Recent Games</p>
                {carromRows.slice(0, 10).map(row => (
                  <div
                    key={row.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      lm ? 'bg-black/[0.03] border border-black/[0.07]' : ''
                    }`}
                    style={lm ? undefined : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[18px]">
                        {row.result === 'win' ? '🏆' : row.result === 'loss' ? '😔' : '🤝'}
                      </span>
                      <div>
                        <p className={`text-[12px] font-medium ${lm ? 'text-gray-800' : 'text-white/80'}`}>
                          {row.result === 'win' ? 'Win' : row.result === 'loss' ? 'Loss' : 'Draw'}
                          {row.opponent ? ` vs ${row.opponent}` : ''}
                        </p>
                        <p className={`text-[10px] font-mono ${lm ? 'text-gray-400' : 'text-white/30'}`}>
                          {row.my_score}–{row.opp_score} · {row.mode.toUpperCase()} · {new Date(row.played_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[13px] font-mono font-semibold ${
                      row.profit > 0 ? 'text-green-400' : row.profit < 0 ? 'text-red-400' : (lm ? 'text-gray-400' : 'text-white/30')
                    }`}>
                      {row.profit > 0 ? `+${row.profit}` : row.profit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Time Spent ── */}
        <p className={`text-[10px] uppercase tracking-[0.3em] font-mono mb-4 mt-10 ${lm ? 'text-gray-400' : 'text-white/25'}`}>Time Spent</p>
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            lm={lm}
            label="Total Time on Site"
            value={formatTime(user.timeSpentSeconds)}
            accent="linear-gradient(90deg, transparent, rgba(34,197,94,0.65), transparent)"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function EditView({ onCancel, onSaved, lm }: { onCancel: () => void; onSaved: () => void; lm?: boolean }) {
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
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-0 w-full h-full z-[360] flex flex-col transform-gpu transition-colors duration-300 ${lm ? 'bg-gray-50' : 'bg-[#0a0a0a]'}`}
    >
      {/* hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* ── Top bar ── */}
      <TopBar lm={lm}
        left={
          <button onClick={onCancel}
            className={`text-[11px] uppercase tracking-[0.2em] font-mono transition-colors py-2 ${lm ? 'text-gray-400 hover:text-gray-900' : 'text-white/40 hover:text-white'}`}>
            Cancel
          </button>
        }
        center={<Eyebrow lm={lm}>Edit Profile</Eyebrow>}
        right={
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={save}
            className={`text-[11px] uppercase tracking-[0.2em] font-mono transition-colors py-2 font-medium ${lm ? 'text-purple-600 hover:text-purple-700' : 'text-purple-300 hover:text-purple-200'}`}>
            Save
          </motion.button>
        }
      />
      <HR lm={lm} />

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
                <div className={`w-full h-full flex items-center justify-center ${lm ? 'bg-gray-100' : 'bg-white/[0.05]'}`}>
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
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[12px] font-mono uppercase tracking-[0.18em] transition-all disabled:opacity-50 ${
              lm
                ? 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100'
                : 'text-purple-200'
            }`}
            style={lm ? undefined : {
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
            className={`text-[9px] uppercase tracking-[0.25em] font-mono transition-colors ${
              lm ? 'text-gray-400 hover:text-purple-600' : 'text-white/25 hover:text-purple-400'
            }`}
          >
            {showPresets ? '— Hide preset avatars' : '+ Choose a preset avatar'}
          </button>

          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'top' }}
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
                          : lm ? '2px solid rgba(0,0,0,0.10)' : '2px solid rgba(255,255,255,0.08)',
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

        <HR lm={lm} />

        {/* ── Display name ── */}
        <div className="flex flex-col gap-2">
          <label className={`text-[9px] uppercase tracking-[0.3em] font-mono pl-1 ${lm ? 'text-gray-400' : 'text-white/30'}`}>
            Display Name
          </label>
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            placeholder={user.username}
            className={`w-full px-5 py-4 rounded-2xl text-[16px] font-light outline-none transition-all ${
              lm
                ? 'bg-white border border-gray-200 text-gray-900 placeholder-gray-300 focus:border-purple-400'
                : 'bg-transparent text-white'
            }`}
            style={lm ? undefined : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
            onFocus={e  => { if (!lm) e.target.style.borderColor = 'rgba(139,92,246,0.6)'; }}
            onBlur={e   => { if (!lm) e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
          />
        </div>

        {/* ── Save (bottom CTA for easy thumb reach on mobile) ── */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={save}
          className={`w-full py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.2em] mt-2 transition-all ${
            lm
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
              : 'text-white'
          }`}
          style={lm ? undefined : {
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
  onEdit, onViewHistory, onClose, lm,
}: {
  onEdit: () => void; onViewHistory: () => void; onClose: () => void; lm?: boolean;
}) {
  const { user, logout } = useAuthStore();
  if (!user) return null;

  return (
    <motion.div key="profile"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 w-full h-full z-[360] flex flex-col transform-gpu transition-colors duration-300 ${lm ? 'bg-gray-50' : 'bg-[#0a0a0a]'}`}
    >
      <TopBar lm={lm}
        center={<Eyebrow lm={lm}>My Profile</Eyebrow>}
        right={
          <button onClick={onClose}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
              lm
                ? 'text-gray-400 hover:text-gray-900 hover:bg-black/[0.06]'
                : 'text-white/30 hover:text-white hover:bg-white/[0.07]'
            }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }
      />
      <HR lm={lm} />

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
        <p className={`text-[26px] font-light tracking-tight mb-1 ${lm ? 'text-gray-900' : 'text-white'}`}>{user.username}</p>
        <p className={`text-[13px] font-mono mb-10 ${lm ? 'text-gray-400' : 'text-white/35'}`}>{user.email}</p>

        <div className="w-full flex flex-col gap-3">
          <HR lm={lm} />

          {/* Edit Profile */}
          <button
            onClick={onEdit}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.15em] transition-all group ${
              lm
                ? 'bg-black/[0.03] border border-black/[0.07] hover:bg-black/[0.06]'
                : ''
            }`}
            style={lm ? undefined : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className={`transition-colors ${lm ? 'text-gray-600 group-hover:text-gray-900' : 'text-white/55 group-hover:text-white'}`}>Edit Profile</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={`transition-colors ${lm ? 'text-gray-300 group-hover:text-gray-600' : 'text-white/20 group-hover:text-white/60'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.586l-2.828.707.707-2.828a4 4 0 01.586-1.414z"/>
            </svg>
          </button>

          {/* View Game History */}
          <button
            onClick={onViewHistory}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-[13px] font-mono uppercase tracking-[0.15em] transition-all group ${
              lm
                ? 'bg-black/[0.03] border border-black/[0.07] hover:bg-black/[0.06]'
                : ''
            }`}
            style={lm ? undefined : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className={`transition-colors ${lm ? 'text-gray-600 group-hover:text-gray-900' : 'text-white/55 group-hover:text-white'}`}>History</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              className={`transition-colors ${lm ? 'text-gray-300 group-hover:text-gray-600' : 'text-white/20 group-hover:text-white/60'}`}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <HR lm={lm} />

          {/* Sign out */}
          <button
            onClick={() => { logout(); onClose(); }}
            className={`w-full py-3.5 rounded-2xl text-[12px] font-mono uppercase tracking-[0.15em] transition-all ${
              lm
                ? 'text-red-500/70 hover:text-red-600 border border-red-200/60 hover:bg-red-50'
                : 'text-red-400/50 hover:text-red-400/80 border border-red-500/[0.08]'
            }`}
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

export default function ProfileModal({ onClose, lm }: { onClose: () => void; lm?: boolean }) {
  const [view, setView] = useState<View>('profile');

  return (
    <AnimatePresence mode="wait">
      {view === 'profile' && (
        <ProfileView
          key="profile"
          lm={lm}
          onEdit={() => setView('edit')}
          onViewHistory={() => setView('history')}
          onClose={onClose}
        />
      )}
      {view === 'edit' && (
        <EditView
          key="edit"
          lm={lm}
          onCancel={() => setView('profile')}
          onSaved={() => setView('profile')}
        />
      )}
      {view === 'history' && (
        <HistoryView
          key="history"
          lm={lm}
          onBack={() => setView('profile')}
        />
      )}
    </AnimatePresence>
  );
}
