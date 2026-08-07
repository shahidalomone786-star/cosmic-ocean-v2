/**
 * docIngestion.ts — Pure document ingestion utilities.
 * No React. No side effects. All functions are safe to unit-test in isolation.
 *
 * Future extension points:
 *   • OCR:      add ocrFile(file) that wraps Tesseract.js
 *   • DOCX:     add extractDocxText(file) using mammoth.js
 *   • EPUB:     add extractEpubText(file) using epub.js
 *   • RAG:      exportChunks(text, chunkSize) for vector indexing
 */

// ── Supported formats ────────────────────────────────────────────────────────

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.pdf'] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

const SUPPORTED_EXT_SET = new Set<string>(SUPPORTED_EXTENSIONS);

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CONTEXT_CHARS = 15_000;

// ── Metadata ─────────────────────────────────────────────────────────────────

export interface DocMeta {
  name: string;
  sizeBytes: number;
  sizeLabel: string;
  pages?: number;
  /** Character count of the (possibly-truncated) extracted text */
  chars: number;
}

// ── Validation ────────────────────────────────────────────────────────────────

/** Returns an error message string, or null if valid. */
export function validateFile(file: File): string | null {
  const rawExt = file.name.includes('.')
    ? ('.' + file.name.split('.').pop()!.toLowerCase())
    : '';

  if (!SUPPORTED_EXT_SET.has(rawExt)) {
    const supported = SUPPORTED_EXTENSIONS.join(', ');
    return `Unsupported file type "${rawExt || '(none)'}". Supported formats: ${supported}.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `File too large (${formatBytes(file.size)}). Maximum allowed size is 5 MB.`;
  }
  return null;
}

// ── Size formatting ───────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}

// ── Text reading (non-blocking) ───────────────────────────────────────────────

/** Reads a plain-text file asynchronously using the FileReader API. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed to read the file.'));
    reader.readAsText(file, 'utf-8');
  });
}

// ── Text normalization ────────────────────────────────────────────────────────

/** Normalizes line endings, trims trailing whitespace per line, collapses excess blank lines. */
export function normalizeText(raw: string): string {
  return raw
    // Remove null bytes and invalid C0 control characters.
    // Preserves: \x09 (TAB), \x0A (LF), \x0D (CR).
    // Preserves all Unicode ≥ \x80 — scientific symbols α β γ ∇ ∫ Σ ∞ etc.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+$/gm, '')      // strip trailing whitespace per line
    .replace(/\n{4,}/g, '\n\n\n')  // collapse runs of 4+ blank lines to 3
    .trim();
}

// ── Context limiter ───────────────────────────────────────────────────────────

const HEAD_CHARS = 8_000;
const TAIL_CHARS = 4_000;

/**
 * Trims extracted text to MAX_CONTEXT_CHARS to prevent model overload.
 * Preserves the beginning, any Markdown headings found in the middle, and the ending.
 */
export function limitContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;

  const head = text.slice(0, HEAD_CHARS);
  const tail = text.slice(text.length - TAIL_CHARS);
  const middle = text.slice(HEAD_CHARS, text.length - TAIL_CHARS);

  // Extract up to 6 Markdown headings from the skipped section as a table-of-contents hint
  const headings = middle
    .split('\n')
    .filter(line => /^#{1,6}\s/.test(line.trimStart()))
    .slice(0, 6)
    .join('\n');

  const bridge = headings
    ? `\n\n[...]\n\n${headings}\n\n[Document truncated for performance. Showing beginning and end.]\n\n`
    : '\n\n[Document truncated for performance. Showing beginning and end.]\n\n';

  return head + bridge + tail;
}

// ── Document header formatter ─────────────────────────────────────────────────

/** Formats the informational header that appears above extracted text in the textarea. */
export function formatDocumentBlock(
  meta: Pick<DocMeta, 'name' | 'chars'> & { pages?: number },
  body: string,
): string {
  const sep = '----------------------------------------';
  const lines: string[] = [
    sep,
    `Document: ${meta.name}`,
    ...(meta.pages !== undefined ? [`Pages: ${meta.pages}`] : []),
    `Characters: ${meta.chars.toLocaleString()}`,
    sep,
    '',
    body,
  ];
  return lines.join('\n');
}

// ── PDF extraction ────────────────────────────────────────────────────────────

export interface PdfResult {
  text: string;
  pages: number;
}

/**
 * Extracts plain text from a PDF file using pdf.js.
 * The worker is resolved locally by Vite — no CDN or network dependency.
 * Never uploads the file; all processing is local in the browser.
 */
export async function extractPdfText(file: File): Promise<PdfResult> {
  // PDF.js and its 2 MB worker are optional document tooling. Keep both out
  // of the initial chat bundle and load them only for a real PDF attachment.
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pages = pdf.numPages;

  const pageParts: string[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pageParts.push(pageText);
  }

  await loadingTask.destroy();
  return { text: pageParts.join('\n'), pages };
}
