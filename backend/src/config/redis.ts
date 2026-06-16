import IORedis, { type RedisOptions } from "ioredis";
import logger from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL ?? "http://localhost:6379";

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null,
};

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
