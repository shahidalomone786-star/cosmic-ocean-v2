import { Router } from "express";
import { EdgeTTS } from "@andresaya/edge-tts";

const router = Router();

// This remains the default for chat and every existing TTS caller. Atelier
// may opt into one of the verified Edge voices below without changing the
// Voice Mode streaming pipeline.
const EDGE_VOICE = "en-US-AvaMultilingualNeural";
const ATELIER_VOICE_IDS = new Set([
  "en-US-EmmaNeural",
  "en-US-BrianMultilingualNeural",
  "en-US-ChristopherNeural",
  "en-US-AriaNeural",
  "en-US-GuyNeural",
]);
const EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const EDGE_RATE = "-10%";

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
  const { text, voice } = req.body as { text?: string; voice?: string };
  const speechText = text ? sanitizeTextForTTS(text) : "";

  if (!speechText) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (voice && !ATELIER_VOICE_IDS.has(voice)) {
    res.status(400).json({ error: "voice is not an available Cosmic Atelier voice" });
    return;
  }

  try {
    const edgeTts = new EdgeTTS();
    // EdgeTTS supplies Microsoft-compatible User-Agent, Origin, cookie, and
    // Sec-MS-GEC headers internally. Buffer the complete MP3 before sending it:
    // browsers can reject a MediaElement source when a provider stream ends
    // without a complete MP3 frame sequence.
    await edgeTts.synthesize(speechText, voice || EDGE_VOICE, {
      outputFormat: EDGE_OUTPUT_FORMAT,
      rate: EDGE_RATE,
      volume: 0,
      pitch: "+0Hz",
    });
    const audioBuffer = edgeTts.toBuffer();
    if (!audioBuffer.length) {
      throw new Error("Edge TTS returned an empty audio buffer.");
    }

    res.status(200);
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "no-store",
      "Content-Disposition": "inline; filename=\"cosmos-tts.mp3\"",
    });
    res.send(audioBuffer);
  } catch (error: unknown) {
    const providerError = error as {
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
      message?: unknown;
      response?: { status?: unknown; statusCode?: unknown; statusText?: unknown };
    };
    const providerStatus = providerError.response?.status
      ?? providerError.response?.statusCode
      ?? providerError.statusCode
      ?? providerError.status
      ?? "unknown";
    const message = typeof providerError.message === "string"
      ? providerError.message
      : String(error);
    req.log.error({
      provider: "Microsoft Edge TTS",
      status: providerStatus,
      code: providerError.code ?? "unknown",
      message,
    }, "[tts] Edge TTS synthesis failed");
    if (res.headersSent) {
      res.destroy(error instanceof Error ? error : new Error(message));
    } else {
      res.status(503).json({
        code: "EDGE_TTS_UNAVAILABLE",
        error: "Speech synthesis is temporarily unavailable.",
        detail: message,
      });
    }
  }
});

export default router;