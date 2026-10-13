import { UnrecoverableError, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { CV_EXTRACT_QUEUE, type CvExtractJobData } from "./queue";
import { createRedisConnection } from "../../config/redis";
import { candidates, db } from "../../db";
import { extractCvText, UnreadableCvError } from "../../modules/candidate/cv-text";
import { cvTextService } from "../../modules/candidate/cv-text.service";
import { r2Service } from "../../shared/services/r2.service";
import logger from "../../utils/logger";

export function startCvExtractWorker(): Worker<CvExtractJobData> {
  const worker = new Worker<CvExtractJobData>(
    CV_EXTRACT_QUEUE,
    async (job) => {
      const { candidateId, resumeKey } = job.data;

      // The candidate may have been deleted, or the CV replaced, since this was queued. The new CV
      // has its own job, so this one has nothing left to do.
      const [candidate] = await db
        .select({ resumeKey: candidates.resumeKey })
        .from(candidates)
        .where(eq(candidates.id, candidateId));
      if (!candidate || candidate.resumeKey !== resumeKey) {
        logger.info(`[cv-extract] skipped candidate=${candidateId}: the CV is gone or was replaced`);
        return;
      }

      const file = await r2Service.getResume(resumeKey);
      if (!file) throw new UnrecoverableError("The CV file could not be found in storage");

      try {
        const cv = await extractCvText(file);
        await cvTextService.save(candidateId, resumeKey, cv);
        logger.info(
          `[cv-extract] candidate=${candidateId} status=${cv.status} pages=${cv.pageCount} chars=${cv.text.length}`,
        );
      } catch (error) {
        // Trying a password-protected or damaged file again gives the same answer.
        if (error instanceof UnreadableCvError) throw new UnrecoverableError(error.message);
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      // Parsing a PDF is CPU work on this process's one thread, so more would not go faster.
      concurrency: 2,
    },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    logger.error(
      `[cv-extract] failed candidate=${job.data.candidateId} attempt=${job.attemptsMade}: ${err.message}`,
    );

    const exhausted =
      err instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1);
    if (exhausted) {
      await cvTextService.markFailed(job.data.candidateId, job.data.resumeKey, err.message);
    }
  });

  worker.on("error", (err) => {
    logger.error(`[cv-extract] worker error: ${err.message}`);
  });

  return worker;
}
