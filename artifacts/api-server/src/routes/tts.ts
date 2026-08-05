import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";

const router = Router();

const EDGE_VOICE = "hi-IN-SwaraNeural";
const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

function cleanSpeechText(input: string): string {
  return input
    .replace(/\\\[([\s\S]*?)\\\]/g, " formula ")
    .replace(/\\\(([\s\S]*?)\\\)/g, " formula ")
    .replace(/\$\$[\s\S]*?\$\$/g, " formula ")
    .replace(/\$[^$]*\$/g, " formula ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/[<>{}[\]\\\\|^~]/g, " ")
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
      rate: 0,
      volume: 0,
      pitch: 0,
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