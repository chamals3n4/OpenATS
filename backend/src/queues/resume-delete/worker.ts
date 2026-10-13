import { Worker } from "bullmq";
import { RESUME_DELETE_QUEUE, type ResumeDeleteJobData } from "./queue";
import { createRedisConnection } from "../../config/redis";
import { r2Service } from "../../shared/services/r2.service";
import logger from "../../utils/logger";

export function startResumeDeleteWorker(): Worker<ResumeDeleteJobData> {
  const worker = new Worker<ResumeDeleteJobData>(
    RESUME_DELETE_QUEUE,
    async (job) => {
      // Deleting a file that is already gone succeeds, so a retry after a half-done attempt is safe.
      await r2Service.deleteResume(job.data.resumeKey);
      logger.info(`[resume-delete] erased ${job.data.resumeKey}`);
    },
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    if (!job) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    logger.error(
      `[resume-delete] failed ${job.data.resumeKey} attempt=${job.attemptsMade}${exhausted ? " (gave up: delete this file by hand)" : ""}: ${err.message}`,
    );
  });

  worker.on("error", (err) => {
    logger.error(`[resume-delete] worker error: ${err.message}`);
  });

  return worker;
}
