import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";

export interface MediaProcessingJobData {
  mediaId: string;
}

let queue: Queue<MediaProcessingJobData> | undefined;

export function getMediaProcessingQueue(): Queue<MediaProcessingJobData> {
  if (!queue) {
    queue = new Queue<MediaProcessingJobData>("media-processing", {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

export async function enqueueMediaProcessing(mediaId: string): Promise<void> {
  await getMediaProcessingQueue().add("process", { mediaId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}
