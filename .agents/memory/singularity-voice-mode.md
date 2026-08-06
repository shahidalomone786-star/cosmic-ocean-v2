---
name: Singularity immersive voice mode
description: Voice Mode uses a separate continuous session controller over existing Whisper, SSE, and Edge TTS primitives.
---

Voice Mode is additive to normal chat: it keeps its own microphone stream, VAD/analyser lifecycle, abort controller, and cancellable sentence-fed Edge TTS queue, while appending turns to the active browser-local chat session.

**Why:** The existing composer microphone intentionally inserts transcription into the composer and normal chat has a 15-second cooldown; continuous voice needs independent lifecycle ownership and a short voice-only request guard without changing ordinary chat behavior.

**How to apply:** Preserve the separate voice path when changing chat streaming, transcription, or TTS. Interruption must abort the active SSE request, cancel TTS audio/object URLs, and retain a live recording when speech-overlap detection has already begun.