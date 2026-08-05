/**
 * DocumentChip — Premium file-attachment chip shown above the textarea.
 *
 * Displays:
 *   • File icon + name + size label
 *   • "Remove" button  → clears the attached document
 *   • "Replace" button → opens the file picker to swap the document
 *
 * Only one document can be active at a time (Replace removes the previous one).
 *
 * Future extension points (do NOT implement yet):
 *   • Multiple files → render a list of chips
 *   • Upload progress → add a progress bar inside the chip
 *   • OCR status     → add a badge overlay
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, RefreshCw } from 'lucide-react';
import type { DocMeta } from '@/lib/docIngestion';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentChipProps {
  meta: DocMeta;
  /** Called when the user clicks "Remove" */
  onRemove: () => void;
  /** Called when the user clicks "Replace" — opens the file picker */
  onReplace: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentChip = memo(function DocumentChip({
  meta,
  onRemove,
  onReplace,
}: DocumentChipProps) {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onRemove(); },
    [onRemove],
  );
  const handleReplace = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onReplace(); },
    [onReplace],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2.5 px-3 py-2 mx-3 mt-3 mb-0
        rounded-xl bg-white/[0.05] border border-white/[0.09]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      role="status"
      aria-label={`Attached document: ${meta.name}, ${meta.sizeLabel}`}
    >
      {/* File icon */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
          bg-sky-500/15 border border-sky-400/20"
        aria-hidden="true"
      >
        <FileText size={14} strokeWidth={1.7} className="text-sky-300/80" />
      </div>

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12.5px] font-medium text-white/80 truncate leading-tight"
          title={meta.name}
        >
          📄 {meta.name}
        </p>
        <p className="text-[11px] text-white/35 leading-tight mt-[1px]">
          {meta.sizeLabel}
          {meta.pages !== undefined && (
            <span className="ml-1.5 text-white/25">· {meta.pages}p</span>
          )}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={handleReplace}
          className="flex items-center gap-1 px-2 py-1 rounded-md
            text-white/35 hover:text-white/70 hover:bg-white/[0.07]
            transition-colors duration-150 text-[11px] font-medium"
          aria-label="Replace document"
          title="Replace document"
        >
          <RefreshCw size={11} strokeWidth={2.2} />
          <span className="hidden sm:inline">Replace</span>
        </button>

        <button
          onClick={handleRemove}
          className="w-6 h-6 rounded-md flex items-center justify-center
            text-white/30 hover:text-white/70 hover:bg-white/[0.07]
            transition-colors duration-150 ml-0.5"
          aria-label="Remove document"
          title="Remove document"
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>
    </motion.div>
  );
});
