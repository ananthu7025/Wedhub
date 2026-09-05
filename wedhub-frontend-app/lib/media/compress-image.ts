const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SKIP_BELOW_BYTES = 500 * 1024;

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
}

let webpSupported: boolean | null = null;

async function detectWebpSupport(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp"));
    webpSupported = blob !== null && blob.type === "image/webp";
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

function fitWithin(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function swapExtension(filename: string, mimeType: string): string {
  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}.${ext}`;
}

/**
 * Resizes and re-encodes an image File in the browser before upload. Never
 * throws — any failure (unsupported browser API, decode error) falls back to
 * returning the original file untouched, since compression is an optimization,
 * never a hard requirement for upload to proceed.
 */
export async function compressImageIfPossible(file: File, options?: CompressImageOptions): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type) || file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  const maxDimension = options?.maxDimension ?? 2560;
  const quality = options?.quality ?? 0.82;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType = (await detectWebpSupport()) ? "image/webp" : "image/jpeg";
    const blob = await canvasToBlob(canvas, outputType, quality);
    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], swapExtension(file.name, outputType), { type: outputType });
  } catch (error) {
    console.warn("Image compression failed, uploading original file", error);
    return file;
  }
}
