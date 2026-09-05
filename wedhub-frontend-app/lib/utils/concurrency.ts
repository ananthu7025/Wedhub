/**
 * Runs the given tasks with at most `limit` running concurrently. Each task's
 * own success/failure is left to the caller (index each task's result inside
 * itself if you need it back) — this only bounds concurrency, it never
 * short-circuits on a single task's rejection.
 */
export async function runWithConcurrencyLimit(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await tasks[currentIndex]();
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
