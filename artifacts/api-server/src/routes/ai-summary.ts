import { Router } from "express";
import type { Request, Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

// ── Groq key pool — filter undefined / empty at startup ──────────────────────
const GROQ_KEYS: string[] = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

// Mutable round-robin pointer — advances on 429, wraps around pool
let groqKeyIndex = 0;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL    = "llama-3.3-70b-versatile";

// ── Status codes that warrant a retry (with key rotation / backoff) ───────────
const RETRY_CODES = new Set([429, 500, 502, 503, 504]);

// ── In-memory summary cache (key = query::language, TTL = 24 h) ──────────────
const CACHE_TTL_MS      = 24 * 60 * 60 * 1_000; // 24 hours
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  summary:     string;
  confidence:  number;
  sourcesUsed: number;
  createdAt:   number;
  expiresAt:   number;
}

const summaryCache = new Map<string, CacheEntry>();

function makeCacheKey(query: string, language: string): string {
  return `${query.toLowerCase().trim()}::${(language || "en").toLowerCase()}`;
}

/** Evict expired entries; if still over capacity evict the oldest. */
function pruneCache(): void {
  const now = Date.now();
  for (const [key, entry] of summaryCache) {
    if (entry.expiresAt <= now) summaryCache.delete(key);
  }
  if (summaryCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey = "";
    let oldestTime = Infinity;
    for (const [key, entry] of summaryCache) {
      if (entry.createdAt < oldestTime) { oldestTime = entry.createdAt; oldestKey = key; }
    }
    if (oldestKey) summaryCache.delete(oldestKey);
  }
}

// ── Exponential backoff (capped at 4 s) ──────────────────────────────────────
function backoffMs(attempt: number): number {
  return Math.min(100 * Math.pow(2, attempt), 4_000);
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Confidence heuristic (0 – 1) ─────────────────────────────────────────────
function estimateConfidence(snippetCount: number, summaryLen: number): number {
  if (snippetCount === 0)                        return 0.10;
  if (snippetCount >= 5 && summaryLen >= 80)     return 0.92;
  if (snippetCount >= 3)                         return 0.75 + Math.min(snippetCount - 3, 2) * 0.05;
  if (snippetCount >= 1)                         return 0.55 + snippetCount * 0.10;
  return 0.30;
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(language: string): string {
  const langNote = language && language !== "en"
    ? `\nRespond in the following language: ${language}.`
    : "";
  return `You are a Scientific Research Assistant specialising in evidence-based summarisation.

STRICT RULES — NEVER VIOLATE:
1. Only use information explicitly present in the CONTEXT snippets provided.
2. Never invent facts, statistics, dates, figures, or details absent from the context.
3. Never fabricate citations, paper titles, authors, DOIs, or URLs.
4. Never speculate about what might be true or what is likely.
5. If the supplied context is insufficient to answer the query, say so plainly and briefly.

OUTPUT FORMAT:
- Write 3 to 5 concise, factually grounded sentences.
- Maximum 120 words total.
- Flowing prose only — no bullet points, no headers, no numbered lists.
- Begin directly with the information; do not open with meta-commentary such as "Based on the context…".${langNote}`;
}

// ── POST /api/ai-summary ──────────────────────────────────────────────────────
router.post("/ai-summary", async (req: Request, res: Response) => {
  const {
    query,
    contextSnippets,
    language = "en",
    stream: wantStream = false,
  } = req.body as {
    query:            string;
    contextSnippets?: string[];
    language?:        string;
    stream?:          boolean;
  };

  const startTime = Date.now();

  // ── Input validation ──────────────────────────────────────────────────────
  if (!query?.trim()) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  if (GROQ_KEYS.length === 0) {
    logger.error({ msg: "ai-summary:no-keys" });
    res.status(503).json({ error: "No Groq API keys configured on the server." });
    return;
  }

  const snippets: string[] = Array.isArray(contextSnippets)
    ? contextSnippets.filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  // ── Cache lookup ──────────────────────────────────────────────────────────
  const ck     = makeCacheKey(query, language);
  const cached = summaryCache.get(ck);

  if (cached && cached.expiresAt > Date.now()) {
    logger.info({ msg: "ai-summary:cache-hit", query, language, latencyMs: Date.now() - startTime });

    if (wantStream) {
      res.set({
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection":    "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(`data: ${JSON.stringify({ token: cached.summary })}\n\n`);
      res.write(`data: ${JSON.stringify({
        done:        true,
        cached:      true,
        confidence:  cached.confidence,
        sourcesUsed: cached.sourcesUsed,
      })}\n\n`);
      res.end();
    } else {
      res.json({
        summary:     cached.summary,
        confidence:  cached.confidence,
        sourcesUsed: cached.sourcesUsed,
        cached:      true,
      });
    }
    return;
  }

  logger.info({ msg: "ai-summary:cache-miss", query, language, snippetCount: snippets.length });

  // ── Build messages ────────────────────────────────────────────────────────
  const contextBlock = snippets.length > 0
    ? `CONTEXT:\n${snippets.map((s, i) => `[${i + 1}] ${s.trim()}`).join("\n\n")}`
    : "CONTEXT: No context snippets provided.";

  const messages = [
    { role: "system" as const, content: buildSystemPrompt(language) },
    { role: "user"   as const, content: `${contextBlock}\n\nQUERY: ${query.trim()}` },
  ];

  // ── Key-rotation loop with exponential backoff ────────────────────────────
  const maxAttempts = GROQ_KEYS.length * 2; // try each key up to twice
  let lastError: unknown;
  let usedKeyIndex  = groqKeyIndex;
  let fallbackUsed  = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIndex = (groqKeyIndex + attempt) % GROQ_KEYS.length;
    usedKeyIndex   = keyIndex;
    if (attempt > 0) {
      fallbackUsed = true;
      const delay = backoffMs(attempt - 1);
      logger.warn({ msg: "ai-summary:backoff", attempt, delayMs: delay, keyIndex });
      await sleep(delay);
    }

    const apiKey = GROQ_KEYS[keyIndex];

    try {
      const groqRes = await fetch(GROQ_ENDPOINT, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:       GROQ_MODEL,
          messages,
          temperature: 0.2,
          max_tokens:  220,
          stream:      wantStream,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      const status = groqRes.status;

      // ── Retry-eligible HTTP status ──────────────────────────────────────
      if (RETRY_CODES.has(status)) {
        // 429 = rate-limit → rotate key; 5xx = server transient → keep key, just backoff
        if (status === 429) {
          groqKeyIndex = (groqKeyIndex + 1) % GROQ_KEYS.length;
        }
        lastError = new Error(`Groq HTTP ${status} on key index ${keyIndex}`);
        logger.warn({ msg: "ai-summary:retry", status, keyIndex, attempt });
        continue;
      }

      if (!groqRes.ok) {
        const body = await groqRes.text();
        throw new Error(`Groq API error ${status}: ${body.slice(0, 300)}`);
      }

      // ─────────────────────────────────────────────────────────────────────
      // STREAMING PATH
      // ─────────────────────────────────────────────────────────────────────
      if (wantStream) {
        res.set({
          "Content-Type":      "text/event-stream",
          "Cache-Control":     "no-cache",
          "Connection":        "keep-alive",
          "X-Accel-Buffering": "no",
        });

        const reader  = groqRes.body?.getReader();
        if (!reader) throw new Error("No readable stream returned from Groq");

        const decoder = new TextDecoder();
        let fullText  = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") continue;
              try {
                const parsed = JSON.parse(raw) as {
                  choices: { delta: { content?: string } }[];
                };
                const token = parsed.choices?.[0]?.delta?.content ?? "";
                if (token) {
                  fullText += token;
                  res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
              } catch {
                // malformed SSE chunk — skip silently
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        const confidence = estimateConfidence(snippets.length, fullText.length);
        const latencyMs  = Date.now() - startTime;
        logger.info({ msg: "ai-summary:stream-complete", keyIndex: usedKeyIndex, fallbackUsed, latencyMs, sourcesUsed: snippets.length });

        // Cache assembled text
        pruneCache();
        const now = Date.now();
        summaryCache.set(ck, {
          summary: fullText, confidence, sourcesUsed: snippets.length,
          createdAt: now, expiresAt: now + CACHE_TTL_MS,
        });

        res.write(`data: ${JSON.stringify({
          done:        true,
          cached:      false,
          confidence,
          sourcesUsed: snippets.length,
        })}\n\n`);
        res.end();
        return;
      }

      // ─────────────────────────────────────────────────────────────────────
      // NON-STREAMING PATH
      // ─────────────────────────────────────────────────────────────────────
      const json = await groqRes.json() as {
        choices: { message: { content: string } }[];
      };
      const summary    = json.choices?.[0]?.message?.content?.trim() ?? "";
      const confidence = estimateConfidence(snippets.length, summary.length);
      const latencyMs  = Date.now() - startTime;

      logger.info({ msg: "ai-summary:success", keyIndex: usedKeyIndex, fallbackUsed, latencyMs, sourcesUsed: snippets.length });

      // Write to cache
      pruneCache();
      const now = Date.now();
      summaryCache.set(ck, {
        summary, confidence, sourcesUsed: snippets.length,
        createdAt: now, expiresAt: now + CACHE_TTL_MS,
      });

      res.json({ summary, confidence, sourcesUsed: snippets.length, cached: false });
      return;

    } catch (err: unknown) {
      lastError       = err;
      const msg       = (err as Error)?.message ?? String(err);
      const isRateLimit  = /429|rate.?limit/i.test(msg);
      const isTransient  = /timeout|abort|network|econnreset|econnrefused|fetch failed/i.test(msg);

      if (isRateLimit) {
        groqKeyIndex = (groqKeyIndex + 1) % GROQ_KEYS.length;
        logger.warn({ msg: "ai-summary:rate-limit-exception", keyIndex, attempt });
        continue;
      }
      if (isTransient) {
        logger.warn({ msg: "ai-summary:transient-exception", keyIndex, attempt, error: msg });
        continue;
      }
      // Auth errors, malformed requests, etc. — no point retrying
      logger.error({ msg: "ai-summary:unrecoverable", keyIndex, error: msg });
      break;
    }
  }

  // All attempts exhausted
  const errMsg = (lastError as Error)?.message ?? String(lastError);
  logger.error({ msg: "ai-summary:all-keys-exhausted", error: errMsg, latencyMs: Date.now() - startTime });
  res.status(503).json({
    error:  "All Groq keys exhausted or unavailable. Please try again later.",
    detail: errMsg,
  });
});

export default router;
