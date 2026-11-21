import "dotenv/config";
import http from "http";
import { validateEnv } from "./config/env";

const env = validateEnv();

import app from "./app";
import { socketService } from "./shared/services/socket.service";
import { subscribeToCvAnalysisEvents } from "./queues/cv-analysis/events";
import { assessmentExecutionService } from "./modules/assessment-execution/assessment-execution.service";
import { assignmentService } from "./modules/assignment/assignment.service";
import { resumeUploadService } from "./modules/upload/resume-upload.service";
import { offerService } from "./modules/offer/offer.service";
import { interviewService } from "./modules/interview/interview.service";
import { startAllWorkers } from "./queues/start-workers";
import { mailService } from "./shared/services/mail.service";
import { closeDb } from "./db";
import logger from "./utils/logger";
import { getErrorMessage } from "./utils/error.utils";

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
    .catch((error) => logger.error(`Assessment expiry check failed: ${getErrorMessage(error)}`));
setInterval(checkExpiredInvites, EXPIRY_CHECK_MS).unref();

// An assignment nobody handed in by its deadline.
const expireOverdueAssignments = () =>
  assignmentService
    .expireOverdue()
    .then((count) => {
      if (count > 0) logger.info(`Expired ${count} assignment(s) that were not handed in on time`);
    })
    .catch((error) => logger.error(`Assignment expiry check failed: ${getErrorMessage(error)}`));
setInterval(expireOverdueAssignments, EXPIRY_CHECK_MS).unref();

// An offer with an expiry date stops being open when the date passes, answered or not.
const expireOverdueOffers = () =>
  offerService
    .expireOverdue()
    .then((count) => {
      if (count > 0) logger.info(`Expired ${count} offer(s) that were not answered in time`);
    })
    .catch((error) => logger.error(`Offer expiry check failed: ${getErrorMessage(error)}`));
setInterval(expireOverdueOffers, EXPIRY_CHECK_MS).unref();

// An interview whose time-picking link ran out before the candidate chose a time.
const expireInterviewSlotLinks = () =>
  interviewService
    .expireStaleSlotLinks()
    .then((count) => {
      if (count > 0) logger.info(`Marked ${count} interview(s) expired: the candidate did not pick a time`);
    })
    .catch((error) => logger.error(`Interview link expiry check failed: ${getErrorMessage(error)}`));
setInterval(expireInterviewSlotLinks, EXPIRY_CHECK_MS).unref();

// A CV uploaded on the careers page by someone who never sent the application.
const removeUnusedResumeUploads = () =>
  resumeUploadService
    .removeExpired()
    .then((count) => {
      if (count > 0) logger.info(`Removed ${count} CV upload(s) that were never attached to an application`);
    })
    .catch((error) => logger.error(`Unused CV upload check failed: ${getErrorMessage(error)}`));
setInterval(removeUnusedResumeUploads, EXPIRY_CHECK_MS).unref();

// For hosting without a separate worker service. Same workers as `src/worker.ts`, so only one of
// the two should be running them unless more throughput is wanted.
const workers = env.RUN_WORKER_IN_API === "true" ? startAllWorkers() : [];
if (workers.length > 0) {
  logger.info("Background workers started inside the API process (RUN_WORKER_IN_API=true)");
}

// Docker and most hosts stop a server with SIGTERM and kill it about 10 seconds later. Node running
// as a container's first process ignores SIGTERM unless it is handled, so without this every stop
// waited for the kill and cut off requests that were still running.
const SHUTDOWN_TIMEOUT_MS = 8_000;
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[api] received ${signal}, shutting down...`);
  setTimeout(() => {
    logger.warn("[api] requests were still running after 8 seconds, exiting anyway");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  try {
    // Stop taking new requests and wait for the running ones. Live sockets and idle keep-alive
    // connections are closed, because they would otherwise hold the server open.
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      socketService.disconnectAll();
      server.closeIdleConnections();
    });
    await Promise.all(workers.map((worker) => worker.close()));
    await closeDb();
    logger.info("[api] shut down cleanly");
    process.exit(0);
  } catch (error) {
    logger.error(`[api] shutdown failed: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

server.listen(PORT, () => {
  void checkExpiredInvites();
  void removeUnusedResumeUploads();
  void expireOverdueOffers();
  void expireOverdueAssignments();
  void expireInterviewSlotLinks();
  void mailService.verify();
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
