/**
 * useDocumentIngestion — React hook wrapping the pure docIngestion utilities.
 *
 * Responsibilities:
 *   • Validates, extracts, normalizes and truncates a dropped/selected file.
 *   • Exposes loading / error / result state to the consumer.
 *   • Cleans up correctly on unmount — no memory leaks, no dangling updates.
 *
 * Future extension points (do NOT implement yet):
 *   • Multiple files   → expose attachedDocs: AttachedDoc[]
 *   • RAG indexing     → call chunkAndIndex(doc) after processFile
 *   • Knowledge WS     → persist attachedDoc to a KnowledgeStore
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  validateFile,
  readFileAsText,
  normalizeText,
  limitContext,
  formatDocumentBlock,
  extractPdfText,
  formatBytes,
  type DocMeta,
} from '@/lib/docIngestion';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AttachedDoc {
  /** Metadata displayed in the DocumentChip */
  meta: DocMeta;
  /** Full formatted block ready to inject into the textarea */
  block: string;
}

export interface UseDocumentIngestionReturn {
  /** Call with a File object. Validates, reads, normalises, limits context. */
  processFile: (file: File) => Promise<void>;
  /** True while reading / extracting text — disables the send button. */
  isProcessing: boolean;
  /** Human-readable error string, or null when clean. */
  error: string | null;
  /** The currently attached document, or null when none. */
  attachedDoc: AttachedDoc | null;
  /** Clears the attached document and any error. */
  clearDocument: () => void;
  /** Clears only the error message. */
  clearError: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentIngestion(): UseDocumentIngestionReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);

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
        pages = result.pages;
      } else {
        rawText = await readFileAsText(file);
      }

      if (!mountedRef.current) return; // unmounted during async work

      // 3. Normalize line endings / whitespace
      const normalized = normalizeText(rawText);

      // 4. Truncate to context limit
      const body = limitContext(normalized);

      // 5. Build metadata & formatted block
      const meta: DocMeta = {
        name: file.name,
        sizeBytes: file.size,
        sizeLabel: formatBytes(file.size),
        pages,
        chars: body.length,
      };

      const block = formatDocumentBlock(meta, body);

      if (mountedRef.current) {
        setAttachedDoc({ meta, block });
      }
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
