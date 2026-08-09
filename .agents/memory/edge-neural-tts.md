---
name: Edge Neural TTS
description: Provider choice and fallback behavior for Cosmos speech synthesis
---

Cosmos keeps synthesis server-side through `@andresaya/edge-tts`, using `en-US-AvaMultilingualNeural` as the default plus a server-allowlisted set of verified Cosmic Atelier voices (`en-US-EmmaNeural`, `en-US-BrianMultilingualNeural`, `en-US-ChristopherNeural`, `en-US-AriaNeural`, and `en-US-GuyNeural`). The frontend uses bounded chunking and abortable ordered playback; Atelier voice previews pass their selected voice explicitly while Voice Mode remains on the default.

**Why:** The previous hosted provider required account-specific paid-plan access and could fail even with configured credentials. Edge Neural removes that dependency, but Microsoft voice availability is authoritative and can differ from requested product copy; Ava is the approved supported multilingual replacement.

**How to apply:** Keep the backend endpoint provider-neutral to the UI, sanitize Markdown/LaTeX artifacts server-side immediately before synthesis, preserve Unicode text, return MP3 audio, and never use `window.speechSynthesis` as a fallback. Keep the default voice unchanged for general chat and Voice Mode; only pass a voice from the verified Atelier allowlist for Atelier previews. Prefetch only after a completed assistant stream, key cached chunks by message ID plus cleaned text, keep the cache bounded with URL revocation on eviction, and let playback fall back to a normal request when a prefetched chunk failed. If the configured voice yields no audio, return a clean error so the UI toast explains the failure.

**Playback reliability rule:** Buffer each Edge TTS synthesis into a complete MP3 before returning it to either regular browser Listen playback or Voice Mode; validate `audio/mpeg` and nonzero bytes client-side, keep playback sequential, prefetch only the next phrase while audio is playing, and log upstream status/content details plus media-element errors.

**Why:** Microsoft’s websocket stream can contain valid MP3 frames while still ending in a form that browser MediaSource playback rejects, producing only a generic audio-element failure.

**How to apply:** Use the library’s buffered `synthesize()`/`toBuffer()` path for request-response audio. Reserve direct streaming only for a consumer that has explicitly verified MediaSource compatibility.