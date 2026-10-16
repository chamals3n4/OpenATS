import { startCvAnalysisWorker } from "./cv-analysis/worker";
import { startCvExtractWorker } from "./cv-extract/worker";
import { startResumeDeleteWorker } from "./resume-delete/worker";

/** Starts every queue's worker. Used by `worker.ts`, and by `server.ts` when `RUN_WORKER_IN_API` is on. */
export function startAllWorkers() {
  return [startCvAnalysisWorker(), startCvExtractWorker(), startResumeDeleteWorker()];
}
