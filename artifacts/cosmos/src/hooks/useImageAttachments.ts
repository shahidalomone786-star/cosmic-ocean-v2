import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IMAGE_MAX_BYTES,
  MAX_IMAGES_PER_MESSAGE,
  optimizeImage,
} from '@/lib/imageAttachments';
import type { ImageAttachment } from '@/lib/attachmentTypes';

interface UseImageAttachmentsReturn {
  images: ImageAttachment[];
  isProcessing: boolean;
  error: string | null;
  processFiles: (files: File[], replaceIndex?: number) => Promise<void>;
  removeImage: (id: string) => void;
  clearImages: () => void;
  clearError: () => void;
}

export function useImageAttachments(): UseImageAttachmentsReturn {
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const processFiles = useCallback(async (files: File[], replaceIndex?: number) => {
    if (!files.length || !mountedRef.current) return;
    setError(null);
    setIsProcessing(true);

    try {
      const currentCount = replaceIndex === undefined ? images.length : images.length - 1;
      const available = MAX_IMAGES_PER_MESSAGE - currentCount;
      if (available <= 0) throw new Error(`You can attach up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      if (files.length > available) {
        throw new Error(`You can attach up to ${MAX_IMAGES_PER_MESSAGE} images per message.`);
      }

      const optimized = await Promise.all(files.slice(0, available).map(file => optimizeImage(file)));
      if (!mountedRef.current) return;
      setImages(previous => {
        if (replaceIndex !== undefined && previous[replaceIndex]) {
          const next = [...previous];
          next.splice(replaceIndex, 1, optimized[0]);
          return next;
        }
        return [...previous, ...optimized];
      });
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'The image could not be attached.');
      }
    } finally {
      if (mountedRef.current) setIsProcessing(false);
    }
  }, [images.length]);

  const removeImage = useCallback((id: string) => {
    setImages(previous => previous.filter(image => image.id !== id));
    setError(null);
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { images, isProcessing, error, processFiles, removeImage, clearImages, clearError };
}

export { IMAGE_MAX_BYTES };