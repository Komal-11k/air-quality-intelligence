import type { FastifyInstance } from "fastify";
import {
  checkDatabaseConnection,
} from "../../infrastructure/database/client.js";
import {
  checkRedisConnection,
} from "../../infrastructure/redis/client.js";

export const healthRoutes = async (app: FastifyInstance) => {
  app.get("/health", async () => {
    const database = await checkDatabaseConnection();
    const redis = await checkRedisConnection();

    return {
      status: "ok",
      database: "ok",
      redis: redis === "PONG" ? "ok" : "error",
      timestamp: new Date().toISOString(),
    };
  });
};