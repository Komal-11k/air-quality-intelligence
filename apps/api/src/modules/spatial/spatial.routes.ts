import type { FastifyInstance } from "fastify";
import { spatialHeatmapQuerySchema } from "./spatial.schema.js";
import { getLatestSpatialHeatmap } from "./spatial.service.js";

export const spatialRoutes = async (app: FastifyInstance) => {
  app.get("/spatial/heatmap", async (request, reply) => {
    const query = spatialHeatmapQuerySchema.parse(request.query);

    const heatmap = await getLatestSpatialHeatmap(query);

    if (!heatmap) {
      return reply.status(404).send({
        error: "NotFound",
        message: `No spatial heatmap available for ${query.pollutant}`,
      });
    }

    return heatmap;
  });
};