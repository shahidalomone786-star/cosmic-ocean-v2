/**
 * Generic attachment contracts.
 *
 * The current UI implements documents and images. Keeping the shared identity
 * fields separate makes audio, video, CSV, ZIP, and code attachments additive.
 */
export type AttachmentKind =
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'markdown'
  | 'csv'
  | 'zip'
  | 'code';

export interface BaseAttachment {
  id: string;
  kind: AttachmentKind;
  filename: string;
  sizeBytes: number;
  timestamp: number;
}

export interface ImageAttachment extends BaseAttachment {
  kind: 'image';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  width: number;
  height: number;
  /** Optimized image sent only as a structured vision content part. */
  dataUrl: string;
  /** Optimized preview representation used by the composer and history. */
  thumbnailDataUrl: string;
}