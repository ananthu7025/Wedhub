import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";

export type ProfileCompletionReminderJobData = Record<string, never>;

let queue: Queue<ProfileCompletionReminderJobData> | undefined;

export function getProfileCompletionReminderQueue(): Queue<ProfileCompletionReminderJobData> {
  if (!queue) {
    queue = new Queue<ProfileCompletionReminderJobData>("profile-completion-reminder", {
      connection: createRedisConnection(),
    });
  }
  return queue;
}
