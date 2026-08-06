---
name: Edge Neural TTS
description: Provider choice and fallback behavior for Cosmos speech synthesis
---

Cosmos keeps synthesis server-side through `@andresaya/edge-tts`, using the supported `en-US-AvaMultilingualNeural` voice, bounded frontend chunking, and an abortable sequential audio queue. Microsoft’s live catalog does not provide `en-US-JennyMultilingualNeural`.

**Why:** The previous hosted provider required account-specific paid-plan access and could fail even with configured credentials. Edge Neural removes that dependency, but Microsoft voice availability is authoritative and can differ from requested product copy; Ava is the approved supported multilingual replacement.

**How to apply:** Keep the backend endpoint provider-neutral to the UI, preserve Unicode text, return MP3 audio, and never use `window.speechSynthesis` as a fallback. If the configured voice yields no audio, return a clean error so the UI toast explains the failure.