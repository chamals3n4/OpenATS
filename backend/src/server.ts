import "dotenv/config";
import http from "http";
import { validateEnv } from "./config/env";

const env = validateEnv();

import app from "./app";
import { socketService } from "./shared/services/socket.service";
import { subscribeToCvAnalysisEvents } from "./queues/cv-analysis/events";
import { assessmentExecutionService } from "./modules/assessment-execution/assessment-execution.service";
import { resumeUploadService } from "./modules/upload/resume-upload.service";
import { offerService } from "./modules/offer/offer.service";
import { startAllWorkers } from "./queues/start-workers";
import logger from "./utils/logger";

const PORT = env.PORT;

const server = http.createServer(app);

socketService.initialize(server);

subscribeToCvAnalysisEvents((event) => {
  socketService.emitCvAnalysisUpdate(event);
});

// A test link that runs out unused counts as 0, and a test that was started and then left has to
// be finished and graded, so both have to be noticed even when nothing else touches the
// candidate. Cheap and idempotent, so every server can run it.
const EXPIRY_CHECK_MS = 15 * 60 * 1000;
const checkExpiredInvites = () =>
  assessmentExecutionService
    .expireStaleInvites()
    .then((count) => {
      if (count > 0) logger.info(`Expired ${count} unused assessment invitation(s)`);
    })
    .then(() => assessmentExecutionService.completeAbandonedAttempts())
    .then((count) => {
      if (count > 0) logger.info(`Completed ${count} assessment(s) that were started and left unfinished`);
    })
    .catch((error) => logger.error(`Assessment expiry check failed: ${error instanceof Error ? error.message : String(error)}`));
setInterval(checkExpiredInvites, EXPIRY_CHECK_MS).unref();

// An offer with an expiry date stops being open when the date passes, answered or not.
const expireOverdueOffers = () =>
  offerService
    .expireOverdue()
    .then((count) => {
      if (count > 0) logger.info(`Expired ${count} offer(s) that were not answered in time`);
    })
    .catch((error) => logger.error(`Offer expiry check failed: ${error instanceof Error ? error.message : String(error)}`));
setInterval(expireOverdueOffers, EXPIRY_CHECK_MS).unref();

// A CV uploaded on the careers page by someone who never sent the application.
const removeUnusedResumeUploads = () =>
  resumeUploadService
    .removeExpired()
    .then((count) => {
      if (count > 0) logger.info(`Removed ${count} CV upload(s) that were never attached to an application`);
    })
    .catch((error) => logger.error(`Unused CV upload check failed: ${error instanceof Error ? error.message : String(error)}`));
setInterval(removeUnusedResumeUploads, EXPIRY_CHECK_MS).unref();

// For hosting without a separate worker service. Same workers as `src/worker.ts`, so only one of
// the two should be running them unless more throughput is wanted.
if (env.RUN_WORKER_IN_API === "true") {
  const workers = startAllWorkers();
  logger.info("Background workers started inside the API process (RUN_WORKER_IN_API=true)");

  const shutdown = (signal: string) => {
    logger.info(`[api] received ${signal}, closing background workers...`);
    void Promise.all(workers.map((worker) => worker.close())).finally(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

server.listen(PORT, () => {
  void checkExpiredInvites();
  void removeUnusedResumeUploads();
  void expireOverdueOffers();
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
