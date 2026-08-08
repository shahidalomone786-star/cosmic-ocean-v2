export const EDGE_TTS_VOICE = 'en-US-AvaMultilingualNeural';
const MIN_CHUNK_LENGTH = 100;
const MAX_CHUNK_LENGTH = 200;
const MAX_PREFETCHED_MESSAGES = 24;

async function readTtsAudioResponse(response: Response): Promise<Blob> {
  const contentType = response.headers.get('content-type') ?? 'unknown';
  const contentLength = response.headers.get('content-length') ?? 'unknown';
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const detail = body.trim().slice(0, 240);
    const message = `Edge TTS request failed (${response.status} ${response.statusText || 'Unknown status'})`
      + (detail ? `: ${detail}` : '');
    console.error('[EdgeTTS] Upstream request failed:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      contentLength,
      message: detail || response.statusText || 'No response body',
    });
    throw new Error(message);
  }

  if (!contentType.toLowerCase().includes('audio/mpeg')) {
    const body = await response.text().catch(() => '');
    const detail = body.trim().slice(0, 240);
    const message = `Edge TTS returned an unexpected response (${contentType})`
      + (detail ? `: ${detail}` : '');
    console.error('[EdgeTTS] Unexpected response format:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      contentLength,
      message: detail || 'No response body',
    });
    throw new Error(message);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    const message = 'Edge TTS returned an empty audio response.';
    console.error('[EdgeTTS] Empty audio response:', {
      status: response.status,
      contentType,
      contentLength,
      receivedBytes: blob.size,
    });
    throw new Error(message);
  }
  return blob;
}

export function cleanTtsText(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, ' formula ')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' formula ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' formula ')
    .replace(/\$[^$]*\$/g, ' formula ')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLongSentence(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function chunkTtsText(text: string): string[] {
  const cleaned = cleanTtsText(text);
  if (!cleaned) return [];

  const sentences = cleaned.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) ?? [cleaned];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const normalized = sentence.trim();
    if (!normalized) continue;
    const candidate = current ? `${current} ${normalized}` : normalized;

    if (current && candidate.length > MAX_CHUNK_LENGTH) {
      chunks.push(current);
      current = normalized;
    } else {
      current = candidate;
    }

    if (current.length >= MIN_CHUNK_LENGTH) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);

  return chunks.flatMap(splitLongSentence);
}

export type TtsPrefetchStatus = 'missing' | 'pending' | 'ready' | 'error';

interface TtsPrefetchRecord {
  textKey: string;
  chunks: string[];
  blobs: Array<Blob | undefined>;
  urls: Array<string | undefined>;
  errors: Array<Error | undefined>;
  readySignals: Array<Promise<void>>;
  resolveReady: Array<() => void>;
  status: 'pending' | 'ready' | 'error';
  lastUsedAt: number;
}

const prefetchCache = new Map<string, TtsPrefetchRecord>();

function revokePrefetchRecord(record: TtsPrefetchRecord): void {
  record.urls.forEach(url => {
    if (url) URL.revokeObjectURL(url);
  });
  // Wake any playback queue that was waiting for a record which has since
  // been replaced or evicted. It will fall back to a direct request instead
  // of retaining a promise that can never settle.
  record.resolveReady.forEach(resolve => resolve());
}

function trimPrefetchCache(): void {
  while (prefetchCache.size > MAX_PREFETCHED_MESSAGES) {
    const oldest = [...prefetchCache.entries()]
      .sort(([, left], [, right]) => left.lastUsedAt - right.lastUsedAt)[0];
    if (!oldest) return;
    prefetchCache.delete(oldest[0]);
    revokePrefetchRecord(oldest[1]);
  }
}

function createPrefetchRecord(text: string): TtsPrefetchRecord {
  const chunks = chunkTtsText(text);
  const resolveReady: Array<() => void> = [];
  const readySignals = chunks.map(() => new Promise<void>(resolve => {
    resolveReady.push(resolve);
  }));

  return {
    textKey: cleanTtsText(text),
    chunks,
    blobs: Array.from({ length: chunks.length }),
    urls: Array.from({ length: chunks.length }),
    errors: Array.from({ length: chunks.length }),
    readySignals,
    resolveReady,
    status: 'pending',
    lastUsedAt: Date.now(),
  };
}

export function getTtsPrefetchStatus(messageId: string, text: string): TtsPrefetchStatus {
  const record = prefetchCache.get(messageId);
  if (!record || record.textKey !== cleanTtsText(text)) return 'missing';
  record.lastUsedAt = Date.now();
  return record.status;
}

export function prefetchTtsAudio(messageId: string, text: string): void {
  const chunks = chunkTtsText(text);
  if (!messageId || chunks.length === 0) return;

  const existing = prefetchCache.get(messageId);
  const textKey = cleanTtsText(text);
  if (existing?.textKey === textKey) {
    existing.lastUsedAt = Date.now();
    return;
  }
  if (existing) {
    prefetchCache.delete(messageId);
    revokePrefetchRecord(existing);
  }

  const record = createPrefetchRecord(text);
  prefetchCache.set(messageId, record);
  trimPrefetchCache();

  // Deliberately do not attach playback cancellation to this work. The
  // response has finished streaming, so this cache should be ready for a
  // later Listen click even if another queue is stopped in the meantime.
  void Promise.all(chunks.map(async (chunk, index) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk }),
      });
      const blob = await readTtsAudioResponse(response);
      const current = prefetchCache.get(messageId);
      if (current !== record) return;
      record.blobs[index] = blob;
      record.urls[index] = URL.createObjectURL(blob);
      record.resolveReady[index]?.();
    } catch (error: unknown) {
      const current = prefetchCache.get(messageId);
      if (current !== record) return;
      record.errors[index] = error instanceof Error ? error : new Error(String(error));
      record.resolveReady[index]?.();
    }
  })).then(() => {
    if (prefetchCache.get(messageId) !== record) return;
    record.status = record.errors.some(Boolean) ? 'error' : 'ready';
    record.lastUsedAt = Date.now();
  });
}

async function waitForPrefetchedAudio(
  messageId: string,
  text: string,
  index: number,
  signal: AbortSignal,
): Promise<string> {
  const record = prefetchCache.get(messageId);
  if (!record || record.textKey !== cleanTtsText(text) || !record.chunks[index]) {
    throw new Error('Prefetched audio is unavailable.');
  }

  record.lastUsedAt = Date.now();
  if (record.urls[index]) return record.urls[index] as string;

  await Promise.race([
    record.readySignals[index],
    new Promise<never>((_, reject) => {
      if (signal.aborted) {
        reject(new DOMException('TTS playback aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', () => {
        reject(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });
    }),
  ]);

  if (record.urls[index]) return record.urls[index] as string;
  throw record.errors[index] ?? new Error('Prefetched audio is unavailable.');
}

export class TtsPlaybackQueue {
  private readonly controller = new AbortController();
  private readonly audioCache = new Map<string, string>();
  private currentAudio: HTMLAudioElement | null = null;
  private stopped = false;

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  stop(): void {
    this.stopped = true;
    this.controller.abort();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio.load();
      this.currentAudio = null;
    }
    for (const url of this.audioCache.values()) URL.revokeObjectURL(url);
    this.audioCache.clear();
  }

  seekBy(deltaSeconds: number): void {
    if (!this.currentAudio) return;
    this.currentAudio.currentTime = Math.max(
      0,
      this.currentAudio.currentTime + deltaSeconds,
    );
  }

  async play(
    text: string,
    messageId?: string,
    onFirstChunkReady?: () => void,
  ): Promise<void> {
    const chunks = chunkTtsText(text);
    if (chunks.length === 0) throw new Error('There is no speakable text.');

    // Fetch the first chunk immediately. Once it starts, fetch the next chunk
    // concurrently with playback so the response is heard without a long wait.
    let nextAudio = await this.fetchAudioForPlayback(chunks[0], 0, text, messageId);
    onFirstChunkReady?.();
    for (let index = 0; index < chunks.length; index += 1) {
      this.assertActive();
      const following = index + 1 < chunks.length
        ? this.fetchAudioForPlayback(chunks[index + 1], index + 1, text, messageId)
        : null;
      await this.playAudio(nextAudio);
      if (following) nextAudio = await following;
    }
  }

  private assertActive(): void {
    if (this.stopped || this.signal.aborted) {
      throw new DOMException('TTS playback aborted', 'AbortError');
    }
  }

  private async fetchAudio(chunk: string): Promise<string> {
    this.assertActive();
    const cached = this.audioCache.get(chunk);
    if (cached) return cached;

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk }),
      signal: this.signal,
    });
    const blob = await readTtsAudioResponse(response);
    this.assertActive();
    const url = URL.createObjectURL(blob);
    this.audioCache.set(chunk, url);
    return url;
  }

  private async fetchAudioForPlayback(
    chunk: string,
    index: number,
    text: string,
    messageId?: string,
  ): Promise<string> {
    if (!messageId) return this.fetchAudio(chunk);
    try {
      return await waitForPrefetchedAudio(messageId, text, index, this.signal);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      return this.fetchAudio(chunk);
    }
  }

  private playAudio(url: string): Promise<void> {
    this.assertActive();
    const audio = getSharedListenAudio();
    this.currentAudio = audio;

    return (listenAudioUnlockPromise ?? Promise.resolve()).then(() => new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        audio.onended = null;
        audio.onerror = null;
        if (this.currentAudio === audio) this.currentAudio = null;
        error ? reject(error) : resolve();
      };
      audio.onended = () => finish();
      audio.onerror = () => {
        const mediaError = audio.error;
        const detail = mediaError
          ? ` (media code ${mediaError.code}${mediaError.message ? `: ${mediaError.message}` : ''})`
          : '';
        console.error('[EdgeTTS] Listen audio element failed:', {
          mediaCode: mediaError?.code ?? null,
          mediaMessage: mediaError?.message ?? null,
          source: audio.currentSrc || audio.src,
        });
        finish(new Error(`Edge TTS audio playback failed${detail}.`));
      };
      this.signal.addEventListener('abort', () => {
        audio.pause();
        finish(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });
      audio.src = url;
      audio.load();
      audio.volume = 1;
      audio.play().catch(error => {
        const playbackError = normalizePlaybackError(error);
        console.error('[EdgeTTS] Listen audio.play() failed:', {
          name: playbackError.name,
          message: playbackError.message,
          source: audio.currentSrc || audio.src,
        });
        finish(playbackError);
      });
    }));
  }
}

type TtsLevelListener = (level: number) => void;

let sharedVoiceAudio: HTMLAudioElement | null = null;
let sharedVoiceAudioContext: AudioContext | null = null;
let sharedVoiceAudioSource: MediaElementAudioSourceNode | null = null;
let sharedVoiceAudioUnlocking = false;
let sharedVoiceAudioUnlocked = false;
let sharedVoiceAudioUnlockPromise: Promise<void> | null = null;

// A real, valid silent WAV is required here. Calling play() without a media
// source does not reliably satisfy mobile autoplay policies.
const SILENT_UNLOCK_WAV =
  'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

function normalizePlaybackError(error: unknown): Error {
  if (error instanceof Error) return error;
  const details = typeof error === 'object' && error !== null
    ? error as { name?: unknown; message?: unknown }
    : {};
  const normalized = new Error(
    typeof details.message === 'string' ? details.message : String(error),
  );
  if (typeof details.name === 'string' && details.name) normalized.name = details.name;
  return normalized;
}

let sharedListenAudio: HTMLAudioElement | null = null;
let listenAudioUnlockPromise: Promise<void> | null = null;
let listenAudioUnlocked = false;

function getSharedListenAudio(): HTMLAudioElement {
  if (!sharedListenAudio) {
    sharedListenAudio = document.createElement('audio');
    sharedListenAudio.preload = 'auto';
    sharedListenAudio.setAttribute('playsinline', '');
  }
  return sharedListenAudio;
}

/**
 * Called synchronously from the regular Listen button click handler so the
 * later asynchronous TTS fetch can reuse the browser's gesture grant.
 */
export function primeListenAudio(): void {
  if (
    typeof window === 'undefined'
    || typeof document === 'undefined'
    || listenAudioUnlocked
    || listenAudioUnlockPromise
  ) return;

  const audio = getSharedListenAudio();
  audio.muted = true;
  audio.volume = 0;
  audio.src = SILENT_UNLOCK_WAV;
  audio.load();
  try {
    listenAudioUnlockPromise = audio.play().then(() => {
      listenAudioUnlocked = true;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
      audio.muted = false;
      audio.volume = 1;
    }).catch(error => {
      console.error('[EdgeTTS] Listen gesture audio unlock failed:', normalizePlaybackError(error));
      audio.muted = false;
      audio.volume = 1;
    }).finally(() => {
      listenAudioUnlockPromise = null;
    });
  } catch (error) {
    console.error('[EdgeTTS] Listen gesture audio unlock failed:', normalizePlaybackError(error));
    listenAudioUnlockPromise = null;
    audio.muted = false;
    audio.volume = 1;
  }
}

function getSharedVoiceAudio(): HTMLAudioElement {
  if (!sharedVoiceAudio) {
    sharedVoiceAudio = document.createElement('audio');
    sharedVoiceAudio.preload = 'auto';
    sharedVoiceAudio.setAttribute('playsinline', '');
  }
  return sharedVoiceAudio;
}

export function primeVoiceAudio(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  const audio = getSharedVoiceAudio();
  const AudioContextClass = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AudioContextClass && !sharedVoiceAudioContext) {
    try {
      sharedVoiceAudioContext = new AudioContextClass();
    } catch {
      sharedVoiceAudioContext = null;
    }
  }
  void sharedVoiceAudioContext?.resume().catch(() => undefined);
  if (sharedVoiceAudioUnlocked) return Promise.resolve();
  if (sharedVoiceAudioUnlocking) return sharedVoiceAudioUnlockPromise ?? Promise.resolve();

  sharedVoiceAudioUnlocking = true;
  audio.muted = true;
  audio.volume = 0;
  audio.src = SILENT_UNLOCK_WAV;
  audio.load();
  try {
    sharedVoiceAudioUnlockPromise = audio.play().then(() => {
      if (sharedVoiceAudio !== audio) return;
      sharedVoiceAudioUnlocked = true;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
      audio.muted = false;
      audio.volume = 1;
    }).catch(error => {
      if (sharedVoiceAudio !== audio) return;
      const playbackError = normalizePlaybackError(error);
      console.error('[EdgeTTS] Gesture audio unlock failed:', playbackError);
      audio.muted = false;
      audio.volume = 1;
    }).finally(() => {
      if (sharedVoiceAudio === audio) {
        sharedVoiceAudioUnlocking = false;
        sharedVoiceAudioUnlockPromise = null;
      }
    });
  } catch (error) {
    console.error('[EdgeTTS] Gesture audio unlock failed:', normalizePlaybackError(error));
    sharedVoiceAudioUnlocking = false;
    sharedVoiceAudioUnlockPromise = null;
    audio.muted = false;
    audio.volume = 1;
  }
  return sharedVoiceAudioUnlockPromise ?? Promise.resolve();
}

export function releaseVoiceAudio(): void {
  if (sharedVoiceAudio) {
    sharedVoiceAudio.pause();
    sharedVoiceAudio.onended = null;
    sharedVoiceAudio.onerror = null;
    sharedVoiceAudio.removeAttribute('src');
    sharedVoiceAudio.load();
  }
  sharedVoiceAudioSource?.disconnect();
  sharedVoiceAudioSource = null;
  void sharedVoiceAudioContext?.close().catch(() => undefined);
  sharedVoiceAudioContext = null;
  sharedVoiceAudioUnlocking = false;
  sharedVoiceAudioUnlocked = false;
  sharedVoiceAudioUnlockPromise = null;
  sharedVoiceAudio = null;
}

/**
 * Streaming voice-mode player. Sentences are enqueued as the assistant SSE
 * response arrives, so the first audio request can start before the response
 * is complete. Playback remains sequential and abortable.
 */
export class TtsStreamingQueue {
  private readonly controller = new AbortController();
  private readonly pending: Array<{ text: string; audio?: Promise<Blob> }> = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private processing = false;
  private playing = false;
  private stopped = false;
  private finished = false;
  private finishPromise: Promise<void> | null = null;
  private finishResolve: (() => void) | null = null;
  private analyserFrame: number | null = null;
  private audioContext: AudioContext | null = sharedVoiceAudioContext;
  private analyser: AnalyserNode | null = null;
  private readonly audio = getSharedVoiceAudio();
  private speakerEnabled = true;
  private playbackStarted = false;
  private audioUnlockPromise: Promise<void> = Promise.resolve();
  private retryTimer: number | null = null;
  private retryWaitResolve: (() => void) | null = null;

  constructor(
    private readonly onLevel?: TtsLevelListener,
    private readonly onError?: (error: Error) => void,
    private readonly onPlaybackStart?: () => void,
  ) {}

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  unlock(): void {
    this.audioUnlockPromise = primeVoiceAudio();
    this.audioContext = sharedVoiceAudioContext;
  }

  setSpeakerEnabled(enabled: boolean): void {
    this.speakerEnabled = enabled;
    this.audio.volume = enabled ? 1 : 0;
  }

  enqueue(text: string): void {
    if (this.stopped || this.finished) return;
    const cleaned = cleanTtsText(text);
    if (!cleaned) return;
    const item: { text: string; audio?: Promise<Blob> } = { text: cleaned };
    this.pending.push(item);
    // If the current phrase is already audible, begin fetching the next
    // phrase immediately. The process loop still consumes items strictly in
    // order, so this cannot overlap or reorder playback.
    if (this.playing && this.pending.length === 1) {
      item.audio = this.fetchAudioWithRetry(cleaned);
    }
    void this.process();
  }

  finish(): Promise<void> {
    this.finished = true;
    if (!this.processing && this.pending.length === 0) return Promise.resolve();
    if (!this.finishPromise) {
      this.finishPromise = new Promise(resolve => {
        this.finishResolve = resolve;
      });
    }
    void this.process();
    return this.finishPromise;
  }

  stop(): void {
    this.stopped = true;
    this.controller.abort();
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
      const resolveRetry = this.retryWaitResolve;
      this.retryWaitResolve = null;
      resolveRetry?.();
    }
    this.pending.length = 0;
    this.stopLevelMeter();
    this.playbackStarted = false;
    this.audio.pause();
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.removeAttribute('src');
    this.audio.load();
    this.currentAudio = null;
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = null;
    }
    this.finishResolve?.();
    this.finishResolve = null;
  }

  private async process(): Promise<void> {
    if (this.processing || this.stopped) return;
    this.processing = true;
    try {
      await this.audioUnlockPromise;
      while (this.pending.length > 0 && !this.stopped) {
        const item = this.pending.shift();
        if (!item) continue;

        // Fetch the following phrase while the current phrase is decoded and
        // played. This is the key gap-reduction path for streamed responses.
        const following = this.pending[0];
        if (following && !following.audio) {
          following.audio = this.fetchAudioWithRetry(following.text);
        }

        let audio: Blob;
        try {
          audio = await (item.audio ?? this.fetchAudioWithRetry(item.text));
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error;
          // One failed phrase must not discard later valid phrases or strand
          // Voice Mode. Report it, then continue in the original order.
          this.onError?.(error instanceof Error ? error : new Error(String(error)));
          continue;
        }

        try {
          this.playing = true;
          await this.playBlob(audio);
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error;
          this.onError?.(error instanceof Error ? error : new Error(String(error)));
        } finally {
          this.playing = false;
        }
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      this.pending.length = 0;
    } finally {
      this.processing = false;
      this.playing = false;
      if (this.pending.length === 0 && (this.finished || this.stopped || Boolean(this.finishResolve))) {
        this.finishResolve?.();
        this.finishResolve = null;
      }
    }
  }

  private async fetchAudioWithRetry(text: string): Promise<Blob> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2 && !this.stopped; attempt += 1) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: this.signal,
        });
        if (!response.ok) {
          let message = `Edge TTS request failed (${response.status})`;
          try {
            const body = await response.json() as { error?: string };
            if (body.error) message = body.error;
          } catch {
            // Keep the status-based error when the server did not return JSON.
          }
          throw new Error(message);
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('audio/mpeg')) {
          throw new Error(`Edge TTS returned an unexpected response (${contentType || 'unknown'})`);
        }
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Edge TTS returned an empty audio response.');
        return blob;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === 0 && !this.stopped) {
          await new Promise<void>(resolve => {
            if (this.stopped) {
              resolve();
              return;
            }
            this.retryWaitResolve = resolve;
            this.retryTimer = window.setTimeout(() => {
              this.retryTimer = null;
              this.retryWaitResolve = null;
              resolve();
            }, 100);
          });
        }
      }
    }
    throw lastError ?? new Error('Edge TTS request failed.');
  }

  private async playBlob(blob: Blob): Promise<void> {
    if (this.stopped) throw new DOMException('TTS playback aborted', 'AbortError');
    const url = URL.createObjectURL(blob);
    const audio = this.audio;
    this.currentUrl = url;
    this.currentAudio = audio;
    audio.src = url;
    audio.volume = this.speakerEnabled ? 1 : 0;
    this.startLevelMeter(audio);

    return new Promise((resolve, reject) => {
      let settled = false;
      const markPlaybackStarted = () => {
        if (this.stopped || this.playbackStarted) return;
        this.playbackStarted = true;
        this.onPlaybackStart?.();
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        audio.onended = null;
        audio.onplaying = null;
        audio.onerror = null;
        this.stopLevelMeter();
        this.playbackStarted = false;
        if (this.currentAudio === audio) this.currentAudio = null;
        if (this.currentUrl === url) this.currentUrl = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        URL.revokeObjectURL(url);
        error ? reject(error) : resolve();
      };
      audio.onended = () => finish();
      audio.onplaying = markPlaybackStarted;
      audio.onerror = () => finish(new Error('Edge TTS audio playback failed.'));
      this.signal.addEventListener('abort', () => {
        audio.pause();
        finish(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });
      audio.play().catch(error => {
        const playbackError = normalizePlaybackError(error);
        if (playbackError.name === 'NotAllowedError') {
          console.error('[EdgeTTS] Browser blocked TTS playback:', playbackError);
        }
        finish(playbackError);
      });
    });
  }

  private startLevelMeter(audio: HTMLAudioElement): void {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass || !this.onLevel) return;
    try {
      const context = this.audioContext ?? new AudioContextClass();
      const source = sharedVoiceAudioSource ?? context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(context.destination);
      void context.resume().catch(() => undefined);
      this.audioContext = context;
      sharedVoiceAudioSource = source;
      this.analyser = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!this.analyser || this.currentAudio !== audio) return;
        this.analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => {
          const normalized = (sample - 128) / 128;
          return sum + normalized * normalized;
        }, 0) / samples.length);
        this.onLevel?.(Math.min(1, rms * 4.2));
        this.analyserFrame = requestAnimationFrame(tick);
      };
      this.analyserFrame = requestAnimationFrame(tick);
    } catch {
      this.onLevel?.(0);
    }
  }

  private stopLevelMeter(): void {
    if (this.analyserFrame !== null) cancelAnimationFrame(this.analyserFrame);
    this.analyserFrame = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.audioContext = sharedVoiceAudioContext;
    this.onLevel?.(0);
  }
}