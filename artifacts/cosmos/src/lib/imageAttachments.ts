import type { ImageAttachment } from './attachmentTypes';

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_MESSAGE = 5;
const MAX_DIMENSION = 768;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const OUTPUT_QUALITY = 0.7;
const FALLBACK_OUTPUT_QUALITY = 0.55;

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

function safeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'image';
  const clean = base
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
  return clean.slice(0, 180) || 'image';
}

export function formatAttachmentBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasBytes(bytes: Uint8Array, offset: number, values: number[]): boolean {
  return values.every((value, index) => bytes[offset + index] === value);
}

async function readSignature(file: File): Promise<'jpeg' | 'png' | 'gif' | 'webp' | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (hasBytes(bytes, 0, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (hasBytes(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (hasBytes(bytes, 0, [0x47, 0x49, 0x46, 0x38]) && bytes[8] === 0x61) return 'gif';
  if (hasBytes(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && hasBytes(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return 'webp';
  return null;
}

function signatureError(signature: string | null): string | null {
  if (!signature) return 'That file is not a readable PNG, JPG, JPEG, WEBP, or GIF image.';
  return null;
}

function readExifOrientation(buffer: ArrayBuffer): number {
  const bytes = new DataView(buffer);
  if (bytes.getUint16(0, false) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 < bytes.byteLength) {
    if (bytes.getUint8(offset) !== 0xff) break;
    const marker = bytes.getUint8(offset + 1);
    const length = bytes.getUint16(offset + 2, false);
    if (marker === 0xe1 && offset + 10 < bytes.byteLength) {
      if (bytes.getUint32(offset + 4, false) !== 0x45786966 || bytes.getUint16(offset + 8, false) !== 0) return 1;
      const tiff = offset + 10;
      const little = bytes.getUint16(tiff, false) === 0x4949;
      const ifdOffset = bytes.getUint32(tiff + 4, little) + tiff;
      const entries = bytes.getUint16(ifdOffset, little);
      for (let i = 0; i < entries; i++) {
        const entry = ifdOffset + 2 + i * 12;
        if (entry + 12 > bytes.byteLength) return 1;
        if (bytes.getUint16(entry, little) === 0x0112) return bytes.getUint16(entry + 8, little) || 1;
      }
      return 1;
    }
    offset += 2 + length;
  }
  return 1;
}

function orientedDimensions(width: number, height: number, orientation: number): [number, number] {
  return orientation >= 5 && orientation <= 8 ? [height, width] : [width, height];
}

function drawOriented(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  orientation: number,
): void {
  switch (orientation) {
    case 2: context.translate(width, 0); context.scale(-1, 1); break;
    case 3: context.translate(width, height); context.rotate(Math.PI); break;
    case 4: context.translate(0, height); context.scale(1, -1); break;
    case 5: context.rotate(0.5 * Math.PI); context.scale(1, -1); break;
    case 6: context.translate(width, 0); context.rotate(0.5 * Math.PI); break;
    case 7: context.translate(width, height); context.rotate(0.5 * Math.PI); context.scale(-1, 1); break;
    case 8: context.translate(0, height); context.rotate(-0.5 * Math.PI); break;
    default: break;
  }
  context.drawImage(source, 0, 0, width, height);
}

async function decodeImage(file: File, orientation: number): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  orientationApplied: boolean;
  close?: () => void;
}> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        orientationApplied: true,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari and older browsers may not support imageOrientation. The
      // HTMLImageElement path below applies the parsed EXIF orientation.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The image could not be decoded.'));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      orientationApplied: false,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The optimized image could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const preferred = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  if (preferred) return preferred;
  const fallback = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!fallback) throw new Error('Your browser could not optimize this image.');
  return fallback;
}

export async function optimizeImage(file: File): Promise<ImageAttachment> {
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`Image is too large (${formatAttachmentBytes(file.size)}). Maximum allowed size is 10 MB.`);
  }

  const extension = extensionOf(file.name);
  const mimeExtension = file.type === 'image/png'
    ? '.png'
    : file.type === 'image/jpeg'
      ? '.jpg'
      : file.type === 'image/webp'
        ? '.webp'
        : file.type === 'image/gif'
          ? '.gif'
          : '';
  if (!IMAGE_EXTENSIONS.has(extension) && !mimeExtension) {
    throw new Error('Unsupported image format. Use PNG, JPG, JPEG, WEBP, or GIF.');
  }

  const signature = await readSignature(file);
  const signatureProblem = signatureError(signature);
  if (signatureProblem) throw new Error(signatureProblem);

  const originalBuffer = await file.arrayBuffer();
  const orientation = signature === 'jpeg' ? readExifOrientation(originalBuffer) : 1;
  const decoded = await decodeImage(file, orientation);

  try {
    const appliedOrientation = decoded.orientationApplied ? 1 : orientation;
    const [orientedWidth, orientedHeight] = orientedDimensions(decoded.width, decoded.height, appliedOrientation);
    if (!orientedWidth || !orientedHeight) throw new Error('The image has invalid dimensions.');

    const scale = Math.min(1, MAX_DIMENSION / Math.max(orientedWidth, orientedHeight));
    const width = Math.max(1, Math.round(orientedWidth * scale));
    const height = Math.max(1, Math.round(orientedHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('Your browser could not prepare this image.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.save();
    const drawWidth = appliedOrientation >= 5 && appliedOrientation <= 8 ? height : width;
    const drawHeight = appliedOrientation >= 5 && appliedOrientation <= 8 ? width : height;
    drawOriented(context, decoded.source, drawWidth, drawHeight, appliedOrientation);
    context.restore();

    let blob = await canvasBlob(canvas, OUTPUT_QUALITY);
    if (blob.size > MAX_OUTPUT_BYTES) blob = await canvasBlob(canvas, FALLBACK_OUTPUT_QUALITY);
    if (blob.size > MAX_OUTPUT_BYTES) throw new Error('This image could not be compressed enough for a vision request.');

    const dataUrl = await blobToDataUrl(blob);
    const mimeType = blob.type === 'image/png' ? 'image/png' : blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    return {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: 'image',
      filename: safeFilename(file.name),
      sizeBytes: blob.size,
      timestamp: Date.now(),
      mimeType,
      width,
      height,
      dataUrl,
      thumbnailDataUrl: dataUrl,
    };
  } catch (error) {
    if (error instanceof Error && /could not|invalid|compressed|decoded/i.test(error.message)) throw error;
    throw new Error('The image could not be processed. Please try a different image.');
  } finally {
    decoded.close?.();
  }
}