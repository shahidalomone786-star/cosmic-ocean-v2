---
name: Document workspace verification
description: Verification notes for the document-grounded Singularity chat flow
---

The document attachment is intentionally split between clean visible UI state and enriched model state: the composer clears after send, the sent user turn owns a read-only attachment chip, and selected chunks are appended only to the request payload.

**Why:** Keeping extracted text out of the visible composer avoids surprising users and prevents oversized or malformed chat payloads.

**How to apply:** Store the record on the sent user message, use the latest message attachment as the fallback context for follow-up questions, and use the local Vite `pdf.worker.mjs?url` import for browser PDF extraction.