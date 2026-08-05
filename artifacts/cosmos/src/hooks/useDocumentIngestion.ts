/**
 * useDocumentIngestion — React hook wrapping the pure docIngestion utilities.
 *
 * Responsibilities:
 *   • Validates, extracts, normalizes, and chunks a dropped/selected file.
 *   • Builds a DocumentRecord with full lifecycle metadata.
 *   • Exposes loading / error / record state to the consumer.
 *   • Cleans up correctly on unmount — no memory leaks, no dangling updates.
 *
 * The extracted text is NEVER returned to the caller for display.
 * Consumers receive only the DocumentRecord (metadata + chunks).
 * Prompt construction happens in SingularityChat via promptBuilder.
 *
 * Future extension points (do NOT implement yet):
 *   • Multiple files   → expose attachedDocs: DocumentRecord[]
 *   • RAG indexing     → call embedChunks(record) after processFile
 *   • Persistence      → serialize record to IndexedDB on ready
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  validateFile,
  readFileAsText,
  normalizeText,
  extractPdfText,
  formatBytes,
} from '@/lib/docIngestion';
import { chunkText } from '@/lib/chunkManager';
import type { DocumentRecord } from '@/lib/documentStore';

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { DocumentRecord } from '@/lib/documentStore';
export type { DocStatus }      from '@/lib/documentStore';

// ─── Public API types ─────────────────────────────────────────────────────────

export interface UseDocumentIngestionReturn {
  /** Call with a File object. Validates, extracts, normalises, chunks. */
  processFile: (file: File) => Promise<void>;
  /** True while reading / extracting — disables the Send button. */
  isProcessing: boolean;
  /** Human-readable error string, or null when clean. */
  error: string | null;
  /**
   * The currently attached document record, or null when none.
   * Contains metadata + chunks; never exposes raw extracted text to the UI.
   */
  attachedDoc: DocumentRecord | null;
  /** Clears the attached document and any error. */
  clearDocument: () => void;
  /** Clears only the error message. */
  clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentIngestion(): UseDocumentIngestionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [attachedDoc, setAttachedDoc]   = useState<DocumentRecord | null>(null);

  // Tracks whether the component that owns this hook is still mounted.
  // Prevents state updates after unmount in long-running PDF extractions.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearDocument = useCallback(() => {
    setAttachedDoc(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const processFile = useCallback(async (file: File): Promise<void> => {
    if (!mountedRef.current) return;

    setError(null);
    setIsProcessing(true);
    setAttachedDoc(null);

    try {
      // 1. Validate — type, extension, size
      const validationError = validateFile(file);
      if (validationError) {
        if (mountedRef.current) setError(validationError);
        return;
      }

      const isPdf = file.name.toLowerCase().endsWith('.pdf');

      // 2. Extract raw text
      let rawText: string;
      let pages: number | undefined;

      if (isPdf) {
        const result = await extractPdfText(file);
        rawText = result.text;
        pages   = result.pages;
      } else {
        rawText = await readFileAsText(file);
      }

      if (!mountedRef.current) return; // unmounted during async work

      // 3. Normalize — strips control chars, collapses whitespace
      //    Preserves all valid Unicode including scientific symbols.
      const normalized = normalizeText(rawText);

      // 4. Chunk — split into logical segments for context selection
      const chunks = chunkText(normalized);

      // 5. Build the document record
      const record: DocumentRecord = {
        id:                 `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        filename:           file.name,
        sizeBytes:          file.size,
        sizeLabel:          formatBytes(file.size),
        pages,
        extractedText:      normalized,   // stored internally only
        chunks,
        extractionTimestamp: Date.now(),
        status:             'ready',
      };

      if (mountedRef.current) setAttachedDoc(record);

    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while processing the document.';
      setError(message);
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  }, []);

  return { processFile, isProcessing, error, attachedDoc, clearDocument, clearError };
}
