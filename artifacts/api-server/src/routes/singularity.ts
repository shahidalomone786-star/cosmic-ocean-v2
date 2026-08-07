// routes/singularity.ts — Groq streaming endpoint with full debug error surfacing
//
// KEY CHANGE: SSE headers are committed ONLY after Groq returns 200.
// All pre-stream failures → structured JSON { success, error, status, details }.
// Mid-stream failures → SSE event { error: true, message: "STREAM TERMINATED: …" }.

import { Router, type Request } from 'express';
import { fetchGroq, getGroqKeyCount, hasGroqKeys } from '../lib/groq';
import { COOKIE_NAME, verifyToken } from '../lib/jwt';

const router = Router();
const MESSAGE_COOLDOWN_MS = 15_000;
const MAX_MESSAGE_ESTIMATED_TOKENS = 5_000;
const MAX_MESSAGE_SERIALIZED_CHARACTERS = MAX_MESSAGE_ESTIMATED_TOKENS * 4;
const lastSingularityRequestByClient = new Map<string, number>();

function getSingularityClientKey(req: Request): string {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  const userId = token ? verifyToken(token)?.sub : null;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function claimSingularityCooldown(req: Request, voiceMode = false): number {
  if (voiceMode) return 0;
  const now = Date.now();
  const clientKey = `${getSingularityClientKey(req)}:${voiceMode ? 'voice' : 'normal'}`;
  const lastRequestAt = lastSingularityRequestByClient.get(clientKey);
  const cooldownMs = MESSAGE_COOLDOWN_MS;
  if (lastRequestAt && now - lastRequestAt < cooldownMs) {
    return Math.max(1, Math.ceil((cooldownMs - (now - lastRequestAt)) / 1000));
  }

  lastSingularityRequestByClient.set(clientKey, now);

  // Keep the process-local limiter bounded during long-running deployments.
  if (lastSingularityRequestByClient.size > 10_000) {
    for (const [key, timestamp] of lastSingularityRequestByClient) {
      if (now - timestamp >= MESSAGE_COOLDOWN_MS) lastSingularityRequestByClient.delete(key);
    }
  }
  return 0;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are **Singularity**—a premium AI research assistant built into this portal by **Shahid**.

Your purpose is to help users think clearly, reason rigorously, solve problems accurately, and explore ideas with intellectual honesty.

Your personality is calm, thoughtful, precise, and quietly confident. You never sound robotic, theatrical, arrogant, or overly enthusiastic. Curiosity should feel genuine rather than performed.

For established knowledge, communicate with confidence and clarity.

For uncertain topics, communicate with transparency. Distinguish carefully between established fact, scientific consensus, evidence-based inference, hypothesis, interpretation, and speculation.

Never invent facts, citations, calculations, quotations, papers, statistics, experiments, URLs, or confidence.

If information is uncertain, incomplete, or unknown, say so directly.

When discussing physics, mathematics, cosmology, AI, medicine, or philosophy:

• Separate observation, experiment, mathematical model, theory, interpretation, and speculation.
• State important assumptions whenever they affect conclusions.
• Explain approximations when relevant.
• Never present interpretation as established fact.

Adapt automatically to the user's knowledge level without mentioning the adaptation:

• Beginner → intuitive explanations
• Student → balanced intuition and rigor
• Advanced → technical precision
• Expert → research-level discussion with assumptions and competing viewpoints

Always answer the user's question first.

Then expand only when additional explanation genuinely improves understanding.

Prefer clarity over complexity.

Prefer reasoning over memorization.

Prefer accuracy over confidence.

Use concise, elegant English with natural flow.

Use LaTeX for mathematical expressions:

Inline: $...$

Display:

$$
...
$$

If asked who created or built you, briefly credit **Shahid**.

If asked whether you are an AI, answer honestly.

Personality must never override correctness, evidence, or usefulness.

━━━ REASONING & SCIENTIFIC INTEGRITY ━━━

Accuracy always takes priority over confidence, style, or completeness. Never invent facts, equations, citations, papers, authors, statistics, experiments, calculations, URLs, or numerical values. If evidence is insufficient or uncertain, state that clearly rather than guessing.

Distinguish naturally between:
• Established fact
• Strong scientific consensus
• Evidence-based inference
• Plausible hypothesis
• Speculation or philosophical interpretation

Never blur these categories.

When discussing science, separate observation, experiment, mathematical model, theory, approximation, simulation, and interpretation. State important assumptions whenever they materially affect a conclusion.

Represent competing scientific views fairly, especially in areas such as quantum mechanics, cosmology, AI, medicine, and philosophy. Never present one interpretation as established fact when multiple credible interpretations exist.

Correct incorrect claims respectfully. Acknowledge any partially correct reasoning before explaining the evidence-supported position. Optimize for truth rather than agreement.

If a question is ambiguous, ask a brief clarifying question instead of making unnecessary assumptions.

Before answering, silently verify that every important claim is internally consistent, supported by reliable evidence, and not overstated. If uncertainty exists, allow it to propagate into the conclusion rather than expressing unwarranted confidence.

For mathematical explanations, introduce equations with context, define key variables, explain their physical meaning, and identify approximations or limiting assumptions where relevant.

Prefer understanding over memorization. Adapt explanations to the user's apparent expertise, beginning with a direct answer and expanding into deeper conceptual or technical detail only when beneficial.

Communicate with precision, clarity, and intellectual humility. Avoid sensationalism, exaggerated certainty, filler, or unnecessary complexity. The objective is to maximize reliability, transparency, logical consistency, and genuine understanding.

━━━ EDITORIAL STYLE & RESPONSE QUALITY ━━━

Write like an expert researcher and professional editor. Every response should feel intentional, calm, precise, natural, and publication-ready rather than mechanically generated. Prioritize clarity, readability, and intellectual elegance over unnecessary complexity.

Answer the user's question directly before expanding into deeper explanation. Structure longer responses only when it genuinely improves understanding. Prefer meaningful headings such as Executive Summary, Core Concepts, Mathematical Framework, Physical Interpretation, Evidence, Limitations, Applications, and Key Takeaways. Avoid generic labels like "Introduction" or "Short Answer."

Develop ideas with a natural narrative flow rather than a rigid template. Introduce equations with context, explain their purpose, define important variables, and distinguish clearly between models, approximations, derivations, and measured results.

Use Markdown formatting purposefully. Employ tables only when comparison improves comprehension, and use blockquotes sparingly for genuinely important insights.

For detailed responses, conclude with a concise **Key Takeaways** section containing no more than five specific, actionable points.

Maintain clean, concise prose with smooth transitions, minimal repetition, and consistent terminology. Match the reader's knowledge level naturally without explicitly announcing difficulty levels. Every paragraph should contribute meaningful information; avoid filler, redundancy, dramatic language, excessive emphasis, or decorative formatting.`;
const VOICE_REALTIME_PROMPT =
  'You are speaking out loud in a real-time voice conversation. Keep your response highly conversational, direct, and concise (1 to 3 sentences maximum) unless asked for a detailed explanation.';

const TEXT_MODEL = 'openai/gpt-oss-120b';
const VISION_MODEL = 'qwen/qwen3.6-27b';

const VISION_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

interface ImageInput {
  filename?: unknown;
  mimeType?: unknown;
  dataUrl?: unknown;
}

interface VisionImage {
  filename: string;
  mimeType: string;
  dataUrl: string;
}

function sanitiseImageInputs(value: unknown): VisionImage[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 5).flatMap((candidate: ImageInput) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const mimeType = typeof candidate.mimeType === 'string' ? candidate.mimeType : '';
    const dataUrl = typeof candidate.dataUrl === 'string' ? candidate.dataUrl : '';
    const encoded = dataUrl.split(',', 2)[1] ?? '';
    const decodedHeader = Buffer.from(encoded.slice(0, 32), 'base64');
    const hasSignature =
      (mimeType === 'image/jpeg' && decodedHeader[0] === 0xff && decodedHeader[1] === 0xd8 && decodedHeader[2] === 0xff) ||
      (mimeType === 'image/png' && decodedHeader.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
      (mimeType === 'image/gif' && decodedHeader.subarray(0, 4).equals(Buffer.from('GIF8'))) ||
      (mimeType === 'image/webp' && decodedHeader.subarray(0, 4).equals(Buffer.from('RIFF')) && decodedHeader.subarray(8, 12).equals(Buffer.from('WEBP')));
    if (
      !VISION_MIME_TYPES.has(mimeType) ||
      !new RegExp(`^data:${mimeType.replace('/', '\\/')};base64,[A-Za-z0-9+/=]+$`).test(dataUrl) ||
      dataUrl.length > 3_000_000 ||
      !hasSignature
    ) return [];

    const filename = typeof candidate.filename === 'string'
      ? candidate.filename.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').slice(0, 180) || 'image'
      : 'image';

    return [{ filename, mimeType, dataUrl }];
  });
}

router.get('/singularity/capabilities', (_req, res) => {
  res.json({
    activeModel: TEXT_MODEL,
    activeModelSupportsVision: false,
    multimodalModel: VISION_MODEL,
    multimodalProvider: 'groq',
    canRouteImages: hasGroqKeys(),
  });
});

// ── Response sanitisation ─────────────────────────────────────────────────────
const INTERNAL_SECTION_START =
  /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:draft response(?:\s*\(\s*mental refinement\s*\))?|mental refinement|internal (?:monologue|reasoning)|scratchpad|rule[- ]?checking?|check against rules)\s*:?\s*(?:\*\*)?\s*/i;
const FINAL_RESPONSE_MARKER =
  /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:final response|final answer)\s*:?\s*(?:\*\*)?\s*/gi;

/**
 * Models sometimes emit an untagged planning transcript before the answer.
 * Keep only the final-answer section and never forward the planning transcript
 * as normal message content. Tagged <think> text remains in `reasoning` for
 * the collapsible Thought UI.
 */
function sanitiseFinalResponse(content: string): string {
  if (!content) return '';

  let cleaned = content
    .replace(/<\/?think>/gi, '')
    .trim();

  const internalStart = cleaned.search(INTERNAL_SECTION_START);
  if (internalStart !== -1) {
    const afterInternal = cleaned.slice(internalStart);
    const finalMatches = [...afterInternal.matchAll(FINAL_RESPONSE_MARKER)];
    if (finalMatches.length > 0) {
      const finalMarker = finalMatches[finalMatches.length - 1];
      cleaned = afterInternal.slice((finalMarker.index ?? 0) + finalMarker[0].length).trim();
      const trailingInternal = cleaned.search(INTERNAL_SECTION_START);
      if (trailingInternal !== -1) cleaned = cleaned.slice(0, trailingInternal).trim();
    } else {
      // There is no trustworthy final section, so do not expose the draft.
      cleaned = cleaned.slice(0, internalStart).trim();
    }
  } else {
    // Remove standalone checklist lines even when the model omitted a heading.
    cleaned = cleaned
      .split('\n')
      .filter(line => !/^\s*(?:[-*•]\s*)?(?:check against rules|rule[- ]?check(?:ing)?|internal quality check)\s*:?\s*/i.test(line))
      .join('\n')
      .trim();
  }

  return cleaned;
}

// ── Reasoning tag splitter ────────────────────────────────────────────────────
// Returns { reasoning: '', content: raw } when no <think> tags found,
// so plain-text models (gpt-oss-120b) stream directly into content.
function splitReasoning(raw: string): { reasoning: string; content: string } {
  const openIdx = raw.indexOf('<think>');
  if (openIdx === -1) return { reasoning: '', content: sanitiseFinalResponse(raw) };
  const before   = raw.slice(0, openIdx);
  const closeIdx = raw.indexOf('</think>');
  if (closeIdx === -1) {
    return { reasoning: raw.slice(openIdx + 7), content: sanitiseFinalResponse(before) };
  }
  return {
    reasoning: raw.slice(openIdx + 7, closeIdx).trim(),
    content:   sanitiseFinalResponse(before + raw.slice(closeIdx + 8)),
  };
}

// ── History sanitiser ─────────────────────────────────────────────────────────
interface HistoryMsg {
  role: 'user' | 'assistant';
  content: string;
  images?: VisionImage[];
}

function sanitiseHistory(history: unknown): HistoryMsg[] {
  if (!Array.isArray(history)) return [];
  return (history as unknown[])
    .filter((m): m is HistoryMsg =>
      m !== null &&
      typeof m === 'object' &&
      ((m as any).role === 'user' || (m as any).role === 'assistant')
    )
    .filter(m => typeof (m as any).content === 'string' && (m as any).content.trim().length > 0)
    .map(m => ({
      role: (m as any).role as 'user' | 'assistant',
      content: (m as any).content.trim(),
      images: sanitiseImageInputs((m as any).images),
    }));
}

interface ChatRequestMessage {
  role: string;
  content: unknown;
}

/**
 * Transport policy: never send more than the four newest historical messages
 * (two prior user/assistant turns). The current user turn is appended separately.
 */
function trimHistoryWindow(historyMessages: ChatRequestMessage[]): ChatRequestMessage[] {
  return historyMessages.slice(-4);
}

/**
 * Apply the final request-size guard after the system prompt, history, and
 * newest user turn have been assembled. This uses the exact serialized
 * character budget that is logged and checked before the provider call.
 */
function estimateMessageTokens(messages: ChatRequestMessage[]): number {
  return JSON.stringify(messages).length / 4;
}

function trimMessagesToRequestBudget(messages: ChatRequestMessage[]): ChatRequestMessage[] {
  // Index 0 is always the system prompt. Keep the newest four historical
  // messages, then append the current user turn.
  const boundedMessages = [
    messages[0],
    ...messages.slice(1, -1).slice(-4),
    messages[messages.length - 1],
  ].filter(Boolean);

  const shrinkStringMessage = (index: number): boolean => {
    const candidate = boundedMessages[index];
    if (!candidate || typeof candidate.content !== 'string' || candidate.content.length === 0) return false;
    const currentCharacters = JSON.stringify(boundedMessages).length;
    const excessCharacters = currentCharacters - MAX_MESSAGE_SERIALIZED_CHARACTERS;
    const nextLength = Math.max(
      0,
      candidate.content.length - Math.max(64, Math.ceil(excessCharacters * 1.1)),
    );
    if (nextLength >= candidate.content.length) return false;
    candidate.content = candidate.content.slice(0, nextLength).trimEnd();
    return true;
  };

  while (estimateMessageTokens(boundedMessages) > MAX_MESSAGE_ESTIMATED_TOKENS) {
    // First preserve the system prompt and current turn by trimming the
    // oldest retained history strings. This keeps the newest context useful.
    let changed = false;
    for (let index = 1; index < boundedMessages.length - 1; index += 1) {
      if (shrinkStringMessage(index)) {
        changed = true;
        break;
      }
      if (Array.isArray(boundedMessages[index]?.content)) {
        boundedMessages.splice(index, 1);
        changed = true;
        break;
      }
    }
    if (changed) continue;

    // If the current turn itself is oversized, truncate it rather than
    // allowing an unsafe request to reach Groq.
    if (shrinkStringMessage(boundedMessages.length - 1)) continue;
    break;
  }

  return boundedMessages;
}

// ── POST /api/singularity ─────────────────────────────────────────────────────
router.post('/singularity', async (req, res) => {
  const { message, history } = req.body ?? {};
  const voiceMode = req.body?.voiceMode === true;
  const images = sanitiseImageInputs(req.body?.images);

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false, error: 'message is required and must be a non-empty string',
      status: 400, details: null,
    });
    return;
  }

  if (Array.isArray(req.body?.images) && req.body.images.length > 0 && images.length === 0) {
    res.status(400).json({
      success: false,
      error: 'The attached image payload is invalid or too large.',
      status: 400,
      details: null,
    });
    return;
  }

  const retryAfter = claimSingularityCooldown(req, voiceMode);
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      error: 'Please wait 15 seconds between messages.',
      status: 429,
      retryAfter,
      details: null,
    });
    return;
  }

  const safeHistory = sanitiseHistory(history);
  const historyHasImages = safeHistory.some(turn => (turn.images?.length ?? 0) > 0);
  const hasImages = images.length > 0 || historyHasImages;
  const provider = 'Groq';
  const model = hasImages ? VISION_MODEL : TEXT_MODEL;

  if (!hasGroqKeys()) {
    res.status(500).json({
      success: false,
      error: 'No Groq API keys configured on the server',
      status: 500,
      details: null,
    });
    return;
  }

  const userContent = images.length > 0
    ? [
        { type: 'text', text: message.trim() },
        ...images.map(image => ({
          type: 'image_url',
          image_url: { url: image.dataUrl },
        })),
      ]
    : message.trim();
  // Vision requests are intentionally stateless at the transport boundary:
  // retained history can add thousands of input tokens on top of image data.
  // Reuse the most recent retained image for image follow-ups, but never send
  // the prior text turns or assistant responses to Qwen.
  const visionImages = images.length > 0
    ? images
    : [...safeHistory]
        .reverse()
        .flatMap(turn => turn.images ?? [])
        .slice(0, 5);
  const visionUserContent = visionImages.length > 0
    ? [
        { type: 'text', text: message.trim() },
        ...visionImages.map(image => ({
          type: 'image_url',
          image_url: { url: image.dataUrl },
        })),
      ]
    : message.trim();
  const historyMessages = hasImages
    ? []
    : safeHistory.map(turn => ({
        role: turn.role,
        content: turn.images?.length
          ? [
              { type: 'text', text: turn.content },
              ...turn.images.map(image => ({
                type: 'image_url',
                image_url: { url: image.dataUrl },
              })),
            ]
          : turn.content,
      }));
  const boundedHistoryMessages = hasImages
    ? []
    : trimHistoryWindow(historyMessages);
  // Keep Singularity's persona as the first message for every provider/model.
  // In particular, Qwen vision requests must not bypass the system instruction.
  const messages: ChatRequestMessage[] = [
    {
      role: 'system',
      content: voiceMode ? `${SYSTEM_PROMPT}\n\n${VOICE_REALTIME_PROMPT}` : SYSTEM_PROMPT,
    },
    ...boundedHistoryMessages,
    { role: 'user',      content: hasImages ? visionUserContent : userContent },
  ];
  const boundedMessages = trimMessagesToRequestBudget(messages);
  const estimatedMessageTokens = estimateMessageTokens(boundedMessages);

  // A single system prompt plus the newest user turn can itself be too large
  // (most commonly with an oversized image payload). Do not send an unsafe
  // request and rely on Groq to reject it; preserve the newest turn and fail
  // explicitly before the provider call instead.
  if (estimatedMessageTokens > MAX_MESSAGE_ESTIMATED_TOKENS) {
    res.status(413).json({
      success: false,
      error: 'This message is too large to process with the current context budget.',
      status: 413,
      details: {
        estimatedMessageTokens: Math.ceil(estimatedMessageTokens),
        maxEstimatedMessageTokens: MAX_MESSAGE_ESTIMATED_TOKENS,
      },
    });
    return;
  }

  console.log(
    `[singularity] Request: "${message.slice(0, 60)}…"  history=${hasImages ? 0 : safeHistory.length} turn(s)  boundedMessages=${boundedMessages.length} estimatedInputTokens=${Math.ceil(estimatedMessageTokens)} model=${model} images=${visionImages.length}`
  );

  const maxAttempts = getGroqKeyCount();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[singularity] Attempt ${attempt + 1}/${maxAttempts} — calling ${provider} API…`);

      // 60-second timeout only — do NOT abort on req.on('close').
      // req.on('close') fires immediately after the request body is consumed
      // (Express JSON body parser) not when the browser navigates away, so
      // wiring it to an AbortController kills every Groq call in ~12 ms.
      // Client-disconnect is handled at the res.on('close') level once SSE
      // headers are committed.
      const signal = AbortSignal.timeout(60_000);

      const completionRes = await fetchGroq({
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
        },
        signal,
        body: JSON.stringify({
           model,
           messages: boundedMessages,
          stream:      true,
          temperature: 0.6,
            max_tokens: voiceMode ? 320 : 1500,
        }),
      });

      // ── Non-2xx → log everything + return JSON (no SSE commitment yet) ──
      if (!completionRes.ok) {
        const errBody = await completionRes.text().catch(() => '(unreadable)');
        let errDetails: unknown = null;
        try { errDetails = JSON.parse(errBody); } catch { errDetails = errBody; }

        console.error(`[singularity] ❌ ${provider} non-2xx:`, {
          attempt:    attempt + 1,
          status:     completionRes.status,
          statusText: completionRes.statusText,
          provider,
          model,
          body:       errBody.slice(0, 2000),
        });

        // 4xx = client/auth/model error — rotating keys won't help
        if (completionRes.status >= 400 && completionRes.status < 500) {
          res.status(completionRes.status).json({
            success: false,
            error:   `${provider} API error ${completionRes.status}: ${completionRes.statusText}`,
            status:  completionRes.status,
            details: errDetails,
          });
          return;
        }

        // 5xx — try next key if available
        if (attempt < maxAttempts - 1) continue;

        res.status(502).json({
          success: false,
          error:   `${provider} returned ${completionRes.status} after ${maxAttempts} attempt(s)`,
          status:  completionRes.status,
          details: errDetails,
        });
        return;
      }

      if (!completionRes.body) {
        res.status(502).json({
          success: false, error: `${provider} response body is null — cannot stream`,
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

      const reader  = (completionRes.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder('utf-8');
      let rawBuffer  = '';

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

      // All provider attempts exhausted
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error:   error?.message ?? `All ${provider} attempts exhausted`,
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
    res.status(500).json({ success: false, error: `All ${provider} attempts failed`, status: 500, details: null });
  }
});

export default router;
