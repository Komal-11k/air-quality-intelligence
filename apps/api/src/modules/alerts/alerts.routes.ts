import type { FastifyInstance } from "fastify";
import { createAlertSchema } from "./alerts.schema.js";
import { createAlert, getAlerts } from "./alerts.service.js";

export const alertsRoutes = async (app: FastifyInstance) => {
  app.get("/locations/:locationId/alerts", async (request) => {
    const { locationId } = request.params as {
      locationId: string;
    };

    return getAlerts(locationId);
  });

  app.post("/alerts", async (request, reply) => {
    const input = createAlertSchema.parse(request.body);
    const alert = await createAlert(input);

    return reply.code(201).send(alert);
  });
};