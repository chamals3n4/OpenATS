import express, { type Express } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import router from "./routes";
import publicRouter from "./routes/public.routes";
import oauthRouter from "./modules/integrations/oauth.routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { swaggerUi, swaggerDocument } from "./config/swagger";
import { authMiddleware } from "./middlewares/auth.middleware";
import { apiLimiter } from "./middlewares/rate-limit.middleware";
import {
  frontendOrigin,
  normalizeOrigin,
  pageSettingsService,
} from "./modules/settings/page-settings.service";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { createRedisConnection } from "./config/redis";
import logger from "./utils/logger";
import { DEFAULT_TRUST_PROXY, parseTrustProxy } from "./config/env";
import { getWorkerStatus } from "./queues/worker-status";

const healthRedis = createRedisConnection();

const app: Express = express();

// Before anything reads req.ip: the request log and every per-IP rate limit depend on it.
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY) ?? DEFAULT_TRUST_PROXY);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);

      if (requestOrigin === frontendOrigin()) {
        callback(null, true);
        return;
      }

      // Cached in memory by the service, so this is not a database read per request.
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
app.use(express.json({ limit: "1mb" }));

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
app.get("/health", async (req, res) => {
  const checks: Record<string, "ok" | "error"> = {
    db: "ok",
    redis: "ok",
  };

  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    checks.db = "error";
    logger.error(
      `[health] db check failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const pong = await healthRedis.ping();
    if (pong !== "PONG") checks.redis = "error";
  } catch (err) {
    checks.redis = "error";
    logger.error(
      `[health] redis check failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  // Reported, but not part of whether this server is healthy: the worker is another process, and
  // restarting the API because the worker is down would fix nothing. A monitor can alert on it.
  const worker = checks.redis === "ok" ? await getWorkerStatus() : "unknown";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
    worker,
    ...(worker === "missing"
      ? { warning: "No background worker is connected. CVs will not be read until it is started." }
      : {}),
  });
});

app.use("/public", publicRouter);
app.use("/oauth", oauthRouter);

app.use("/api", authMiddleware, apiLimiter, router);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorMiddleware);

export default app;
