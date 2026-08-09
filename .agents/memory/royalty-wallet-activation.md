---
name: Royalty wallet activation
description: The operational boundary for activating the Cosmic Ocean Royalty wallet securely.
---

The Royalty client is intentionally read-only for balances and relies on a Supabase migration for the `wallets` table, RLS, zero-balance creation, and the authenticated `ensure_wallet` function.

**Why:** A browser session must not be able to mint or alter virtual currency, and the local preview cannot apply SQL to the user's Supabase project or prove cross-account isolation without authenticated test accounts.

**How to apply:** Before treating Royalty as live, apply `artifacts/cosmos/supabase-royalty.sql` in the existing Supabase project, then verify one authenticated user can read/create only their wallet while updates and cross-user reads are denied.

An unauthenticated local preview cannot prove the final authenticated UI read: it can only verify that the public wallet query is RLS-scoped and that `ensure_wallet` rejects anonymous callers. Keep an already-authenticated browser session available for the last visual check.

**Why:** The preview browser starts signed out, and creating a disposable production account solely for verification would add live user data without the user's explicit approval.

**How to apply:** Report the authenticated UI step as pending when the preview has no session; do not claim Royalty balances were displayed unless the balance cards and browser console were observed while signed in.