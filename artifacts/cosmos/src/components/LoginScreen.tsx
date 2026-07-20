import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

// ─── Subtle starfield background particles ────────────────────────────────────
function Starfield() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.sin(i * 2.4) * 50 + 50,
    y: Math.cos(i * 1.7) * 50 + 50,
    size: (i % 3) + 1,
    delay: (i * 0.17) % 4,
    dur: 3 + (i % 3),
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(s => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: 0.15 }}
          animate={{ opacity: [0.05, 0.4, 0.05] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ─── Scan-line overlay ────────────────────────────────────────────────────────
function ScanLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
        backgroundSize: '100% 3px',
      }}
    />
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, placeholder, autoFocus,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-mono">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/[0.20] focus:border-[rgba(147,112,219,0.7)] focus:bg-white/[0.06] rounded-lg px-4 py-3 text-[14px] text-white placeholder-white/20 outline-none transition-all duration-200 font-mono"
        style={{ backdropFilter: 'blur(4px)' }}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { login, signup } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (tab === 'login') {
      const res = await login(email, password);
      if (!res.ok) setError(res.error ?? 'Login failed.');
    } else {
      const res = await signup(email, username, password);
      if (!res.ok) setError(res.error ?? 'Signup failed.');
    }
    setLoading(false);
  };

  const switchTab = (t: 'login' | 'signup') => {
    setTab(t); setError('');
    setEmail(''); setPassword(''); setUsername('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(15,12,40,0.98) 0%, rgba(8,8,20,1) 100%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(147,112,219,0.6) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(79,195,247,0.5) 0%, transparent 70%)' }} />
      </div>
      <Starfield />

      {/* Orbital ring decoration */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full border border-white/[0.03] pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full border border-purple-500/[0.06] pointer-events-none"
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />

      {/* Glass panel */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="relative z-10 w-full max-w-md mx-4"
        style={{
          background: 'rgba(14, 12, 32, 0.85)',
          border: '1px solid rgba(147,112,219,0.18)',
          borderRadius: '20px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(147,112,219,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <ScanLines />

        {/* Header */}
        <div className="relative z-10 text-center pt-10 pb-8 px-8 border-b border-white/[0.05]">
          {/* Cosmos logotype */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-mono mb-3">
              Deep Space System
            </p>
            <h1 className="text-[32px] font-light tracking-[0.25em] uppercase"
              style={{
                background: 'linear-gradient(135deg, #e2d9f3 0%, #b794f4 40%, #9f7aea 70%, #c4a0ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--app-font-heading, sans-serif)',
              }}>
              COSMOS
            </h1>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 font-mono mt-2">
              Science · Explored
            </p>
          </motion.div>
        </div>

        {/* Tab switcher */}
        <div className="relative z-10 flex mx-8 mt-6 rounded-lg overflow-hidden border border-white/[0.07] bg-white/[0.03]">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 text-[12px] uppercase tracking-[0.2em] font-mono transition-all duration-200 ${
                tab === t
                  ? 'bg-purple-600/30 text-purple-200 border-r border-white/[0.05]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="relative z-10 px-8 py-6 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <Field label="Email Address" type="email" value={email} onChange={setEmail}
                placeholder="you@example.com" autoFocus />
              {tab === 'signup' && (
                <Field label="Username" value={username} onChange={setUsername}
                  placeholder="Commander Cosmos" />
              )}
              <Field label="Password" type="password" value={password} onChange={setPassword}
                placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'} />
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[12px] text-red-400/90 font-mono bg-red-500/[0.08] border border-red-500/20 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl text-[13px] font-mono uppercase tracking-[0.2em] text-white relative overflow-hidden mt-1 disabled:opacity-60 transition-opacity"
            style={{
              background: loading
                ? 'rgba(147,112,219,0.2)'
                : 'linear-gradient(135deg, rgba(147,112,219,0.5) 0%, rgba(126,87,194,0.6) 100%)',
              border: '1px solid rgba(147,112,219,0.4)',
              boxShadow: loading ? 'none' : '0 0 20px rgba(147,112,219,0.2)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  className="inline-block w-1 h-1 rounded-full bg-white/60"
                  animate={{ opacity: [0.3,1,0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="inline-block w-1 h-1 rounded-full bg-white/60"
                  animate={{ opacity: [0.3,1,0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="inline-block w-1 h-1 rounded-full bg-white/60"
                  animate={{ opacity: [0.3,1,0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                />
              </span>
            ) : (
              tab === 'login' ? 'Access System' : 'Initialize Profile'
            )}
          </motion.button>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-600 font-mono pt-1">
            {tab === 'login'
              ? 'Your session persists securely across all visits.'
              : 'Your account is saved to the server — access it from any device.'}
          </p>
        </form>

        {/* Bottom accent line */}
        <div className="relative z-10 h-[2px] mx-8 mb-6 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.4), transparent)' }} />
      </motion.div>
    </motion.div>
  );
}
