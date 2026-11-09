import { db } from "../../infrastructure/database/client.js";
import type { CreateAlertInput } from "./alerts.schema.js";

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