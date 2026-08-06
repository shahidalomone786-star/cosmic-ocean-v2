---
name: Edge Neural TTS
description: Provider choice and fallback behavior for Cosmos speech synthesis
---

Cosmos keeps synthesis server-side through `@andresaya/edge-tts`, with bounded frontend chunking and an abortable sequential audio queue. The requested `en-US-JennyMultilingualNeural` identifier is not present in Microsoft's live voice catalog; the catalog exposes `en-US-JennyNeural` and separate multilingual voices such as Ava, so the backend must fail explicitly rather than substitute a voice.

**Why:** The previous hosted provider required account-specific paid-plan access and could fail even with configured credentials. Edge Neural removes that dependency, but Microsoft voice availability is authoritative and can differ from requested product copy.

**How to apply:** Keep the backend endpoint provider-neutral to the UI, preserve Unicode text, return MP3 audio, and never use `window.speechSynthesis` as a fallback. If the exact configured voice yields no audio, return a clean error so the UI toast explains the failure; only change the voice after explicit product approval.