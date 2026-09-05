import { Worker, type Job } from "bullmq";
import sharp from "sharp";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { downloadObject, uploadObject } from "../../integrations/storage/r2.client";
import { omitUndefined } from "../../common/utils/object.util";
import type { MediaProcessingJobData } from "../queues/media-processing.queue";

// "large" (1600px) was previously generated here too, but its key was never
// persisted on Media/referenced anywhere — pure wasted R2 storage and
// processing time. Removed; re-add alongside a real consumer (e.g. a
// wedding-website gallery lightbox) if one gets built.
const VARIANTS = [
  { name: "medium", width: 800 },
  { name: "thumbnail", width: 300 },
] as const;

function variantObjectKey(originalKey: string, variant: string): string {
  const lastDot = originalKey.lastIndexOf(".");
  const base = lastDot === -1 ? originalKey : originalKey.slice(0, lastDot);
  return `${base}-${variant}.webp`;
}

async function processImage(mediaId: string): Promise<void> {
  const start = performance.now();
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });

  const original = await downloadObject(media.originalObjectKey);
  const metadata = await sharp(original).metadata();

  let optimizedKey: string | undefined;
  let thumbnailKey: string | undefined;

  for (const variant of VARIANTS) {
    const objectKey = variantObjectKey(media.originalObjectKey, variant.name);
    const resized = await sharp(original)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await uploadObject(objectKey, resized, "image/webp");

    if (variant.name === "medium") {
      optimizedKey = objectKey;
    }
    if (variant.name === "thumbnail") {
      thumbnailKey = objectKey;
    }
  }

  const fields = omitUndefined({
    optimizedObjectKey: optimizedKey,
    thumbnailObjectKey: thumbnailKey,
    width: metadata.width,
    height: metadata.height,
  });

  await prisma.media.update({
    where: { id: mediaId },
    data: {
      status: "READY",
      ...fields,
    },
  });

  const durationMs = Math.round(performance.now() - start);
  logger.info({ mediaId, durationMs }, "Media processing completed");
}

export function startMediaProcessingWorker(): Worker<MediaProcessingJobData> {
  const worker = new Worker<MediaProcessingJobData>(
    "media-processing",
    async (job: Job<MediaProcessingJobData>) => {
      const { mediaId } = job.data;

      try {
        await processImage(mediaId);
      } catch (err) {
        logger.error({ err, mediaId }, "Media processing failed");
        await prisma.media.update({ where: { id: mediaId }, data: { status: "FAILED" } });
        throw err;
      }
    },
    // CPU-bound (Sharp resize/encode) — a deliberate, tuned value rather than
    // BullMQ's default of 1. Kept modest since each job holds a full-size
    // image buffer in memory across 2 variants; raise only after confirming
    // real instance memory headroom.
    { connection: createRedisConnection(), concurrency: 3 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Media processing job failed permanently");
  });

  return worker;
}
