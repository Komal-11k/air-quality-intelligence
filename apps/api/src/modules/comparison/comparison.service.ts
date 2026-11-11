import { db } from "../../infrastructure/database/client.js";
import {
  calculateAqi,
  convertToAqiUnit,
} from "../aqi/aqi.service.js";
import type { AqiInput } from "../aqi/aqi.schema.js";
import type { ComparisonQuery } from "./comparison.schema.js";

type ComparisonMeasurement = {
  pollutant: string;
  value: number;
  unit: string;
  source: string;
  dataType: "ACTUAL";
  measuredAt: string;
};

const pollutantToAqiKey: Record<string, keyof AqiInput> = {
  "PM2.5": "pm25",
  PM25: "pm25",
  "PM10": "pm10",
  NO2: "no2",
  SO2: "so2",
  CO: "co",
  O3: "o3",
};

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
        l.region,
        l.country,
        l.source AS "locationSource",
        m.pollutant,
        m.value,
        m.unit,
        m.source,
        m.measured_at AS "measuredAt"
      FROM locations l
      LEFT JOIN LATERAL (
        SELECT DISTINCT ON (pollutant)
          pollutant,
          value,
          unit,
          source,
          measured_at
        FROM measurements
        WHERE location_id = l.id
        ORDER BY pollutant, measured_at DESC
      ) m ON TRUE
      WHERE l.id IN (${placeholders})
      ORDER BY l.name ASC, m.pollutant ASC
    `,
    query.locationIds,
  );

  const locations = new Map<
    string,
    {
      locationId: string;
      name: string;
      city: string | null;
      region: string | null;
      country: string | null;
      source: string;
      measurements: ComparisonMeasurement[];
    }
  >();

  for (const row of result.rows) {
    if (!locations.has(row.locationId)) {
      locations.set(row.locationId, {
        locationId: row.locationId,
        name: row.name,
        city: row.city,
        region: row.region,
        country: row.country,
        source: row.locationSource,
        measurements: [],
      });
    }

    if (row.pollutant !== null) {
      locations.get(row.locationId)!.measurements.push({
        pollutant: row.pollutant,
        value: Number(row.value),
        unit: row.unit,
        source: row.source,
        dataType: "ACTUAL",
        measuredAt: new Date(row.measuredAt).toISOString(),
      });
    }
  }

  return Array.from(locations.values()).map((location) => {
    const aqiInput: AqiInput = {};

    for (const measurement of location.measurements) {
      const key = pollutantToAqiKey[measurement.pollutant];

      if (key !== undefined) {
        aqiInput[key] = convertToAqiUnit(
          measurement.pollutant,
          measurement.value,
          measurement.unit,
        );
      }
    }

    const aqi =
      Object.keys(aqiInput).length > 0
        ? calculateAqi(aqiInput)
        : null;

    return {
      locationId: location.locationId,
      name: location.name,
      city: location.city,
      region: location.region,
      country: location.country,
      source: location.source,
      dataType: "ACTUAL" as const,
      aqi: aqi?.aqi ?? null,
      category: aqi?.category ?? null,
      dominantPollutant: aqi?.dominantPollutant ?? null,
      measurements: location.measurements,
    };
  });
};
