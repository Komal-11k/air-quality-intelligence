import type { FastifyInstance } from "fastify";
import { createMeasurementSchema } from "./measurements.schema.js";
import {
  createMeasurement,
  getMeasurements,
} from "./measurements.service.js";

export const measurementsRoutes = async (app: FastifyInstance) => {
  app.get("/measurements", async () => {
    return getMeasurements();
  });

  app.post("/measurements", async (request, reply) => {
    const input = createMeasurementSchema.parse(request.body);

    const measurement = await createMeasurement(input);

    return reply.code(201).send(measurement);
  });
};