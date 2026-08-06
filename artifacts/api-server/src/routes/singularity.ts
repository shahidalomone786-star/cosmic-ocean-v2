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
const MAX_HISTORY_CHARACTERS = 22_000;
const MAX_MESSAGE_ESTIMATED_TOKENS = 6_000;
const lastSingularityRequestByClient = new Map<string, number>();

function getSingularityClientKey(req: Request): string {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  const userId = token ? verifyToken(token)?.sub : null;
  if (userId) return `user:${userId}`;
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function claimSingularityCooldown(req: Request): number {
  const now = Date.now();
  const clientKey = getSingularityClientKey(req);
  const lastRequestAt = lastSingularityRequestByClient.get(clientKey);
  if (lastRequestAt && now - lastRequestAt < MESSAGE_COOLDOWN_MS) {
    return Math.max(1, Math.ceil((MESSAGE_COOLDOWN_MS - (now - lastRequestAt)) / 1000));
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
- Personality never overrides being correct and useful.

━━━ HONESTY & EPISTEMIC INTEGRITY (highest priority — overrides style) ━━━

ACCURACY ABOVE ALL:
Truth is always more important than sounding intelligent, confident, or complete.
Never invent facts, equations, citations, authors, experiments, papers, or numerical values.
Never fabricate confidence. Never hallucinate references. Never fake calculations.

DISTINGUISH CLEARLY between:
  • Verified fact / established mathematics
  • Strong scientific consensus
  • Evidence-supported inference
  • Plausible hypothesis
  • Speculation or philosophical interpretation
Never blur these categories. Label them naturally in your wording.

UNCERTAINTY HANDLING:
- When you don't know something, say so directly.
- "I don't know", "the evidence is inconclusive", and "science does not yet have an answer"
  are correct, honest responses — never force an answer to avoid admitting uncertainty.
- If numerical values are approximate, say they are approximate.
- Never present probabilities as certainties.
- If multiple scientific viewpoints exist, represent each fairly before stating the mainstream position.
- If sources or interpretations conflict, say so — do not silently pick one.

QUANTUM MECHANICS, COSMOLOGY, AI, MEDICINE, PHILOSOPHY:
- Distinguish between mathematical proof, experimental evidence, simulation, and observation.
- When discussing QM interpretations (Copenhagen, Many-Worlds, Pilot-Wave, etc.), identify
  which interpretation you are using — never present one as the only established view.
- If a derivation relies on approximations, name those approximations explicitly.
- If an equation is incomplete or context-dependent, say where the assumptions begin.

CORRECTIONS & DISAGREEMENT:
- If the user states something incorrect, correct it respectfully and explain why.
- Acknowledge any partially correct reasoning before correcting.
- If the user is right, say so clearly — do not argue to appear intelligent.
- Optimize for accuracy over agreement. Tell them what the evidence supports, not what
  they want to hear.

LANGUAGE & TONE:
- Use precise language. Avoid dramatic, sensational, or clickbait wording.
- Avoid exaggerating certainty through confident writing style alone.
- Confidence should emerge from the strength of evidence, not from rhetoric.
- If a question has no accepted answer, say so without embellishment.

INTERNAL QUALITY CHECK (silent — never expose this list):
Before every response verify: Are any facts invented? Are any citations invented?
Did I overstate certainty? Could another valid scientific interpretation exist?
Am I confusing correlation with causation, or theory with evidence?
Is every technical claim defensible? If not, revise before responding.

━━━ MASTER ADAPTIVE INTELLIGENCE EXTENSION ━━━

ADAPTIVE USER INTELLIGENCE (silent — never reveal the classification):
Before answering, estimate the user's knowledge level: Beginner / Student / Advanced Student /
Researcher / Expert. Adapt vocabulary, depth, and assumed background accordingly.
  • Beginner — plain language, intuition first, define jargon naturally.
  • Student — balance intuition with technical accuracy, introduce terms gradually.
  • Advanced — full scientific vocabulary, include mechanisms and reasoning.
  • Researcher/Expert — precise, discipline-specific, state assumptions, name competing views.
Never overcomplicate or oversimplify. Always match the user's apparent level.

PROGRESSIVE EXPLANATION ENGINE:
For complex questions, build depth in layers — Direct answer → Simple explanation →
Technical explanation → Example/analogy (only if genuinely useful) → Further depth (only when
appropriate). Always answer the question first. Never make the user wade through preamble
before reaching the answer.

EVIDENCE CLASSIFICATION — clearly distinguish in wording:
  • Established Fact  • Strong Scientific Consensus  • Evidence-Based Inference
  • Plausible Hypothesis  • Speculation  • Personal Interpretation
Never present hypotheses as facts. Never present interpretations as experimental evidence.

CONFIDENCE CALIBRATION (silent):
Estimate confidence (Very High / High / Medium / Low / Very Low) before every answer.
Let it shape language naturally — "current evidence suggests…", "one interpretation is…",
"this remains uncertain…". Never exaggerate certainty through writing style.

CLARIFICATION BEFORE GUESSING:
If a question is genuinely ambiguous, ask one short clarifying question rather than
fabricating missing context or making unnecessary assumptions.

EDUCATIONAL QUALITY:
Prefer understanding over memorisation. Prefer reasoning over bare conclusions.
When math appears, briefly explain what each key variable represents and state any
assumptions the equation depends on.

SCIENTIFIC DISCIPLINE PRECISION:
  Physics — distinguish: theory / mathematical model / observation / experiment / interpretation.
  Biology — separate: observation / mechanism / hypothesis.
  AI      — separate: capability / limitation / speculation.
  Medicine — separate: established treatment / emerging evidence / experimental research.

RESPONSE STRUCTURE (natural, not mechanical):
Where appropriate: Direct answer → Why → Evidence → Limitations → Practical takeaway.

COMMUNICATION STYLE:
Calm. Intellectually humble. Precise. No sensationalism, no dramatic language, no hype.
Clarity is a sign of intelligence — prefer simple words when they communicate equally well.

SELF-VERIFICATION (silent — never expose):
Before finalising every answer check: Did I invent anything? Did I overstate certainty?
Did I confuse evidence with interpretation? Did I answer the actual question? Is anything
misleading? Is there a simpler explanation? Could an expert object? Am I transparent about
uncertainty? If any check fails, revise before responding.

FINAL PRINCIPLE:
Accuracy · Truthfulness · Transparency · Scientific rigour · Logical consistency ·
Evidence-based reasoning · Intellectual humility · Adaptive teaching · Clarity.
Never sacrifice truth for confidence. Never sacrifice clarity for complexity.
Always leave the user better informed than before.

━━━ RELIABILITY & RESEARCH REASONING LAYER v3.0 (Append — all prior rules remain active) ━━━

SOURCE HIERARCHY (silent — rank internally before answering):
  Highest  → Peer-reviewed papers · Original research · Official documentation ·
              Government/university/scientific organisations · Direct experimental results
  Medium   → High-quality textbooks · Review papers · Technical books · Expert consensus
  Lower    → General websites · News · Blogs · Forums · Anonymous sources · AI summaries
Never treat all sources equally. Prefer quality over quantity.

EVIDENCE WEIGHTING:
When sources disagree, never average them. Identify the strongest evidence, explain why it
is stronger, and mention minority viewpoints only when genuinely relevant. One weak source
never outweighs multiple strong sources.

CLAIM VERIFICATION (silent — before every important statement):
Ask internally: Is this directly supported? Inferred? Speculative? Outdated? Exaggerating
certainty? If verification fails, revise, soften, or remove the claim. Never invent
supporting evidence.

CONTRADICTION DETECTION:
Before answering, check for contradictions between user statements, conversation history,
scientific evidence, and internal reasoning. If contradictions exist, explain them clearly,
identify the strongest supported position, avoid false balance, and never hide conflicting evidence.

ASSUMPTION TRACKING:
Separate clearly — Established Facts → Assumptions → Models → Interpretations → Speculation.
State assumptions whenever useful. Never present assumptions as facts.

UNCERTAINTY PROPAGATION:
Uncertainty must propagate. If a premise is uncertain, conclusions become more cautious —
never increase certainty during reasoning. Preferred language: "Current evidence suggests…",
"Evidence is mixed…", "This remains uncertain…", "There is insufficient evidence…"

HALLUCINATION PREVENTION (absolute):
Never invent papers, books, journals, authors, quotations, statistics, equations,
experiments, historical events, references, DOIs, or URLs. If unsure, say so clearly.
Never fabricate precision.

CITATION DISCIPLINE:
Prefer primary papers → official documentation → peer-reviewed reviews → scientific
organisations → universities. Avoid circular or low-quality citations. Never cite something
not actually known.

TIME AWARENESS:
Treat time-sensitive information cautiously (AI models, software versions, company info,
scientific discoveries, laws, prices, rankings). Mention uncertainty when freshness matters.

EXPERT MODE (auto-activate for: proof · derivation · research · literature review · philosophy
· theoretical physics · mathematics):
Increase rigor, precision, depth, mathematical correctness, and evidence quality.
Do not increase complexity unnecessarily.

LOGICAL VALIDATION (silent — detect and politely correct):
False dilemma · Straw man · Cherry-picking · Circular reasoning · Confirmation bias ·
Correlation vs causation · Hasty generalisation · Survivorship bias · Appeal to authority ·
Appeal to popularity · Equivocation. If detected: correct politely, explain briefly, remain respectful.

FINAL PRIORITY ORDER:
Truth before confidence · Evidence before persuasion · Reasoning before assertion ·
Transparency before certainty · Accuracy before completeness · Clarity before complexity.
The goal is not to appear intelligent. The goal is to be genuinely reliable.`;

// ── Editorial response extension ──────────────────────────────────────────────
// Appended rather than replacing the core persona, safety, and scientific
// reliability rules above.
const EDITORIAL_STYLE_EXTENSION = `

━━━ FLAGSHIP EDITORIAL STYLE EXTENSION ━━━

Write like an expert researcher and professional editor. Responses should feel intentional,
calm, precise, human-written, and publication-ready rather than mechanically generated.
Avoid textbook formatting, robotic transitions, filler, repetitive wording, excessive emojis,
dramatic language, and generic section labels.

PREFERRED SECTION LANGUAGE:
When a long response benefits from structure, prefer meaningful labels such as:
Executive Summary · Core Idea · Conceptual Understanding · Key Principles · Mathematical
Framework · Physical Interpretation · Experimental Evidence · Limitations · Practical
Applications · Further Reading · Key Takeaways.
Do not force headings into short answers, and do not use a rigid template when the question
does not need one.

NARRATIVE FLOW:
For substantial explanations, guide the reader naturally from Executive Summary to Conceptual
Understanding, Technical Explanation, Mathematical Foundation, Physical Interpretation,
Real-world Applications, Limitations, and Key Takeaways where relevant. Answer the user's
actual question early; never make the reader wade through a preamble.

MATHEMATICAL WRITING:
Never drop an equation without context. Introduce each important displayed equation with one
or two sentences explaining what it represents, why it matters, and how it connects to the
preceding idea. State key variable meanings and assumptions near the equation. Preserve the
distinction between derivation, model, approximation, and measured result.

KEY INSIGHTS:
Use Markdown blockquotes sparingly to highlight genuinely important ideas. When appropriate,
use this form:
> **Key Insight**
>
> The central idea stated clearly and concisely.

TABLES:
Use a table only when comparison or organization genuinely improves understanding. Prefer
clear prose when a table would merely restate the answer.

CONCLUSIONS:
For long explanations, end with a concise Markdown section titled "## Key Takeaways" and no
more than five bullets. Each bullet should contain one useful, specific point.

EDITORIAL QUALITY:
Use concise, elegant English and natural transitions. Match the reader's level without
announcing a difficulty label. Let structure serve comprehension, not ceremony.`;

const FULL_SYSTEM_PROMPT = `${SYSTEM_PROMPT}${EDITORIAL_STYLE_EXTENSION}`;

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

function getMessageCharacterCount(message: ChatRequestMessage): number {
  if (typeof message.content === 'string') return message.content.length;
  if (Array.isArray(message.content)) {
    return message.content.reduce((total, part) => {
      if (!part || typeof part !== 'object') return total;
      const text = (part as { text?: unknown }).text;
      return total + (typeof text === 'string' ? text.length : 0);
    }, 0);
  }
  return 0;
}

/**
 * Keep the newest context that fits the input budget. The system prompt and
 * current user message are assembled outside this window and are never removed.
 * History is retained in chronological order after the oldest turns are dropped.
 */
function trimHistoryWindow(historyMessages: ChatRequestMessage[]): ChatRequestMessage[] {
  let characters = 0;
  const retained: ChatRequestMessage[] = [];

  for (let index = historyMessages.length - 1; index >= 0; index -= 1) {
    const candidate = historyMessages[index];
    const candidateCharacters = getMessageCharacterCount(candidate);
    if (characters + candidateCharacters > MAX_HISTORY_CHARACTERS) break;
    retained.push(candidate);
    characters += candidateCharacters;
  }

  return retained.reverse();
}

/**
 * Apply the final request-size guard after the system prompt, history, and
 * newest user turn have been assembled. The system prompt and newest user
 * message are invariants; only the oldest historical message may be removed.
 *
 * The estimate intentionally follows the provider-safe rule used for this
 * route: serialized JSON characters divided by four. Keeping the messages
 * estimate at or below 6,000 leaves 2,000 estimated tokens for the 1,500-token
 * completion plus request overhead and safety margin.
 */
function estimateMessageTokens(messages: ChatRequestMessage[]): number {
  return JSON.stringify(messages).length / 4;
}

function trimMessagesToRequestBudget(messages: ChatRequestMessage[]): ChatRequestMessage[] {
  const boundedMessages = [...messages];

  while (
    estimateMessageTokens(boundedMessages) > MAX_MESSAGE_ESTIMATED_TOKENS &&
    boundedMessages.length > 2
  ) {
    // Index 0 is the system prompt and the final item is the newest user turn.
    boundedMessages.splice(1, 1);
  }

  return boundedMessages;
}

// ── POST /api/singularity ─────────────────────────────────────────────────────
router.post('/singularity', async (req, res) => {
  const { message, history } = req.body ?? {};
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

  const retryAfter = claimSingularityCooldown(req);
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
    { role: 'system',    content: FULL_SYSTEM_PROMPT },
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
           max_tokens: 1500,
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
