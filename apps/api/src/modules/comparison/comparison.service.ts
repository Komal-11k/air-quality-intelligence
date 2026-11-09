import { db } from "../../infrastructure/database/client.js";
import type { ComparisonQuery } from "./comparison.schema.js";

export const compareLocations = async (query: ComparisonQuery) => {
  const placeholders = query.locationIds
    .map((_, index) => `$${index + 1}`)
    .join(", ");

  const result = await db.query(
    `
      SELECT
        l.id AS "locationId",
        l.name,
        l.city,
        m.pollutant,
        m.value,
        m.unit,
        m.measured_at AS "measuredAt"
      FROM locations l
      LEFT JOIN LATERAL (
        SELECT
          pollutant,
          value,
          unit,
          measured_at
        FROM measurements
        WHERE location_id = l.id
        ORDER BY measured_at DESC
      ) m ON TRUE
      WHERE l.id IN (${placeholders})
      ORDER BY l.name, m.measured_at DESC
    `,
    query.locationIds,
  );

  return result.rows;
};