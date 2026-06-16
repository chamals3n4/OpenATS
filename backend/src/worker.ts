import "dotenv/config";
import { startCvAnalysisWorker } from "./workers/cv-analysis.worker";
import logger from "./utils/logger";

const worker = startCvAnalysisWorker();
logger.info("CV analysis worker process started");

async function shutdown(signal: string) {
  logger.info(`[worker] received ${signal}, shutting down gracefully...`);
  await worker.close(); // finish in-flight jobs, stop taking new ones
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
