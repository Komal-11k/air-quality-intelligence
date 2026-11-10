import { db } from "../../infrastructure/database/client.js";
import type {
  SpatialHeatmapQuery,
  SpatialHeatmapResponse,
  SpatialStationsResponse,
} from "./spatial.schema.js";

interface SpatialHeatmapRow {
  id: string;
  pollutant: string;
  unit: string;
  generatedAt: Date;
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  rows: number;
  columns: number;
  cells: unknown;
}

export const getLatestSpatialHeatmap = async (
  query: SpatialHeatmapQuery,
): Promise<SpatialHeatmapResponse | null> => {
  const result = await db.query<SpatialHeatmapRow>(
    `
      SELECT
        id::text AS id,
        pollutant,
        unit,
        generated_at AS "generatedAt",
        min_latitude AS "minLatitude",
        max_latitude AS "maxLatitude",
        min_longitude AS "minLongitude",
        max_longitude AS "maxLongitude",
        rows,
        columns,
        cells
      FROM spatial_heatmaps
      WHERE pollutant = $1
      ORDER BY generated_at DESC, id DESC
      LIMIT 1
    `,
    [query.pollutant],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    pollutant: row.pollutant,
    unit: row.unit,
    generatedAt: row.generatedAt.toISOString(),
    bounds: {
      minLatitude: row.minLatitude,
      maxLatitude: row.maxLatitude,
      minLongitude: row.minLongitude,
      maxLongitude: row.maxLongitude,
    },
    rows: row.rows,
    columns: row.columns,
    cells: row.cells as SpatialHeatmapResponse["cells"],
  };
};
export const getLatestSpatialStations = async (
  query: SpatialHeatmapQuery,
): Promise<SpatialStationsResponse> => {
  const result = await db.query<{
    id: string;
    locationId: string;
    latitude: number;
    longitude: number;
    value: number;
    pollutant: string;
    unit: string;
    measuredAt: Date;
  }>(
    `
      SELECT DISTINCT ON (m.location_id)
        m.id::text AS id,
        m.location_id::text AS "locationId",
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
        AND m.source = 'OPENAQ'
        AND m.data_type = 'ACTUAL'
        AND m.value IS NOT NULL
        AND m.measured_at >= NOW() - INTERVAL '24 hours'
        AND l.latitude BETWEEN -90 AND 90
        AND l.longitude BETWEEN -180 AND 180
      ORDER BY
        m.location_id,
        m.measured_at DESC,
        m.id DESC
    `,
    [query.pollutant],
  );

  return {
    pollutant: query.pollutant,
    stations: result.rows.map((row) => ({
      id: row.id,
      locationId: row.locationId,
      latitude: row.latitude,
      longitude: row.longitude,
      pollutant: row.pollutant,
      value: row.value,
      unit: row.unit,
      measuredAt: row.measuredAt.toISOString(),
    })),
  };
};