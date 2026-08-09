---
name: Royalty wallet activation
description: The operational boundary for activating the Cosmic Ocean Royalty wallet securely.
---

The Royalty client is intentionally read-only for balances and relies on a Supabase migration for the `wallets` table, RLS, zero-balance creation, and the authenticated `ensure_wallet` function.

**Why:** A browser session must not be able to mint or alter virtual currency, and the local preview cannot apply SQL to the user's Supabase project or prove cross-account isolation without authenticated test accounts.

**How to apply:** Before treating Royalty as live, apply `artifacts/cosmos/supabase-royalty.sql` in the existing Supabase project, then verify one authenticated user can read/create only their wallet while updates and cross-user reads are denied.