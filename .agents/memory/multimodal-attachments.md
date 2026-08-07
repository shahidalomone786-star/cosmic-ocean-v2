---
name: Singularity multimodal attachments
description: Image attachments must remain structured, locally optimized, and capability-gated while preserving text-only streaming.
---

Image attachments are an additive multimodal layer: optimize and validate them in the browser, keep them out of visible prompt text, send them as structured image content only when a vision-capable model is available, and never resend prior image bytes on follow-ups.

**Why:** Singularity's existing stream uses a text model and must not receive invalid multimodal payloads or unbounded base64 history; historical image bytes also inflate serialized request estimates even when the provider would treat them as visual input.

**How to apply:** Keep document ingestion separate, enforce five images/10 MB input limits, resize browser output to at most 768px with quality 0.7, validate signatures server-side, preserve image metadata in message history but reduce historical image turns to `[Previous image]` at transport time, route only the active image turn to Groq `qwen/qwen3.6-27b` with the existing vision pipeline and 1500-token completion ceiling, keep text turns on `openai/gpt-oss-120b` with history and 4000 tokens, estimate image URLs by structured markers rather than base64 length, and sanitize final-answer output without removing the reasoning channel.