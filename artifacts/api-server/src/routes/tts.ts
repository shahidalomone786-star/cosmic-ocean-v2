import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";

const router = Router();

// This exact supported voice is required for consistent multilingual
// English/Hindi and mixed-language playback. Do not silently substitute a
// browser voice.
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
    .slice(0, 240);
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
    // EdgeTTS creates the Microsoft-compatible SSML document internally from
    // this bounded Unicode-preserving text and the exact multilingual voice.
    // Forward the provider's audio frames immediately instead of waiting for
    // the library's buffered synthesize() call to assemble the whole chunk.
    res.status(200);
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "no-store");
    res.flushHeaders();

    for await (const audioChunk of edgeTts.synthesizeStream(speechText, EDGE_VOICE, {
      outputFormat: EDGE_OUTPUT_FORMAT,
      rate: EDGE_RATE,
      volume: 0,
      pitch: "+0Hz",
    })) {
      if (res.destroyed) return;
      res.write(Buffer.from(audioChunk));
    }
    res.end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[tts] Edge TTS synthesis failed:", message);
    if (res.headersSent) {
      res.destroy(error instanceof Error ? error : new Error(message));
    } else {
      res.status(503).json({
        code: "EDGE_TTS_UNAVAILABLE",
        error: "Speech synthesis is temporarily unavailable.",
      });
    }
  }
});

export default router;