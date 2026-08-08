---
name: Singularity immersive voice mode
description: Voice Mode uses a separate continuous session controller over existing Whisper, SSE, and Edge TTS primitives.
---

Voice Mode is additive to normal chat: it keeps its own microphone stream, VAD/analyser lifecycle, abort controller, and cancellable sentence-fed Edge TTS queue, while appending turns to the active browser-local chat session.

Voice Mode v2 uses a deliberately minimal full-screen surface: close control, one state-reactive cosmic orb, a single status line, transient two-line subtitles, and a centered mute/end/speaker dock. The visual state maps internal transport phases into idle, listening, thinking, speaking, interrupted, and offline modes.

Voice sessions are generation-gated. Opening primes audio in the user gesture path; every delayed restart, microphone permission result, transcription result, SSE event, and TTS callback must verify that the session is still open and on the same generation. Close, offline, unmount, and interruption abort transport, stop MediaRecorder before tracks, clear timers/RAF, close recording AudioContext, stop the TTS queue, release the shared playback graph, and reset levels.

Voice VAD uses microphone constraints for echo cancellation, noise suppression, and auto gain control, with onset hysteresis and roughly 1,200ms of continuous silence before finishing a turn. Speaking-over detection requires multiple consecutive frames and a short post-playback guard to avoid TTS echo interruptions.

Voice TTS is mobile-gesture-safe: one reusable inline audio element and AudioContext/media source are primed at entry with a valid silent WAV gesture unlock, playback is sequential, and the speaking state starts only from the element's `onplaying` event. The queue awaits unlock settlement, failed chunks retry once, browser playback rejections recover to Listening, and the shared graph is explicitly released at session teardown.

Voice transcription must construct the upload only after both the terminal `dataavailable` and `stop` events arrive. The client rejects empty/tiny or decoded-silent recordings locally, sends only WebM/MP4-compatible media through the existing `audio` multipart field, and quietly restarts Listening after empty or failed transcription. The single server route logs parser, format, payload, and exact Groq failures while returning generic client errors.

Voice response latency is intentionally separate from normal chat: the server bypasses the normal message limiter for `voiceMode`, appends the concise real-time speech instruction, and uses a smaller voice completion budget. The client flushes the first sentence on punctuation or newline as soon as it appears in SSE, buffers complete MP3 responses, prefetches the next queued phrase while the current phrase plays, and consumes audio strictly in order.

**Why:** The existing composer microphone intentionally inserts transcription into the composer and normal chat has a 15-second cooldown; continuous voice needs independent lifecycle ownership and a short voice-only request guard without changing ordinary chat behavior.

**How to apply:** Preserve the separate voice path when changing chat streaming, transcription, or TTS. Interruption must abort the active SSE request, cancel TTS audio/object URLs, and retain a live recording when speech-overlap detection has already begun. Do not reintroduce persistent transcript panels, captions toggles, or per-chunk audio contexts. Keep normal chat streaming and composer recording behavior unchanged.