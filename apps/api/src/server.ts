import { locationsRoutes } from "./modules/locations/locations.routes.js";
import { measurementsRoutes } from "./modules/measurements/measurements.routes.js";
import { aqiRoutes } from "./modules/aqi/aqi.routes.js";
import { checkDatabaseConnection } from "./infrastructure/database/client.js";
import { checkRedisConnection } from "./infrastructure/redis/client.js";
import { historyRoutes } from "./modules/history/history.routes.js";
import { env } from "./config/env.js";
import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

await app.register(locationsRoutes);
await app.register(measurementsRoutes);
await app.register(aqiRoutes);
await app.register(historyRoutes);

app.get("/health", async () => {
  return {
    status: "ok",
    service: "air-quality-api",
  };
});

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