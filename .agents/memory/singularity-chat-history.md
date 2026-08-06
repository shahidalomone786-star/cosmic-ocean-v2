---
name: Singularity chat history
description: Local Singularity history behavior, scalable storage, and sync constraints.
---

Singularity chat history is browser-local and additive: session metadata must remain backward-compatible, while pin/favorite/archive/rename/delete/duplicate/export actions stay outside the streaming transport. IndexedDB is the primary store; localStorage remains the migration and failure fallback. The API applies a final serialized-message budget after assembling the detailed system prompt, retained history, and newest user turn.

**Why:** The chat stream is the critical path; productivity actions must never interrupt generation or require backend/API changes. A character-only history limit can still overflow the provider once the system prompt and JSON message overhead are included.

**How to apply:** Keep smart titles client-side and idle-only, preserve manually renamed titles, cap pinned chats at ten, keep pinned chats above favorites and time-grouped history, provide confirmation plus timed undo for deletion, and keep keyboard shortcuts/focus behavior accessible across desktop and mobile. Store full sessions separately from indexed summaries, page summaries by stable sort cursor, virtualize the row window, and retry failed writes with reconnect flush. Enforce message cooldowns, bounded model context, serialized payload limits, and audio transcription limits in the API; the backend remains authoritative.