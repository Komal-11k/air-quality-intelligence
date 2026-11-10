import { locationsRoutes } from "./modules/locations/locations.routes.js";
import { measurementsRoutes } from "./modules/measurements/measurements.routes.js";
import { aqiRoutes } from "./modules/aqi/aqi.routes.js";
import { checkDatabaseConnection } from "./infrastructure/database/client.js";
import { checkRedisConnection } from "./infrastructure/redis/client.js";
import { historyRoutes } from "./modules/history/history.routes.js";
import { comparisonRoutes } from "./modules/comparison/comparison.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { forecastRoutes } from "./modules/forecast/forecast.routes.js";
import { alertsRoutes } from "./modules/alerts/alerts.routes.js";
import { assistantRoutes } from "./modules/assistant/assistant.routes.js";
import { spatialRoutes } from "./modules/spatial/spatial.routes.js";
import { env } from "./config/env.js";
import Fastify from "fastify";
import { ZodError } from "zod";
import cors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "ValidationError",
      message: error.message,
    });
  }

  request.log.error(error);

  return reply.status(500).send({
    error: "InternalServerError",
    message: "An unexpected error occurred",
  });
});
await app.register(cors, {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
});
await app.register(locationsRoutes);
await app.register(measurementsRoutes);
await app.register(aqiRoutes);
await app.register(historyRoutes);
await app.register(comparisonRoutes);
await app.register(forecastRoutes);
await app.register(alertsRoutes);
await app.register(assistantRoutes);
await app.register(spatialRoutes);
await app.register(healthRoutes);

const start = async () => {
  try {
    const database = await checkDatabaseConnection();
    const redis = await checkRedisConnection();

    app.log.info({ database, redis }, "Database and Redis connections verified");
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();