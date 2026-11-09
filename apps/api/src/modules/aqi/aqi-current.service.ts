import { db } from "../../infrastructure/database/client.js";
import { calculateAqi } from "./aqi.service.js";
import type { AqiInput } from "./aqi.schema.js";

export const calculateCurrentAqi = async (locationId: string) => {
  const result = await db.query<{
    pollutant: string;
    value: number;
    measuredAt: Date;
  }>(
    `
      SELECT DISTINCT ON (pollutant)
        pollutant,
        value,
        measured_at AS "measuredAt"
      FROM measurements
      WHERE location_id = $1
      ORDER BY pollutant, measured_at DESC
    `,
    [locationId],
  );

  const input: AqiInput = {};

  for (const row of result.rows) {
    switch (row.pollutant) {
      case "PM2.5":
        input.pm25 = row.value;
        break;

      case "PM10":
        input.pm10 = row.value;
        break;

      case "NO2":
        input.no2 = row.value;
        break;

      case "SO2":
        input.so2 = row.value;
        break;

      case "CO":
        input.co = row.value;
        break;

      case "O3":
        input.o3 = row.value;
        break;
    }
  }

  const aqi = calculateAqi(input);

  return {
    locationId,
    ...aqi,
    measurements: result.rows,
  };
};