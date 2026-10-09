import "dotenv/config";
import http from "http";
import { validateEnv } from "./config/env";

const env = validateEnv();

import app from "./app";
import { socketService } from "./shared/services/socket.service";
import { subscribeToCvAnalysisEvents } from "./queues/cv-analysis/events";
import { assessmentExecutionService } from "./modules/assessment-execution/assessment-execution.service";
import logger from "./utils/logger";

const PORT = env.PORT;

const server = http.createServer(app);

socketService.initialize(server);

subscribeToCvAnalysisEvents((event) => {
  socketService.emitCvAnalysisUpdate(event);
});

// A test link that runs out unused counts as 0, so expiry has to be noticed even when nothing else
// touches the candidate. Cheap and idempotent, so every server can run it.
const EXPIRY_CHECK_MS = 15 * 60 * 1000;
const checkExpiredInvites = () =>
  assessmentExecutionService
    .expireStaleInvites()
    .then((count) => {
      if (count > 0) logger.info(`Expired ${count} unused assessment invitation(s)`);
    })
    .catch((error) => logger.error(`Assessment expiry check failed: ${error instanceof Error ? error.message : String(error)}`));
setInterval(checkExpiredInvites, EXPIRY_CHECK_MS).unref();

server.listen(PORT, () => {
  void checkExpiredInvites();
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
