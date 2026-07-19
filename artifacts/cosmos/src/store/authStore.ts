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

interface StoredAccount {
  password: string; // plaintext — client-only simulation, no real backend
  profile: UserProfile;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  accounts: Record<string, StoredAccount>; // keyed by email

  // Actions
  login: (email: string, password: string) => { ok: boolean; error?: string };
  signup: (email: string, username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => void;
  recordChessResult: (result: 'win' | 'loss') => void;
}

// ─── Unique ID generator ──────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Default avatars ──────────────────────────────────────────────────────────
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
      accounts: {},

      login(email, password) {
        const key = email.trim().toLowerCase();
        const account = get().accounts[key];
        if (!account) return { ok: false, error: 'No account found with that email.' };
        if (account.password !== password) return { ok: false, error: 'Incorrect password.' };
        set({ isAuthenticated: true, user: account.profile });
        return { ok: true };
      },

      signup(email, username, password) {
        const key = email.trim().toLowerCase();
        if (get().accounts[key]) return { ok: false, error: 'An account with this email already exists.' };
        if (!email.includes('@')) return { ok: false, error: 'Please enter a valid email address.' };
        if (username.trim().length < 2) return { ok: false, error: 'Username must be at least 2 characters.' };
        if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

        const profile: UserProfile = {
          id: uid(),
          email: key,
          username: username.trim(),
          avatar: PRESET_AVATARS[0].url,
          joinDate: new Date().toISOString(),
          chessWins: 0,
          chessLosses: 0,
        };
        const account: StoredAccount = { password, profile };
        set(state => ({
          accounts: { ...state.accounts, [key]: account },
          isAuthenticated: true,
          user: profile,
        }));
        return { ok: true };
      },

      logout() {
        set({ isAuthenticated: false, user: null });
      },

      updateProfile(updates) {
        const { user, accounts } = get();
        if (!user) return;
        const updatedUser = { ...user, ...updates };
        const key = user.email;
        set({
          user: updatedUser,
          accounts: {
            ...accounts,
            [key]: { ...accounts[key], profile: updatedUser },
          },
        });
      },

      recordChessResult(result) {
        const { user, accounts } = get();
        if (!user) return;
        const key = user.email;
        const updatedUser: UserProfile = {
          ...user,
          chessWins:   user.chessWins   + (result === 'win'  ? 1 : 0),
          chessLosses: user.chessLosses + (result === 'loss' ? 1 : 0),
        };
        set({
          user: updatedUser,
          accounts: {
            ...accounts,
            [key]: { ...accounts[key], profile: updatedUser },
          },
        });
      },
    }),
    {
      name: 'cosmos-auth-v1', // localStorage key
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accounts: state.accounts,
      }),
    }
  )
);
