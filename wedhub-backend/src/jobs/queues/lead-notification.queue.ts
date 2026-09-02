import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";

export type LeadNotificationEventType = "NEW_LEAD" | "LEAD_REMINDER" | "USER_REPLIED" | "LEAD_FOLLOW_UP" | "HIGH_INTENT_LEAD";

export interface LeadNotificationJobData {
  leadId: string;
  eventType: LeadNotificationEventType;
}

let queue: Queue<LeadNotificationJobData> | undefined;

export function getLeadNotificationQueue(): Queue<LeadNotificationJobData> {
  if (!queue) {
    queue = new Queue<LeadNotificationJobData>("lead-notification", {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

export async function enqueueLeadNotification(leadId: string, eventType: LeadNotificationEventType): Promise<void> {
  await getLeadNotificationQueue().add(
    "notify",
    { leadId, eventType },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: false },
  );
}
