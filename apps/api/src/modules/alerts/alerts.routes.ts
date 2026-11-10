import type { FastifyInstance } from "fastify";
import {
  createAlertSchema,
  updateAlertSchema,
} from "./alerts.schema.js";
import {
  createAlert,
  deleteAlert,
  evaluateAlerts,
  getAlerts,
  updateAlert,
} from "./alerts.service.js";

export const alertsRoutes = async (app: FastifyInstance) => {
  app.get("/locations/:locationId/alerts", async (request) => {
    const { locationId } = request.params as {
      locationId: string;
    };

    return getAlerts(locationId);
  });

  app.get("/locations/:locationId/alerts/evaluate", async (request) => {
    const { locationId } = request.params as {
      locationId: string;
    };

    return evaluateAlerts(locationId);
  });

  app.post("/alerts", async (request, reply) => {
    const input = createAlertSchema.parse(request.body);
    const alert = await createAlert(input);

    return reply.code(201).send(alert);
  });

  app.patch("/alerts/:alertId", async (request, reply) => {
    const { alertId } = request.params as {
      alertId: string;
    };

    const input = updateAlertSchema.parse(request.body);

    const alert = await updateAlert(alertId, input.enabled);

    if (!alert) {
      return reply.code(404).send({
        message: "Alert not found",
      });
    }

    return reply.send(alert);
  });
  app.delete("/alerts/:alertId", async (request, reply) => {
    const { alertId } = request.params as {
      alertId: string;
    };

    const alert = await deleteAlert(alertId);

    if (!alert) {
      return reply.code(404).send({
        message: "Alert not found",
      });
    }

    return reply.code(204).send();
  });
};
