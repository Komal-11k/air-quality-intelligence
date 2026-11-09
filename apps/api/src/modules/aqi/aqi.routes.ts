import type { FastifyInstance } from "fastify";
import { aqiInputSchema } from "./aqi.schema.js";
import { calculateAqi } from "./aqi.service.js";
import { calculateCurrentAqi } from "./aqi-current.service.js";

export const aqiRoutes = async (app: FastifyInstance) => {
  app.post("/aqi", async (request, reply) => {
    const input = aqiInputSchema.parse(request.body);

    const result = calculateAqi(input);

    return reply.code(200).send(result);
  });

  app.get("/locations/:locationId/aqi", async (request) => {
    const { locationId } = request.params as {
      locationId: string;
    };
  
    return calculateCurrentAqi(locationId);
  });
};