/**
 * contextSelector.ts — Lightweight keyword-based chunk selection.
 *
 * Scores each chunk against the user query using term-frequency counting
 * with stop-word filtering. Preserves document order in the final result
 * so the model receives context in reading order.
 *
 * Fallback (no query tokens / no match): returns beginning + mid + end of
 * the document to cover abstract, body, and conclusion patterns common in
 * scientific papers.
 *
 * Performance: O(Q × C) where Q = query tokens, C = chunk count.
 * For typical documents (< 200 chunks) this is < 1 ms — no Worker needed.
 *
 * Future extension points (do NOT implement yet):
 *   • Embedding-based similarity (sentence-transformers)
 *   • BM25 / TF-IDF with IDF weighting across chunks
 *   • Hybrid keyword + semantic re-ranking
 *   • Citation tracking (which chunk answered the question)
 */

// ─── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','in','it','of','on','to','was','for','with',
  'as','at','by','be','or','and','that','this','from','are','but',
  'have','has','had','not','what','which','who','i','me','my','we',
  'do','did','does','will','would','can','could','should','may',
  'might','also','its','their','they','them','there','been','were',
  'more','some','any','all','one','two','three','about','just','than',
  'then','so','if','each','how','her','his','him','she','he','our',
  'your','up','out','into','over','after','before','through','between',
]);

// ─── Tokeniser ────────────────────────────────────────────────────────────────

/**
 * Convert text to an array of meaningful lowercase tokens.
 * Strips punctuation while preserving Unicode letters and numbers,
 * so scientific symbols that appear at word boundaries survive.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

// ─── Scorer ───────────────────────────────────────────────────────────────────

/** Raw term-frequency score of `queryTokens` against a single chunk. */
function scoreChunk(queryTokens: string[], chunkLower: string): number {
  let total = 0;
  for (const token of queryTokens) {
    // Escape regex meta-characters in the token
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = chunkLower.match(new RegExp(escaped, 'g'));
    if (matches) total += matches.length;
  }
  return total;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Select the most relevant chunks for a user query.
 *
 * @param query        The user's message text (clean — no document context).
 * @param chunks       All chunks from ChunkManager.
 * @param topK         Maximum number of chunks to return (default 4).
 * @returns            Ordered subset of chunks (document order preserved).
 */
export function selectRelevantChunks(
  query: string,
  chunks: string[],
  topK = 4,
): string[] {
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const queryTokens = tokenize(query);

  // ── Fallback: no meaningful query tokens ──────────────────────────────────
  if (queryTokens.length === 0) {
    return fallback(chunks, topK);
  }

  // ── Score every chunk ─────────────────────────────────────────────────────
  const scored = chunks.map((chunk, idx) => ({
    idx,
    score: scoreChunk(queryTokens, chunk.toLowerCase()),
  }));

  const maxScore = Math.max(...scored.map(s => s.score));

  // ── Fallback: no keyword overlap at all ───────────────────────────────────
  if (maxScore === 0) {
    return fallback(chunks, topK);
  }

  // ── Pick top-K by score; break ties by document position ─────────────────
  const topIndices = new Set(
    [...scored]
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .slice(0, topK)
      .map(s => s.idx),
  );

  // Return in document order so the model reads context naturally
  return chunks.filter((_, idx) => topIndices.has(idx));
}

// ─── Fallback selection ───────────────────────────────────────────────────────

/**
 * When no keyword match exists, return the beginning + middle + end of the
 * document. This mirrors the Abstract → Body → Conclusion structure common
 * in scientific papers.
 */
function fallback(chunks: string[], topK: number): string[] {
  const head = Math.ceil(topK / 2);
  const tail = Math.floor(topK / 2);
  const mid  = Math.floor(chunks.length / 2);

  const indices = new Set<number>([
    ...Array.from({ length: head }, (_, i) => i),
    mid,
    ...Array.from({ length: tail }, (_, i) => chunks.length - 1 - i),
  ]);

  return chunks
    .filter((_, i) => indices.has(i))
    .slice(0, topK);
}
