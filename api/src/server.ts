import http from "http";
import app from "./app";
import { ensureSchemaCompat } from "./db";
import { socketService } from "./services/socket.service";
import logger from "./utils/logger";

const PORT = process.env.PORT || 8080;

const server = http.createServer(app);

socketService.initialize(server);

<<<<<<< HEAD
ensureSchemaCompat()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`OpenATS Backend running on port ${PORT}`);
      console.log(`Socket.io initialized and listening on the same port.`);
    });
  })
  .catch((err) => {
    console.error("Database schema compatibility check failed:", err);
    process.exit(1);
  });
=======
server.listen(PORT, () => {
  logger.info(`OpenATS Backend running on port ${PORT}`);
  logger.info(`Socket.io initialized and listening on the same port.`);
});
>>>>>>> 926dde859e9697a2b89a2d4ffe3f324056139aaf
