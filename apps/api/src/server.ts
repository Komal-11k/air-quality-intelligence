import { checkDatabaseConnection } from "./infrastructure/database/client.js";
import { checkRedisConnection } from "./infrastructure/redis/client.js";
import "./config/env.js";
import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "air-quality-api",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: 3001,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();