---
name: Singularity AI modes
description: Server-owned operating modes and clean-context boundaries for Singularity requests.
---

Singularity modes are an explicit request policy, not separate API implementations. Pro keeps the existing prompt, bounded history, attachments, model routing, and streaming behavior. Max uses a minimal Shahid-aware instruction, omits conversational history and attachments, and requests a larger bounded output budget. Flash adds concise guidance with a smaller budget. Research adds evidence-oriented guidance and a larger budget.

**Why:** Mode choice should change how a request is interpreted without changing authentication, authorization, rate limits, safety controls, stored chat history, or the shared streaming transport.

**How to apply:** Keep the selected mode in a versioned browser-local preference, send it with each request, and enforce its context policy again on the server. Max must ignore forged history/attachment fields server-side while leaving the local session untouched. Keep the four public IDs stable: `pro`, `max`, `flash`, and `research`.