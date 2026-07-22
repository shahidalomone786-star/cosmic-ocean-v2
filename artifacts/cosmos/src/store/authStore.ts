import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

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
  login:           (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup:          (email: string, username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout:          () => Promise<void>;
  checkSession:    () => Promise<void>;
  updateProfile:   (updates: Partial<Pick<UserProfile, 'username' | 'avatar'>>) => Promise<void>;
  recordChessResult: (result: 'win' | 'loss') => Promise<void>;
}

// ─── Preset avatars ───────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
type SupabaseAuthUser = { id: string; email?: string | null; created_at?: string };
type ProfileRow = {
  username?: string | null;
  avatar?: string | null;
  chess_wins?: number | null;
  chess_losses?: number | null;
  join_date?: string | null;
};

function buildProfile(authUser: SupabaseAuthUser, row?: ProfileRow | null): UserProfile {
  return {
    id:          authUser.id,
    email:       authUser.email ?? '',
    username:    row?.username  ?? authUser.email?.split('@')[0] ?? 'Explorer',
    avatar:      row?.avatar    ?? PRESET_AVATARS[0].url,
    joinDate:    row?.join_date ?? authUser.created_at ?? new Date().toISOString(),
    chessWins:   row?.chess_wins   ?? 0,
    chessLosses: row?.chess_losses ?? 0,
  };
}

async function fetchOrCreateProfile(authUser: SupabaseAuthUser): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] profiles fetch error:', error.message);
    return buildProfile(authUser, null);
  }

  if (!data) {
    // First sign-in: seed the row (trigger may have already done it — upsert is safe)
    const newRow = {
      id:           authUser.id,
      email:        authUser.email ?? '',
      username:     authUser.email?.split('@')[0] ?? 'Explorer',
      avatar:       PRESET_AVATARS[0].url,
      join_date:    new Date().toISOString(),
      chess_wins:   0,
      chess_losses: 0,
    };
    await supabase.from('profiles').upsert(newRow);
    return buildProfile(authUser, newRow);
  }

  return buildProfile(authUser, data);
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

      async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: error.message };
        const profile = await fetchOrCreateProfile(data.user);
        set({ isAuthenticated: true, user: profile });
        return { ok: true };
      },

      async signup(email, username, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { ok: false, error: error.message };
        if (!data.user) return { ok: false, error: 'Signup failed — please check your email for a confirmation link.' };

        const newRow = {
          id:           data.user.id,
          email,
          username,
          avatar:       PRESET_AVATARS[0].url,
          join_date:    new Date().toISOString(),
          chess_wins:   0,
          chess_losses: 0,
        };
        await supabase.from('profiles').upsert(newRow);
        const profile = buildProfile(data.user, newRow);
        // Supabase may require email confirmation depending on project settings
        const confirmed = !!data.session;
        set({ isAuthenticated: confirmed, user: confirmed ? profile : null });
        if (!confirmed) {
          return { ok: false, error: 'Check your inbox — confirm your email to activate your account.' };
        }
        return { ok: true };
      },

      async loginWithGoogle() {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
      },

      async logout() {
        await supabase.auth.signOut();
        set({ isAuthenticated: false, user: null });
      },

      async checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        const profile = await fetchOrCreateProfile(session.user);
        set({ isAuthenticated: true, user: profile });
      },

      async updateProfile(updates) {
        const { user } = get();
        if (!user) return;
        const dbUpdates: Record<string, string> = {};
        if (updates.username) dbUpdates.username = updates.username;
        if (updates.avatar)   dbUpdates.avatar   = updates.avatar;
        await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
        set({ user: { ...user, ...updates } });
      },

      async recordChessResult(result) {
        const { user } = get();
        if (!user) return;
        const updated = {
          ...user,
          chessWins:   user.chessWins   + (result === 'win'  ? 1 : 0),
          chessLosses: user.chessLosses + (result === 'loss' ? 1 : 0),
        };
        set({ user: updated });
        await supabase
          .from('profiles')
          .update({ chess_wins: updated.chessWins, chess_losses: updated.chessLosses })
          .eq('id', user.id);
      },
    }),
    {
      name: 'cosmos-auth-v3',
      partialize: state => ({ isAuthenticated: state.isAuthenticated, user: state.user }),
    },
  ),
);

// Subscribe to Supabase auth state changes so session persists across page reloads
// (Google OAuth redirect lands back here and fires this listener)
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const profile = await fetchOrCreateProfile(session.user);
    useAuthStore.setState({ isAuthenticated: true, user: profile });
  } else {
    useAuthStore.setState({ isAuthenticated: false, user: null });
  }
});
