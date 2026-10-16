import "dotenv/config";
import { validateEnv } from "./config/env";

validateEnv();

import { startAllWorkers } from "./queues/start-workers";
import logger from "./utils/logger";

const workers = startAllWorkers();
logger.info("Background worker started: CV text, CV file deletion and AI CV analysis");

async function shutdown(signal: string) {
  logger.info(`[worker] received ${signal}, shutting down gracefully...`);
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
