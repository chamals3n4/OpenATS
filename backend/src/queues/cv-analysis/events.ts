import type IORedis from "ioredis";
import { createRedisConnection } from "../../config/redis";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const CHANNEL = "cv-analysis:events";

export type CvAnalysisEvent = {
  candidateId: number;
  jobId: number;
  status: "done" | "failed";
};

const publisher = createRedisConnection();

export async function publishCvAnalysisEvent(
  event: CvAnalysisEvent,
): Promise<void> {
  await publisher.publish(CHANNEL, JSON.stringify(event));
}

export function subscribeToCvAnalysisEvents(
  handler: (event: CvAnalysisEvent) => void,
): IORedis {
  const subscriber = createRedisConnection();

  subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      logger.error(`[cv-events] failed to subscribe: ${getErrorMessage(err)}`);
      return;
    }
    logger.info(`[cv-events] subscribed to "${CHANNEL}"`);
  });

  subscriber.on("message", (channel, message) => {
    if (channel !== CHANNEL) return;
    try {
      handler(JSON.parse(message) as CvAnalysisEvent);
    } catch (err) {
      logger.error(`[cv-events] bad message payload: ${String(err)}`);
    }
  });

  return subscriber;
}
