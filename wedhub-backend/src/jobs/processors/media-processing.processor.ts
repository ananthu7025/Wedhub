import { Worker, type Job } from "bullmq";
import sharp from "sharp";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { downloadObject, uploadObject } from "../../integrations/storage/r2.client";
import { omitUndefined } from "../../common/utils/object.util";
import type { MediaProcessingJobData } from "../queues/media-processing.queue";

const VARIANTS = [
  { name: "large", width: 1600 },
  { name: "medium", width: 800 },
  { name: "thumbnail", width: 300 },
] as const;

function variantObjectKey(originalKey: string, variant: string): string {
  const lastDot = originalKey.lastIndexOf(".");
  const base = lastDot === -1 ? originalKey : originalKey.slice(0, lastDot);
  return `${base}-${variant}.webp`;
}

async function processImage(mediaId: string): Promise<void> {
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

  logger.info({ mediaId }, "Media processing completed");
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
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Media processing job failed permanently");
  });

  return worker;
}
