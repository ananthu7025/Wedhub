import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { MAX_DELIVERY_ATTEMPTS } from "../../modules/notifications/notification.constants";

// See PLAN-2026-09-30-whatsapp-notification-channel.md §4c. Deliberately a
// separate queue/worker from notification-delivery, not a fourth branch in
// it — deliverNotification() (notification-delivery.processor.ts) assumes
// every job resolves to an existing Notification row; WhatsApp needs to
// serve a "no User/Notification row yet" case too (the vendor-claim OTP),
// so both cases share this one queue instead of that assumption being
// special-cased into the wrong place.
export type WhatsAppDeliveryJobData =
  | { kind: "notification"; notificationId: string }
  | {
      kind: "direct";
      directSendId: string;
      to: string;
      templateName: string;
      languageCode: string;
      params: string[];
    };

let queue: Queue<WhatsAppDeliveryJobData> | undefined;

export function getWhatsAppDeliveryQueue(): Queue<WhatsAppDeliveryJobData> {
  if (!queue) {
    queue = new Queue<WhatsAppDeliveryJobData>("whatsapp-delivery", {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

// Same crash-safety rule as notification-delivery's enqueueNotificationDelivery:
// the PENDING row (Notification or WhatsAppDirectSend) is created before this
// is ever called — this only ever delivers an already-committed row/payload,
// it never creates one, so a crash between the two can't produce a phantom
// delivery with no record.
export async function enqueueWhatsAppDelivery(data: WhatsAppDeliveryJobData): Promise<void> {
  await getWhatsAppDeliveryQueue().add("deliver", data, {
    attempts: MAX_DELIVERY_ATTEMPTS,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}
