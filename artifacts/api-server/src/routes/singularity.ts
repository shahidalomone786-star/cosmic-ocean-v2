// routes/singularity.ts — Groq streaming endpoint with full debug error surfacing
//
// KEY CHANGE: SSE headers are committed ONLY after Groq returns 200.
// All pre-stream failures → structured JSON { success, error, status, details }.
// Mid-stream failures → SSE event { error: true, message: "STREAM TERMINATED: …" }.

import { Router, type Request } from 'express';
import { fetchGroq, getGroqKeyCount, hasGroqKeys } from '../lib/groq';
import { COOKIE_NAME, verifyToken } from '../lib/jwt';
import { stmts } from '../lib/db';

const router = Router();
const MESSAGE_COOLDOWN_MS = 15_000;
const MODE_REQUEST_TOKEN_BUDGET = 8_000;
const lastSingularityRequestByClient = new Map<string, number>();

type SingularityMode = 'pro' | 'max' | 'flash' | 'research';
type ResponseMetadataKind = 'followups' | 'evidence' | null;
type EvidenceLevel = 'high' | 'medium' | 'low' | 'not-assessed';

type SingularityResponseMetadata =
  | { kind: 'followups'; questions: string[] }
  | {
      kind: 'evidence';
      confidence: Exclude<EvidenceLevel, 'not-assessed'>;
      assumptions: string[];
      evidenceQuality: EvidenceLevel;
      uncertainty: string;
    };

interface SingularityModePolicy {
  mode: SingularityMode;
  systemInstruction: string;
  includeHistory: boolean;
  includeAttachments: boolean;
  historyLimit: number;
  maxTokens: number;
  researchStyle: boolean;
  inputTokenBudget: number;
  responseMetadata: ResponseMetadataKind;
}

function resolveSingularityMode(value: unknown): SingularityMode {
  if (value === undefined || value === null || value === '') return 'pro';
  if (value === 'pro' || value === 'max' || value === 'flash' || value === 'research') return value;
  throw new Error('mode must be one of: pro, max, flash, research');
}

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

// ── Identity context ──────────────────────────────────────────────────────────
// Creator and user identity are deliberately separate. The creator is a stable
// product fact; a user's name must come from a trusted account or an explicit
// statement in the current conversation and must never be inferred from the
// creator attribution.
const CREATOR_NAME = 'Shahid';

interface SingularityIdentity {
  creatorName: string;
  userName: string | null;
  userNameSource: 'account' | 'explicit' | 'unknown';
}

function getAuthenticatedUserName(req: Request): string | null {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = stmts.getUserById.get(payload.sub);
  const username = user?.username?.trim();
  return username ? username.slice(0, 80) : null;
}

function extractExplicitUserName(texts: string[]): string | null {
  const namePattern = /\b(?:my name is|i am|i'm)\s+([A-Za-z][A-Za-z0-9'-]*(?:\s+[A-Za-z][A-Za-z0-9'-]*){0,3})(?=\s+(?:and|but|because|from|who|which)\b|[.!?,;\n]|$)/gi;
  for (const text of texts.slice().reverse()) {
    let match: RegExpExecArray | null;
    while ((match = namePattern.exec(text)) !== null) {
      const candidate = match[1].replace(/\s+/g, ' ').trim();
      if (candidate && !/^(?:a|an|the|just|not|here|looking|wondering)\b/i.test(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function resolveSingularityIdentity(req: Request, userMessages: string[], currentMessage: string): SingularityIdentity {
  const explicitName = extractExplicitUserName([...userMessages, currentMessage]);
  if (explicitName) {
    return { creatorName: CREATOR_NAME, userName: explicitName, userNameSource: 'explicit' };
  }
  const accountName = getAuthenticatedUserName(req);
  if (accountName) {
    return { creatorName: CREATOR_NAME, userName: accountName, userNameSource: 'account' };
  }
  return { creatorName: CREATOR_NAME, userName: null, userNameSource: 'unknown' };
}

function isCreatorIdentityQuestion(text: string): boolean {
  return /\b(?:who\s+(?:created|made|developed|built)\s+(?:you|singularity|this\s+ai|the\s+ai|this\s+portal)|who\s+is\s+your\s+creator|creator(?:'s)?\s+name|who\s+is\s+shahid|are\s+you\s+shahid)\b/i.test(text);
}

function buildIdentitySystemInstruction(identity: SingularityIdentity, currentMessage: string): string {
  const userName = identity.userName ?? 'unknown';
  const creatorContext = isCreatorIdentityQuestion(currentMessage)
    ? `
The creator identity is relevant to this request:
- creatorName: ${identity.creatorName}
If asked who created, built, or developed Singularity, answer that it was created/developed by ${identity.creatorName}.
If asked whether you are ${identity.creatorName}, answer that you are Singularity and ${identity.creatorName} is your creator, not you.`
    : `
Creator attribution is not relevant to this request. Do not volunteer it or mention the creator.`;
  return `━━━ IDENTITY BOUNDARY (AUTHORITATIVE) ━━━
Creator identity and current-user identity are completely separate.
- userName: ${userName}
- userNameSource: ${identity.userNameSource}

Never assume the current user is the creator. Never greet or address the user as the creator unless that person's identity is independently established as the current user's name. Do not volunteer creator information in greetings or unrelated answers.
If the user asks for their name and userName is unknown, answer naturally: "I don't know your name yet." Never guess a name.
If the user explicitly states a name in this conversation, that name may be used as the user's name and must not be replaced with creatorName.
${creatorContext}`;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const CORE_SYSTEM_PROMPT = `You are **Singularity**—a premium AI research assistant built into this portal.

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

If asked who created or built you, follow the authoritative identity boundary supplied with this request.

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

// Keep these overrides intentionally small. The shared scientific identity above is
// included once, while only the active mode signature is appended at runtime.
const MODE_OVERRIDES: Record<SingularityMode, string> = {
  pro: `Offer 2 or 3 useful next questions based on your answer. At the very end,
emit them only as <singularity-followups>["question 1","question 2","question 3"]</singularity-followups>.
Keep each question short and never mention this control line.`,
  max: `Give a deep, complete answer. For substantial responses, use clear headings such
as Executive Summary, Core Idea, Technical Detail, and Key Takeaways. Do not carry
unnecessary old context.`,
  flash: `Answer directly in a one-screen format. Use no long preamble and do not expand
unless asked. Preserve necessary caveats and correctness.`,
  research: `Prioritize primary or high-quality evidence. Separate fact, inference, and
speculation; state material assumptions and uncertainty. At the end, emit only this
compact control line: <singularity-evidence>{"confidence":"high|medium|low","assumptions":["..."],"evidenceQuality":"high|medium|low|not-assessed","uncertainty":"..."}</singularity-evidence>.
Use honest values and never mention this control line.`,
};

function buildModeSystemInstruction(mode: SingularityMode): string {
  return `${CORE_SYSTEM_PROMPT}\n\n${MODE_OVERRIDES[mode]}`;
}

const SINGULARITY_MODE_POLICIES: Record<SingularityMode, SingularityModePolicy> = {
  pro: {
    mode: 'pro',
    systemInstruction: buildModeSystemInstruction('pro'),
    includeHistory: true,
    includeAttachments: true,
    historyLimit: 4,
    maxTokens: 1500,
    researchStyle: false,
    inputTokenBudget: 5_000,
    responseMetadata: 'followups',
  },
  max: {
    mode: 'max',
    systemInstruction: buildModeSystemInstruction('max'),
    includeHistory: false,
    includeAttachments: false,
    historyLimit: 0,
    maxTokens: 5_200,
    researchStyle: false,
    inputTokenBudget: 2_800,
    responseMetadata: null,
  },
  flash: {
    mode: 'flash',
    systemInstruction: buildModeSystemInstruction('flash'),
    includeHistory: true,
    includeAttachments: true,
    historyLimit: 2,
    maxTokens: 700,
    researchStyle: false,
    inputTokenBudget: 2_600,
    responseMetadata: null,
  },
  research: {
    mode: 'research',
    systemInstruction: buildModeSystemInstruction('research'),
    includeHistory: true,
    includeAttachments: true,
    historyLimit: 4,
    maxTokens: 3000,
    researchStyle: true,
    inputTokenBudget: 5_000,
    responseMetadata: 'evidence',
  },
};

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
  const seenDataUrls = new Set<string>();

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
    if (seenDataUrls.has(dataUrl)) return [];
    seenDataUrls.add(dataUrl);

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
    .map(m => {
      const content = (m as any).content.trim();
      const hasPreviousImage = Array.isArray((m as any).images) && (m as any).images.length > 0;
      return {
        role: (m as any).role as 'user' | 'assistant',
        // Image bytes are never part of historical context. Keep only a tiny
        // marker so the model knows that turn included an image.
        content: hasPreviousImage && !content.includes('[Previous image]')
          ? `${content}\n[Previous image]`
          : content,
      };
    })
    // A previous bad response must not become authoritative identity context.
    // Keep the rest of the conversation intact while removing only explicit
    // claims that the current user is the creator.
    .map(message => message.role === 'assistant'
      ? {
          ...message,
          content: message.content
            .replace(/\b(?:your|the user's?)\s+name\s+is\s+Shahid\b[.!]?/gi, '')
            .replace(/\b(?:you are|you're)\s+Shahid\b[.!]?/gi, '')
            .replace(/\bHello,\s+Shahid\b[.!]?/gi, 'Hello')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        }
      : message)
    .filter(message => message.content.length > 0);
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
  // Base64 image data is transport encoding, not text context. Counting it as
  // ordinary characters makes one valid image look like thousands of tokens
  // and rejects otherwise safe vision requests. Estimate the structured
  // message envelope while replacing each image URL with a small marker.
  const estimationMessages = messages.map(message => ({
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map((part: any) => part?.type === 'image_url'
          ? { ...part, image_url: { ...part.image_url, url: '[image]' } }
          : part)
      : message.content,
  }));
  return JSON.stringify(estimationMessages).length / 4;
}

function trimMessagesToRequestBudget(
  messages: ChatRequestMessage[],
  inputTokenBudget: number,
): ChatRequestMessage[] {
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
    const excessCharacters = currentCharacters - inputTokenBudget * 4;
    const nextLength = Math.max(
      0,
      candidate.content.length - Math.max(64, Math.ceil(excessCharacters * 1.1)),
    );
    if (nextLength >= candidate.content.length) return false;
    candidate.content = candidate.content.slice(0, nextLength).trimEnd();
    return true;
  };

  while (estimateMessageTokens(boundedMessages) > inputTokenBudget) {
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

    // Never truncate the current user message or image. If the system prompt
    // plus current turn cannot fit, fail explicitly rather than corrupting it.
    break;
  }

  return boundedMessages;
}

function stripModeControlTags(content: string): string {
  return content
    .replace(/<singularity-followups>[\s\S]*?<\/singularity-followups>/gi, '')
    .replace(/<singularity-evidence>[\s\S]*?<\/singularity-evidence>/gi, '')
    .replace(/<singularity-(?:followups|evidence)>[\s\S]*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanMetadataString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
}

function extractResponseMetadata(
  content: string,
  mode: SingularityMode,
): SingularityResponseMetadata | null {
  if (mode === 'pro') {
    const match = content.match(/<singularity-followups>([\s\S]*?)<\/singularity-followups>/i);
    if (!match) return null;
    try {
      const parsed: unknown = JSON.parse(match[1]);
      if (!Array.isArray(parsed)) return null;
      const questions = parsed
        .filter((question): question is string => typeof question === 'string')
        .map(question => cleanMetadataString(question, 180))
        .filter(Boolean)
        .slice(0, 3);
      return questions.length > 0 ? { kind: 'followups', questions } : null;
    } catch {
      return null;
    }
  }

  if (mode !== 'research') return null;

  const match = content.match(/<singularity-evidence>([\s\S]*?)<\/singularity-evidence>/i);
  if (!match) {
    return {
      kind: 'evidence',
      confidence: 'medium',
      assumptions: [],
      evidenceQuality: 'not-assessed',
      uncertainty: 'No structured evidence note was returned.',
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    const confidence = parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
      ? parsed.confidence
      : 'medium';
    const evidenceQuality: EvidenceLevel =
      parsed.evidenceQuality === 'high'
      || parsed.evidenceQuality === 'medium'
      || parsed.evidenceQuality === 'low'
      || parsed.evidenceQuality === 'not-assessed'
        ? parsed.evidenceQuality
        : 'not-assessed';
    const assumptions = Array.isArray(parsed.assumptions)
      ? parsed.assumptions
        .filter((assumption): assumption is string => typeof assumption === 'string')
        .map(assumption => cleanMetadataString(assumption, 180))
        .filter(Boolean)
        .slice(0, 3)
      : [];
    return {
      kind: 'evidence',
      confidence,
      assumptions,
      evidenceQuality,
      uncertainty: cleanMetadataString(parsed.uncertainty, 240) || 'No additional uncertainty note.',
    };
  } catch {
    return {
      kind: 'evidence',
      confidence: 'medium',
      assumptions: [],
      evidenceQuality: 'not-assessed',
      uncertainty: 'The evidence note could not be structured reliably.',
    };
  }
}

// ── POST /api/singularity ─────────────────────────────────────────────────────
router.post('/singularity', async (req, res) => {
  const { message, history } = req.body ?? {};
  const voiceMode = req.body?.voiceMode === true;
  const images = sanitiseImageInputs(req.body?.images);
  let mode: SingularityMode;
  try {
    mode = resolveSingularityMode(req.body?.mode);
  } catch (error: unknown) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid Singularity mode.',
      status: 400,
      details: null,
    });
    return;
  }
  const modePolicy = SINGULARITY_MODE_POLICIES[mode];
  const effectiveImages = modePolicy.includeAttachments ? images : [];

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false, error: 'message is required and must be a non-empty string',
      status: 400, details: null,
    });
    return;
  }

  if (modePolicy.includeAttachments && Array.isArray(req.body?.images) && req.body.images.length > 0 && images.length === 0) {
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
  // Max deliberately ignores caller-supplied history. Identity must obey the
  // same boundary so a forged historical turn cannot establish a user name.
  const identityHistory = modePolicy.includeHistory ? safeHistory : [];
  const identity = resolveSingularityIdentity(
    req,
    identityHistory.filter(turn => turn.role === 'user').map(turn => turn.content),
    message.trim(),
  );
  // Only the request's active images are eligible for the vision turn. Any
  // image information in history has already been reduced to a placeholder.
  const hasImages = effectiveImages.length > 0;
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

  const userContent = effectiveImages.length > 0
    ? [
        { type: 'text', text: message.trim() },
        ...effectiveImages.map(image => ({
          type: 'image_url',
          image_url: { url: image.dataUrl },
        })),
      ]
    : message.trim();
  // Vision requests are intentionally stateless at the transport boundary:
  // the active image(s) arrive in `images` exactly once, while history only
  // contains text and "[Previous image]" placeholders.
  const visionImages = effectiveImages;
  const visionUserContent = visionImages.length > 0
    ? [
        { type: 'text', text: message.trim() },
        ...visionImages.map(image => ({
          type: 'image_url',
          image_url: { url: image.dataUrl },
        })),
      ]
    : message.trim();
  const historyMessages = !modePolicy.includeHistory || hasImages
    ? []
    : safeHistory.map(turn => ({ role: turn.role, content: turn.content }));
  const boundedHistoryMessages = !modePolicy.includeHistory || hasImages
    ? []
    : historyMessages.slice(-modePolicy.historyLimit);
  // Keep Singularity's persona as the first message for every provider/model.
  // In particular, Qwen vision requests must not bypass the system instruction.
  const messages: ChatRequestMessage[] = [
    {
      role: 'system',
      content: voiceMode
        ? `${buildIdentitySystemInstruction(identity, message.trim())}\n\n${modePolicy.systemInstruction}\n\n${VOICE_REALTIME_PROMPT}`
        : `${buildIdentitySystemInstruction(identity, message.trim())}\n\n${modePolicy.systemInstruction}`,
    },
    ...boundedHistoryMessages,
    { role: 'user',      content: hasImages ? visionUserContent : userContent },
  ];
  const boundedMessages = trimMessagesToRequestBudget(messages, modePolicy.inputTokenBudget);
  const estimatedMessageTokens = estimateMessageTokens(boundedMessages);

  // A single system prompt plus the newest user turn can itself be too large
  // (most commonly with an oversized image payload). Do not send an unsafe
  // request and rely on Groq to reject it; preserve the newest turn and fail
  // explicitly before the provider call instead.
  if (estimatedMessageTokens > modePolicy.inputTokenBudget) {
    res.status(413).json({
      success: false,
      error: 'This message is too large to process with the current context budget.',
      status: 413,
      details: {
        estimatedMessageTokens: Math.ceil(estimatedMessageTokens),
         maxEstimatedMessageTokens: modePolicy.inputTokenBudget,
      },
    });
    return;
  }

  console.log(
    `[singularity] Request: "${message.slice(0, 60)}…"  mode=${mode} history=${modePolicy.includeHistory && !hasImages ? safeHistory.length : 0} turn(s)  boundedMessages=${boundedMessages.length} estimatedInputTokens=${Math.ceil(estimatedMessageTokens)} model=${model} images=${visionImages.length} research=${modePolicy.researchStyle}`
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
            max_tokens: voiceMode
              ? 320
              : Math.min(modePolicy.maxTokens, MODE_REQUEST_TOKEN_BUDGET - modePolicy.inputTokenBudget),
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
              res.write(`data: ${JSON.stringify({ reasoning, content: stripModeControlTags(content) })}\n\n`);
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
        const final = splitReasoning(rawBuffer);
        const metadata = modePolicy.responseMetadata
          ? extractResponseMetadata(final.content, mode)
          : null;
        res.write(`data: ${JSON.stringify({
          reasoning: final.reasoning,
          content: stripModeControlTags(final.content),
          ...(metadata ? { metadata } : {}),
        })}\n\n`);
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
