---
name: Cosmic gallery safety routing
description: Adult gallery sources are opt-in by explicit query intent and adult-source rights metadata is never inferred
---

## Rule
Cosmic Ocean gallery searches default to strict safe-search behavior and must never dispatch adult-specific providers unless the query has explicit adult intent. Explicit mature intent routes only to the Eporner/Danbooru dual engine, whose results are interleaved and always presented with unknown licensing and source-verification attribution.

**Why:** General science, museum, and art searches must not accidentally expose adult records, while public adult-capable feeds do not provide reliable reuse rights.

**How to apply:** Keep intent classification server-owned, pass provider-specific safe-search flags through the shared gallery context, and preserve the existing deduplication/ranking pipeline after routing.