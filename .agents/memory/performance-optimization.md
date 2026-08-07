---
name: Cosmos performance optimization
description: Safe client-side performance boundaries for preserving Cosmos behavior while reducing initial work.
---

Keep the initial Cosmos path focused on authentication and chat. Load secondary science surfaces and document tooling only when they are needed, and cancel obsolete user-driven requests without changing streaming or API semantics.

**Why:** The app contains several large, infrequently used tools; loading them eagerly materially increases first-load cost, while stale autocomplete and overlapping session reads create avoidable network work.

**How to apply:** Preserve the existing chat, auth, streaming, and visual behavior. Prefer interaction-triggered dynamic imports for secondary features, defer PDF parsing dependencies until a PDF is attached, abort superseded autocomplete/search requests, and deduplicate concurrent profile reads.