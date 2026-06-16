import { Worker } from "bullmq";
import {
  CV_ANALYSIS_QUEUE,
  type CvAnalysisJobData,
} from "../queues/cv-analysis.queues";
import { createRedisConnection } from "../config/redis";
import { cvAnalysisService } from "../services/cv-analysis.service";
import { publishCvAnalysisEvent } from "../events/cv-analysis-events";
import logger from "../utils/logger";

export function startCvAnalysisWorker(): Worker<CvAnalysisJobData> {
  const worker = new Worker<CvAnalysisJobData>(
    CV_ANALYSIS_QUEUE,
    async (job) => {
      const { candidateId, jobId, resumeUrl } = job.data;
      logger.info(
        `[worker] processing candidate=${candidateId} attempt=${job.attemptsMade + 1}`,
      );
      // Throws on any error → BullMQ catches it and retries with backoff.
      await cvAnalysisService.analyze(candidateId, jobId, resumeUrl);
    },
    {
      connection: createRedisConnection(),
      concurrency: 3, // process up to 3 CVs at once
    },
  );

  worker.on("completed", async (job) => {
    logger.info(`[worker] completed candidate=${job.data.candidateId}`);
    await publishCvAnalysisEvent({
      candidateId: job.data.candidateId,
      jobId: job.data.jobId,
      status: "done",
    });
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    logger.error(
      `[worker] failed candidate=${job.data.candidateId} attempt=${job.attemptsMade}: ${err.message}`,
    );

    const maxAttempts = job.opts.attempts ?? 1;
    const exhausted = job.attemptsMade >= maxAttempts;

    // Only write "failed" to the DB after the LAST retry, so the UI stays
    // "pending" (spinner) while retries are still in progress.
    if (exhausted) {
      await cvAnalysisService.markFailed(job.data.candidateId, err.message);
      await publishCvAnalysisEvent({
        candidateId: job.data.candidateId,
        jobId: job.data.jobId,
        status: "failed",
      });
    }
  });

  worker.on("error", (err) => {
    logger.error(`[worker] worker error: ${err.message}`);
  });

  return worker;
}
