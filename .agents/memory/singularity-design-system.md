---
name: Singularity design system
description: Durable UI polish rules for the shared Singularity/Cosmos frontend.
---

The Singularity interface uses a centralized token vocabulary for spacing, radii, motion timing, focus rings, borders, and elevation. Shared primitives should consume these tokens, while chat-specific presentation stays in the Singularity components.

**Why:** The product has many independently authored science surfaces and the premium feel depends on consistent interaction timing, focus treatment, and surface language rather than isolated visual fixes.

**How to apply:** Prefer shared design-system classes and UI primitives for new controls, preserve the 120/180/240/300ms motion scale, and keep reduced-motion behavior global. Floating controls should use bounded viewport-aware height and explicit overflow behavior so the same surface remains usable on short mobile screens.

For the Singularity chat composer, the preferred pattern is a compact, height-driven horizontal bar: controls stay visually integrated and quiet, while only the ready send action receives filled emphasis.

**Why:** The composer is primarily used on mobile, where a tall card-like shell and multiple prominent circular controls reduce usable chat space and feel visually disconnected.

**How to apply:** Keep the empty composer around 56–64px on mobile and 60–68px on desktop; preserve 44px hit targets without making those targets visually dominant.