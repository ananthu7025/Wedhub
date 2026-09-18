import sharp from "sharp";
import { downloadObject, uploadObject } from "../../integrations/storage/r2.client";

/**
 * The single source of truth for this app's resize/variant strategy —
 * extracted out of media-processing.processor.ts (the BullMQ worker that
 * runs this on every fresh upload) so the one-off backfill script
 * (scripts/backfill-media-variants.ts, for pre-pipeline Media rows that
 * only ever got an originalObjectKey) can reuse the exact same logic
 * instead of a second, potentially-drifting copy. Nothing about the live
 * worker's behavior changes by this extraction — same width/quality/keying,
 * same function bodies, just given names and exported.
 *
 * "large" (1600px) was previously generated here too, but its key was never
 * persisted on Media/referenced anywhere — pure wasted R2 storage and
 * processing time. Removed; re-add alongside a real consumer (e.g. a
 * wedding-website gallery lightbox) if one gets built.
 */
export const MEDIA_VARIANTS = [
  { name: "medium", width: 800 },
  { name: "thumbnail", width: 300 },
] as const;

export function variantObjectKey(originalKey: string, variant: string): string {
  const lastDot = originalKey.lastIndexOf(".");
  const base = lastDot === -1 ? originalKey : originalKey.slice(0, lastDot);
  return `${base}-${variant}.webp`;
}

// A tiny (16px-wide) heavily-compressed WebP, inlined as a data URL and
// stored directly on the Media row — this is what next/image's
// placeholder="blur" renders before the real optimized image arrives.
// Deliberately not one of the R2-uploaded variants: it's small enough (a
// few hundred bytes) to embed in the API response/DB row directly, so the
// browser paints an image-accurate blur with zero extra network request
// instead of a flat placeholder color.
export async function generateBlurDataUrl(original: Buffer): Promise<string> {
  const blurBuffer = await sharp(original).resize({ width: 16, withoutEnlargement: true }).webp({ quality: 20 }).toBuffer();
  return `data:image/webp;base64,${blurBuffer.toString("base64")}`;
}

export interface GeneratedVariants {
  optimizedObjectKey: string;
  thumbnailObjectKey: string;
  blurDataUrl: string;
  width: number | undefined;
  height: number | undefined;
}

/**
 * Downloads `originalObjectKey` from R2, generates+uploads the medium and
 * thumbnail WebP variants plus the inline blur placeholder, and returns
 * everything a caller needs to persist on the Media row. Does NOT touch
 * the database itself — media-processing.processor.ts and
 * scripts/backfill-media-variants.ts each decide how/when to persist
 * (the worker always on the fresh-upload path; the backfill script behind
 * its own dry-run/force gating).
 */
export async function generateMediaVariants(originalObjectKey: string): Promise<GeneratedVariants> {
  const original = await downloadObject(originalObjectKey);
  const metadata = await sharp(original).metadata();

  let optimizedKey: string | undefined;
  let thumbnailKey: string | undefined;

  for (const variant of MEDIA_VARIANTS) {
    const objectKey = variantObjectKey(originalObjectKey, variant.name);
    const resized = await sharp(original)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await uploadObject(objectKey, resized, "image/webp");

    if (variant.name === "medium") optimizedKey = objectKey;
    if (variant.name === "thumbnail") thumbnailKey = objectKey;
  }

  if (!optimizedKey || !thumbnailKey) {
    // Unreachable given MEDIA_VARIANTS is a fixed literal array containing
    // exactly one "medium" and one "thumbnail" entry — satisfies strict
    // TypeScript's inability to prove that from the loop above alone.
    throw new Error("Failed to generate all required media variants");
  }

  const blurDataUrl = await generateBlurDataUrl(original);

  return {
    optimizedObjectKey: optimizedKey,
    thumbnailObjectKey: thumbnailKey,
    blurDataUrl,
    width: metadata.width,
    height: metadata.height,
  };
}
