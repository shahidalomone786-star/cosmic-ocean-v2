---
name: Document workspace verification
description: Verification notes for the document-grounded Singularity chat flow
---

The document attachment is intentionally split between clean visible UI state and enriched model state: the textarea and user message show only the user's question, while selected chunks are appended only to the request payload.

**Why:** Keeping extracted text out of the visible composer avoids surprising users and prevents oversized or malformed chat payloads.

**How to apply:** Preserve the attachment record after sending so follow-up questions can reuse it; use the local Vite `pdf.worker.mjs?url` import for browser PDF extraction.