---
name: ElevenLabs account limits
description: ElevenLabs voice availability and fallback behavior in this environment
---

The configured ElevenLabs credentials currently reject library voices with a paid-plan-required response. Treat that as a provider capability limitation, not a transient gateway error, and preserve browser speech as the user-facing fallback.

**Why:** A live routed TTS request returned HTTP 402 for the configured library voice even though the API keys were present and the server was healthy.

**How to apply:** When changing TTS routes or listen buttons, keep a distinct premium-plan error code and ensure every listen surface can fall back to `speechSynthesis` without leaving a loading or playing state stuck.