---
name: Singularity AI modes
description: Server-owned operating modes and clean-context boundaries for Singularity requests.
---

Singularity modes are an explicit request policy, not separate API implementations. One shared core prompt is combined with only the active short override. Pro keeps balanced context and adds follow-up chips; Max omits old history/attachments and structures deep answers; Flash uses the smallest practical context and one-screen answers; Research adds an evidence footer.

**Why:** Mode choice should change how a request is interpreted without changing authentication, authorization, rate limits, safety controls, stored chat history, or the shared streaming transport.

**How to apply:** Keep the selected mode in a versioned browser-local preference, send it with each request, and enforce its context policy again on the server. The per-mode input budget plus output budget must never exceed 8,000 tokens. Max must ignore forged history/attachment fields server-side while leaving the local session untouched. Keep the four public IDs stable: `pro`, `max`, `flash`, and `research`.