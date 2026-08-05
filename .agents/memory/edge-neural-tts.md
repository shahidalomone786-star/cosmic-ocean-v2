---
name: Edge Neural TTS
description: Provider choice and fallback behavior for Cosmos speech synthesis
---

Cosmos uses Microsoft Edge's public `en-IN-NeerjaNeural` voice through `@andresaya/edge-tts` at a `+15%` rate; the backend keeps synthesis server-side and the browser speech API remains the automatic fallback.

**Why:** The previous hosted provider required account-specific paid-plan access and could fail even with configured credentials. Edge Neural removes that dependency and does not require an API key.

**How to apply:** Keep the backend endpoint provider-neutral to the UI, strip Markdown/math/list syntax before synthesis, return MP3 audio, and never leave a listen control permanently unavailable when the remote service fails.