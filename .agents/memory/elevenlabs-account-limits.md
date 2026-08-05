---
name: ElevenLabs account limits
description: ElevenLabs voice availability and fallback behavior in this environment
---

The configured ElevenLabs credentials currently reject even the requested Rachel library voice with a paid-plan-required response. The current API also rejects the deprecated monolingual v1 model. The server keeps keys private, rotates through the configured pool, and preserves browser speech as fallback.

**Why:** Live routed requests showed that Rachel still depends on account eligibility, while `eleven_monolingual_v1` is rejected as deprecated by the current ElevenLabs API.

**How to apply:** Use a currently supported model such as `eleven_turbo_v2`, keep a distinct aggregate premium-plan error code, rotate on 401/402/403/429 responses, and ensure every listen surface can fall back to `speechSynthesis` without leaving a loading or playing state stuck.