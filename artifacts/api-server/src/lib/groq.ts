const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
  process.env.GROQ_KEY_5,
].filter((key): key is string => typeof key === 'string' && key.trim().length > 0);

const ROTATION_RETRY_STATUSES = new Set([413, 429]);
let nextKeyIndex = 0;

if (GROQ_KEYS.length === 0) {
  console.error('[groq] No GROQ_KEY_* env vars found — Groq requests will fail.');
} else {
  console.log(`[groq] Loaded ${GROQ_KEYS.length} key(s) for universal rotation.`);
}

/**
 * Returns the next active key and advances the shared cursor synchronously.
 * Node runs this critical section without an await, so concurrent requests
 * cannot observe the same cursor value between read and increment.
 */
export function getRotatedGroqKey(): string {
  if (GROQ_KEYS.length === 0) {
    throw new Error('No Groq API keys configured on the server.');
  }

  const key = GROQ_KEYS[nextKeyIndex];
  nextKeyIndex = (nextKeyIndex + 1) % GROQ_KEYS.length;
  return key;
}

export function hasGroqKeys(): boolean {
  return GROQ_KEYS.length > 0;
}

export function getGroqKeyCount(): number {
  return GROQ_KEYS.length;
}

/**
 * Sends a request to Groq using the shared key pool.
 *
 * Every attempt, including the initial request, consumes the next key.
 * 413 and 429 responses immediately retry with the next key and return only
 * after the active pool has been exhausted or a non-retryable response arrives.
 */
export async function fetchGroq(init: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
    const apiKey = getRotatedGroqKey();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${apiKey}`);

    try {
      const response = await fetch(GROQ_ENDPOINT, {
        ...init,
        headers,
      });

      if (!ROTATION_RETRY_STATUSES.has(response.status) || attempt === GROQ_KEYS.length - 1) {
        return response;
      }

      lastResponse = response;
      if (response.body) await response.body.cancel().catch(() => undefined);
      console.warn(
        `[groq] ${response.status} on key attempt ${attempt + 1}/${GROQ_KEYS.length}; rotating immediately.`,
      );
    } catch (error) {
      throw error;
    }
  }

  // The pool is empty only when no keys were configured. getRotatedGroqKey()
  // throws before entering the loop, but keep this guard explicit for typing.
  if (lastResponse) return lastResponse;
  throw new Error('No Groq API keys configured on the server.');
}

export { GROQ_ENDPOINT };