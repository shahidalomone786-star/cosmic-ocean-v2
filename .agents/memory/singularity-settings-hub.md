---
name: Singularity settings hub
description: Local-only personalization and privacy boundaries for the Singularity control center.
---

Singularity settings are intentionally isolated from chat transport and persisted as a versioned, defensively merged browser-local preference object. Appearance previews are scoped to the settings surface; preference changes do not silently alter AI, voice, or attachment pipelines.

**Why:** The product must offer a rich control center without changing production AI behavior or interrupting an active chat.

**How to apply:** Keep new personalization fields backward-compatible with defaults, use confirmation for destructive local actions, and clear both IndexedDB and localStorage when removing browser-local chat history.