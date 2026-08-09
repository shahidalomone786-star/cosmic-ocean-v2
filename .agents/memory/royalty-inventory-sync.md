---
name: Royalty inventory sync
description: Purchased Cosmic Atelier avatars are merged into the existing Avatar section from RLS-scoped Supabase ownership.
---

Cosmic Atelier inventory is server-authoritative and additive: the browser hydrates owned catalog IDs from the authenticated Supabase session, clears them on auth changes, and revalidates when Atelier opens. Only verified owned entries are merged into the existing Cosmic Pix avatar flow.

**Why:** Local ownership state can leak a previous user's inventory or show a stale Buy/Owned state during refresh, logout/login, or cross-device use.

**How to apply:** Preserve the session-verification gate, RLS-scoped ownership query without client identity trust, explicit syncing/error states, and the catalog as the single source for artwork, personality, model, and Edge TTS voice metadata.