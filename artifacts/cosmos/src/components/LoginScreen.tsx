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
  label, type = 'text', value, onChange, placeholder, autoFocus, autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-mono">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
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
  const [gLoading, setGLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuthStore();

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
                placeholder="you@example.com" autoFocus
                autoComplete={tab === 'login' ? 'username' : 'email'} />
              {tab === 'signup' && (
                <Field label="Username" value={username} onChange={setUsername}
                  placeholder="Commander Cosmos" autoComplete="username" />
              )}
              <Field label="Password" type="password" value={password} onChange={setPassword}
                placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
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

          {/* Divider */}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-[10px] font-mono tracking-[0.2em] text-slate-600 uppercase">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Google OAuth button */}
          <motion.button
            type="button"
            disabled={gLoading || loading}
            onClick={async () => { setGLoading(true); await loginWithGoogle(); setGLoading(false); }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[13px] font-mono tracking-[0.06em] text-white/90 relative overflow-hidden disabled:opacity-50 transition-opacity"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: gLoading ? 'none' : '0 0 24px rgba(66,133,244,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Animated glow ring */}
            {!gLoading && (
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ boxShadow: '0 0 20px rgba(66,133,244,0.2), 0 0 40px rgba(52,168,83,0.08)' }}
              />
            )}
            {/* Google "G" logo */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {gLoading ? 'Redirecting…' : 'Sign in with Google'}
          </motion.button>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-600 font-mono pt-1">
            {tab === 'login'
              ? 'Session persists securely — no re-login on refresh.'
              : 'Account stored permanently — access from any device.'}
          </p>
        </form>

        {/* Bottom accent line */}
        <div className="relative z-10 h-[2px] mx-8 mb-6 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(147,112,219,0.4), transparent)' }} />
      </motion.div>
    </motion.div>
  );
}
