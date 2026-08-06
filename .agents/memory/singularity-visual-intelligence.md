---
name: Singularity visual intelligence
description: Architecture and guardrails for asynchronous visual references below Singularity responses.
---

Singularity visual references are an additive post-stream capability: the text response must render immediately, then a separate bounded request decides whether visuals improve understanding. The decision layer prefers educational Wikimedia Commons imagery, expands queries into descriptive subjects, caches short-lived results, deduplicates URLs, and returns a safe unavailable state on failure. Visual metadata is stored with the browser-local assistant message so reloaded conversations retain their references.

**Why:** Images should function as evidence, not decoration, and image search must never delay or destabilize the existing streaming, voice, attachment, or chat-history paths.

**How to apply:** Keep the visual request independent from `/api/singularity`; preserve text-only behavior for coding, translation, proofs, poetry, legal drafting, and emails unless visuals are explicit. Keep result counts bounded, captions concise, images lazy-loaded, and failure states non-blocking.