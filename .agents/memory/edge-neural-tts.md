---
name: Edge Neural TTS
description: Provider choice and fallback behavior for Cosmos speech synthesis
---

Cosmos keeps synthesis server-side through `@andresaya/edge-tts`, using the supported `en-US-AvaMultilingualNeural` voice, bounded frontend chunking, an abortable sequential audio queue, and a bounded message-level background prefetch cache. Microsoft’s live catalog does not provide `en-US-JennyMultilingualNeural`.

**Why:** The previous hosted provider required account-specific paid-plan access and could fail even with configured credentials. Edge Neural removes that dependency, but Microsoft voice availability is authoritative and can differ from requested product copy; Ava is the approved supported multilingual replacement.

**How to apply:** Keep the backend endpoint provider-neutral to the UI, sanitize Markdown/LaTeX artifacts server-side immediately before synthesis, preserve Unicode text, return MP3 audio, and never use `window.speechSynthesis` as a fallback. Prefetch only after a completed assistant stream, key cached chunks by message ID plus cleaned text, keep the cache bounded with URL revocation on eviction, and let playback fall back to a normal request when a prefetched chunk failed. If the configured voice yields no audio, return a clean error so the UI toast explains the failure.

**Playback reliability rule:** Buffer each Edge TTS synthesis into a complete MP3 before returning it to regular browser Listen playback; validate `audio/mpeg` and nonzero bytes client-side, and log upstream status/content details plus media-element errors.

**Why:** Microsoft’s websocket stream can contain valid MP3 frames while still ending in a form that browser MediaSource playback rejects, producing only a generic audio-element failure.

**How to apply:** Use the library’s buffered `synthesize()`/`toBuffer()` path for request-response audio. Reserve direct streaming only for a consumer that has explicitly verified MediaSource compatibility.