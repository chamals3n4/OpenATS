import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis";
import { cvAnalysisService } from "../services/cv-analysis.service";
import logger from "../utils/logger";

export const CV_ANALYSIS_QUEUE = "cv-analysis";

export type CvAnalysisJobData = {
  candidateId: number;
  jobId: number;
  resumeUrl: string;
};

export const cvAnalysisQueue = new Queue<CvAnalysisJobData>(CV_ANALYSIS_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3, // try up to 3 times total
    backoff: {
      type: "exponential", // wait 5s, then 10s, then 20s between tries
      delay: 5000,
    },
    removeOnComplete: { count: 100 }, // keep last 100 succeeded jobs for inspection
    removeOnFail: { count: 500 }, // keep last 500 failed jobs
  },
});

export async function requestCvAnalysis(
  data: CvAnalysisJobData,
): Promise<void> {
  await cvAnalysisService.markPending(data.candidateId, data.jobId);
  await cvAnalysisQueue.add("analyze", data);
  logger.info(
    `[cv-queue] enqueued analysis for candidate=${data.candidateId} job=${data.jobId}`,
  );
}
