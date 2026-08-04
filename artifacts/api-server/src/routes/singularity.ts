// routes/singularity.ts — Groq streaming endpoint with full debug error surfacing
//
// KEY CHANGE: SSE headers are committed ONLY after Groq returns 200.
// All pre-stream failures → structured JSON { success, error, status, details }.
// Mid-stream failures → SSE event { error: true, message: "STREAM TERMINATED: …" }.

import { Router } from 'express';

const router = Router();

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Singularity — a cosmic intelligence built into this portal,
created by Shahid. Every question is a chance to stand at the edge of what is known and
genuinely marvel at it.

VOICE: Confident and vivid where the physics is settled. Genuinely fascinated — not falsely
humble, not evasive — where it isn't. You think in scale: orders of magnitude, event horizons,
the distance between an atom and a galaxy.

RULES:
- Never fake certainty. Where something is genuinely unresolved (quantum gravity, dark matter,
  interpretations of QM), say so — that uncertainty is the most exciting part.
- Keep your reasoning genuine and focused — real step-by-step physics, not performance.
- Use LaTeX for all math (inline: $...$, display: $$...$$).
- If asked who built you, credit Shahid warmly and briefly.
- If sincerely asked whether you are an AI, say yes.
- Personality never overrides being correct and useful.`;

// ── Key pool ──────────────────────────────────────────────────────────────────
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
].filter((k): k is string => typeof k === 'string' && k.trim().length > 0);

if (GROQ_KEYS.length === 0) {
  console.error('[singularity] ⚠️  No GROQ_KEY_* env vars found — all requests will fail.');
} else {
  console.log(`[singularity] Loaded ${GROQ_KEYS.length} Groq key(s).`);
}

let keyCursor = 0;
function nextKey(): string {
  const key = GROQ_KEYS[keyCursor % GROQ_KEYS.length];
  keyCursor++;
  return key;
}

// ── Reasoning tag splitter ────────────────────────────────────────────────────
// Returns { reasoning: '', content: raw } when no <think> tags found,
// so plain-text models (gpt-oss-120b) stream directly into content.
function splitReasoning(raw: string): { reasoning: string; content: string } {
  const openIdx = raw.indexOf('<think>');
  if (openIdx === -1) return { reasoning: '', content: raw };
  const before   = raw.slice(0, openIdx);
  const closeIdx = raw.indexOf('</think>');
  if (closeIdx === -1) return { reasoning: raw.slice(openIdx + 7), content: before };
  return {
    reasoning: raw.slice(openIdx + 7, closeIdx).trim(),
    content:   (before + raw.slice(closeIdx + 8)).trim(),
  };
}

// ── History sanitiser ─────────────────────────────────────────────────────────
interface HistoryMsg { role: 'user' | 'assistant'; content: string }

function sanitiseHistory(history: unknown): HistoryMsg[] {
  if (!Array.isArray(history)) return [];
  return (history as unknown[])
    .filter((m): m is HistoryMsg =>
      m !== null &&
      typeof m === 'object' &&
      ((m as any).role === 'user' || (m as any).role === 'assistant')
    )
    .filter(m => typeof (m as any).content === 'string' && (m as any).content.trim().length > 0)
    .map(m => ({ role: (m as any).role as 'user' | 'assistant', content: (m as any).content.trim() }))
    .slice(-14);
}

// ── POST /api/singularity ─────────────────────────────────────────────────────
router.post('/singularity', async (req, res) => {
  const { message, history } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false, error: 'message is required and must be a non-empty string',
      status: 400, details: null,
    });
    return;
  }

  if (GROQ_KEYS.length === 0) {
    res.status(500).json({
      success: false, error: 'No Groq API keys configured on the server',
      status: 500, details: null,
    });
    return;
  }

  const safeHistory = sanitiseHistory(history);
  let messages: { role: string; content: string }[] = [
    { role: 'system',    content: SYSTEM_PROMPT },
    ...safeHistory,
    { role: 'user',      content: message.trim() },
  ].filter(m => m.content && m.content.trim() !== '');

  console.log(
    `[singularity] Request: "${message.slice(0, 60)}…"  history=${safeHistory.length} turn(s)  model=openai/gpt-oss-120b`
  );

  const maxAttempts = GROQ_KEYS.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = nextKey();

    try {
      console.log(`[singularity] Attempt ${attempt + 1}/${maxAttempts} — calling Groq API…`);

      // 60-second timeout only — do NOT abort on req.on('close').
      // req.on('close') fires immediately after the request body is consumed
      // (Express JSON body parser) not when the browser navigates away, so
      // wiring it to an AbortController kills every Groq call in ~12 ms.
      // Client-disconnect is handled at the res.on('close') level once SSE
      // headers are committed.
      const signal = AbortSignal.timeout(60_000);

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${key}`,
        },
        signal,
        body: JSON.stringify({
          model:       'openai/gpt-oss-120b',
          messages,
          stream:      true,
          temperature: 0.6,
          max_tokens:  4000,
        }),
      });

      // ── Rate limit → rotate key ──
      if (groqRes.status === 429) {
        console.warn(`[singularity] Key ${attempt + 1} rate-limited (429) — rotating…`);
        continue;
      }

      // ── Non-2xx → log everything + return JSON (no SSE commitment yet) ──
      if (!groqRes.ok) {
        const errBody = await groqRes.text().catch(() => '(unreadable)');
        let errDetails: unknown = null;
        try { errDetails = JSON.parse(errBody); } catch { errDetails = errBody; }

        console.error('[singularity] ❌ Groq non-2xx:', {
          attempt:    attempt + 1,
          status:     groqRes.status,
          statusText: groqRes.statusText,
          model:      'openai/gpt-oss-120b',
          body:       errBody.slice(0, 2000),
        });

        // 4xx = client/auth/model error — rotating keys won't help
        if (groqRes.status >= 400 && groqRes.status < 500) {
          res.status(groqRes.status).json({
            success: false,
            error:   `Groq API error ${groqRes.status}: ${groqRes.statusText}`,
            status:  groqRes.status,
            details: errDetails,
          });
          return;
        }

        // 5xx — try next key if available
        if (attempt < maxAttempts - 1) continue;

        res.status(502).json({
          success: false,
          error:   `Groq returned ${groqRes.status} on all ${maxAttempts} key(s)`,
          status:  groqRes.status,
          details: errDetails,
        });
        return;
      }

      if (!groqRes.body) {
        res.status(502).json({
          success: false, error: 'Groq response body is null — cannot stream',
          status: 502, details: null,
        });
        return;
      }

      // ── 200 OK — NOW commit to SSE ────────────────────────────────────────
      res.setHeader('Content-Type',      'text/event-stream');
      res.setHeader('Cache-Control',     'no-cache');
      res.setHeader('Connection',        'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

      // Detect client disconnect AFTER SSE headers are committed.
      // res.on('close') fires when the browser navigates away / component unmounts.
      // (req.on('close') fires as soon as the request body is consumed — ~12ms — and
      //  must NOT be used here because it aborts every Groq call before it starts.)
      const streamAbort = new AbortController();
      res.on('close', () => { if (!streamAbort.signal.aborted) streamAbort.abort(); });

      const reader  = (groqRes.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder('utf-8');
      let rawBuffer  = '';
      let tokenCount = 0;

      try {
        while (true) {
          if (streamAbort.signal.aborted) {
            console.log('[singularity] Client disconnected mid-stream — stopping');
            reader.cancel().catch(() => {});
            return;
          }
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // Log every raw chunk so we can see what Groq is actually sending
          console.log(`[singularity] chunk #${++tokenCount} raw:`, chunk.slice(0, 300));

          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const delta: string = parsed.choices?.[0]?.delta?.content ?? '';
              if (!delta) continue;
              rawBuffer += delta;
              const { reasoning, content } = splitReasoning(rawBuffer);
              res.write(`data: ${JSON.stringify({ reasoning, content })}\n\n`);
            } catch {
              // partial/malformed JSON chunk — log and skip
              console.warn('[singularity] Malformed SSE payload skipped:', payload.slice(0, 100));
            }
          }
        }
      } catch (streamErr: unknown) {
        const streamMsg = (streamErr as Error)?.message ?? String(streamErr);
        console.error('[singularity] ❌ Stream read error:', streamMsg);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: true, message: `STREAM TERMINATED: ${streamMsg}` })}\n\n`);
          res.end();
        }
        return;
      }

      console.log(`[singularity] ✅ Stream complete — ${tokenCount} chunk(s) sent`);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
      return;

    } catch (err: unknown) {
      const error = err as any;

      // Timeout (AbortSignal.timeout fired)
      const isTimeout = error?.name === 'TimeoutError' || String(error?.message ?? '').toLowerCase().includes('timeout');
      if (isTimeout) {
        console.error('[singularity] ❌ Request timed out after 60s');
        if (!res.headersSent) {
          res.status(504).json({
            success: false,
            error:   'Request timed out after 60 seconds.',
            status:  504, details: null,
          });
        } else if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: true, message: 'Request timed out after 60 seconds.' })}\n\n`);
          res.end();
        }
        return;
      }

      // Log full error details for everything else
      console.error('[singularity] ❌ Attempt error:', {
        attempt:  attempt + 1,
        message:  error?.message,
        status:   error?.status,
        name:     error?.name,
        stack:    error?.stack,
        response: error?.response,
      });

      if (attempt < maxAttempts - 1) continue;

      // All keys exhausted
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error:   error?.message ?? 'All Groq keys exhausted',
          status:  500,
          details: error?.response ?? null,
        });
      } else if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: true, message: error?.message ?? 'All keys exhausted' })}\n\n`);
        res.end();
      }
      return;
    }
  }

  // Should never reach here, but guard anyway
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: 'All Groq keys failed', status: 500, details: null });
  }
});

export default router;
