import { db } from "../../infrastructure/database/client.js";
import type { CreateAlertInput } from "./alerts.schema.js";
import { calculateCurrentAqi } from "../aqi/aqi-current.service.js";

export const createAlert = async (input: CreateAlertInput) => {
  const result = await db.query(
    `
      INSERT INTO alerts (
        location_id,
        type,
        pollutant,
        condition,
        threshold,
        enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        location_id AS "locationId",
        type,
        pollutant,
        condition,
        threshold,
        enabled,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.locationId,
      input.type,
      input.pollutant ?? null,
      input.condition,
      input.threshold,
      input.enabled,
    ],
  );

  return result.rows[0];
};

export const getAlerts = async (locationId: string) => {
  const result = await db.query(
    `
      SELECT
        id,
        location_id AS "locationId",
        type,
        pollutant,
        condition,
        threshold,
        enabled,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM alerts
      WHERE location_id = $1
      ORDER BY created_at DESC
    `,
    [locationId],
  );

  return result.rows;
};

export const evaluateAlerts = async (locationId: string) => {
  const alertsResult = await db.query<{
    id: string;
    locationId: string;
    type: "AQI_THRESHOLD" | "POLLUTANT_THRESHOLD";
    pollutant: string | null;
    condition: "GREATER_THAN" | "LESS_THAN" | "EQUAL_TO";
    threshold: number;
    enabled: boolean;
    isTriggered: boolean;
  }>(
    `
      SELECT
        id,
        location_id AS "locationId",
        type,
        pollutant,
        condition,
        threshold,
        enabled,
        is_triggered AS "isTriggered"
      FROM alerts
      WHERE location_id = $1
        AND enabled = TRUE
      ORDER BY created_at DESC
    `,
    [locationId],
  );

  if (alertsResult.rows.length === 0) {
    return [];
  }

  const measurementsResult = await db.query<{
    pollutant: string;
    value: number;
  }>(
    `
      SELECT DISTINCT ON (pollutant)
        pollutant,
        value
      FROM measurements
      WHERE location_id = $1
      ORDER BY pollutant, measured_at DESC
    `,
    [locationId],
  );

  const measurements = new Map(
    measurementsResult.rows.map((measurement) => [
      measurement.pollutant,
      Number(measurement.value),
    ]),
  );

  const currentAqi = await calculateCurrentAqi(locationId);

  const triggeredAlerts = [];

  for (const alert of alertsResult.rows) {
    let currentValue: number | undefined;

    if (alert.type === "POLLUTANT_THRESHOLD" && alert.pollutant) {
      currentValue = measurements.get(alert.pollutant);
    }

    if (alert.type === "AQI_THRESHOLD") {
      currentValue = currentAqi.aqi;
    }

    if (currentValue === undefined) {
      continue;
    }

    let triggered = false;

    switch (alert.condition) {
      case "GREATER_THAN":
        triggered = currentValue > alert.threshold;
        break;

      case "LESS_THAN":
        triggered = currentValue < alert.threshold;
        break;

      case "EQUAL_TO":
        triggered = currentValue === alert.threshold;
        break;
    }

    if (triggered) {
      if (!alert.isTriggered) {
        await db.query(
          `
            INSERT INTO alert_events (
              alert_id,
              location_id,
              current_value,
              threshold,
              condition
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            alert.id,
            alert.locationId,
            currentValue,
            alert.threshold,
            alert.condition,
          ],
        );

        await db.query(
          `
            UPDATE alerts
            SET is_triggered = TRUE,
                updated_at = NOW()
            WHERE id = $1
          `,
          [alert.id],
        );
      }

      triggeredAlerts.push({
        ...alert,
        currentValue,
      });
    } else if (alert.isTriggered) {
      await db.query(
        `
          UPDATE alerts
          SET is_triggered = FALSE,
              updated_at = NOW()
          WHERE id = $1
        `,
        [alert.id],
      );
    }
  }

  return triggeredAlerts;
};

export const updateAlert = async (
  alertId: string,
  enabled: boolean,
) => {
  const result = await db.query(
    `
      UPDATE alerts
      SET enabled = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        location_id AS "locationId",
        type,
        pollutant,
        condition,
        threshold,
        enabled,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [enabled, alertId],
  );

  return result.rows[0] ?? null;
};
export const deleteAlert = async (alertId: string) => {
  const result = await db.query(
    `
      DELETE FROM alerts
      WHERE id = $1
      RETURNING id
    `,
    [alertId],
  );

  return result.rows[0] ?? null;
};
