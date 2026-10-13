import { Queue } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import logger from "../../utils/logger";

export const RESUME_DELETE_QUEUE = "resume-delete";

const ENQUEUE_TIMEOUT_MS = 5000;

export type ResumeDeleteJobData = {
  resumeKey: string;
};

export const resumeDeleteQueue = new Queue<ResumeDeleteJobData>(RESUME_DELETE_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    // Storage being unreachable is the usual reason this fails, and it can last a while, so this
    // keeps trying for about a day before giving up.
    attempts: 12,
    backoff: {
      type: "exponential",
      delay: 30_000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 1000 },
  },
});

/**
 * Queues stored CV files to be erased. Called after candidates are deleted, or a CV is replaced,
 * once that change is committed: the rows are already gone, so the file must not outlive them.
 * It is a queue and not a direct call so that a storage error is tried again instead of leaving
 * the file behind. It never throws: the deletion that led here has already happened.
 */
export async function requestResumeDeletion(
  resumeKeys: Array<string | null | undefined>,
): Promise<void> {
  const keys = resumeKeys.filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;

  let timer: NodeJS.Timeout | undefined;
  try {
    // While Redis is down a command waits for it to come back instead of failing, which would
    // leave the person who pressed Delete waiting too. Give up on the wait, not on the command.
    await Promise.race([
      resumeDeleteQueue.addBulk(keys.map((resumeKey) => ({ name: "delete", data: { resumeKey } }))),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Redis did not answer")), ENQUEUE_TIMEOUT_MS);
      }),
    ]);
    logger.info(`[resume-delete] enqueued ${keys.length} file(s)`);
  } catch (error) {
    // The keys are logged so the files can still be removed by hand. A key is a random id and
    // says nothing about whose CV it was.
    logger.error(
      `[resume-delete] could not queue ${keys.length} file(s) for deletion (${error instanceof Error ? error.message : String(error)}): ${keys.join(", ")}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
