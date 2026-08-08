---
name: Singularity AI modes
description: Server-owned operating modes and clean-context boundaries for Singularity requests.
---

Singularity modes are an explicit request policy, not separate API implementations. One shared core prompt is combined with only the active short override. Pro keeps balanced context and adds follow-up chips; Max omits old history/attachments and structures deep answers; Flash uses the smallest practical context and one-screen answers; Research adds an evidence footer.

**Why:** Mode choice should change how a request is interpreted without changing authentication, authorization, rate limits, safety controls, stored chat history, or the shared streaming transport.

**How to apply:** Keep the selected mode in a versioned browser-local preference, send it with each request, and enforce its context policy again on the server. The per-mode input budget plus output budget must never exceed 8,000 tokens. Max must ignore forged history/attachment fields server-side while leaving the local session untouched. Keep the four public IDs stable: `pro`, `max`, `flash`, and `research`.

## Identity boundary

Creator attribution and current-user identity are separate server-owned concepts. The creator may be named only for relevant creator questions; an account name or an explicit in-conversation introduction may establish the user name, otherwise it remains unknown. Never derive user identity from creator attribution or stale assistant history, and apply this boundary before every mode override, including Max.

**Why:** A shared prompt that described the creator as the user caused false personalization such as answering “Shahid” to “What is my name?”. Mode-specific prompt differences must not reintroduce that identity conflation.

**How to apply:** Keep creator metadata out of routine greetings and unrelated responses, pass an authoritative per-request identity boundary before the shared mode prompt, sanitize stale assistant identity claims, and ignore untrusted history when Max policy excludes history.