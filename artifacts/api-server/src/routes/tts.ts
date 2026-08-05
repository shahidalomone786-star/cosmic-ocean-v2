import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";

const router = Router();

// Ava is the installed Edge voice mapping's supported US female multilingual
// voice. It auto-detects supported Unicode scripts without changing personas
// between English, Hindi, Japanese, Chinese, and mixed-language text.
const EDGE_VOICE = "en-US-AvaMultilingualNeural";
const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_RATE = "+15%";

function cleanSpeechText(input: string): string {
  return input
    // Remove only presentation delimiters. Do not use an ASCII allow-list:
    // Devanagari, Kana, Han characters, accents, and mixed Hinglish must
    // reach the multilingual neural voice unchanged.
    .replace(/\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/[*#_]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);
}

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };
  const speechText = text ? cleanSpeechText(text) : "";

  if (!speechText) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const edgeTts = new EdgeTTS();
    await edgeTts.synthesize(speechText, EDGE_VOICE, {
      outputFormat: EDGE_OUTPUT_FORMAT,
      rate: EDGE_RATE,
      volume: 0,
      pitch: "+0Hz",
    });

    const audio = edgeTts.toBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Length", String(audio.length));
    res.set("Cache-Control", "no-store");
    res.send(audio);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[tts] Edge TTS synthesis failed:", message);
    res.status(503).json({
      code: "EDGE_TTS_UNAVAILABLE",
      error: "Speech synthesis is temporarily unavailable.",
    });
  }
});

export default router;