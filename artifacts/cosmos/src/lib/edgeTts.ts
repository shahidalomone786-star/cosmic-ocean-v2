export const EDGE_TTS_VOICE = 'en-US-AvaMultilingualNeural';
const MIN_CHUNK_LENGTH = 100;
const MAX_CHUNK_LENGTH = 200;

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

  async play(text: string): Promise<void> {
    const chunks = chunkTtsText(text);
    if (chunks.length === 0) throw new Error('There is no speakable text.');

    // Fetch the first chunk immediately. Once it starts, fetch the next chunk
    // concurrently with playback so the response is heard without a long wait.
    let nextAudio = await this.fetchAudio(chunks[0]);
    for (let index = 0; index < chunks.length; index += 1) {
      this.assertActive();
      const following = index + 1 < chunks.length
        ? this.fetchAudio(chunks[index + 1])
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