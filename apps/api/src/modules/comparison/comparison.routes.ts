import type { FastifyInstance } from "fastify";
import { comparisonQuerySchema } from "./comparison.schema.js";
import { compareLocations } from "./comparison.service.js";

export const comparisonRoutes = async (app: FastifyInstance) => {
  app.get("/comparison", async (request) => {
    const query = comparisonQuerySchema.parse(request.query);

    return compareLocations(query);
  });
};