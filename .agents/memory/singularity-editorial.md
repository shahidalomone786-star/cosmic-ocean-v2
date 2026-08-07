---
name: Singularity editorial system
description: Durable rules for the response reading experience and AI editorial behavior.
---

Singularity treats response presentation as an editorial surface: rendered content uses a narrow reading measure with generous rhythm, restrained tables/callouts/code, and unchanged math parsing. The server now uses one consolidated system prompt for persona, scientific integrity, adaptive teaching, and editorial response quality.

**Why:** Consolidating overlapping prompt guidance reduces prompt size and inference overhead while preserving the established transport, rendering, and scientific reliability behavior.

**How to apply:** Keep future Markdown refinements in the renderer, keep LaTeX behavior compatible, and update the consolidated server prompt rather than adding a second editorial prompt layer. Prefer natural structure over forced headings or templates.