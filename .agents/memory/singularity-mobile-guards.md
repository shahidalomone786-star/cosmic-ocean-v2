---
name: Singularity mobile and request guards
description: Mobile keyboard layout, regular Listen autoplay priming, and strict Singularity request-size boundaries.
---

The chat surface must use dynamic viewport sizing and scroll the composer into view after keyboard animation begins. Regular Listen playback needs its own reusable audio element, primed synchronously by the Listen click with a valid silent source before TTS fetches; Voice Mode keeps its separate shared audio graph.

**Why:** Mobile browsers resize the visual viewport around the keyboard and reject delayed audio starts unless a trusted gesture has already unlocked the player.

Singularity transport should keep the system prompt, only the newest four historical messages, and the current turn, then apply an exact serialized-character budget with bounded string truncation before calling the provider.

**Why:** Conversation history can exceed provider context limits even when individual turns appear reasonable; the request boundary must enforce the cap rather than relying on provider rejection.