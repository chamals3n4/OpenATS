import express, { type Express } from "express";
import cors from "cors";
import morgan from "morgan";
import router from "./routes";
import publicRouter from "./routes/public.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { swaggerUi, swaggerDocument } from "./config/swagger";
import { authMiddleware } from "./middlewares/auth.middleware";
import { pageSettingsService } from "./services/page-settings.service";
// import { activeLogMiddleware } from "./middlewares/active-log.middleware";
import logger from "./utils/logger";

const app: Express = express();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      const fallbackFrontend = normalizeOrigin(
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      );

      if (requestOrigin === fallbackFrontend) {
        callback(null, true);
        return;
      }

      pageSettingsService
        .getAllowedOrigins()
        .then((origins) => {
          const allowed = origins.map(normalizeOrigin);
          callback(null, allowed.includes(requestOrigin));
        })
        .catch((err) => callback(err));
    },
    credentials: true,
  }),
);
app.use(express.json());
// app.use(activeLogMiddleware);

app.use(
  morgan(
    ":remote-addr :method :url :status :res[content-length] - :response-time ms",
    {
      skip: (req) => req.url.startsWith("/api-docs"),
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    },
  ),
);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "working" });
});

app.use("/public", publicRouter);

app.use("/api", authMiddleware, router);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorMiddleware);

export default app;
