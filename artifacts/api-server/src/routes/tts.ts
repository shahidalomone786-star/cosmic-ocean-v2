import { Router } from "express";

const router = Router();

// ── 6-key ElevenLabs pool ─────────────────────────────────────────────────────
const EL_KEYS: string[] = [
  process.env.ELEVENLABS_KEY_1,
  process.env.ELEVENLABS_KEY_2,
  process.env.ELEVENLABS_KEY_3,
  process.env.ELEVENLABS_KEY_4,
  process.env.ELEVENLABS_KEY_5,
  process.env.ELEVENLABS_KEY_6,
].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

// Mutable rotation pointer — advances on 401/429, wraps around pool
let elKeyIndex = 0;

// ── Avatar → ElevenLabs voice ID ──────────────────────────────────────────────
// Mapped to real voices available on this account:
//   Einstein  → Bill    (Wise, Mature, Balanced — old American male)
//   Feynman   → Charlie (Deep, Confident, Energetic — Australian male)
//   Sagan     → Daniel  (Steady Broadcaster — formal British male)
//   Tesla     → Brian   (Deep, Resonant and Comforting — American male)
const AVATAR_VOICES: Record<string, string> = {
  "Albert Einstein": "pqHfZKP75CvOlQylNhV4",  // Bill    — wise, old
  "Richard Feynman": "IKne3meq5aSn9XLyUdCD",  // Charlie — energetic
  "Carl Sagan":      "onwK4e9ZLuTAKqWW03F9",  // Daniel  — broadcaster
  "Nikola Tesla":    "nPczCjzI2devNBz1zQrb",  // Brian   — deep, resonant
  "Mahera Jannat":   "EXAVITQu4vr4xnSDxMaL",  // Bella   — warm female
};
const FALLBACK_VOICE = "onwK4e9ZLuTAKqWW03F9"; // Daniel

// ── POST /api/tts ──────────────────────────────────────────────────────────────
router.post("/tts", async (req, res) => {
  const { text, avatarName } = req.body as { text?: string; avatarName?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (EL_KEYS.length === 0) {
    res.status(503).json({ code: "TOTAL_QUOTA_EXHAUSTED", error: "No ElevenLabs keys configured." });
    return;
  }

  const voiceId  = AVATAR_VOICES[avatarName ?? ""] ?? FALLBACK_VOICE;
  const safeText = text.slice(0, 2500);
  const elUrl    = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  for (let attempt = 0; attempt < EL_KEYS.length; attempt++) {
    const keyIndex = (elKeyIndex + attempt) % EL_KEYS.length;
    const apiKey   = EL_KEYS[keyIndex];

    try {
      const elRes = await fetch(elUrl, {
        method:  "POST",
        headers: {
          "xi-api-key":   apiKey,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text: safeText,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.48, similarity_boost: 0.82 },
        }),
      });

      if (elRes.status === 401 || elRes.status === 429) {
        elKeyIndex = (elKeyIndex + 1) % EL_KEYS.length;
        continue;
      }

      if (!elRes.ok) {
        const body = await elRes.text();
        res.status(502).json({ error: `ElevenLabs ${elRes.status}: ${body.slice(0, 300)}` });
        return;
      }

      const buf = Buffer.from(await elRes.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "no-store");
      res.send(buf);
      return;

    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      if (/429|rate.?limit/i.test(msg)) {
        elKeyIndex = (elKeyIndex + 1) % EL_KEYS.length;
        continue;
      }
      res.status(502).json({ error: msg });
      return;
    }
  }

  // All 6 keys exhausted
  res.status(503).json({ code: "TOTAL_QUOTA_EXHAUSTED", error: "All ElevenLabs quota exhausted." });
});

export default router;
