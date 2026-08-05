/**
 * chunkManager.ts — Splits extracted document text into logical chunks.
 *
 * Strategy (in priority order):
 *   1. Markdown headings  — sections already defined by the author
 *   2. Double newlines    — paragraph boundaries
 *   3. Sentence boundary  — period + space/newline within an oversized block
 *   4. Hard cut           — last resort at TARGET chars
 *
 * Tiny residual chunks (< MIN chars) are merged with their predecessor to
 * avoid single-sentence orphans that waste context window space.
 *
 * Target size: ~1 000–1 500 chars (≈ 250–375 tokens).
 * Each AI request uses at most topK=4 chunks → ≤ 6 000 chars of context.
 *
 * Future extension points (do NOT implement yet):
 *   • Sentence-transformer embeddings for semantic chunking
 *   • Overlapping windows for better cross-chunk recall
 *   • EPUB / DOCX structure awareness
 */

const TARGET = 1_300; // chars — center of the 1 000–1 500 range
const MIN    =   200; // chars — chunks shorter than this are merged

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Split `text` into logical chunks of roughly TARGET characters each.
 * Returns an empty array for blank input.
 */
export function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Short enough to be a single chunk — fast path
  if (trimmed.length <= TARGET) return [trimmed];

  // 1. Split at Markdown headings (lines starting with one or more #)
  const sections = trimmed.split(/\n(?=#{1,6}\s)/).filter(s => s.trim());

  const raw: string[] = [];
  for (const section of sections) {
    if (section.length <= TARGET) {
      raw.push(section);
    } else {
      splitByParagraph(section, raw);
    }
  }

  return mergeTiny(raw);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Split a block that is larger than TARGET by paragraph boundaries. */
function splitByParagraph(text: string, out: string[]): void {
  const paras = text.split(/\n\n+/).filter(p => p.trim());
  let current = '';

  for (const para of paras) {
    if (!current) {
      // Starting a new chunk
      if (para.length <= TARGET) {
        current = para;
      } else {
        // Single paragraph larger than TARGET — split by sentence
        const leftover = splitBySentence(para, out);
        current = leftover;
      }
    } else if (current.length + 2 + para.length <= TARGET) {
      // Paragraph fits in the current chunk
      current += `\n\n${para}`;
    } else {
      // Flush current chunk; start fresh with this paragraph
      out.push(current.trim());
      if (para.length <= TARGET) {
        current = para;
      } else {
        const leftover = splitBySentence(para, out);
        current = leftover;
      }
    }
  }

  if (current.trim()) out.push(current.trim());
}

/**
 * Split an oversized paragraph by sentence boundaries.
 * Returns any remaining text that did not fill a full chunk.
 */
function splitBySentence(text: string, out: string[]): string {
  let remaining = text.trim();

  while (remaining.length > TARGET) {
    const slice = remaining.slice(0, TARGET);

    // Find the last sentence-ending punctuation followed by whitespace
    const lastEnd = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('.\n'),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('! '),
    );

    // Only use the sentence boundary if it leaves at least 60 % of TARGET
    const cut = lastEnd > TARGET * 0.55 ? lastEnd + 1 : TARGET;

    out.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trimStart();
  }

  return remaining;
}

/**
 * Merge chunks shorter than MIN into their predecessor.
 * This keeps the output array free of near-empty slivers.
 */
function mergeTiny(chunks: string[]): string[] {
  const result: string[] = [];

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    if (chunk.length < MIN && result.length > 0) {
      // Absorb into the previous chunk
      result[result.length - 1] += `\n\n${chunk}`;
    } else {
      result.push(chunk);
    }
  }

  return result.filter(c => c.trim().length > 0);
}
