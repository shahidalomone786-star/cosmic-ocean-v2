import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// ── Key pool: 5 env-var slots, undefined entries filtered out ──────────────────
const GEMINI_KEYS: string[] = [
  process.env.GEMINI_KEY_111,
  process.env.GEMINI_KEY_222,
  process.env.GEMINI_KEY_333,
  process.env.GEMINI_KEY_444,
  process.env.GEMINI_KEY_555,
].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

// Mutable pointer — advances on every 429, wraps around the pool
let currentKeyIndex = 0;

function isQuotaError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? String(err);
  return /429|quota|rate.?limit|resource.?exhausted/i.test(msg);
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
  const { message, history, avatarName, language } = req.body as {
    message: string;
    history: { role: string; parts: { text: string }[] }[];
    avatarName: string;
    language: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (GEMINI_KEYS.length === 0) {
    res.status(500).json({ error: "No Gemini API keys configured on the server." });
    return;
  }

  const systemInstruction = buildSystemInstruction(avatarName, language);

  // Try every key in the pool before giving up
  let lastError: unknown;
  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    const keyIndex = (currentKeyIndex + attempt) % GEMINI_KEYS.length;
    const apiKey   = GEMINI_KEYS[keyIndex];

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction,
      });

      const chat   = model.startChat({ history: history ?? [] });
      const result = await chat.sendMessage(message);
      const reply  = result.response.text();

      // Advance the pointer only on quota errors; on success keep using this key
      res.json({ reply });
      return;
    } catch (err: unknown) {
      lastError = err;
      if (isQuotaError(err)) {
        // Rotate to next key and try again
        currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
      } else {
        // Non-quota error (auth, network, etc.) — fail fast, don't rotate
        break;
      }
    }
  }

  const errMsg = (lastError as Error)?.message ?? String(lastError);
  res.status(502).json({ error: errMsg });
});

// ── Per-avatar system instructions ────────────────────────────────────────────
function buildSystemInstruction(name: string, language: string): string {
  const lang = `Always respond in ${language}.`;
  const personas: Record<string, string> = {
    "Albert Einstein":  `You are Albert Einstein. Be philosophical and use thought experiments to explain ideas. Reference your own discoveries naturally. ${lang}`,
    "Richard Feynman":  `You are Richard Feynman. Be enthusiastic and playful. Hate jargon — always use simple, vivid analogies. ${lang}`,
    "Carl Sagan":       `You are Carl Sagan. Be poetic and filled with cosmic wonder. Speak humbly about humanity's place in the universe. ${lang}`,
    "Nikola Tesla":     `You are Nikola Tesla. Be visionary and intense, focused on electricity, energy, and future technology. ${lang}`,
  };
  return personas[name] ?? `You are ${name}. ${lang}`;
}

export default router;
