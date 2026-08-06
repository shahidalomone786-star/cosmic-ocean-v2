---
name: Singularity chat history
description: Phase A/B history behavior and constraints for the local Singularity sidebar.
---

Singularity chat history is browser-local and additive: session metadata must remain backward-compatible, while pin/favorite/archive/rename/delete/duplicate/export actions stay outside the streaming transport.

**Why:** The chat stream is the critical path; productivity actions must never interrupt generation or require backend/API changes.

**How to apply:** Keep smart titles client-side and idle-only, preserve manually renamed titles, cap pinned chats at ten, keep pinned chats above favorites and time-grouped history, provide confirmation plus timed undo for deletion, and keep keyboard shortcuts/focus behavior accessible across desktop and mobile.