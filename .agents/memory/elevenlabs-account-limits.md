---
name: ElevenLabs account limits
description: ElevenLabs voice availability and fallback behavior in this environment
---

The configured ElevenLabs credentials currently reject even the requested Rachel library voice with a paid-plan-required response. The server keeps the keys private, rotates through the configured pool on account/quota/rate-limit failures, and preserves browser speech as the user-facing fallback.

**Why:** A live routed TTS request returned HTTP 402 for Rachel after every configured key was tried, even though the keys were present and the server was healthy.

**How to apply:** When changing TTS routes or listen buttons, keep a distinct aggregate premium-plan error code, rotate on 401/402/403/429 responses, and ensure every listen surface can fall back to `speechSynthesis` without leaving a loading or playing state stuck.