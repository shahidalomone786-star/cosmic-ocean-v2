/**
 * documentStore.ts — Document lifecycle types.
 *
 * These types are the single source of truth for the document attachment
 * feature. They are intentionally kept as plain data — no class, no
 * singleton, no side effects — so every consumer can import only what it
 * needs and future features (multiple docs, RAG, OCR) can extend cleanly.
 *
 * Future extension points (do NOT implement yet):
 *   • Multiple documents → DocumentStore manages DocumentRecord[]
 *   • Persistence        → serialize to IndexedDB / localStorage
 *   • Embeddings         → add embeddingVector?: number[] to DocumentRecord
 *   • OCR status         → add ocrStatus?: 'pending' | 'done' | 'failed'
 */

// ─── Lifecycle status ─────────────────────────────────────────────────────────

/**
 * Document moves through these states:
 *
 *   uploading → extracting → ready → (attached while AI is idle)
 *                                  → processing (while AI generates)
 *                                  → completed (after first successful reply)
 *   Any state → failed (on error)
 *
 * 'attached' and 'completed' are semantically equivalent in v1; they are kept
 * separate so the UI can distinguish "just attached, never queried yet" from
 * "already used in at least one exchange".
 */
export type DocStatus =
  | 'uploading'
  | 'extracting'
  | 'ready'
  | 'attached'
  | 'processing'
  | 'completed'
  | 'failed';

// ─── Document record ──────────────────────────────────────────────────────────

export interface DocumentRecord {
  /** Unique ID generated at ingestion time. */
  id: string;
  /** Original filename as reported by the browser. */
  filename: string;
  sizeBytes: number;
  /** Human-readable file size, e.g. "2.8 MB". */
  sizeLabel: string;
  /** PDF page count — undefined for non-PDF files. */
  pages?: number;
  /**
   * Full normalized extracted text.
   * NEVER displayed in the UI or injected into the textarea.
   * Used only as the source for chunk selection.
   */
  extractedText: string;
  /**
   * Text split into logical chunks (~1 000–1 500 chars each) by
   * ChunkManager. Only the most relevant subset is sent to the model.
   */
  chunks: string[];
  /** Unix timestamp (ms) when extraction completed. */
  extractionTimestamp: number;
  status: DocStatus;
}
