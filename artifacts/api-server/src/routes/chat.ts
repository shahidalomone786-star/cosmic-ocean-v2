import { Router } from "express";

const router = Router();

// ── Key pool: 5 Groq keys, undefined entries filtered out ─────────────────────
const GROQ_KEYS: string[] = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

// Mutable pointer — advances on every 429, wraps around the pool
let currentKeyIndex = 0;

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL    = "llama-3.3-70b-versatile";

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

  if (GROQ_KEYS.length === 0) {
    res.status(500).json({ error: "No Groq API keys configured on the server." });
    return;
  }

  const systemInstruction = buildSystemInstruction(avatarName, language);

  // Convert Gemini-style history to OpenAI-style messages
  const historyMessages: { role: "user" | "assistant"; content: string }[] =
    (history ?? []).map((turn) => ({
      role: turn.role === "model" ? "assistant" : "user",
      content: turn.parts.map((p) => p.text).join(""),
    }));

  const messages = [
    { role: "system" as const, content: systemInstruction },
    ...historyMessages,
    { role: "user" as const, content: message },
  ];

  // Try every key before giving up
  let lastError: unknown;
  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const keyIndex = (currentKeyIndex + attempt) % GROQ_KEYS.length;
    const apiKey   = GROQ_KEYS[keyIndex];

    try {
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages }),
      });

      if (response.status === 429) {
        // Rate-limited — rotate and retry with next key
        currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
        lastError = new Error(`429 rate limit on key index ${keyIndex}`);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Groq API error ${response.status}: ${body}`);
      }

      const json = await response.json() as {
        choices: { message: { content: string } }[];
      };
      const reply = json.choices?.[0]?.message?.content ?? "";
      res.json({ reply });
      return;

    } catch (err: unknown) {
      lastError = err;
      const msg = (err as Error)?.message ?? String(err);
      // Only rotate on rate-limit signals; fail fast on auth / network errors
      if (/429|rate.?limit/i.test(msg)) {
        currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
      } else {
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
