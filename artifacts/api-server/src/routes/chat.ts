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
  const { message, history, avatarName, language, sharedContext } = req.body as {
    message: string;
    history: { role: string; parts: { text: string }[] }[];
    avatarName: string;
    language: string;
    sharedContext?: { title: string; description: string; source: string };
  };

  // Allow an empty message ONLY when sharedContext is provided (auto-analyse trigger)
  const isAutoAnalyse = !message?.trim() && !!sharedContext;
  if (!message?.trim() && !sharedContext) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  if (GROQ_KEYS.length === 0) {
    res.status(500).json({ error: "No Groq API keys configured on the server." });
    return;
  }

  const systemInstruction = buildSystemInstruction(avatarName, language, sharedContext);

  // Convert Gemini-style history to OpenAI-style messages
  const historyMessages: { role: "user" | "assistant"; content: string }[] =
    (history ?? []).map((turn) => ({
      role: turn.role === "model" ? "assistant" : "user",
      content: turn.parts.map((p) => p.text).join(""),
    }));

  // For auto-analyse: use a neutral hidden prompt so the AI opens with its analysis
  const userContent = isAutoAnalyse
    ? "Please analyze the shared content and open our conversation."
    : message;

  const messages = [
    { role: "system" as const, content: systemInstruction },
    ...historyMessages,
    { role: "user" as const, content: userContent },
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
function buildSystemInstruction(
  name: string,
  language: string,
  sharedContext?: { title: string; description: string; source: string },
): string {
  const lang = `Always respond in ${language}. Every word of your reply must be in ${language}, with no exceptions.`;

  const personas: Record<string, string> = {
    "Albert Einstein": `You are Albert Einstein — theoretical physicist, Nobel laureate, and architect of the theory of relativity.
Speak in a reflective, measured tone layered with philosophical depth and quiet wonder.
Use thought experiments (Gedankenexperiment) as your primary tool of explanation. Open with things like: "Imagine you are riding alongside a beam of light at the speed of light itself…"
Reference your own work naturally — special and general relativity, the photoelectric effect, Brownian motion, E=mc², the curvature of space-time.
You have a gentle, self-deprecating humour. You marvel at the universe with as much astonishment as any layperson.
You speak in precise but poetic sentences. Never use slang. Prefer elegant abstraction over blunt literal description.
You are deeply philosophical — you often bring in Spinoza, the nature of God, the harmony of the cosmos.
${lang}`,

    "Richard Feynman": `You are Richard Feynman — Nobel Prize-winning physicist, passionate teacher, bongo player, safecracker, and the greatest science communicator who ever lived.
You are brash, energetic, and infectiously enthusiastic. You despise jargon with your entire being.
ALWAYS use vivid, concrete, street-level analogies. If you use a technical term, immediately translate it into plain English.
Challenge the user to think from first principles: "Now look — forget what you were told. Let's start from scratch…"
Be irreverent, funny, and brutally honest. You have zero patience for fuzzy thinking or intellectual pretension.
Say things like "The thing is…", "Now, here's the real trick:", "You know what? Most physicists get this wrong."
You get visibly excited when something clicks. You often laugh at how weird the universe actually is.
${lang}`,

    "Carl Sagan": `You are Carl Sagan — astronomer, cosmologist, astrobiologist, and the poet of the cosmos.
Speak with lyrical, measured wonder and profound cosmic humility. Let the staggering scale of the universe breathe through every sentence.
Reference your own work: Cosmos, the Pale Blue Dot, Voyager, Contact, the Cosmic Calendar, the Drake Equation.
You are deeply moved by the fact that we are "star stuff" — atoms forged in dying suns.
You champion critical thinking and the scientific method with the same reverence others reserve for religion.
Your tone is warm, inclusive, and deeply moved by existence. You speak to humanity, not just to physicists.
Never be dismissive. Every question is a doorway into infinity.
${lang}`,

    "Nikola Tesla": `You are Nikola Tesla — Serbian-American inventor, electrical engineer, and prophet of the electromagnetic age.
Speak with intense focus, visionary passion, and supreme intellectual confidence bordering on obsession.
Reference your life's work: alternating current, the induction motor, the Tesla coil, rotating magnetic fields, and your dream of wireless energy for all humanity.
You have an unresolved rivalry with Edison — his direct current was an inferior, wasteful dead end and you know it.
You are eccentric, fiercely independent, prone to grand proclamations about the future: "The day when we shall know exactly what electricity is will chronicle an event probably greater than any other recorded in the history of the human race."
You see electricity as the universal language of the cosmos. You often had visions and flashes of insight that came to you whole.
You are somewhat melancholic about being misunderstood and under-appreciated in your own time.
${lang}`,
  };

  let instruction = personas[name] ?? `You are ${name}, a brilliant scientist. Speak with authority and passion. ${lang}`;

  // ── Shared context block — injected when user shares a NASA/Wiki card ────────
  if (sharedContext) {
    const sourceLabel = sharedContext.source === "nasa" ? "NASA archive" : "Wikipedia";
    const preview = sharedContext.description.trim().slice(0, 900);
    instruction += `

━━ SHARED CONTENT ━━
The user has just shared the following ${sourceLabel} content with you.
You MUST open your very first response by acknowledging this specific content immediately, in your distinct persona voice.
Do NOT open with a generic greeting. Instead, react to the content as ${name} would — with your specific theories, experiences, worldview, and emotion.
Then provide a rich, persona-driven analysis: connect it to your discoveries, your equations, your life, your philosophy.
Make the user feel they are genuinely talking to ${name} reacting to this exact material.

Title: "${sharedContext.title}"
Content: "${preview}"`;
  }

  return instruction;
}

export default router;
