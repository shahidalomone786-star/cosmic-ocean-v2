import { Router } from "express";

const router = Router();

// ── ElevenLabs key pool ──────────────────────────────────────────────────────
// Keep keys server-side. The comma-separated form is useful for deployments
// that inject one secret, while the numbered form preserves the existing
// Replit secret setup.
const getElevenLabsKeys = (): string[] => {
  const commaSeparated = (
    process.env.VITE_ELEVENLABS_API_KEYS ||
    process.env.ELEVENLABS_API_KEYS ||
    ""
  )
    .split(",")
    .map(key => key.trim())
    .filter(Boolean);
  const numbered = [
    process.env.ELEVENLABS_KEY_1,
    process.env.ELEVENLABS_KEY_2,
    process.env.ELEVENLABS_KEY_3,
    process.env.ELEVENLABS_KEY_4,
    process.env.ELEVENLABS_KEY_5,
    process.env.ELEVENLABS_KEY_6,
  ].filter((key): key is string => typeof key === "string" && key.trim().length > 0);

  return [...new Set([...commaSeparated, ...numbered])];
};

// Mutable rotation pointer — advances across the pool after each attempt
// and wraps around for the next request.
let elKeyIndex = 0;

// Rachel — calm, natural female voice compatible with ElevenLabs free-tier
// accounts. Keep this server-side so the client never needs voice/provider
// configuration and cannot select a premium-only library voice accidentally.
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

// ── POST /api/tts ──────────────────────────────────────────────────────────────
router.post("/tts", async (req, res) => {
  const { text } = req.body as {
    text?: string;
  };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const elKeys = getElevenLabsKeys();
  if (elKeys.length === 0) {
    res.status(503).json({ code: "TOTAL_QUOTA_EXHAUSTED", error: "No ElevenLabs keys configured." });
    return;
  }

  const voiceId  = DEFAULT_VOICE;
  const safeText = text.slice(0, 2500);
  const elUrl    = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  let sawPlanRequired = false;
  for (let attempt = 0; attempt < elKeys.length; attempt++) {
    const keyIndex = (elKeyIndex + attempt) % elKeys.length;
    const apiKey   = elKeys[keyIndex];

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
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.48, similarity_boost: 0.82 },
        }),
      });

      // A free-tier quota, account restriction, invalid key, or rate limit
      // can be isolated to one account. Always try the next configured key.
      if (elRes.status === 401 || elRes.status === 402 || elRes.status === 403 || elRes.status === 429) {
        if (elRes.status === 402) sawPlanRequired = true;
        elKeyIndex = (keyIndex + 1) % elKeys.length;
        continue;
      }

      if (!elRes.ok) {
        const body = await elRes.text();
        res.status(502).json({ error: `ElevenLabs ${elRes.status}: ${body.slice(0, 300)}` });
        return;
      }

      const buf = Buffer.from(await elRes.arrayBuffer());
      elKeyIndex = (keyIndex + 1) % elKeys.length;
      res.set("Content-Type", "audio/mpeg");
      res.set("Cache-Control", "no-store");
      res.send(buf);
      return;

    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      if (/401|402|403|429|rate.?limit|quota|paid.?plan/i.test(msg)) {
        elKeyIndex = (keyIndex + 1) % elKeys.length;
        continue;
      }
      res.status(502).json({ error: msg });
      return;
    }
  }

  if (sawPlanRequired) {
    res.status(503).json({
      code: "PREMIUM_PLAN_REQUIRED",
      error: "All configured ElevenLabs accounts rejected this voice or quota.",
    });
    return;
  }

  res.status(503).json({ code: "TOTAL_QUOTA_EXHAUSTED", error: "All ElevenLabs quota exhausted." });
});

export default router;
