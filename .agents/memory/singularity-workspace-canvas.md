---
name: Singularity Workspace canvas
description: Browser-local editorial workspace behavior and its boundary with chat.
---

The Workspace is a browser-local editorial canvas seeded from saved or selected assistant responses. Its document state, autosave snapshots, exports, and selection transforms must remain separate from the original chat messages.

**Why:** The product promise is that an exchange can become a durable research artifact without rewriting the conversation that produced it or changing backend streaming and AI contracts.

**How to apply:** Extend the existing Workspace seam rather than adding a second persistence system; preserve saved-response compatibility, keep snapshots bounded and defensively parsed, and keep unavailable exports clearly labeled instead of generating fake files.