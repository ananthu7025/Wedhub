// Item 14: the actual resize/re-encode work, moved off the main thread so
// selecting a batch of large photos doesn't jank the UI while each one
// compresses in sequence (runWithConcurrencyLimit already bounds how many
// upload pipelines run at once, but compression itself used to happen
// inline in each of those, on the main thread). Uses OffscreenCanvas +
// createImageBitmap — both available inside a Worker, unlike
// HTMLCanvasElement — so this is close to a straight lift of
// compress-image.ts's own logic, not a rewrite.
export interface CompressRequest {
  id: number;
  file: File;
  maxDimension: number;
  quality: number;
}

export interface CompressResponse {
  id: number;
  blob: Blob | null;
  outputType: string;
  error?: string;
}

function fitWithin(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

let webpSupported: boolean | null = null;

async function detectWebpSupport(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const blob = await canvas.convertToBlob({ type: "image/webp" });
    webpSupported = blob.type === "image/webp";
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

self.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const { id, file, maxDimension, quality } = event.data;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      const response: CompressResponse = { id, blob: null, outputType: file.type };
      (self as unknown as Worker).postMessage(response);
      return;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outputType = (await detectWebpSupport()) ? "image/webp" : "image/jpeg";
    const blob = await canvas.convertToBlob({ type: outputType, quality });
    const response: CompressResponse = { id, blob, outputType };
    (self as unknown as Worker).postMessage(response);
  } catch (error) {
    const response: CompressResponse = {
      id,
      blob: null,
      outputType: file.type,
      error: error instanceof Error ? error.message : "Unknown compression error",
    };
    (self as unknown as Worker).postMessage(response);
  }
};
