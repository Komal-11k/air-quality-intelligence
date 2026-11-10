import { db } from "../../infrastructure/database/client.js";
import type {
  SpatialHeatmapQuery,
  SpatialHeatmapResponse,
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