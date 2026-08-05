---
name: Singularity multimodal attachments
description: Image attachments must remain structured, locally optimized, and capability-gated while preserving text-only streaming.
---

Image attachments are an additive multimodal layer: optimize and validate them in the browser, keep them out of visible prompt text, send them as structured image content only when a vision-capable model is available, and retain only bounded prior image context for follow-ups.

**Why:** Singularity's existing stream uses a text model and must not receive invalid multimodal payloads or unbounded base64 history.

**How to apply:** Keep document ingestion separate, enforce five images/10 MB input limits, validate signatures server-side, preserve image metadata in message history, route image turns to OpenAI `gpt-4o-mini`, keep text turns on `openai/gpt-oss-120b` through Groq, and show a clean configuration error when `OPENAI_API_KEY` is unavailable.