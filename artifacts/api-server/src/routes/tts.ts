import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";

const router = Router();

// This exact supported voice is required for consistent multilingual
// English/Hindi and mixed-language playback. Do not silently substitute a
// browser voice.
const EDGE_VOICE = "en-US-AvaMultilingualNeural";
const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_RATE = "+15%";

const LATEX_SPOKEN_WORDS: Record<string, string> = {
  alpha: "alpha",
  beta: "beta",
  chi: "chi",
  delta: "delta",
  epsilon: "epsilon",
  eta: "eta",
  gamma: "gamma",
  iota: "iota",
  kappa: "kappa",
  lambda: "lambda",
  mu: "mu",
  nu: "nu",
  omega: "omega",
  omicron: "omicron",
  phi: "phi",
  pi: "pi",
  psi: "psi",
  rho: "rho",
  sigma: "sigma",
  tau: "tau",
  theta: "theta",
  upsilon: "upsilon",
  xi: "xi",
  zeta: "zeta",
  varphi: "phi",
  varepsilon: "epsilon",
  vartheta: "theta",
  varsigma: "sigma",
  in: "in",
};

/**
 * Convert rendered Markdown/LaTeX presentation syntax into natural speech.
 * Keep this server-side so every bounded chunk sent to Edge TTS is sanitized,
 * regardless of which frontend surface requested playback.
 */
export function sanitizeTextForTTS(input: string): string {
  return input
    // Remove fenced-code delimiters and inline-code backticks without
    // allowing the punctuation itself to reach the speech engine.
    .replace(/```[a-zA-Z0-9_-]*\s*/g, " ")
    .replace(/```/g, " ")
    .replace(/`/g, " ")
    // Remove horizontal rules and Markdown list markers line-by-line.
    .replace(/^[ \t]*(?:-{3,}|_{3,}|\*{3,})[ \t]*$/gm, " ")
    .replace(/^[ \t]*[-*+][ \t]+/gm, " ")
    // Remove table alignment separators and pipes without stripping ordinary
    // hyphenated prose elsewhere in the response.
    .replace(/^[^\n]*\|[^\n]*$/gm, line =>
      line.replace(/:?-{2,}:?/g, " ").replace(/\|/g, " "),
    )
    // Remove Markdown headings/emphasis and LaTeX display/inline wrappers.
    .replace(/\\\[|\\\]|\\\(|\\\)/g, " ")
    .replace(/\$\$/g, " ")
    .replace(/\$/g, " ")
    .replace(/#{1,6}[ \t]*/g, " ")
    .replace(/[*_~]/g, "")
    // Keep readable Greek command names, but strip commands such as frac,
    // int, text, left, and right so Edge never speaks raw LaTeX syntax.
    .replace(/\\([A-Za-z]+)\*?/g, (_match, command: string) =>
      LATEX_SPOKEN_WORDS[command.toLowerCase()] ?? " ",
    )
    .replace(/\\/g, " ")
    .replace(/[{}[\]^]/g, " ")
    // Remove residual Markdown link/image punctuation while retaining labels.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    // Do not use an ASCII allow-list: preserve Devanagari, Kana, Han
    // characters, accents, and mixed Hinglish for multilingual playback.
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

router.post("/tts", async (req, res) => {
  const { text } = req.body as { text?: string };
  const speechText = text ? sanitizeTextForTTS(text) : "";

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