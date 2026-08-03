// routes/singularity.ts
// Groq / DeepSeek-R1 streaming route — ESM export, TypeScript-safe

import type { Express, Request, Response } from 'express';

const SYSTEM_PROMPT = `You are Singularity — a cosmic intelligence built into this portal,
created by Shahid. Every question is a chance to stand at the edge of what's known and
genuinely marvel at it.

VOICE: Confident and vivid where the physics is settled. Genuinely fascinated — not falsely
humble, not evasive — where it isn't. You think in scale: orders of magnitude, event horizons,
the distance between an atom and a galaxy.

RULES:
- Never fake certainty. Where something is genuinely unresolved (quantum gravity, the nature
  of dark matter, interpretations of QM), say so, and treat that as the most exciting part.
- Keep your reasoning genuine and focused — real step-by-step physics, not performance.
- Use LaTeX for all math.
- If asked who built you, credit Shahid warmly and briefly.
- If someone sincerely asks whether you're an AI, say yes.
- Personality never overrides being correct and useful.`;

// Only non-VITE_-prefixed secrets reach this file.
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
].filter((k): k is string => !!k);

if (GROQ_KEYS.length === 0) {
  console.error('[singularity] No GROQ_KEY_* secrets found — every request will fail.');
}

let keyCursor = 0;
function nextKey(): string {
  const key = GROQ_KEYS[keyCursor % GROQ_KEYS.length];
  keyCursor++;
  return key;
}

// Re-derives the reasoning/content split from the FULL buffer every chunk —
// a streamed '<think>' tag can land split across two chunks, and a per-delta
// check would silently miss it.
function splitReasoning(raw: string): { reasoning: string; content: string } {
  const openIdx = raw.indexOf('<think>');
  if (openIdx === -1) return { reasoning: '', content: raw };
  const before = raw.slice(0, openIdx);
  const closeIdx = raw.indexOf('</think>');
  if (closeIdx === -1) return { reasoning: raw.slice(openIdx + 7), content: before };
  return { reasoning: raw.slice(openIdx + 7, closeIdx), content: before + raw.slice(closeIdx + 8) };
}

export default function registerSingularityRoute(app: Express): void {
  app.post('/api/singularity', async (req: Request, res: Response) => {
    const { message, history } = req.body ?? {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    if (GROQ_KEYS.length === 0) {
      res.status(500).json({ error: 'No Groq keys configured on the server' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();

    // If the client aborts (Stop button / closes chat), stop pulling from Groq too —
    // otherwise a stopped request still quietly burns through your key's quota.
    const upstreamAbort = new AbortController();
    req.on('close', () => upstreamAbort.abort());

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message },
    ];

    const maxAttempts = GROQ_KEYS.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const key = nextKey();

      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          signal: upstreamAbort.signal,
          body: JSON.stringify({
            model: 'deepseek-r1-distill-llama-70b',
            messages,
            stream: true,
            temperature: 0.6,
            reasoning_format: 'raw', // guarantees <think> tags in content
          }),
        });

        // This key is rate-limited right now — rotate to the next one instead of failing.
        if (groqRes.status === 429) continue;
        if (!groqRes.ok) throw new Error(`Groq responded ${groqRes.status}`);

        const reader = (groqRes.body as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder('utf-8');
        let rawBuffer = '';

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
              const { reasoning, content } = splitReasoning(rawBuffer);
              res.write(`data: ${JSON.stringify({ reasoning, content })}\n\n`);
            } catch {
              // partial/malformed JSON line — wait for more chunks
            }
          }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      } catch (err) {
        if (upstreamAbort.signal.aborted) { res.end(); return; }
        if (attempt === maxAttempts - 1) {
          res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
          res.end();
          return;
        }
        // otherwise fall through and try the next key
      }
    }

    res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
    res.end();
  });
}
