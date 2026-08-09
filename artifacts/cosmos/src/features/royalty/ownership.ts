import { supabase } from '../../lib/supabase';
import { findCosmicAvatar } from '../../components/cosmic-atelier/cosmicAtelierCatalog';

type OwnershipRow = {
  avatar_id: string | null;
};

/**
 * Supabase is the authority for the inventory. This query intentionally does
 * not add a client-supplied user id filter: the authenticated session and the
 * ownership table's RLS policy scope the result to the current user.
 */
export async function fetchOwnedCosmicAvatarIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('cosmic_avatar_ownerships')
    .select('avatar_id');

  if (error) throw error;

  const rows = (data ?? []) as OwnershipRow[];
  return new Set(
    rows
      .map(row => row.avatar_id)
      .filter((avatarId): avatarId is string => Boolean(avatarId && findCosmicAvatar(avatarId))),
  );
}