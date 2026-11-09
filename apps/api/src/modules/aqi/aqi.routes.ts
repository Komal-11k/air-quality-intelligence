import type { FastifyInstance } from "fastify";
import { aqiInputSchema } from "./aqi.schema.js";
import { calculateAqi } from "./aqi.service.js";

export const aqiRoutes = async (app: FastifyInstance) => {
  app.post("/aqi", async (request, reply) => {
    const input = aqiInputSchema.parse(request.body);

    const result = calculateAqi(input);

    return reply.code(200).send(result);
  });
};