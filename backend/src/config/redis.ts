// backend/src/config/redis.ts
import IORedis, { type RedisOptions } from "ioredis";
import logger from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const baseOptions: RedisOptions = {
  // BullMQ requires this to be null (it uses blocking commands).
  maxRetriesPerRequest: null,
};

/**
 * Creates a fresh Redis connection.
 * BullMQ best practice is a dedicated connection per Queue / Worker / pub-sub
 * client, so we expose a factory instead of a shared singleton.
 */
export function createRedisConnection(): IORedis {
  const connection = new IORedis(REDIS_URL, baseOptions);

  connection.on("error", (err) => {
    logger.error(`[redis] connection error: ${err.message}`);
  });
  connection.on("connect", () => {
    logger.info("[redis] connected");
  });

  return connection;
}
