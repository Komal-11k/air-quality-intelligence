import type { Pool } from "pg";
import type { SpatialStation } from "../idw/idw.types.js";

export interface LatestStationMeasurement {
  id: string;
  latitude: number;
  longitude: number;
  value: number;
  pollutant: string;
  unit: string;
  measuredAt: Date;
}

export class SpatialRepository {
  constructor(private readonly pool: Pool) {}

  async getLatestStationMeasurements(
    pollutant: string,
  ): Promise<SpatialStation[]> {
    const result = await this.pool.query<LatestStationMeasurement>(
      `
        SELECT DISTINCT ON (m.location_id)
          m.id::text AS id,
          l.latitude,
          l.longitude,
          m.value,
          m.pollutant,
          m.unit,
          m.measured_at AS "measuredAt"
        FROM measurements m
        INNER JOIN locations l
          ON l.id = m.location_id
        WHERE m.pollutant = $1
          AND m.data_type = 'ACTUAL'
          AND m.value IS NOT NULL
          AND l.latitude BETWEEN -90 AND 90
          AND l.longitude BETWEEN -180 AND 180
        ORDER BY
          m.location_id,
          m.measured_at DESC,
          m.id DESC
      `,
      [pollutant],
    );

    return result.rows.map((row) => ({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      value: row.value,
      pollutant: row.pollutant,
      unit: row.unit,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}