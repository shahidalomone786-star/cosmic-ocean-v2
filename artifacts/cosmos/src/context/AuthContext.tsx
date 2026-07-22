import { createContext, useContext, type ReactNode } from 'react';
import { useAuthStore, type UserProfile } from '../store/authStore';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:            UserProfile | null;
  isAuthenticated: boolean;
  login:           (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup:          (email: string, username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout:          () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, login, signup, loginWithGoogle, logout } = useAuthStore();

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
