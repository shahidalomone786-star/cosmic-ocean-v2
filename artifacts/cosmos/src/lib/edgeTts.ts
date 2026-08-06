export const EDGE_TTS_VOICE = 'en-US-AvaMultilingualNeural';
const MIN_CHUNK_LENGTH = 100;
const MAX_CHUNK_LENGTH = 200;
const MAX_PREFETCHED_MESSAGES = 24;

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

      const blob = await response.blob();
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

    const url = URL.createObjectURL(await response.blob());
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
    const audio = new Audio(url);
    this.currentAudio = audio;

    return new Promise((resolve, reject) => {
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
      audio.onerror = () => finish(new Error('Edge TTS audio playback failed.'));
      this.signal.addEventListener('abort', () => {
        audio.pause();
        finish(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });
      audio.play().catch(error => finish(error instanceof Error ? error : new Error(String(error))));
    });
  }
}

type TtsLevelListener = (level: number) => void;

let sharedVoiceAudio: HTMLAudioElement | null = null;
let sharedVoiceAudioContext: AudioContext | null = null;
let sharedVoiceAudioSource: MediaElementAudioSourceNode | null = null;

function getSharedVoiceAudio(): HTMLAudioElement {
  if (!sharedVoiceAudio) {
    sharedVoiceAudio = document.createElement('audio');
    sharedVoiceAudio.preload = 'auto';
    sharedVoiceAudio.setAttribute('playsinline', '');
  }
  return sharedVoiceAudio;
}

export function primeVoiceAudio(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const audio = getSharedVoiceAudio();
  audio.muted = true;
  audio.volume = 0;
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
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
  }).catch(() => {
    audio.muted = false;
    audio.volume = 1;
  });
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
  sharedVoiceAudio = null;
}

/**
 * Streaming voice-mode player. Sentences are enqueued as the assistant SSE
 * response arrives, so the first audio request can start before the response
 * is complete. Playback remains sequential and abortable.
 */
export class TtsStreamingQueue {
  private readonly controller = new AbortController();
  private readonly pending: string[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private processing = false;
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

  constructor(
    private readonly onLevel?: TtsLevelListener,
    private readonly onError?: (error: Error) => void,
    private readonly onPlaybackStart?: () => void,
  ) {}

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  unlock(): void {
    primeVoiceAudio();
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
    this.pending.push(cleaned);
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
      while (this.pending.length > 0 && !this.stopped) {
        const text = this.pending.shift();
        if (!text) continue;
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
            await this.playResponse(response);
            lastError = null;
            break;
          } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') throw error;
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === 0 && !this.stopped) {
              await new Promise<void>(resolve => window.setTimeout(resolve, 160));
            }
          }
        }
        if (lastError) throw lastError;
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      this.pending.length = 0;
    } finally {
      this.processing = false;
      if (this.pending.length === 0 && (this.finished || this.stopped || Boolean(this.finishResolve))) {
        this.finishResolve?.();
        this.finishResolve = null;
      }
    }
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
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        audio.onended = null;
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
      audio.onerror = () => finish(new Error('Edge TTS audio playback failed.'));
      this.signal.addEventListener('abort', () => {
        audio.pause();
        finish(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });
      audio.play().then(() => {
        if (this.stopped) return;
        this.playbackStarted = true;
        this.onPlaybackStart?.();
      }).catch(error => finish(error instanceof Error ? error : new Error(String(error))));
    });
  }

  private async playResponse(response: Response): Promise<void> {
    if (
      !response.body
      || typeof MediaSource === 'undefined'
      || !MediaSource.isTypeSupported('audio/mpeg')
    ) {
      await this.playBlob(await response.blob());
      return;
    }

    if (this.stopped) throw new DOMException('TTS playback aborted', 'AbortError');

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    const audio = this.audio;
    this.currentUrl = url;
    this.currentAudio = audio;
    audio.src = url;
    audio.volume = this.speakerEnabled ? 1 : 0;
    this.startLevelMeter(audio);

    return new Promise((resolve, reject) => {
      let settled = false;
      let started = false;
      let sourceBuffer: SourceBuffer | null = null;
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        audio.onended = null;
        audio.onerror = null;
        this.stopLevelMeter();
        if (this.currentAudio === audio) this.currentAudio = null;
        if (this.currentUrl === url) this.currentUrl = null;
        reader?.cancel().catch(() => undefined);
        if (mediaSource.readyState === 'open') {
          try {
            mediaSource.endOfStream();
          } catch {
            // The media source may already be closing during cancellation.
          }
        }
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        URL.revokeObjectURL(url);
        error ? reject(error) : resolve();
      };

      const startPlayback = () => {
        if (started || this.stopped) return;
        started = true;
        audio.play().then(() => {
          if (this.stopped) return;
          this.playbackStarted = true;
          this.onPlaybackStart?.();
        }).catch(error => finish(error instanceof Error ? error : new Error(String(error))));
      };

      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('Edge TTS audio playback failed.'));
      this.signal.addEventListener('abort', () => {
        audio.pause();
        finish(new DOMException('TTS playback aborted', 'AbortError'));
      }, { once: true });

      mediaSource.addEventListener('sourceopen', () => {
        if (settled || this.stopped) return;
        try {
          sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          reader = response.body!.getReader();
          void (async () => {
            let receivedAudio = false;
            while (!settled && !this.stopped) {
              const { done, value } = await reader!.read();
              if (done) break;
              if (!value?.byteLength) continue;
              receivedAudio = true;
              await new Promise<void>((appendResolve, appendReject) => {
                const append = () => {
                  if (settled || this.stopped || !sourceBuffer) {
                    appendReject(new DOMException('TTS playback aborted', 'AbortError'));
                    return;
                  }
                  try {
                    const appendBytes = new Uint8Array(value.byteLength);
                    appendBytes.set(value);
                    sourceBuffer.addEventListener('updateend', () => {
                      appendResolve();
                      if (!started) startPlayback();
                    }, { once: true });
                    sourceBuffer.appendBuffer(appendBytes.buffer);
                  } catch (error) {
                    appendReject(error instanceof Error ? error : new Error(String(error)));
                  }
                };
                if (sourceBuffer!.updating) {
                  sourceBuffer!.addEventListener('updateend', append, { once: true });
                } else {
                  append();
                }
              });
            }
            if (!receivedAudio) {
              finish(new Error('Edge TTS returned an empty audio stream.'));
              return;
            }
            if (mediaSource.readyState === 'open') mediaSource.endOfStream();
          })().catch(error => finish(error instanceof Error ? error : new Error(String(error))));
        } catch (error) {
          finish(error instanceof Error ? error : new Error(String(error)));
        }
      }, { once: true });
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