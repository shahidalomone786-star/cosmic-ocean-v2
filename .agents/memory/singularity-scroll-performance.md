---
name: Singularity scroll performance
description: Scroll and streaming-render performance constraints for the Singularity chat surface.
---

Singularity's chat uses native `content-visibility: auto` for off-screen message rendering rather than a second virtualization library. Scroll metrics are read once per animation frame, auto-follow writes are frame-coalesced, and resize-driven follow-up only runs while the user is already near the bottom.

**Why:** A second virtualized list would risk breaking variable-height Markdown, KaTeX, code blocks, attachments, and interactive message controls. The native browser windowing already reduces off-screen work while preserving the existing layout and scroll model.

**How to apply:** Keep scroll listeners passive, avoid `will-change: scroll-position`, skip no-op streaming state commits, keep streaming-specific props isolated to the active row, and never force the user back to the bottom after manual upward scrolling.