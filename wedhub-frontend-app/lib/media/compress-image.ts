import type { CompressRequest, CompressResponse } from "./compress-image.worker";

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

// Item 14: a shared worker instance, lazily created on first use rather
// than one per file — spinning up a fresh worker per upload would add
// more overhead than the compression itself saves for a typical few-photo
// batch. `null` after a failed creation attempt means "don't retry, this
// browser doesn't support it" — compressImageIfPossible falls back to the
// main-thread path below for the rest of the session.
let sharedWorker: Worker | null | undefined;
let nextRequestId = 0;
const pendingRequests = new Map<number, { resolve: (blob: Blob | null, outputType: string) => void }>();

function getWorker(): Worker | null {
  if (sharedWorker !== undefined) return sharedWorker;
  try {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
      sharedWorker = null;
      return null;
    }
    sharedWorker = new Worker(new URL("./compress-image.worker.ts", import.meta.url));
    sharedWorker.onmessage = (event: MessageEvent<CompressResponse>) => {
      const pending = pendingRequests.get(event.data.id);
      if (!pending) return;
      pendingRequests.delete(event.data.id);
      pending.resolve(event.data.blob, event.data.outputType);
    };
    sharedWorker.onerror = () => {
      // A worker-level error (not caught inside the worker's own try/catch)
      // — treat every still-pending request as a miss so callers fall back
      // to the original file rather than hanging forever, and stop trying
      // to use this worker again.
      for (const pending of pendingRequests.values()) {
        pending.resolve(null, "");
      }
      pendingRequests.clear();
      sharedWorker = null;
    };
  } catch {
    sharedWorker = null;
  }
  return sharedWorker;
}

function compressViaWorker(worker: Worker, file: File, maxDimension: number, quality: number): Promise<{ blob: Blob | null; outputType: string }> {
  const id = nextRequestId++;
  return new Promise((resolve) => {
    pendingRequests.set(id, { resolve: (blob, outputType) => resolve({ blob, outputType }) });
    const request: CompressRequest = { id, file, maxDimension, quality };
    worker.postMessage(request);
  });
}

async function compressOnMainThread(file: File, maxDimension: number, quality: number): Promise<File> {
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
}

/**
 * Resizes and re-encodes an image File before upload — off the main thread
 * via a shared Web Worker when available (item 14), falling back to the
 * original main-thread canvas path otherwise. Never throws — any failure
 * (unsupported browser API, decode error) falls back to returning the
 * original file untouched, since compression is an optimization, never a
 * hard requirement for upload to proceed.
 */
export async function compressImageIfPossible(file: File, options?: CompressImageOptions): Promise<File> {
  if (!COMPRESSIBLE_TYPES.has(file.type) || file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  const maxDimension = options?.maxDimension ?? 2560;
  const quality = options?.quality ?? 0.82;

  const worker = getWorker();
  if (worker) {
    try {
      const { blob, outputType } = await compressViaWorker(worker, file, maxDimension, quality);
      if (blob && blob.size < file.size) {
        return new File([blob], swapExtension(file.name, outputType), { type: outputType });
      }
      if (blob) {
        return file; // compressed but not smaller — keep the original
      }
      // blob === null means the worker hit an error — fall through to the
      // main-thread path below rather than silently uploading uncompressed.
    } catch (error) {
      console.warn("Worker-based image compression failed, falling back to main thread", error);
    }
  }

  try {
    return await compressOnMainThread(file, maxDimension, quality);
  } catch (error) {
    console.warn("Image compression failed, uploading original file", error);
    return file;
  }
}
