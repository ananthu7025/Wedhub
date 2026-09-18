import { Worker, type Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { logger } from "../../config/logger";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import { generateMediaVariants } from "./media-variant-generator";
import type { MediaProcessingJobData } from "../queues/media-processing.queue";

async function processImage(mediaId: string): Promise<void> {
  const start = performance.now();
  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });

  const variants = await generateMediaVariants(media.originalObjectKey);

  // omitUndefined: Sharp's metadata.width/height can come back undefined
  // for some inputs, and exactOptionalPropertyTypes rejects explicit
  // `undefined` against Prisma's generated update-input types (they accept
  // "field absent", not "field: undefined") — see object.util.ts's doc
  // comment on why this is required, not just defensive.
  const fields = omitUndefined({
    optimizedObjectKey: variants.optimizedObjectKey,
    thumbnailObjectKey: variants.thumbnailObjectKey,
    blurDataUrl: variants.blurDataUrl,
    width: variants.width,
    height: variants.height,
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
