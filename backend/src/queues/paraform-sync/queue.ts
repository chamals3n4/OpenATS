import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import logger from "../../utils/logger";

export const PARAFORM_SYNC_QUEUE = "paraform-sync";
export const PARAFORM_SYNC_EVERY_MS = 15 * 60_000;
const SCHEDULER_ID = "paraform-sync-every-15-minutes";
const ENQUEUE_TIMEOUT_MS = 5000;

export type ParaformSyncJobData = { trigger: "scheduled" | "manual" };

export const paraformSyncQueue = new Queue<ParaformSyncJobData>(PARAFORM_SYNC_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    // A failed run is written to the sync log, and the next scheduled one tries again.
    attempts: 1,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
});

/** Runs the sync every 15 minutes. Safe to call on every worker start: the schedule is replaced. */
export async function scheduleParaformSync(): Promise<void> {
  await paraformSyncQueue.upsertJobScheduler(
    SCHEDULER_ID,
    { every: PARAFORM_SYNC_EVERY_MS },
    { name: "sync", data: { trigger: "scheduled" } },
  );
}

/** Queues a sync now, for the "Sync now" button. Returns false when Redis did not take it. */
export async function requestParaformSync(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      paraformSyncQueue.add("sync", { trigger: "manual" }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Redis did not answer")), ENQUEUE_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch (error) {
    logger.error(`[paraform-sync] could not queue a sync: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
