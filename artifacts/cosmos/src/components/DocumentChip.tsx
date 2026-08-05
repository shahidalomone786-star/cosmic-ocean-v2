/**
 * DocumentChip — Premium glassmorphism attachment chip shown above the textarea.
 *
 * Displays:
 *   • PDF icon + filename + file size + page count
 *   • Status badge that reflects the document lifecycle
 *   • "Replace" button → opens the file picker to swap the document
 *   • "Remove" button  → clears the attached document
 *
 * Only one document can be active at a time (Replace removes the previous one).
 *
 * Future extension points (do NOT implement yet):
 *   • Multiple files → render a list of chips
 *   • Upload progress → add a progress bar inside the chip
 *   • OCR status     → add a badge overlay on the icon
 */

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, RefreshCw, Loader2 } from 'lucide-react';
import type { DocumentRecord, DocStatus } from '@/lib/documentStore';

// ─── Status badge config ──────────────────────────────────────────────────────

interface BadgeCfg {
  label:    string;
  dotCls:   string;
  textCls:  string;
  spin?:    boolean;
}

const STATUS_CFG: Record<DocStatus, BadgeCfg> = {
  uploading:  { label: 'Uploading',   dotCls: 'bg-sky-400/60',      textCls: 'text-sky-300/70'     },
  extracting: { label: 'Extracting',  dotCls: 'bg-amber-400/70',    textCls: 'text-amber-300/70', spin: true },
  ready:      { label: 'Ready',       dotCls: 'bg-emerald-400/70',  textCls: 'text-emerald-300/70' },
  attached:   { label: 'Attached',    dotCls: 'bg-sky-400/60',      textCls: 'text-sky-300/65'     },
  processing: { label: 'Processing',  dotCls: 'bg-violet-400/80',   textCls: 'text-violet-300/70'  },
  completed:  { label: 'Used',        dotCls: 'bg-emerald-400/50',  textCls: 'text-emerald-300/55' },
  failed:     { label: 'Failed',      dotCls: 'bg-red-400/70',      textCls: 'text-red-300/70'     },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = memo(function StatusBadge({
  status,
  isThinking,
}: {
  status:     DocStatus;
  isThinking: boolean;
}) {
  // Override: while AI is generating, always show 'processing'
  const effective: DocStatus = isThinking ? 'processing' : status;
  const cfg = STATUS_CFG[effective];

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {cfg.spin ? (
        <Loader2
          size={8}
          strokeWidth={2.5}
          className={`animate-spin ${cfg.textCls}`}
          aria-hidden="true"
        />
      ) : (
        <motion.div
          className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${cfg.dotCls}`}
          animate={
            effective === 'processing'
              ? { opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }
              : { opacity: 1, scale: 1 }
          }
          transition={
            effective === 'processing'
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : {}
          }
          aria-hidden="true"
        />
      )}
      <span className={`text-[9.5px] font-mono uppercase tracking-[0.12em] ${cfg.textCls}`}>
        {cfg.label}
      </span>
    </div>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface DocumentChipProps {
  record:     DocumentRecord;
  /** True while the AI is generating — overrides status badge to 'processing'. */
  isThinking: boolean;
  /** Read-only history presentation; hides attachment controls and hover affordances. */
  readOnly?:  boolean;
  /** Called when the user clicks "Remove" */
  onRemove?:  () => void;
  /** Called when the user clicks "Replace" — opens the file picker */
  onReplace?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DocumentChip = memo(function DocumentChip({
  record,
  isThinking,
  readOnly = false,
  onRemove,
  onReplace,
}: DocumentChipProps) {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onRemove?.(); },
    [onRemove],
  );
  const handleReplace = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onReplace?.(); },
    [onReplace],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={   { opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={readOnly ? undefined : { backgroundColor: 'rgba(255,255,255,0.04)' }}
      className={`flex items-center gap-2.5
        ${readOnly ? 'px-2.5 py-1.5 mx-0 mt-0 mb-2' : 'px-3 py-2 mx-3 mt-3 mb-0'}
        rounded-xl
        bg-white/[0.03]
        border border-white/[0.08]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
        backdrop-blur-sm
        transition-colors duration-200 cursor-default`}
      role="status"
      aria-label={`Attached: ${record.filename}, ${record.sizeLabel}`}
    >
      {/* File icon */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
          bg-sky-500/10 border border-sky-400/18
          shadow-[0_0_10px_rgba(56,189,248,0.08)]"
        aria-hidden="true"
      >
        <FileText size={14} strokeWidth={1.7} className="text-sky-300/75" />
      </div>

      {/* Name + size + status */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12.5px] font-medium text-white/82 truncate leading-tight"
          title={record.filename}
        >
          {record.filename}
        </p>
        <div className="flex items-center gap-2 mt-[2px]">
          <span className="text-[10.5px] text-white/32 leading-tight">
            {record.sizeLabel}
            {record.pages !== undefined && (
              <span className="ml-1.5 text-white/22">· {record.pages}p</span>
            )}
          </span>
          <span aria-hidden="true" className="text-white/15">·</span>
          <StatusBadge status={record.status} isThinking={isThinking} />
        </div>
      </div>

      {/* Action buttons — intentionally omitted for sent-message history chips. */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleReplace}
            className="flex items-center gap-1 px-2 py-1 rounded-md
              text-white/30 hover:text-white/68 hover:bg-white/[0.07]
              transition-all duration-150 text-[11px] font-medium
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="Replace document"
            title="Replace document"
          >
            <RefreshCw size={11} strokeWidth={2.2} />
            <span className="hidden sm:inline">Replace</span>
          </button>

          <button
            onClick={handleRemove}
            className="w-6 h-6 rounded-md flex items-center justify-center
              text-white/28 hover:text-white/70 hover:bg-white/[0.07]
              transition-all duration-150 ml-0.5
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="Remove document"
            title="Remove document"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </motion.div>
  );
});
