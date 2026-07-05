import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { cvAnalysisService } from "../../services/cv-analysis.service";
import logger from "../../utils/logger";

export const CV_ANALYSIS_QUEUE = "cv-analysis";

export type CvAnalysisJobData = {
  candidateId: number;
  jobId: number;
  resumeUrl: string;
};

export const cvAnalysisQueue = new Queue<CvAnalysisJobData>(CV_ANALYSIS_QUEUE, {
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

export async function requestCvAnalysis(
  data: CvAnalysisJobData,
): Promise<void> {
  await cvAnalysisService.markPending(data.candidateId, data.jobId);
  await cvAnalysisQueue.add("analyze", data);
  logger.info(
    `[cv-queue] enqueued analysis for candidate=${data.candidateId} job=${data.jobId}`,
  );
}
