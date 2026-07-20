import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar: string;
  joinDate: string;
  chessWins: number;
  chessLosses: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;

  // Actions
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => Promise<void>;
  recordChessResult: (result: 'win' | 'loss') => Promise<void>;
}

// ─── Base URL helper ──────────────────────────────────────────────────────────
// Uses a relative path so it works through the Replit shared proxy on any domain.
const API = '/api';

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

// ─── Preset avatars (kept for profile picker UI) ──────────────────────────────
export const PRESET_AVATARS: { label: string; url: string }[] = [
  { label: 'Einstein',   url: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg' },
  { label: 'Feynman',    url: 'https://upload.wikimedia.org/wikipedia/en/4/42/Richard_Feynman_Nobel.jpg' },
  { label: 'Carl Sagan', url: '/carl-sagan.jpg' },
  { label: 'Tesla',      url: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg' },
  { label: 'Mahera',     url: '/mehera.jpg' },
  { label: 'Curie',      url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_c._1920s.jpg' },
  { label: 'Hawking',    url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Stephen_Hawking.StarChild.jpg' },
  { label: 'Turing',     url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg' },
];

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

      async login(email, password) {
        try {
          const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json() as { ok: boolean; error?: string; user?: UserProfile };
          if (!data.ok) return { ok: false, error: data.error ?? 'Login failed.' };
          set({ isAuthenticated: true, user: data.user! });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Network error — please try again.' };
        }
      },

      async signup(email, username, password) {
        try {
          const res = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
          });
          const data = await res.json() as { ok: boolean; error?: string; user?: UserProfile };
          if (!data.ok) return { ok: false, error: data.error ?? 'Signup failed.' };
          set({ isAuthenticated: true, user: data.user! });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Network error — please try again.' };
        }
      },

      async logout() {
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } catch {
          // fire and forget — clear state regardless
        }
        set({ isAuthenticated: false, user: null });
      },

      async checkSession() {
        try {
          const res = await apiFetch('/auth/me');
          if (!res.ok) {
            set({ isAuthenticated: false, user: null });
            return;
          }
          const data = await res.json() as { ok: boolean; user?: UserProfile };
          if (data.ok && data.user) {
            set({ isAuthenticated: true, user: data.user });
          } else {
            set({ isAuthenticated: false, user: null });
          }
        } catch {
          // Network unavailable — keep whatever persisted state exists
        }
      },

      async updateProfile(updates) {
        const { user } = get();
        if (!user) return;
        try {
          const res = await apiFetch('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(updates),
          });
          const data = await res.json() as { ok: boolean; user?: UserProfile };
          if (data.ok && data.user) {
            set({ user: data.user });
          }
        } catch {
          // Optimistic local update as fallback
          set({ user: { ...user, ...updates } });
        }
      },

      async recordChessResult(result) {
        const { user } = get();
        if (!user) return;
        // Optimistic update immediately for snappy UI
        set({
          user: {
            ...user,
            chessWins:   user.chessWins   + (result === 'win'  ? 1 : 0),
            chessLosses: user.chessLosses + (result === 'loss' ? 1 : 0),
          },
        });
        try {
          const res = await apiFetch('/auth/chess', {
            method: 'POST',
            body: JSON.stringify({ result }),
          });
          const data = await res.json() as { ok: boolean; user?: UserProfile };
          if (data.ok && data.user) {
            set({ user: data.user }); // sync confirmed state from DB
          }
        } catch {
          // optimistic state already applied; DB will catch up on next session
        }
      },
    }),
    {
      name: 'cosmos-auth-v2',
      // Only persist the safe display profile — never passwords or sensitive data
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);
