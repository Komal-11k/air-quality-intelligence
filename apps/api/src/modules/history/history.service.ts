import { db } from "../../infrastructure/database/client.js";
import type { HistoryQuery } from "./history.schema.js";

export const getMeasurementHistory = async (
  locationId: string,
  query: HistoryQuery,
) => {
  const conditions = ["location_id = $1"];
  const values: unknown[] = [locationId];

  if (query.from) {
    values.push(query.from);
    conditions.push(`measured_at >= $${values.length}`);
  }

  if (query.to) {
    values.push(query.to);
    conditions.push(`measured_at <= $${values.length}`);
  }

  if (query.pollutant) {
    values.push(query.pollutant);
    conditions.push(`pollutant = $${values.length}`);
  }

  values.push(query.limit);
  const limitParameter = values.length;

  const result = await db.query(
    `
      SELECT
        id,
        location_id AS "locationId",
        measured_at AS "measuredAt",
        pollutant,
        value,
        unit,
        source
      FROM measurements
      WHERE ${conditions.join(" AND ")}
      ORDER BY measured_at DESC
      LIMIT $${limitParameter}
    `,
    values,
  );

  return {
    value: result.rows,
    Count: result.rows.length,
  };
};