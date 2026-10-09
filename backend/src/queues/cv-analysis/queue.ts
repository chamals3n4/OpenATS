import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import { cvAnalysisService } from "../../modules/candidate/cv-analysis.service";
import { aiSettingsService } from "../../modules/settings/ai-settings.service";
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

/**
 * Queues a CV for analysis, but only while AI CV analysis is turned on in Settings (and the server
 * has a Gemini key). This is the single way a CV gets analysed, so nothing reaches Gemini while it
 * is off. Returns whether the CV was queued.
 */
export async function requestCvAnalysis(
  data: CvAnalysisJobData,
): Promise<boolean> {
  if (!(await aiSettingsService.isCvAnalysisActive())) {
    // This is called when a CV arrives or is replaced. Any notes saved earlier describe the old
    // CV, so they are dropped rather than left to reappear if analysis is turned on later.
    await cvAnalysisService.clear(data.candidateId);
    return false;
  }

  await cvAnalysisService.markPending(data.candidateId, data.jobId);
  await cvAnalysisQueue.add("analyze", data);
  logger.info(
    `[cv-queue] enqueued analysis for candidate=${data.candidateId} job=${data.jobId}`,
  );
  return true;
}
