import http from "http";
import app from "./app";
import { socketService } from "./services/socket.service";
import { subscribeToCvAnalysisEvents } from "./events/cv-analysis-events";
import logger from "./utils/logger";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

socketService.initialize(server);

subscribeToCvAnalysisEvents((event) => {
  socketService.emitCvAnalysisUpdate(event);
});

server.listen(PORT, () => {
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
