import { db } from "../../infrastructure/database/client.js";
import type { CreateMeasurementInput } from "./measurements.schema.js";

export const createMeasurement = async (
  input: CreateMeasurementInput,
) => {
  const result = await db.query(
    `
      INSERT INTO measurements (
        location_id,
        measured_at,
        pollutant,
        value,
        unit,
        source,
        source_measurement_id,
        raw_data
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING
        id,
        location_id AS "locationId",
        measured_at AS "measuredAt",
        pollutant,
        value,
        unit,
        source,
        source_measurement_id AS "sourceMeasurementId",
        raw_data AS "rawData",
        created_at AS "createdAt"
    `,
    [
      input.locationId,
      input.measuredAt,
      input.pollutant,
      input.value,
      input.unit,
      input.source,
      input.sourceMeasurementId ?? null,
      input.rawData ?? null,
    ],
  );

  return result.rows[0];
};

export const getMeasurements = async () => {
  const result = await db.query(`
    SELECT
      id,
      location_id AS "locationId",
      measured_at AS "measuredAt",
      pollutant,
      value,
      unit,
      source,
      source_measurement_id AS "sourceMeasurementId",
      raw_data AS "rawData",
      created_at AS "createdAt"
    FROM measurements
    ORDER BY measured_at DESC
  `);

  return result.rows;
};