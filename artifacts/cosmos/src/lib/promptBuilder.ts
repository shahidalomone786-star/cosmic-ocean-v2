/**
 * promptBuilder.ts — Constructs the enriched AI prompt for document-grounded queries.
 *
 * The user's visible chat message is ALWAYS the clean, unmodified question.
 * This module builds the internal prompt that is sent to the model — it is
 * never shown in the UI, never injected into the textarea.
 *
 * Structure:
 *   <user question>
 *
 *   ----------------
 *
 *   Relevant context from document "<filename>":
 *
 *   <chunk 1>
 *
 *   ---
 *
 *   <chunk 2>
 *
 *   ----------------
 *
 *   Please answer the question using the document context above where relevant.
 *
 * Future extension points (do NOT implement yet):
 *   • Multi-document: accept DocumentRecord[] and label each source
 *   • Citation mode: ask the model to cite chunk indices
 *   • System prompt injection: prepend persona or role context
 *   • Structured output: request JSON for downstream parsing
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a document-grounded prompt.
 *
 * Returns `userQuestion` unchanged when `selectedChunks` is empty so the
 * caller never has to branch on whether a document is attached.
 *
 * @param userQuestion    The user's original clean question (shown in chat).
 * @param selectedChunks  Chunks chosen by contextSelector (document order).
 * @param filename        Original filename — used for attribution only.
 */
export function buildDocumentPrompt(
  userQuestion: string,
  selectedChunks: string[],
  filename: string,
): string {
  if (selectedChunks.length === 0) return userQuestion;

  const contextBlock = selectedChunks.join('\n\n---\n\n');

  return [
    userQuestion,
    '',
    '----------------',
    '',
    `Relevant context from document "${filename}":`,
    '',
    contextBlock,
    '',
    '----------------',
    '',
    'Please answer the question using the document context above where relevant. '
    + 'If the document does not contain enough information to answer, say so clearly '
    + 'and answer from your general knowledge.',
  ].join('\n');
}
