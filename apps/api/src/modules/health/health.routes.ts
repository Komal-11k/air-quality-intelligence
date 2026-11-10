import type { FastifyInstance } from "fastify";

import {
  checkDatabaseConnection,
} from "../../infrastructure/database/client.js";

import {
  checkRedisConnection,
} from "../../infrastructure/redis/client.js";

import {
  healthAdviceQuerySchema,
} from "./health.schema.js";

import {
  getHealthAdvice,
} from "./health.service.js";

export const healthRoutes = async (
  app: FastifyInstance,
) => {
  // Infrastructure health check.
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

  // Product health & safety advisory.
  app.get("/health/advice", async (request) => {
    const query = healthAdviceQuerySchema.parse(
      request.query,
    );

    return getHealthAdvice(query);
  });
};