import type { FastifyInstance } from "fastify";
import {
  createLocationSchema,
  locationsQuerySchema,
} from "./locations.schema.js";
import {
  createLocation,
  getLocations,
} from "./locations.service.js";

export const locationsRoutes = async (app: FastifyInstance) => {
  app.get("/locations", async (request) => {
    const query = locationsQuerySchema.parse(request.query);
  
    return getLocations(query);
  });

  app.post("/locations", async (request, reply) => {
    const input = createLocationSchema.parse(request.body);

    const location = await createLocation(input);

    return reply.code(201).send(location);
  });
};