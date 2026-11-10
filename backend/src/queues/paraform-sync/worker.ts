import { Worker } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { paraformSyncService } from "../../modules/paraform/paraform-sync.service";
import logger from "../../utils/logger";
import { PARAFORM_SYNC_QUEUE, scheduleParaformSync, type ParaformSyncJobData } from "./queue";

export function startParaformSyncWorker(): Worker<ParaformSyncJobData> {
  const worker = new Worker<ParaformSyncJobData>(
    PARAFORM_SYNC_QUEUE,
    async (job) => {
      // Does nothing, and writes no log entry, while Paraform is not connected.
      const run = await paraformSyncService.run(job.data.trigger);
      if (run) {
        logger.info(
          `[paraform-sync] run ${run.id} ${run.status}: ${run.candidatesImported} imported`,
        );
      }
    },
    { connection: createRedisConnection(), concurrency: 1 },
  );

  worker.on("error", (err) => {
    logger.error(`[paraform-sync] worker error: ${err.message}`);
  });

  scheduleParaformSync().catch((err: unknown) => {
    logger.error(`[paraform-sync] could not set the schedule: ${err instanceof Error ? err.message : String(err)}`);
  });

  return worker;
}
