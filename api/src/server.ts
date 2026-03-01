import http from "http";
import app from "./app";
import { socketService } from "./services/socket.service";

const PORT = 8080;

const server = http.createServer(app);

socketService.initialize(server);

server.listen(PORT, () => {
  console.log(`OpenATS Backend running on port ${PORT}`);
  console.log(`Socket.io initialized and listening on the same port.`);
});
