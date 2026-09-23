import { getProfileCompletionReminderQueue } from "../queues/profile-completion-reminder.queue";

// Item 9 — the first repeatable job in this codebase (src/jobs/schedules/
// previously existed as an empty placeholder directory). Runs once daily at
// 09:00 IST — a reasonable "start of business day" nudge, not the middle of
// the night. upsertJobScheduler is idempotent by jobSchedulerId: calling
// this again on every worker boot updates the existing scheduler in place
// rather than creating duplicates.
export async function registerProfileCompletionReminderSchedule(): Promise<void> {
  await getProfileCompletionReminderQueue().upsertJobScheduler(
    "profile-completion-reminder-daily",
    { pattern: "0 9 * * *", tz: "Asia/Kolkata" },
    { opts: { removeOnComplete: true, removeOnFail: { count: 10 } } },
  );
}
