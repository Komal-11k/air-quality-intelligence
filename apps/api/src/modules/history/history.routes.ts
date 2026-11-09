import type { FastifyInstance } from "fastify";
import { historyQuerySchema } from "./history.schema.js";
import { getMeasurementHistory } from "./history.service.js";

export const historyRoutes = async (app: FastifyInstance) => {
  app.get("/locations/:locationId/history", async (request) => {
    const { locationId } = request.params as {
      locationId: string;
    };

    const query = historyQuerySchema.parse(request.query);

    return getMeasurementHistory(locationId, query);
  });
};