import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { MAX_DELIVERY_ATTEMPTS } from "../../modules/notifications/notification.constants";

export interface NotificationDeliveryJobData {
  notificationId: string;
}

let queue: Queue<NotificationDeliveryJobData> | undefined;

export function getNotificationDeliveryQueue(): Queue<NotificationDeliveryJobData> {
  if (!queue) {
    queue = new Queue<NotificationDeliveryJobData>("notification-delivery", {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

// Coding Rule 7: the Notification row is created (PENDING) before this is
// enqueued — the job only ever delivers an already-committed row, it never
// creates one, so a crash between the two can't produce a phantom delivery
// with no record.
export async function enqueueNotificationDelivery(notificationId: string): Promise<void> {
  await getNotificationDeliveryQueue().add(
    "deliver",
    { notificationId },
    {
      attempts: MAX_DELIVERY_ATTEMPTS,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}
