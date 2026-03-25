import http from "http";
import app from "./app";
import { ensureSchemaCompat } from "./db";
import { socketService } from "./services/socket.service";

const PORT = 8080;

const server = http.createServer(app);

socketService.initialize(server);

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
