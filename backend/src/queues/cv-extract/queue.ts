import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { cvTextService } from "../../modules/candidate/cv-text.service";
import logger from "../../utils/logger";

export const CV_EXTRACT_QUEUE = "cv-extract";

export type CvExtractJobData = {
  candidateId: number;
  resumeKey: string;
};

export const cvExtractQueue = new Queue<CvExtractJobData>(CV_EXTRACT_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Queues a CV to have its text read. Called whenever a CV arrives or is replaced. Unlike the AI
 * analysis this is always on: the text is read on this server and goes nowhere else.
 */
export async function requestCvExtraction(data: CvExtractJobData): Promise<void> {
  await cvTextService.markPending(data.candidateId, data.resumeKey);
  await cvExtractQueue.add("extract", data);
  logger.info(`[cv-extract] enqueued candidate=${data.candidateId}`);
}
