import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth and wallet actions are unavailable until configured.');
}

// Keep the app renderable in previews where the managed workflow has not
// injected the project secrets yet. This is never a successful auth path:
// every request against the placeholder fails, while a configured build uses
// the real Supabase values above.
const resolvedSupabaseUrl = supabaseUrl || 'https://supabase-not-configured.invalid';
const resolvedSupabaseAnonKey = supabaseAnonKey || 'supabase-not-configured';

// This client remains the app-wide auth/session client. Keeping auth on a
// normal client is important because Supabase disables `supabase.auth` when a
// client is configured with the accessToken option.
export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

/**
 * Create a data client whose PostgREST requests always use the exact JWT
 * verified by the caller. This is intentionally per-request so a stale token
 * cannot linger in shared headers, while the regular client above continues
 * to own auth persistence and auth-state listeners.
 */
export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    accessToken: async () => accessToken,
  });
}
