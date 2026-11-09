import { db } from "../../infrastructure/database/client.js";
import type { ForecastQuery, ForecastResponse } from "./forecast.schema.js";

export const getForecast = async (
  query: ForecastQuery,
): Promise<ForecastResponse> => {
  const result = await db.query<{
    pollutant: string;
    value: number;
    unit: string;
    measuredAt: Date;
  }>(
    `
      SELECT DISTINCT ON (pollutant)
        pollutant,
        value,
        unit,
        measured_at AS "measuredAt"
      FROM measurements
      WHERE location_id = $1
      ORDER BY pollutant, measured_at DESC
    `,
    [query.locationId],
  );

  const forecast = [];

  for (const row of result.rows) {
    for (let hour = 1; hour <= query.hours; hour++) {
      forecast.push({
        timestamp: new Date(
          row.measuredAt.getTime() + hour * 60 * 60 * 1000,
        ).toISOString(),
        pollutant: row.pollutant,
        predictedValue: row.value,
        unit: row.unit,
      });
    }
  }

  return {
    locationId: query.locationId,
    forecast,
  };
};