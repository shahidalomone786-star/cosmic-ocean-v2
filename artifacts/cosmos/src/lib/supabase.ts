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
export const supabase = createClient(
  supabaseUrl || 'https://supabase-not-configured.invalid',
  supabaseAnonKey || 'supabase-not-configured',
);
