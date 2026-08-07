import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import type { ImageAttachment } from '@/lib/attachmentTypes';
import { formatAttachmentBytes } from '@/lib/imageAttachments';

interface ImageAttachmentGridProps {
  images: ImageAttachment[];
  readOnly?: boolean;
  onRemove?: (id: string) => void;
  onReplace?: (index: number) => void;
}

export const ImageAttachmentGrid = memo(function ImageAttachmentGrid({
  images,
  readOnly = false,
  onRemove,
  onReplace,
}: ImageAttachmentGridProps) {
  const handleRemove = useCallback((event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    onRemove?.(id);
  }, [onRemove]);

  return (
    <div
      className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1 max-w-[280px]' : 'grid-cols-2 max-w-[360px]'}`}
      aria-label={`${images.length} image${images.length === 1 ? '' : 's'} attached`}
    >
      {images.map((image, index) => (
        <motion.figure
          key={image.id}
          layout
          initial={{ opacity: 0, scale: 0.94, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 5 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.035] shadow-[0_5px_20px_rgba(0,0,0,0.28)]"
        >
          <img
            src={image.thumbnailDataUrl}
            alt={image.filename}
            loading="lazy"
            decoding="async"
            width={image.width}
            height={image.height}
            className="block aspect-[4/3] w-full object-cover"
          />
          <figcaption className="flex items-center gap-1.5 border-t border-white/[0.08] px-2 py-1.5">
            <ImageIcon size={10} className="flex-shrink-0 text-violet-300/70" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[10px] text-white/60" title={image.filename}>
              {image.filename}
            </span>
            <span className="flex-shrink-0 text-[9px] text-white/30">
              {image.width}×{image.height}
            </span>
          </figcaption>
          {!readOnly && (
            <div className="absolute right-1.5 top-1.5 flex gap-1">
              {onReplace && (
                <button
                  type="button"
                  onClick={() => onReplace(index)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/70 backdrop-blur-md transition hover:bg-black/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70"
                  aria-label={`Replace ${image.filename}`}
                  title="Replace image"
                >
                  <RefreshCw size={11} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={event => handleRemove(event, image.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/70 backdrop-blur-md transition hover:bg-black/85 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70"
                aria-label={`Remove ${image.filename}`}
                title="Remove image"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          )}
          <span className="absolute bottom-[30px] left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-white/65 backdrop-blur-md">
            {formatAttachmentBytes(image.sizeBytes)}
          </span>
        </motion.figure>
      ))}
    </div>
  );
});