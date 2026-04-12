import http from "http";
import app from "./app";
import { ensureSchemaCompat } from "./db";
import { socketService } from "./services/socket.service";
import logger from "./utils/logger";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

socketService.initialize(server);

server.listen(PORT, () => {
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
