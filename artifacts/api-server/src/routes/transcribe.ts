import { Router, type Request } from "express";
import { fetchGroqAudio, hasGroqKeys } from "../lib/groq";

const router = Router();
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const MAX_MULTIPART_READ_MS = 35_000;
const WHISPER_MODEL = "whisper-large-v3";
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
]);

interface MultipartAudio {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

function sanitiseFilename(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f<>:"|?*\\/]/g, "_")
    .trim()
    .slice(0, 120) || "recording.webm";
}

function parseHeaderBlock(headerBlock: Buffer): Record<string, string> {
  return headerBlock
    .toString("latin1")
    .split("\r\n")
    .reduce<Record<string, string>>((headers, line) => {
      const separator = line.indexOf(":");
      if (separator <= 0) return headers;
      headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
      return headers;
    }, {});
}

function getDispositionParameter(disposition: string, name: string): string {
  const match = disposition.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] ?? "";
}

function hasAudioSignature(audio: Buffer, contentType: string): boolean {
  if (contentType === "audio/webm") {
    return audio.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (contentType === "audio/ogg") return audio.subarray(0, 4).equals(Buffer.from("OggS"));
  if (contentType === "audio/wav" || contentType === "audio/x-wav") {
    return audio.subarray(0, 4).equals(Buffer.from("RIFF"))
      && audio.subarray(8, 12).equals(Buffer.from("WAVE"));
  }
  if (contentType === "audio/mp4") return audio.subarray(4, 8).equals(Buffer.from("ftyp"));
  if (contentType === "audio/mpeg") {
    return audio.subarray(0, 3).equals(Buffer.from("ID3"))
      || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0);
  }
  return false;
}

async function readMultipartAudio(req: Request): Promise<MultipartAudio> {
  const requestContentType = String(req.headers["content-type"] ?? "");
  const boundaryMatch = requestContentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    console.error("[transcribe] Multipart parsing failure:", {
      reason: "missing boundary",
      contentType: requestContentType,
    });
    throw new Error("A multipart boundary is required.");
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] ?? boundaryMatch[2]}`, "latin1");
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error("Audio upload timed out."));
    }, MAX_MULTIPART_READ_MS);

    req.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAX_AUDIO_BYTES + 512 * 1024) {
        clearTimeout(timeout);
        req.destroy();
        reject(new Error("Audio recording is too large."));
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      clearTimeout(timeout);
      resolve();
    });
    req.on("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  const body = Buffer.concat(chunks);
  const firstBoundary = body.indexOf(boundary);
  if (firstBoundary < 0) {
    console.error("[transcribe] Multipart parsing failure:", {
      reason: "opening boundary not found",
      bodyBytes: body.length,
    });
    throw new Error("Invalid multipart audio payload.");
  }

  const partStart = firstBoundary + boundary.length + 2;
  const nextBoundary = body.indexOf(boundary, partStart);
  if (nextBoundary < 0) {
    console.error("[transcribe] Multipart parsing failure:", {
      reason: "closing boundary not found",
      bodyBytes: body.length,
    });
    throw new Error("Invalid multipart audio part.");
  }

  const part = body.subarray(partStart, Math.max(partStart, nextBoundary - 2));
  const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
  if (headerEnd < 0) {
    console.error("[transcribe] Multipart parsing failure:", {
      reason: "audio part headers missing",
      partBytes: part.length,
    });
    throw new Error("Audio part headers are missing.");
  }

  const headers = parseHeaderBlock(part.subarray(0, headerEnd));
  const disposition = headers["content-disposition"] ?? "";
  if (getDispositionParameter(disposition, "name") !== "audio") {
    console.error("[transcribe] Multipart parsing failure:", {
      reason: "unexpected form field",
      fieldName: getDispositionParameter(disposition, "name") || "(missing)",
      expectedField: "audio",
    });
    throw new Error("The multipart audio field is required.");
  }

  const audio = part.subarray(headerEnd + 4);
  if (audio.length === 0) {
    console.error("[transcribe] Empty audio blob received:", {
      fieldName: "audio",
      filename: getDispositionParameter(disposition, "filename") || "(missing)",
      contentType: headers["content-type"] ?? "(missing)",
    });
    throw new Error("Audio recording is empty.");
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    console.error("[transcribe] Audio blob exceeds size limit:", {
      bytes: audio.length,
      maxBytes: MAX_AUDIO_BYTES,
    });
    throw new Error("Audio recording is empty or too large.");
  }

  return {
    buffer: audio,
    filename: sanitiseFilename(getDispositionParameter(disposition, "filename")),
    contentType: (headers["content-type"] ?? "application/octet-stream").split(";")[0].toLowerCase(),
  };
}

router.post("/transcribe", async (req, res) => {
  if (!hasGroqKeys()) {
    res.status(503).json({ success: false, error: "Speech transcription is unavailable." });
    return;
  }

  if (!String(req.headers["content-type"] ?? "").toLowerCase().startsWith("multipart/form-data")) {
    console.error("[transcribe] Request parsing failure:", {
      status: 415,
      reason: "request is not multipart/form-data",
      contentType: String(req.headers["content-type"] ?? ""),
    });
    res.status(415).json({ success: false, error: "Audio must be uploaded as multipart/form-data." });
    return;
  }

  try {
    const audio = await readMultipartAudio(req);
    const supportedType = SUPPORTED_AUDIO_TYPES.has(audio.contentType);
    const validSignature = supportedType && hasAudioSignature(audio.buffer, audio.contentType);
    if (!supportedType || !validSignature) {
      console.error("[transcribe] Unsupported audio format:", {
      status: 415,
        contentType: audio.contentType,
        filename: audio.filename,
        bytes: audio.buffer.length,
        supportedType,
        validSignature,
        header: audio.buffer.subarray(0, 16).toString("hex"),
      });
      res.status(415).json({ success: false, error: "Unsupported audio format." });
      return;
    }

    const audioArrayBuffer = new ArrayBuffer(audio.buffer.length);
    new Uint8Array(audioArrayBuffer).set(audio.buffer);
    const form = new FormData();
    form.append("file", new Blob([audioArrayBuffer], { type: audio.contentType }), audio.filename);
    form.append("model", WHISPER_MODEL);
    form.append("response_format", "json");

    const response = await fetchGroqAudio({
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const providerBody = await response.text().catch(() => "");
      console.error("[transcribe] Groq transcription failed:", {
        status: response.status,
        body: providerBody.slice(0, 500),
      });
      res.status(response.status === 429 ? 429 : 502).json({
        success: false,
        error: "Speech transcription failed. Please try again.",
      });
      return;
    }

    const result = await response.json() as { text?: unknown };
    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (!text) {
      console.info("[transcribe] Groq returned no meaningful speech:", {
        status: response.status,
        filename: audio.filename,
        bytes: audio.buffer.length,
      });
      res.status(422).json({ success: false, error: "No speech was detected." });
      return;
    }

    res.json({ success: true, text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError"))
      || /timed out|timeout|aborted/i.test(message);
    console.error("[transcribe] Request parsing or processing failure:", {
      status: isTimeout ? 504 : 400,
      message,
      contentType: String(req.headers["content-type"] ?? ""),
    });
    res.status(isTimeout ? 504 : 400).json({
      success: false,
      error: isTimeout ? "Speech upload timed out." : "Could not process this recording.",
    });
  }
});

export default router;