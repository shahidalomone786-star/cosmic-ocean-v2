---
name: Singularity voice engine
description: Voice capture, preprocessing, and transcription boundaries for Singularity.
---

Singularity voice input is additive to the existing chat transport: the browser owns microphone permission, MediaRecorder capture, silence detection, duration limits, and editable composer insertion; the API owns validation, in-memory multipart handling, and rotating-key Whisper transcription.

**Why:** Voice should improve message composition without coupling microphone lifecycle or upload failures to streaming responses, TTS playback, attachments, or chat history.

**How to apply:** Keep transcription non-sending, preserve tap and press-and-hold controls, stop safely on silence/background/unmount, keep audio bounded and signature-validated, and use the shared Groq rotation utility for `whisper-large-v3`.