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
import { pageSettingsService } from "./modules/settings/page-settings.service";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { createRedisConnection } from "./config/redis";
import logger from "./utils/logger";

const healthRedis = createRedisConnection();

const app: Express = express();

app.use(helmet());

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
  const checks: Record<string, "ok" | "error"> = { db: "okkk", redis: "ok" };

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
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
  });
});

app.use("/public", publicRouter);
app.use("/oauth", oauthRouter);

app.use("/api", authMiddleware, router);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(errorMiddleware);

export default app;
