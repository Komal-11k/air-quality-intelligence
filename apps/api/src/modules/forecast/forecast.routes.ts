import type { FastifyInstance } from "fastify";
import { forecastQuerySchema } from "./forecast.schema.js";
import { getForecast } from "./forecast.service.js";

export const forecastRoutes = async (app: FastifyInstance) => {
  app.get("/forecast", async (request) => {
    const query = forecastQuerySchema.parse(request.query);

    return getForecast(query);
  });
};