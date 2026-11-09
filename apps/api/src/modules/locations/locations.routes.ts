import type { FastifyInstance } from "fastify";
import {
  createLocationSchema,
} from "./locations.schema.js";
import {
  createLocation,
  getLocations,
} from "./locations.service.js";

export const locationsRoutes = async (app: FastifyInstance) => {
  app.get("/locations", async () => {
    return getLocations();
  });

  app.post("/locations", async (request, reply) => {
    const input = createLocationSchema.parse(request.body);

    const location = await createLocation(input);

    return reply.code(201).send(location);
  });
};