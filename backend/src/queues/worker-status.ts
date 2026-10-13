import { cvExtractQueue } from "./cv-extract/queue";
import logger from "../utils/logger";

/**
 * Whether the background worker (`src/worker.ts`) is running.
 *
 *   connected  at least one worker is listening for CVs to read
 *   missing    none is. CVs stay "pending", CV search misses them, and the files of deleted
 *              candidates are not erased, all without any error anywhere
 *   unknown    Redis could not say (some hosted Redis services do not allow the question), so
 *              nobody is warned about something that may be fine
 */
export type WorkerStatus = "connected" | "missing" | "unknown";

const CACHE_MS = 15_000;
const ASK_TIMEOUT_MS = 3_000;
let cached: { status: WorkerStatus; expiresAt: number } | null = null;

export async function getWorkerStatus(now: number = Date.now()): Promise<WorkerStatus> {
  if (cached && cached.expiresAt > now) return cached.status;

  let status: WorkerStatus;
  let timer: NodeJS.Timeout | undefined;
  try {
    // The worker process starts every queue's worker together, so one queue speaks for all.
    const workers = await Promise.race([
      cvExtractQueue.getWorkers(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Redis did not answer")), ASK_TIMEOUT_MS);
      }),
    ]);
    status = workers.length > 0 ? "connected" : "missing";
  } catch (error) {
    logger.warn(
      `[worker-status] could not check for a background worker: ${error instanceof Error ? error.message : String(error)}`,
    );
    status = "unknown";
  } finally {
    clearTimeout(timer);
  }

  cached = { status, expiresAt: now + CACHE_MS };
  return status;
}

export function clearWorkerStatusCache(): void {
  cached = null;
}
