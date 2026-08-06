---
name: Singularity chat history
description: Local Singularity history behavior, scalable storage, and sync constraints.
---

Singularity chat history is browser-local and additive: session metadata must remain backward-compatible, while pin/favorite/archive/rename/delete/duplicate/export actions stay outside the streaming transport. IndexedDB is the primary store; localStorage remains the migration and failure fallback.

**Why:** The chat stream is the critical path; productivity actions must never interrupt generation or require backend/API changes.

**How to apply:** Keep smart titles client-side and idle-only, preserve manually renamed titles, cap pinned chats at ten, keep pinned chats above favorites and time-grouped history, provide confirmation plus timed undo for deletion, and keep keyboard shortcuts/focus behavior accessible across desktop and mobile. Store full sessions separately from indexed summaries, page summaries by stable sort cursor, virtualize the row window, soft-delete records, and retry failed writes with reconnect flush.