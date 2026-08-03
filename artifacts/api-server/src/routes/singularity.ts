// routes/singularity.ts — Groq / DeepSeek-R1 streaming endpoint
// Uses Express Router (same pattern as all other routes), with detailed
// error logging and strict history sanitisation to prevent empty-content
// Groq rejections.

import { Router } from 'express';

const router = Router();

// ── System prompt ────────────────────────────────────────────────────────────
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

// ── Key pool ─────────────────────────────────────────────────────────────────
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

// ── Reasoning tag splitter ───────────────────────────────────────────────────
// Re-derives from the FULL buffer every chunk so split-chunk <think> tags work.
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

// ── History sanitiser ────────────────────────────────────────────────────────
// Groq strictly rejects messages with empty/whitespace-only content strings.
interface HistoryMsg { role: 'user' | 'assistant'; content: string }

function sanitiseHistory(history: unknown): HistoryMsg[] {
  if (!Array.isArray(history)) return [];
  return (history as unknown[])
    .filter((m): m is HistoryMsg =>
      m !== null &&
      typeof m === 'object' &&
      (m as any).role === 'user' || (m as any).role === 'assistant'
    )
    .filter((m) =>
      typeof (m as any).content === 'string' &&
      (m as any).content.trim().length > 0   // ← guard against empty content
    )
    .map(m => ({ role: (m as any).role as 'user' | 'assistant', content: (m as any).content.trim() }))
    .slice(-14); // keep last 14 turns (7 exchanges) at most
}

// ── POST /api/singularity ────────────────────────────────────────────────────
router.post('/singularity', async (req, res) => {
  const { message, history } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    console.error('[singularity] 400 — missing or empty message field');
    res.status(400).json({ error: 'message is required and must be a non-empty string' });
    return;
  }

  if (GROQ_KEYS.length === 0) {
    console.error('[singularity] 500 — no Groq keys available');
    res.status(500).json({ error: 'No Groq keys configured on the server' });
    return;
  }

  const safeHistory = sanitiseHistory(history);
  const messages = [
    { role: 'system',    content: SYSTEM_PROMPT },
    ...safeHistory,
    { role: 'user',      content: message.trim() },
  ];

  console.log(
    `[singularity] Request: "${message.slice(0, 60)}…"  history=${safeHistory.length} turn(s)`
  );

  // ── SSE headers ──
  res.setHeader('Content-Type',       'text/event-stream');
  res.setHeader('Cache-Control',      'no-cache');
  res.setHeader('Connection',         'keep-alive');
  res.setHeader('X-Accel-Buffering',  'no');
  if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

  const upstreamAbort = new AbortController();
  req.on('close', () => { if (!upstreamAbort.signal.aborted) upstreamAbort.abort(); });

  const maxAttempts = GROQ_KEYS.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = nextKey();

    try {
      console.log(`[singularity] Attempt ${attempt + 1}/${maxAttempts} — calling Groq…`);

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${key}`,
        },
        signal: upstreamAbort.signal,
        body: JSON.stringify({
          model:       'deepseek-r1-distill-llama-70b',
          messages,
          stream:      true,
          temperature: 0.6,
          max_tokens:  8192,
        }),
      });

      if (groqRes.status === 429) {
        console.warn(`[singularity] Key ${attempt + 1} rate-limited (429) — rotating…`);
        continue;
      }

      if (!groqRes.ok) {
        const errBody = await groqRes.text().catch(() => '(unreadable)');
        console.error(
          `[singularity] Groq HTTP ${groqRes.status} on attempt ${attempt + 1}:`,
          errBody.slice(0, 600)
        );
        // 4xx client errors — no point retrying with another key
        if (groqRes.status >= 400 && groqRes.status < 500) {
          res.write(`data: ${JSON.stringify({ error: true, code: groqRes.status })}\n\n`);
          res.end();
          return;
        }
        throw new Error(`Groq responded ${groqRes.status}`);
      }

      if (!groqRes.body) throw new Error('Groq response body is null');

      // ── Stream tokens ──
      const reader  = (groqRes.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder('utf-8');
      let rawBuffer  = '';
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta: string = parsed.choices?.[0]?.delta?.content ?? '';
            if (!delta) continue;
            rawBuffer += delta;
            tokenCount++;
            const { reasoning, content } = splitReasoning(rawBuffer);
            res.write(`data: ${JSON.stringify({ reasoning, content })}\n\n`);
          } catch {
            // partial/malformed JSON chunk — skip and continue
          }
        }
      }

      console.log(`[singularity] Stream complete — ${tokenCount} token chunks sent`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;

    } catch (err: unknown) {
      if (upstreamAbort.signal.aborted) {
        console.log('[singularity] Client disconnected — stream aborted');
        res.end();
        return;
      }
      const msg = (err as Error)?.message ?? String(err);
      console.error(`[singularity] Attempt ${attempt + 1} error:`, msg);
      if (attempt === maxAttempts - 1) {
        console.error('[singularity] All keys exhausted — sending error to client');
        res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
        res.end();
        return;
      }
    }
  }

  res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
  res.end();
});

export default router;
